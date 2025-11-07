const Order = require('../models/order');
const Crop = require('../models/crop');
const Transporter = require('../models/transporter');
const User = require('../models/user');
const logger = require('../config/logger');

/**
 * TRIP CONTROLLER
 * Handles trip creation, acceptance, and management
 */

// @desc    Get all trips with filtering
// @route   GET /api/trips
// @access  Private
exports.getAll = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const trips = await Order.find(filter)
      .populate('cropId')
      .populate('farmerId', 'name phone')
      .populate('buyerId', 'name phone')
      .populate('transporterId', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: trips,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Error fetching trips:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get single trip by ID
// @route   GET /api/trips/:id
// @access  Private
exports.getById = async (req, res) => {
  try {
    const trip = await Order.findById(req.params.id)
      .populate('cropId')
      .populate('farmerId', 'name phone')
      .populate('buyerId', 'name phone')
      .populate('transporterId', 'name phone');

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
      });
    }

    res.json({
      success: true,
      data: trip,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Create new trip (transporter accepts cargo)
// @route   POST /api/trips
// @access  Private (Transporter only)
exports.create = async (req, res) => {
  try {
    if (req.user.role !== 'transporter') {
      return res.status(403).json({
        success: false,
        error: 'Only transporters can create trips',
      });
    }

    const {
      cargo_id,
      quantity,
      total_price,
      pickup_location,
      delivery_location,
    } = req.body;

    if (!cargo_id || !quantity || !total_price) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: cargo_id, quantity, total_price',
      });
    }

    // Get cargo details
    const cargo = await Crop.findById(cargo_id).populate('farmerId');
    if (!cargo) {
      return res.status(404).json({
        success: false,
        error: 'Cargo not found',
      });
    }

    // Get transporter profile
    const transporter = await Transporter.findOne({ userId: req.user.id });
    if (!transporter) {
      return res.status(400).json({
        success: false,
        error: 'Transporter profile not found. Please create a profile first.',
      });
    }

    // Create trip/order
    const trip = new Order({
      cropId: cargo_id,
      farmerId: cargo.farmerId._id,
      buyerId: req.user.id,
      transporterId: req.user.id,
      quantity: parseFloat(quantity),
      totalPrice: parseFloat(total_price),
      status: 'accepted',
      pickupLocation: pickup_location || cargo.location,
      deliveryLocation: delivery_location,
    });

    await trip.save();

    // Update cargo status
    cargo.status = 'matched';
    await cargo.save();

    logger.info(`Trip created: ${trip._id} by transporter ${req.user.id}`);

    res.status(201).json({
      success: true,
      data: await trip.populate('farmerId', 'name phone').populate('cropId'),
      message: 'Trip created successfully',
    });
  } catch (error) {
    logger.error('Error creating trip:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Accept trip (transporter accepts order)
// @route   POST /api/trips/:id/accept
// @access  Private (Transporter only)
exports.acceptTrip = async (req, res) => {
  try {
    if (req.user.role !== 'transporter') {
      return res.status(403).json({
        success: false,
        error: 'Only transporters can accept trips',
      });
    }

    const trip = await Order.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
      });
    }

    if (trip.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Trip cannot be accepted. Current status: ${trip.status}`,
      });
    }

    // Update trip
    trip.transporterId = req.user.id;
    trip.status = 'accepted';
    await trip.save();

    // Update cargo status
    await Crop.findByIdAndUpdate(trip.cropId, { status: 'matched' });

    logger.info(`Trip accepted: ${trip._id} by transporter ${req.user.id}`);

    res.json({
      success: true,
      data: await trip.populate('farmerId', 'name phone').populate('transporterId', 'name phone'),
      message: 'Trip accepted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Mark trip as in progress
// @route   PUT /api/trips/:id/start
// @access  Private (Transporter only)
exports.startTrip = async (req, res) => {
  try {
    const trip = await Order.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
      });
    }

    if (trip.transporterId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to start this trip',
      });
    }

    trip.status = 'in_progress';
    await trip.save();

    // Update cargo
    await Crop.findByIdAndUpdate(trip.cropId, { status: 'in_transit' });

    logger.info(`Trip started: ${trip._id}`);

    res.json({
      success: true,
      data: trip,
      message: 'Trip started',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Complete trip
// @route   PUT /api/trips/:id/complete
// @access  Private (Transporter only)
exports.completeTrip = async (req, res) => {
  try {
    const trip = await Order.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
      });
    }

    if (trip.transporterId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to complete this trip',
      });
    }

    trip.status = 'completed';
    await trip.save();

    // Update cargo
    await Crop.findByIdAndUpdate(trip.cropId, { status: 'delivered' });

    // Update transporter completed deliveries
    await Transporter.findOneAndUpdate(
      { userId: req.user.id },
      { $inc: { completedDeliveries: 1 } }
    );

    logger.info(`Trip completed: ${trip._id}`);

    res.json({
      success: true,
      data: trip,
      message: 'Trip completed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Cancel trip
// @route   PUT /api/trips/:id/cancel
// @access  Private (Transporter or Admin)
exports.cancelTrip = async (req, res) => {
  try {
    const trip = await Order.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
      });
    }

    if (trip.transporterId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to cancel this trip',
      });
    }

    trip.status = 'cancelled';
    await trip.save();

    // Update cargo status back to listed
    await Crop.findByIdAndUpdate(trip.cropId, { status: 'listed' });

    logger.info(`Trip cancelled: ${trip._id}`);

    res.json({
      success: true,
      data: trip,
      message: 'Trip cancelled',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get transporter's trips
// @route   GET /api/trips/transporter/:transporterId
// @access  Private
exports.getByTransporter = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = { transporterId: req.params.transporterId };
    if (status) filter.status = status;

    const trips = await Order.find(filter)
      .populate('cropId')
      .populate('farmerId', 'name phone')
      .populate('buyerId', 'name phone')
      .sort({ createdAt: -1 });

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

// @desc    Get available trips
// @route   GET /api/trips/available
// @access  Public
exports.getAvailable = async (req, res) => {
  try {
    const trips = await Order.find({ status: 'pending' })
      .populate('cropId')
      .populate('farmerId', 'name phone')
      .sort({ createdAt: -1 });

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

// @desc    Update trip location
// @route   PUT /api/trips/:id/location
// @access  Private (Transporter only)
exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude required',
      });
    }

    const trip = await Order.findByIdAndUpdate(
      req.params.id,
      {
        'pickupLocation.latitude': latitude,
        'pickupLocation.longitude': longitude,
      },
      { new: true }
    );

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
      });
    }

    logger.info(`Trip location updated: ${req.params.id}`);

    res.json({
      success: true,
      data: trip,
      message: 'Location updated',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};