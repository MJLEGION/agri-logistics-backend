const Crop = require('../models/crop');
const Order = require('../models/order');
const logger = require('../config/logger');

/**
 * CARGO CONTROLLER
 * Handles cargo/product listings with advanced features
 */

// @desc    Get all cargo with filtering and pagination
// @route   GET /api/cargo
// @access  Public
exports.getAll = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20, minPrice, maxPrice, location } = req.query;
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (minPrice || maxPrice) {
      filter.pricePerUnit = {};
      if (minPrice) filter.pricePerUnit.$gte = parseFloat(minPrice);
      if (maxPrice) filter.pricePerUnit.$lte = parseFloat(maxPrice);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limit_num = parseInt(limit);

    const cargo = await Crop.find(filter)
      .populate('farmerId', 'name phone role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit_num);

    const total = await Crop.countDocuments(filter);

    res.json({
      success: true,
      data: cargo,
      pagination: {
        total,
        page: parseInt(page),
        limit: limit_num,
        pages: Math.ceil(total / limit_num),
      },
    });
  } catch (error) {
    logger.error('Error fetching cargo:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get single cargo by ID
// @route   GET /api/cargo/:id
// @access  Public
exports.getById = async (req, res) => {
  try {
    const cargo = await Crop.findById(req.params.id)
      .populate('farmerId', 'name phone role location');

    if (!cargo) {
      return res.status(404).json({
        success: false,
        error: 'Cargo not found',
      });
    }

    res.json({
      success: true,
      data: cargo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Create new cargo
// @route   POST /api/cargo
// @access  Private (Shipper/Farmer only)
exports.create = async (req, res) => {
  try {
    if (req.user.role !== 'farmer' && req.user.role !== 'shipper') {
      return res.status(403).json({
        success: false,
        error: 'Only farmers/shippers can create cargo listings',
      });
    }

    const {
      title,
      description,
      quantity,
      unit,
      price_per_unit,
      origin_location,
      origin_latitude,
      origin_longitude,
      destination_location,
      destination_latitude,
      destination_longitude,
      delivery_date,
      category,
    } = req.body;

    // Validation
    if (
      !title ||
      !quantity ||
      !price_per_unit ||
      !origin_location ||
      !destination_location
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    if (typeof quantity !== 'number' || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be a positive number',
      });
    }

    // Create cargo document
    const cargo = new Crop({
      farmerId: req.user.id,
      name: title,
      description,
      quantity: parseFloat(quantity),
      unit: unit || 'kg',
      pricePerUnit: parseFloat(price_per_unit),
      location: {
        latitude: parseFloat(origin_latitude),
        longitude: parseFloat(origin_longitude),
        address: origin_location,
      },
      status: 'listed',
      harvestDate: delivery_date || new Date(),
    });

    await cargo.save();

    logger.info(`Cargo created: ${cargo._id} by user ${req.user.id}`);

    res.status(201).json({
      success: true,
      data: await cargo.populate('farmerId', 'name phone'),
      message: 'Cargo listed successfully',
    });
  } catch (error) {
    logger.error('Error creating cargo:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Update cargo
// @route   PUT /api/cargo/:id
// @access  Private (Owner only)
exports.update = async (req, res) => {
  try {
    const cargo = await Crop.findById(req.params.id);

    if (!cargo) {
      return res.status(404).json({
        success: false,
        error: 'Cargo not found',
      });
    }

    // Check ownership
    if (cargo.farmerId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this cargo',
      });
    }

    // Update allowed fields
    const allowedFields = [
      'name',
      'description',
      'quantity',
      'pricePerUnit',
      'status',
    ];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        cargo[field] = req.body[field];
      }
    });

    await cargo.save();

    res.json({
      success: true,
      data: cargo,
      message: 'Cargo updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Delete cargo
// @route   DELETE /api/cargo/:id
// @access  Private (Owner only)
exports.delete = async (req, res) => {
  try {
    const cargo = await Crop.findById(req.params.id);

    if (!cargo) {
      return res.status(404).json({
        success: false,
        error: 'Cargo not found',
      });
    }

    // Check ownership
    if (cargo.farmerId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this cargo',
      });
    }

    await Crop.findByIdAndDelete(req.params.id);

    logger.info(`Cargo deleted: ${req.params.id}`);

    res.json({
      success: true,
      message: 'Cargo deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get cargo by user ID
// @route   GET /api/cargo/user/:userId
// @access  Public
exports.getByUserId = async (req, res) => {
  try {
    const cargo = await Crop.find({ farmerId: req.params.userId })
      .populate('farmerId', 'name phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: cargo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Search cargo with filters and distance
// @route   GET /api/cargo/search
// @access  Public
exports.search = async (req, res) => {
  try {
    const { q, minPrice, maxPrice, status } = req.query;

    const filter = { status: status || 'listed' };

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    if (minPrice || maxPrice) {
      filter.pricePerUnit = {};
      if (minPrice) filter.pricePerUnit.$gte = parseFloat(minPrice);
      if (maxPrice) filter.pricePerUnit.$lte = parseFloat(maxPrice);
    }

    const results = await Crop.find(filter)
      .populate('farmerId', 'name phone location')
      .limit(50);

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get available cargo near location
// @route   GET /api/cargo/nearby
// @access  Public
exports.getNearby = async (req, res) => {
  try {
    const { latitude, longitude, radius = 50 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude required',
      });
    }

    // Using MongoDB geospatial query
    const cargo = await Crop.find({
      status: 'listed',
      'location.latitude': {
        $gte: parseFloat(latitude) - parseFloat(radius) / 111,
        $lte: parseFloat(latitude) + parseFloat(radius) / 111,
      },
      'location.longitude': {
        $gte: parseFloat(longitude) - parseFloat(radius) / 111,
        $lte: parseFloat(longitude) + parseFloat(radius) / 111,
      },
    }).populate('farmerId', 'name phone');

    res.json({
      success: true,
      data: cargo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Update cargo status
// @route   PUT /api/cargo/:id/status
// @access  Private
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['listed', 'matched', 'picked_up', 'in_transit', 'delivered'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
      });
    }

    const cargo = await Crop.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!cargo) {
      return res.status(404).json({
        success: false,
        error: 'Cargo not found',
      });
    }

    logger.info(`Cargo status updated: ${req.params.id} -> ${status}`);

    res.json({
      success: true,
      data: cargo,
      message: `Status updated to ${status}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};