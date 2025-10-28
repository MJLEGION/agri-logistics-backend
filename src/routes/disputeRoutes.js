const express = require('express');
const router = express.Router();
const disputeController = require('../controllers/disputeController');
const auth = require('../middleware/auth');

// POST routes
router.post('/', auth, disputeController.raiseDispute);

// GET routes - specific routes before generic /:id route
router.get('/my-disputes', auth, disputeController.getMyDisputes);
router.get('/open', auth, disputeController.getOpenDisputes);
router.get('/status/:status', auth, disputeController.getDisputesByStatus);
router.get('/escrow/:escrowId', auth, disputeController.getDisputesByEscrow);

// GET dispute by ID
router.get('/:disputeId', auth, disputeController.getDisputeById);

// PUT routes
router.put('/:disputeId/review', auth, disputeController.reviewDispute);
router.put('/:disputeId/resolve', auth, disputeController.resolveDispute);
router.put('/:disputeId/close', auth, disputeController.closeDispute);

module.exports = router;