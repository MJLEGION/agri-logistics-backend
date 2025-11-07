const express = require('express');
const router = express.Router();
const escrowController = require('../controllers/escrowController');
const { protect } = require('../middleware/auth');

// POST routes
router.post('/', protect, escrowController.createEscrow);
router.post('/auto-release', escrowController.autoReleaseEscrows);

// GET routes - specific routes before generic /:id route
router.get('/my-escrows', protect, escrowController.getMyEscrows);
router.get('/stats', protect, escrowController.getEscrowStats);
router.get('/transaction/:transactionId', protect, escrowController.getEscrowByTransaction);

// GET all escrows
router.get('/', protect, escrowController.getAllEscrows);

// GET escrow by ID
router.get('/:escrowId', protect, escrowController.getEscrowById);

// PUT routes
router.put('/:escrowId/release', protect, escrowController.releaseEscrow);
router.put('/:escrowId/refund', protect, escrowController.refundEscrow);
router.put('/:escrowId/dispute', protect, escrowController.disputeEscrow);

module.exports = router;