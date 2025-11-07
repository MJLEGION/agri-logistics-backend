const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const { protect, authorize } = require('../middleware/auth');

/**
 * TRIP ROUTES
 * All trip management endpoints
 */

// GET all trips with pagination
router.get('/', protect, tripController.getAll);

// GET available trips (no auth needed)
router.get('/available', tripController.getAvailable);

// GET transporter's trips
router.get('/transporter/:transporterId', protect, tripController.getByTransporter);

// GET trip by ID
router.get('/:id', protect, tripController.getById);

// CREATE new trip (protected, transporters only)
router.post('/', protect, authorize('transporter'), tripController.create);

// ACCEPT trip (protected, transporters only)
router.post('/:id/accept', protect, authorize('transporter'), tripController.acceptTrip);

// START trip (protected, transporter only)
router.put('/:id/start', protect, authorize('transporter'), tripController.startTrip);

// COMPLETE trip (protected, transporter only)
router.put('/:id/complete', protect, authorize('transporter'), tripController.completeTrip);

// CANCEL trip (protected, transporter only)
router.put('/:id/cancel', protect, authorize('transporter'), tripController.cancelTrip);

// UPDATE trip location (protected, transporter only)
router.put('/:id/location', protect, authorize('transporter'), tripController.updateLocation);

module.exports = router;