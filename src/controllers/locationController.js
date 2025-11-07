const Crop = require('../models/crop');
const Order = require('../models/order');
const Transporter = require('../models/transporter');
const LocationTracking = require('../models/locationTracking');
const geospatialService = require('../services/geospatialService');
const logger = require('../config/logger');

/**
 * LOCATION CONTROLLER
 * Handles all location-based queries and real-time tracking
 */

// @desc    Find nearby cargo for a transporter
// @route   GET /api/location/nearby-cargo
// @access  Private
exports.findNearbyCargo = async (req, res) => {
  try {
    const { latitude, longitude, radiusKm = 50, limit = 20 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    geospatialService.validateCoordinates(parseFloat(latitude), parseFloat(longitude));

    // Find nearby listed cargo
    const cargo = await Crop.find({
      status: 'listed',
      coordinates: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseFloat(radiusKm) * 1000 // Convert to meters
        }
      }
    })
      .populate('farmerId', 'name phone')
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Calculate distance for each cargo
    const cargoWithDistance = cargo.map(c => ({
      ...c.toObject(),
      distance: geospatialService.calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        c.location.latitude,
        c.location.longitude
      )
    }));

    res.json({
      success: true,
      count: cargoWithDistance.length,
      data: cargoWithDistance
    });
  } catch (error) {
    logger.error('Error finding nearby cargo:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Find nearby transporters for cargo
// @route   GET /api/location/nearby-transporters
// @access  Private
exports.findNearbyTransporters = async (req, res) => {
  try {
    const { latitude, longitude, radiusKm = 50, limit = 10, minRating = 0 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    geospatialService.validateCoordinates(parseFloat(latitude), parseFloat(longitude));

    // Find nearby available transporters
    const transporters = await Transporter.find({
      available: true,
      rating: { $gte: parseFloat(minRating) },
      coordinates: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseFloat(radiusKm) * 1000 // Convert to meters
        }
      }
    })
      .populate('userId', 'name phone')
      .limit(parseInt(limit))
      .sort({ rating: -1 });

    // Calculate distance and ETA for each transporter
    const transportersWithDistance = transporters.map(t => {
      const currentLoc = t.currentLocation || { latitude: 0, longitude: 0 };
      const distance = geospatialService.calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        currentLoc.latitude || 0,
        currentLoc.longitude || 0
      );

      return {
        ...t.toObject(),
        distance,
        estimatedMinutes: geospatialService.calculateETA(distance)
      };
    });

    res.json({
      success: true,
      count: transportersWithDistance.length,
      data: transportersWithDistance
    });
  } catch (error) {
    logger.error('Error finding nearby transporters:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update transporter real-time location
// @route   POST /api/location/update-location
// @access  Private (Transporter only)
exports.updateLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, address = '', accuracy = 0, speed = 0, heading = 0, orderId = null } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    geospatialService.validateCoordinates(latitude, longitude);

    // Find transporter
    const transporter = await Transporter.findOne({ userId });
    if (!transporter) {
      return res.status(404).json({
        success: false,
        error: 'Transporter profile not found'
      });
    }

    // Update transporter location
    transporter.currentLocation = {
      latitude,
      longitude,
      address,
      lastUpdated: new Date()
    };
    await transporter.save();

    // Create location tracking entry
    const tracking = await LocationTracking.create({
      transporterId: transporter._id,
      userId,
      orderId: orderId || null,
      coordinates: geospatialService.toGeoJSON(latitude, longitude),
      latitude,
      longitude,
      address,
      accuracy,
      speed,
      heading,
      tripStatus: orderId ? 'in_transit' : 'arrived',
      isActive: true
    });

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        transporterId: transporter._id,
        location: transporter.currentLocation,
        tracking: tracking
      }
    });
  } catch (error) {
    logger.error('Error updating location:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get transporter location history
// @route   GET /api/location/history/:transporterId
// @access  Private
exports.getLocationHistory = async (req, res) => {
  try {
    const { transporterId } = req.params;
    const { orderId = null, limit = 100, offset = 0 } = req.query;

    const filter = { transporterId };
    if (orderId) filter.orderId = orderId;

    const history = await LocationTracking.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await LocationTracking.countDocuments(filter);

    res.json({
      success: true,
      count: history.length,
      total,
      data: history
    });
  } catch (error) {
    logger.error('Error fetching location history:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get current active locations (real-time tracking)
// @route   GET /api/location/active
// @access  Private
exports.getActiveLocations = async (req, res) => {
  try {
    const { orderId = null, limit = 50 } = req.query;

    const filter = {
      isActive: true,
      tripStatus: { $in: ['in_transit', 'arrived'] }
    };

    if (orderId) filter.orderId = orderId;

    const locations = await LocationTracking.find(filter)
      .populate('transporterId', 'name phone vehicle_type')
      .populate('userId', 'name phone')
      .limit(parseInt(limit))
      .sort({ timestamp: -1 });

    res.json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (error) {
    logger.error('Error fetching active locations:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Calculate distance between two points
// @route   POST /api/location/distance
// @access  Public
exports.calculateDistance = async (req, res) => {
  try {
    const { lat1, lon1, lat2, lon2 } = req.body;

    if (!lat1 || !lon1 || !lat2 || !lon2) {
      return res.status(400).json({
        success: false,
        error: 'All coordinates are required'
      });
    }

    geospatialService.validateCoordinates(lat1, lon1);
    geospatialService.validateCoordinates(lat2, lon2);

    const distance = geospatialService.calculateDistance(lat1, lon1, lat2, lon2);
    const bearing = geospatialService.calculateBearing(lat1, lon1, lat2, lon2);
    const eta = geospatialService.calculateETA(distance);

    res.json({
      success: true,
      data: {
        distance: distance,
        unit: 'km',
        bearing: bearing,
        estimatedMinutes: eta
      }
    });
  } catch (error) {
    logger.error('Error calculating distance:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Find orders near location
// @route   GET /api/location/nearby-orders
// @access  Private
exports.findNearbyOrders = async (req, res) => {
  try {
    const { latitude, longitude, radiusKm = 50, limit = 20, status = 'pending' } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    geospatialService.validateCoordinates(parseFloat(latitude), parseFloat(longitude));

    // Find orders with pickup location near the specified point
    const orders = await Order.find({
      status,
      pickupCoordinates: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseFloat(radiusKm) * 1000
        }
      }
    })
      .populate('cropId', 'name quantity unit')
      .populate('farmerId', 'name phone')
      .populate('buyerId', 'name phone')
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Add distance information
    const ordersWithDistance = orders.map(order => ({
      ...order.toObject(),
      pickupDistance: geospatialService.calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        order.pickupLocation.latitude,
        order.pickupLocation.longitude
      ),
      deliveryDistance: geospatialService.calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        order.deliveryLocation.latitude,
        order.deliveryLocation.longitude
      )
    }));

    res.json({
      success: true,
      count: ordersWithDistance.length,
      data: ordersWithDistance
    });
  } catch (error) {
    logger.error('Error finding nearby orders:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get bounding box for map view
// @route   GET /api/location/bounds
// @access  Public
exports.getBounds = async (req, res) => {
  try {
    const { latitude, longitude, radiusKm = 10 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    geospatialService.validateCoordinates(parseFloat(latitude), parseFloat(longitude));

    const bounds = geospatialService.getBoundingBox(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radiusKm)
    );

    res.json({
      success: true,
      data: bounds
    });
  } catch (error) {
    logger.error('Error getting bounds:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Stop tracking location
// @route   POST /api/location/stop-tracking
// @access  Private (Transporter only)
exports.stopTracking = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId = null } = req.body;

    // Find active tracking entries
    const filter = { userId, isActive: true };
    if (orderId) filter.orderId = orderId;

    // Mark as inactive
    const result = await LocationTracking.updateMany(filter, { isActive: false });

    res.json({
      success: true,
      message: `Stopped tracking for ${result.modifiedCount} record(s)`,
      data: result
    });
  } catch (error) {
    logger.error('Error stopping tracking:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Search cargo by location
// @route   POST /api/location/search-cargo
// @access  Private
exports.searchCargo = async (req, res) => {
  try {
    const { latitude, longitude, radiusKm = 50, minPrice, maxPrice, limit = 20 } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    geospatialService.validateCoordinates(latitude, longitude);

    // Build filter
    const filter = {
      status: 'listed',
      coordinates: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: radiusKm * 1000
        }
      }
    };

    if (minPrice || maxPrice) {
      filter.pricePerUnit = {};
      if (minPrice) filter.pricePerUnit.$gte = parseFloat(minPrice);
      if (maxPrice) filter.pricePerUnit.$lte = parseFloat(maxPrice);
    }

    const cargo = await Crop.find(filter)
      .populate('farmerId', 'name phone')
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const cargoWithDistance = cargo.map(c => ({
      ...c.toObject(),
      distance: geospatialService.calculateDistance(
        latitude,
        longitude,
        c.location.latitude,
        c.location.longitude
      )
    })).sort((a, b) => a.distance - b.distance);

    res.json({
      success: true,
      count: cargoWithDistance.length,
      data: cargoWithDistance
    });
  } catch (error) {
    logger.error('Error searching cargo:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = exports;