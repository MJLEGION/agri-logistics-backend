const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');

// POST routes
router.post('/initiate', protect, transactionController.initiatePayment);

// GET routes - specific routes before generic /:id route
router.get('/my-transactions', protect, transactionController.getMyTransactions);
router.get('/stats', protect, transactionController.getTransactionStats);

// GET all transactions (admin)
router.get('/', protect, transactionController.getAllTransactions);

// POST routes for specific transaction operations
router.post('/:transactionId/process', protect, transactionController.processPayment);
router.post('/:transactionId/confirm', protect, transactionController.confirmPayment);
router.post('/:transactionId/cancel', protect, transactionController.cancelPayment);

// GET transaction by ID
router.get('/:transactionId', protect, transactionController.getTransactionById);

// PUT routes
router.put('/:transactionId/status', protect, transactionController.updateTransactionStatus);

module.exports = router;