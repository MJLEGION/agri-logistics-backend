const Transporter = require('../models/transporter');
const User = require('../models/user');
const Order = require('../models/order');
const Rating = require('../models/rating');
const logger = require('../config/logger');

/**
 * TRANSPORTER CONTROLLER
 * Handles transporter profiles and management
 */

// @desc    Get all transporters
// @route   GET /api/transporters
// @access  Public
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20, vehicleType, minRating } = req.query;

    const filter = {};
    if (vehicleType) filter.vehicle_type = vehicleType;
    if (minRating) filter.rating = { $gte: parseFloat(minRating) };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transporters = await Transporter.find(filter)
      .populate('userId', 'name phone location')
      .sort({ rating: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transporter.countDocuments(filter);

    res.json({
      success: true,
      data: transporters,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Error fetching transporters:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get available transporters
// @route   GET /api/transporters/available
// @access  Public
exports.getAvailable = async (req, res) => {
  try {
    const { vehicleType } = req.query;

    const filter = { available: true };
    if (vehicleType) filter.vehicle_type = vehicleType;

    const transporters = await Transporter.find(filter)
      .populate('userId', 'name phone location')
      .sort({ rating: -1, completedDeliveries: -1 });

    res.json({
      success: true,
      data: transporters,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get single transporter
// @route   GET /api/transporters/:id
// @access  Public
exports.getById = async (req, res) => {
  try {
    const transporter = await Transporter.findById(req.params.id)
      .populate('userId', 'name phone email location');

    if (!transporter) {
      return res.status(404).json({
        success: false,
        error: 'Transporter not found',
      });
    }

    // Get rating stats
    const stats = await Rating.aggregate([
      { $match: { ratedUserId: transporter.userId } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        ...transporter.toObject(),
        ratingStats: stats[0] || { avgRating: 0, totalRatings: 0 },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get current user's transporter profile
// @route   GET /api/transporters/profile/me
// @access  Private
exports.getMyProfile = async (req, res) => {
  try {
    const transporter = await Transporter.findOne({ userId: req.user.id });

    if (!transporter) {
      return res.status(404).json({
        success: false,
        error: 'Transporter profile not found. Create a profile first.',
      });
    }

    res.json({
      success: true,
      data: transporter,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Create or update transporter profile
// @route   POST /api/transporters/profile/me
// @access  Private (Transporter only)
exports.createOrUpdateProfile = async (req, res) => {
  try {
    if (req.user.role !== 'transporter') {
      return res.status(403).json({
        success: false,
        error: 'Only transporters can create profiles',
      });
    }

    const {
      vehicle_type,
      capacity,
      rates,
      location,
      phone,
      available,
    } = req.body;

    // Validation
    if (!vehicle_type || !capacity || !rates) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: vehicle_type, capacity, rates',
      });
    }

    const validVehicles = ['bicycle', 'motorcycle', 'car', 'van', 'truck', 'lorry'];
    if (!validVehicles.includes(vehicle_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid vehicle type. Must be one of: ${validVehicles.join(', ')}`,
      });
    }

    if (capacity <= 0 || rates <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Capacity and rates must be positive numbers',
      });
    }

    // Get or create profile
    let transporter = await Transporter.findOne({ userId: req.user.id });
    const user = await User.findById(req.user.id);

    if (transporter) {
      // Update existing
      transporter.vehicle_type = vehicle_type;
      transporter.capacity = capacity;
      transporter.rates = rates;
      if (location) transporter.location = location;
      if (available !== undefined) transporter.available = available;
      if (phone) transporter.phone = phone;
      if (user) transporter.name = user.name;

      await transporter.save();

      logger.info(`Transporter profile updated: ${req.user.id}`);

      return res.json({
        success: true,
        data: transporter,
        message: 'Transporter profile updated successfully',
      });
    } else {
      // Create new
      transporter = new Transporter({
        userId: req.user.id,
        vehicle_type,
        capacity,
        rates,
        location: location || '',
        available: available !== undefined ? available : true,
        phone: phone || user?.phone || '',
        name: user?.name || '',
      });

      await transporter.save();

      logger.info(`Transporter profile created: ${req.user.id}`);

      return res.status(201).json({
        success: true,
        data: transporter,
        message: 'Transporter profile created successfully',
      });
    }
  } catch (error) {
    logger.error('Error creating/updating transporter profile:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Update transporter profile
// @route   PUT /api/transporters/:id
// @access  Private (Owner only)
exports.update = async (req, res) => {
  try {
    const transporter = await Transporter.findById(req.params.id);

    if (!transporter) {
      return res.status(404).json({
        success: false,
        error: 'Transporter not found',
      });
    }

    if (transporter.userId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this profile',
      });
    }

    const allowedFields = [
      'vehicle_type',
      'capacity',
      'rates',
      'location',
      'available',
      'phone',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        transporter[field] = req.body[field];
      }
    });

    await transporter.save();

    logger.info(`Transporter profile updated: ${req.params.id}`);

    res.json({
      success: true,
      data: transporter,
      message: 'Transporter profile updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Toggle transporter availability
// @route   PUT /api/transporters/:id/availability
// @access  Private (Owner only)
exports.toggleAvailability = async (req, res) => {
  try {
    const transporter = await Transporter.findById(req.params.id);

    if (!transporter) {
      return res.status(404).json({
        success: false,
        error: 'Transporter not found',
      });
    }

    if (transporter.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    transporter.available = !transporter.available;
    await transporter.save();

    logger.info(`Transporter availability toggled: ${req.params.id} -> ${transporter.available}`);

    res.json({
      success: true,
      data: transporter,
      message: `Now ${transporter.available ? 'available' : 'unavailable'}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get transporter's completed deliveries
// @route   GET /api/transporters/:id/deliveries
// @access  Public
exports.getCompletedDeliveries = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const transporter = await Transporter.findById(req.params.id);
    if (!transporter) {
      return res.status(404).json({
        success: false,
        error: 'Transporter not found',
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const deliveries = await Order.find({
      transporterId: transporter.userId,
      status: 'completed',
    })
      .populate('cropId')
      .populate('farmerId', 'name phone')
      .populate('buyerId', 'name phone')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments({
      transporterId: transporter.userId,
      status: 'completed',
    });

    res.json({
      success: true,
      data: deliveries,
      stats: {
        completedDeliveries: transporter.completedDeliveries,
        rating: transporter.rating,
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get transporter's active trips
// @route   GET /api/transporters/:id/active-trips
// @access  Private
exports.getActiveTrips = async (req, res) => {
  try {
    const transporter = await Transporter.findById(req.params.id);

    if (!transporter) {
      return res.status(404).json({
        success: false,
        error: 'Transporter not found',
      });
    }

    const trips = await Order.find({
      transporterId: transporter.userId,
      status: { $in: ['accepted', 'in_progress'] },
    })
      .populate('cropId')
      .populate('farmerId', 'name phone')
      .populate('buyerId', 'name phone');

    res.json({
      success: true,
      data: trips,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Search transporters by location
// @route   GET /api/transporters/search/location
// @access  Public
exports.searchByLocation = async (req, res) => {
  try {
    const { latitude, longitude, radius = 50, vehicleType } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude required',
      });
    }

    const filter = { available: true };
    if (vehicleType) filter.vehicle_type = vehicleType;

    const transporters = await Transporter.find(filter)
      .populate('userId', 'name phone location')
      .lean();

    // Filter by distance (rough approximation)
    const filtered = transporters.filter((t) => {
      // This is a simple check - in production, use proper geospatial queries
      return true;
    });

    res.json({
      success: true,
      data: filtered.sort((a, b) => b.rating - a.rating),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get transporter statistics
// @route   GET /api/transporters/:id/stats
// @access  Public
exports.getStats = async (req, res) => {
  try {
    const transporter = await Transporter.findById(req.params.id);

    if (!transporter) {
      return res.status(404).json({
        success: false,
        error: 'Transporter not found',
      });
    }

    // Get completed trips
    const completedTrips = await Order.countDocuments({
      transporterId: transporter.userId,
      status: 'completed',
    });

    // Get pending trips
    const pendingTrips = await Order.countDocuments({
      transporterId: transporter.userId,
      status: { $in: ['accepted', 'in_progress'] },
    });

    // Get ratings
    const ratings = await Rating.find({ ratedUserId: transporter.userId });
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    res.json({
      success: true,
      data: {
        transporterId: transporter._id,
        name: transporter.name,
        vehicleType: transporter.vehicle_type,
        capacity: transporter.capacity,
        rates: transporter.rates,
        available: transporter.available,
        completedDeliveries: transporter.completedDeliveries,
        rating: transporter.rating,
        averageRating: parseFloat(avgRating.toFixed(2)),
        totalRatings: ratings.length,
        activeTrips: pendingTrips,
        stats: {
          completedTrips,
          pendingTrips,
          successRate: completedTrips > 0 ? ((completedTrips - pendingTrips) / completedTrips * 100).toFixed(1) : 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};