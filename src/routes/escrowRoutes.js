const express = require('express');
const router = express.Router();
const escrowController = require('../controllers/escrowController');
const auth = require('../middleware/auth');

// POST routes
router.post('/', auth, escrowController.createEscrow);
router.post('/auto-release', escrowController.autoReleaseEscrows);

// GET routes - specific routes before generic /:id route
router.get('/my-escrows', auth, escrowController.getMyEscrows);
router.get('/stats', auth, escrowController.getEscrowStats);
router.get('/transaction/:transactionId', auth, escrowController.getEscrowByTransaction);

// GET all escrows
router.get('/', auth, escrowController.getAllEscrows);

// GET escrow by ID
router.get('/:escrowId', auth, escrowController.getEscrowById);

// PUT routes
router.put('/:escrowId/release', auth, escrowController.releaseEscrow);
router.put('/:escrowId/refund', auth, escrowController.refundEscrow);
router.put('/:escrowId/dispute', auth, escrowController.disputeEscrow);

module.exports = router;