const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const auth = require('../middleware/auth');

// POST routes
router.post('/initiate', auth, transactionController.initiatePayment);

// GET routes - specific routes before generic /:id route
router.get('/my-transactions', auth, transactionController.getMyTransactions);
router.get('/stats', auth, transactionController.getTransactionStats);

// GET all transactions (admin)
router.get('/', auth, transactionController.getAllTransactions);

// POST routes for specific transaction operations
router.post('/:transactionId/process', auth, transactionController.processPayment);
router.post('/:transactionId/confirm', auth, transactionController.confirmPayment);
router.post('/:transactionId/cancel', auth, transactionController.cancelPayment);

// GET transaction by ID
router.get('/:transactionId', auth, transactionController.getTransactionById);

// PUT routes
router.put('/:transactionId/status', auth, transactionController.updateTransactionStatus);

module.exports = router;