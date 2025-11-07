const express = require('express');
const router = express.Router();
const transporterController = require('../controllers/transporterController');
const { protect, authorize } = require('../middleware/auth');

/**
 * TRANSPORTER ROUTES
 * All transporter profile and management endpoints
 */

// Profile endpoints (must come before /:id to avoid conflicts)

// GET my profile (protected)
router.get('/profile/me', protect, transporterController.getMyProfile);

// POST create/update my profile (protected, transporters only)
router.post('/profile/me', protect, authorize('transporter'), transporterController.createOrUpdateProfile);

// General endpoints

// GET all transporters
router.get('/', transporterController.getAll);

// GET available transporters
router.get('/available', transporterController.getAvailable);

// GET transporter by ID
router.get('/:id', transporterController.getById);

// GET transporter completed deliveries
router.get('/:id/deliveries', transporterController.getCompletedDeliveries);

// GET transporter active trips (protected)
router.get('/:id/active-trips', protect, transporterController.getActiveTrips);

// GET transporter statistics
router.get('/:id/stats', transporterController.getStats);

// PUT update transporter profile (protected, owner only)
router.put('/:id', protect, transporterController.update);

// PUT toggle availability (protected, owner only)
router.put('/:id/availability', protect, transporterController.toggleAvailability);

module.exports = router;