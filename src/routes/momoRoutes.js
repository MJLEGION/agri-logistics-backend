const express = require('express');
const router = express.Router();
const momoController = require('../controllers/momoController');
const auth = require('../middleware/auth');

/**
 * MoMo Payment Routes
 * Base URL: /api/payments/momo
 */

// @route   POST /api/payments/momo/request
// @desc    Initiate MoMo payment request
// @access  Private
router.post('/request', auth, momoController.initiatePaymentRequest);

// @route   GET /api/payments/momo/status/:referenceId
// @desc    Check MoMo payment status
// @access  Private
router.get('/status/:referenceId', auth, momoController.checkPaymentStatus);

// @route   POST /api/payments/momo/confirm
// @desc    Confirm MoMo payment
// @access  Private
router.post('/confirm', auth, momoController.confirmPayment);

// @route   POST /api/payments/momo/payout
// @desc    Request payout to MoMo account
// @access  Private
router.post('/payout', auth, momoController.requestPayout);

// @route   POST /api/payments/momo/callback
// @desc    Handle MoMo webhook callbacks
// @access  Public (signature validation should be added)
router.post('/callback', momoController.handleCallback);

// @route   GET /api/payments/momo/config
// @desc    Get MoMo service configuration (admin only)
// @access  Private (Admin)
router.get('/config', auth, momoController.getConfig);

module.exports = router;