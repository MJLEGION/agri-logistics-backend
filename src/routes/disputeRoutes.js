const express = require('express');
const router = express.Router();
const disputeController = require('../controllers/disputeController');
const { protect } = require('../middleware/auth');

// POST routes
router.post('/', protect, disputeController.raiseDispute);

// GET routes - specific routes before generic /:id route
router.get('/my-disputes', protect, disputeController.getMyDisputes);
router.get('/open', protect, disputeController.getOpenDisputes);
router.get('/status/:status', protect, disputeController.getDisputesByStatus);
router.get('/escrow/:escrowId', protect, disputeController.getDisputesByEscrow);

// GET dispute by ID
router.get('/:disputeId', protect, disputeController.getDisputeById);

// PUT routes
router.put('/:disputeId/review', protect, disputeController.reviewDispute);
router.put('/:disputeId/resolve', protect, disputeController.resolveDispute);
router.put('/:disputeId/close', protect, disputeController.closeDispute);

module.exports = router;