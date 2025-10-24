const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  initiatePayment,
  checkPaymentStatus,
  verifyPayment
} = require('../controllers/paymentController');

/**
 * ========================================
 * PAYMENT ENDPOINTS (MOCK VERSION FOR DEMO)
 * ========================================
 * 
 * These are mock endpoints that simulate Flutterwave
 * Replace with real Flutterwave integration when you get live keys
 */

// Initiate Payment
router.post('/flutterwave/initiate', protect, initiatePayment);

// Check Payment Status
router.get('/flutterwave/status/:referenceId', protect, checkPaymentStatus);

// Verify Payment
router.post('/flutterwave/verify', protect, verifyPayment);

module.exports = router;