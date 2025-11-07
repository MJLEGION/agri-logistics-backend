const Crop = require('../models/crop');
const Order = require('../models/order');
const Transporter = require('../models/transporter');
const User = require('../models/user');
const logger = require('../config/logger');

/**
 * MATCHING CONTROLLER
 * Handles cargo-transporter matching and requests
 */

// @desc    Find matching transporters for cargo
// @route   POST /api/matching/find
// @access  Private
exports.findMatchingTransporters = async (req, res) => {
  try {
    const { cargoId, maxDistance = 50, limit = 10 } = req.body;

    if (!cargoId) {
      return res.status(400).json({
        success: false,
        error: 'Cargo ID required',
      });
    }

    // Get cargo details
    const cargo = await Crop.findById(cargoId).populate('farmerId');

    if (!cargo) {
      return res.status(404).json({
        success: false,
        error: 'Cargo not found',
      });
    }

    // Find available transporters
    const transporters = await Transporter.find({
      available: true,
      capacity: { $gte: cargo.quantity },
    })
      .populate('userId', 'name phone location')
      .sort({ rating: -1 })
      .limit(parseInt(limit));

    // Filter by rating (preferably 3+ stars)
    const filtered = transporters.filter((t) => t.rating >= 3);

    // Add distance and score
    const scored = filtered.map((t) => {
      const score = (t.rating / 5) * 100; // 0-100 score

      return {
        transporterId: t._id,
        userId: t.userId._id,
        name: t.userId.name,
        phone: t.userId.phone,
        vehicleType: t.vehicle_type,
        capacity: t.capacity,
        rates: t.rates,
        rating: t.rating,
        completedDeliveries: t.completedDeliveries,
        matchScore: score,
      };
    });

    logger.info(`Found ${scored.length} matching transporters for cargo ${cargoId}`);

    res.json({
      success: true,
      data: scored,
      cargoDetails: {
        cargoId: cargo._id,
        name: cargo.name,
        quantity: cargo.quantity,
        unit: cargo.unit,
        pricePerUnit: cargo.pricePerUnit,
        location: cargo.location,
      },
    });
  } catch (error) {
    logger.error('Error finding matching transporters:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Find available cargo for transporter
// @route   GET /api/matching/available-cargo
// @access  Private (Transporter only)
exports.findAvailableCargo = async (req, res) => {
  try {
    if (req.user.role !== 'transporter') {
      return res.status(403).json({
        success: false,
        error: 'Only transporters can search for cargo',
      });
    }

    const { limit = 20, vehicleType } = req.query;

    // Get transporter profile
    const transporter = await Transporter.findOne({ userId: req.user.id });

    if (!transporter) {
      return res.status(400).json({
        success: false,
        error: 'Transporter profile not found',
      });
    }

    // Find available cargo matching transporter capacity
    const cargo = await Crop.find({
      status: 'listed',
      quantity: { $lte: transporter.capacity },
    })
      .populate('farmerId', 'name phone location')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Add distance and score
    const scored = cargo.map((c) => {
      const score = (c.quantity / transporter.capacity) * 100;

      return {
        cargoId: c._id,
        name: c.name,
        farmerId: c.farmerId._id,
        farmerName: c.farmerId.name,
        farmerPhone: c.farmerId.phone,
        quantity: c.quantity,
        unit: c.unit,
        pricePerUnit: c.pricePerUnit,
        totalPrice: c.quantity * c.pricePerUnit,
        location: c.location,
        status: c.status,
        matchScore: Math.round(score),
      };
    });

    logger.info(`Found ${scored.length} available cargo for transporter ${req.user.id}`);

    res.json({
      success: true,
      data: scored,
      transporterInfo: {
        vehicleType: transporter.vehicle_type,
        capacity: transporter.capacity,
        rates: transporter.rates,
      },
    });
  } catch (error) {
    logger.error('Error finding available cargo:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Send transport request to transporter
// @route   POST /api/matching/request
// @access  Private
exports.sendTransportRequest = async (req, res) => {
  try {
    const { transporterId, cargoId, proposedPrice, notes } = req.body;

    if (!transporterId || !cargoId) {
      return res.status(400).json({
        success: false,
        error: 'Transporter ID and Cargo ID required',
      });
    }

    // Verify cargo exists and belongs to user
    const cargo = await Crop.findById(cargoId).populate('farmerId');

    if (!cargo) {
      return res.status(404).json({
        success: false,
        error: 'Cargo not found',
      });
    }

    if (cargo.farmerId._id.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You can only request transport for your own cargo',
      });
    }

    // Verify transporter exists
    const transporter = await Transporter.findById(transporterId);

    if (!transporter) {
      return res.status(404).json({
        success: false,
        error: 'Transporter not found',
      });
    }

    // Check if request already exists
    const existingRequest = await Order.findOne({
      cropId: cargoId,
      transporterId: transporter.userId,
      status: { $in: ['pending', 'accepted'] },
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        error: 'Request already sent to this transporter',
      });
    }

    // Create request/order
    const order = new Order({
      cropId: cargoId,
      farmerId: req.user.id,
      buyerId: req.user.id,
      transporterId: transporter.userId,
      quantity: cargo.quantity,
      totalPrice: proposedPrice || cargo.quantity * cargo.pricePerUnit,
      status: 'pending',
      pickupLocation: cargo.location,
      deliveryLocation: cargo.location,
    });

    // Add notes to metadata if provided
    if (notes) {
      order.metadata = { notes };
    }

    await order.save();

    logger.info(`Transport request sent: ${order._id}`);

    res.status(201).json({
      success: true,
      data: await order.populate('cropId').populate('transporterId', 'name phone'),
      message: 'Transport request sent to transporter',
    });
  } catch (error) {
    logger.error('Error sending transport request:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get pending requests for transporter
// @route   GET /api/matching/pending-requests
// @access  Private (Transporter only)
exports.getPendingRequests = async (req, res) => {
  try {
    if (req.user.role !== 'transporter') {
      return res.status(403).json({
        success: false,
        error: 'Only transporters can view pending requests',
      });
    }

    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const requests = await Order.find({
      transporterId: req.user.id,
      status: 'pending',
    })
      .populate('cropId')
      .populate('farmerId', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments({
      transporterId: req.user.id,
      status: 'pending',
    });

    res.json({
      success: true,
      data: requests,
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

// @desc    Accept transport request
// @route   POST /api/matching/accept/:requestId
// @access  Private (Transporter only)
exports.acceptRequest = async (req, res) => {
  try {
    const order = await Order.findById(req.params.requestId)
      .populate('cropId')
      .populate('farmerId');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Request not found',
      });
    }

    if (order.transporterId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to accept this request',
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Request cannot be accepted. Current status: ${order.status}`,
      });
    }

    order.status = 'accepted';
    await order.save();

    // Update cargo status
    await Crop.findByIdAndUpdate(order.cropId._id, { status: 'matched' });

    logger.info(`Transport request accepted: ${req.params.requestId}`);

    res.json({
      success: true,
      data: order,
      message: 'Transport request accepted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Reject transport request
// @route   POST /api/matching/reject/:requestId
// @access  Private (Transporter only)
exports.rejectRequest = async (req, res) => {
  try {
    const { reason } = req.body;

    const order = await Order.findById(req.params.requestId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Request not found',
      });
    }

    if (order.transporterId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to reject this request',
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Request cannot be rejected. Current status: ${order.status}`,
      });
    }

    order.status = 'cancelled';
    if (reason) {
      order.metadata = { rejectionReason: reason };
    }
    await order.save();

    logger.info(`Transport request rejected: ${req.params.requestId}`);

    res.json({
      success: true,
      data: order,
      message: 'Transport request rejected',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get matching statistics
// @route   GET /api/matching/stats
// @access  Public
exports.getStats = async (req, res) => {
  try {
    const totalCargo = await Crop.countDocuments({ status: 'listed' });
    const totalAvailableTransporters = await Transporter.countDocuments({ available: true });
    const pendingRequests = await Order.countDocuments({ status: 'pending' });
    const acceptedRequests = await Order.countDocuments({ status: 'accepted' });
    const completedTrips = await Order.countDocuments({ status: 'completed' });

    res.json({
      success: true,
      data: {
        totalCargo,
        totalAvailableTransporters,
        pendingRequests,
        acceptedRequests,
        completedTrips,
        successRate: completedTrips > 0
          ? ((completedTrips / (completedTrips + pendingRequests + acceptedRequests)) * 100).toFixed(1)
          : 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};