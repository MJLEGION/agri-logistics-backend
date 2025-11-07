const express = require('express');
const router = express.Router();
const matchingController = require('../controllers/matchingController');
const { protect, authorize } = require('../middleware/auth');

/**
 * MATCHING ROUTES
 * All cargo-transporter matching endpoints
 */

// POST find matching transporters for cargo (protected)
router.post('/find', protect, matchingController.findMatchingTransporters);

// GET available cargo for transporter (protected, transporters only)
router.get('/available-cargo', protect, authorize('transporter'), matchingController.findAvailableCargo);

// GET pending requests for transporter (protected, transporters only)
router.get('/pending-requests', protect, authorize('transporter'), matchingController.getPendingRequests);

// GET matching statistics (public)
router.get('/stats', matchingController.getStats);

// POST send transport request (protected)
router.post('/request', protect, matchingController.sendTransportRequest);

// POST accept request (protected, transporters only)
router.post('/accept/:requestId', protect, authorize('transporter'), matchingController.acceptRequest);

// POST reject request (protected, transporters only)
router.post('/reject/:requestId', protect, authorize('transporter'), matchingController.rejectRequest);

module.exports = router;