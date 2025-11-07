const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { protect, authorize } = require('../middleware/auth');

/**
 * LOCATION ROUTES
 * All location-based and real-time tracking endpoints
 */

// GET nearby cargo for transporter (protected)
router.get('/nearby-cargo', protect, locationController.findNearbyCargo);

// GET nearby transporters for cargo (protected)
router.get('/nearby-transporters', protect, locationController.findNearbyTransporters);

// GET nearby orders (protected)
router.get('/nearby-orders', protect, locationController.findNearbyOrders);

// POST update real-time location (protected, transporters only)
router.post('/update-location', protect, authorize('transporter'), locationController.updateLocation);

// GET location history for transporter (protected)
router.get('/history/:transporterId', protect, locationController.getLocationHistory);

// GET active real-time locations (protected)
router.get('/active', protect, locationController.getActiveLocations);

// POST calculate distance between two points (public)
router.post('/distance', locationController.calculateDistance);

// GET bounding box for map view (public)
router.get('/bounds', locationController.getBounds);

// POST stop tracking location (protected, transporters only)
router.post('/stop-tracking', protect, authorize('transporter'), locationController.stopTracking);

// POST search cargo by location (protected)
router.post('/search-cargo', protect, locationController.searchCargo);

module.exports = router;