const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const momoController = require('../controllers/momoController');
const { protect, authorize } = require('../middleware/auth');

/**
 * PAYMENT ROUTES
 * All payment processing and verification endpoints
 */

// NEW ENDPOINTS (standardized format)

// POST initiate payment
router.post('/initiate', protect, paymentController.initiatePayment);

// GET payment status
router.get('/:id', protect, paymentController.checkPaymentStatus);

// POST confirm payment
router.post('/confirm', protect, paymentController.confirmPayment);

// GET payment details
router.get('/:id/details', protect, paymentController.getPaymentDetails);

// GET payment history
router.get('/history', protect, paymentController.getPaymentHistory);

// POST refund payment (admin only)
router.post('/:id/refund', protect, authorize('admin'), paymentController.refundPayment);

// GET earnings (transporter only)
router.get('/earnings', protect, authorize('transporter'), paymentController.getEarnings);

// ==========================================
// MoMo Payment Routes (PRIORITY PAYMENT METHOD)
// ==========================================

// POST initiate MoMo payment request
router.post('/momo/request', protect, momoController.initiatePaymentRequest);

// GET MoMo payment status
router.get('/momo/status/:referenceId', protect, momoController.checkPaymentStatus);

// POST confirm MoMo payment
router.post('/momo/confirm', protect, momoController.confirmPayment);

// POST request payout to MoMo
router.post('/momo/payout', protect, momoController.requestPayout);

// POST MoMo webhook callback (public endpoint for MoMo service)
router.post('/momo/callback', momoController.handleCallback);

// GET MoMo configuration (admin only)
router.get('/momo/config', protect, authorize('admin'), momoController.getConfig);

// OLD ENDPOINTS (for backward compatibility)

// @deprecated
router.post('/flutterwave/initiate', protect, paymentController.initiatePaymentOld);
router.get('/flutterwave/status/:referenceId', protect, paymentController.checkPaymentStatusOld);
router.post('/flutterwave/verify', protect, paymentController.confirmPaymentOld);

module.exports = router;