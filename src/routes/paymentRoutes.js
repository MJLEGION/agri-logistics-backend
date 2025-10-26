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

// Standard API endpoints (matching integration guide)
router.post('/initiate', protect, initiatePayment);
router.get('/:id', protect, checkPaymentStatus);
router.post('/confirm', protect, verifyPayment);

// Legacy endpoints (backward compatibility)
router.post('/flutterwave/initiate', protect, initiatePayment);
router.get('/flutterwave/status/:referenceId', protect, checkPaymentStatus);
router.post('/flutterwave/verify', protect, verifyPayment);

module.exports = router;