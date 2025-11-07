const Transaction = require('../models/transaction');
const Order = require('../models/order');
const momoService = require('../services/momoService');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * MOMO PAYMENT CONTROLLER
 * Handles MTN MoMo payment operations
 */

/**
 * @desc    Initiate MoMo payment request
 * @route   POST /api/payments/momo/request
 * @access  Private
 */
exports.initiatePaymentRequest = async (req, res) => {
  try {
    const {
      amount,
      phoneNumber,
      orderId,
      email,
      firstName,
      lastName,
      currency = 'RWF',
    } = req.body;

    // Validation
    if (!amount || !phoneNumber || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: amount, phoneNumber, orderId',
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number',
      });
    }

    // Verify order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Generate unique reference
    const externalId = `MOMO_${orderId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('📱 Processing MoMo payment request:', {
      amount,
      phone: phoneNumber,
      orderId,
    });

    // Create transaction record
    const transaction = new Transaction({
      orderId,
      farmerId: order.farmerId,
      transporterId: order.transporterId,
      cropId: order.cropId,
      cargoDescription: `Order #${orderId}`,
      pickupLocation: order.pickupLocation?.address || 'TBD',
      dropoffLocation: order.deliveryLocation?.address || 'TBD',
      pickupTime: new Date(),
      estimatedDeliveryTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      amount: parseFloat(amount),
      currency: currency,
      paymentMethod: 'momo',
      status: 'INITIATED',
      paymentReference: externalId,
      metadata: {
        initiatedAt: new Date(),
        email,
        customerName: `${firstName || ''} ${lastName || ''}`.trim(),
        phoneNumber,
        momoProvider: 'MTN',
      },
    });

    await transaction.save();
    logger.info('💾 Transaction created:', transaction._id);

    // Call MoMo service to initiate payment
    const momoPayment = await momoService.initiatePaymentRequest({
      amount: parseFloat(amount),
      phoneNumber: phoneNumber,
      externalId: externalId,
      payerMessage: `Payment for Order #${orderId}`,
      payeeNote: 'Agri-Logistics payment',
    });

    res.status(200).json({
      success: true,
      status: 'pending',
      data: {
        transactionId: transaction._id,
        referenceId: momoPayment.referenceId,
        amount: momoPayment.amount,
        currency: momoPayment.currency || currency,
        phoneNumber: momoPayment.phoneNumber,
        timestamp: momoPayment.timestamp,
      },
      message: 'MoMo payment request sent successfully. Please check your phone for a payment prompt.',
    });
  } catch (error) {
    logger.error('❌ MoMo Payment Request Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate MoMo payment',
      error: error.message,
    });
  }
};

/**
 * @desc    Check MoMo payment status
 * @route   GET /api/payments/momo/status/:referenceId
 * @access  Private
 */
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { referenceId } = req.params;

    if (!referenceId) {
      return res.status(400).json({
        success: false,
        message: 'Reference ID is required',
      });
    }

    logger.info('🔍 Checking MoMo payment status:', referenceId);

    // Find transaction by reference
    const transaction = await Transaction.findOne({ paymentReference: referenceId });
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Check status with MoMo API
    const momoStatus = await momoService.checkPaymentStatus(referenceId);

    // Update transaction status if payment is confirmed
    if (momoStatus.status === 'PAYMENT_CONFIRMED' && transaction.status !== 'PAYMENT_CONFIRMED') {
      transaction.status = 'PAYMENT_CONFIRMED';
      transaction.metadata = {
        ...transaction.metadata,
        confirmedAt: new Date(),
        financialTransactionId: momoStatus.financialTransactionId,
      };
      await transaction.save();
      logger.info('✅ Payment confirmed:', referenceId);
    }

    res.json({
      success: true,
      data: {
        transactionId: transaction._id,
        referenceId: momoStatus.referenceId,
        status: momoStatus.status,
        amount: momoStatus.amount,
        phoneNumber: momoStatus.phoneNumber,
        financialTransactionId: momoStatus.financialTransactionId,
      },
      message: `Payment status: ${momoStatus.status}`,
    });
  } catch (error) {
    logger.error('❌ Error checking MoMo payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status',
      error: error.message,
    });
  }
};

/**
 * @desc    Confirm MoMo payment
 * @route   POST /api/payments/momo/confirm
 * @access  Private
 */
exports.confirmPayment = async (req, res) => {
  try {
    const { transactionId, orderId, referenceId } = req.body;

    if (!transactionId || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID and Order ID required',
      });
    }

    logger.info('🔐 Confirming MoMo payment:', { transactionId, orderId });

    // Find transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    // Verify payment status with MoMo API if reference is provided
    if (referenceId) {
      const momoStatus = await momoService.checkPaymentStatus(referenceId);
      if (momoStatus.status !== 'PAYMENT_CONFIRMED') {
        return res.status(400).json({
          success: false,
          message: `Payment status is ${momoStatus.status}, cannot confirm`,
        });
      }
    }

    // Verify transaction is in correct state
    if (!['PAYMENT_CONFIRMED', 'INITIATED', 'PENDING'].includes(transaction.status)) {
      return res.status(400).json({
        success: false,
        message: `Payment cannot be confirmed. Current status: ${transaction.status}`,
      });
    }

    // Update transaction status
    transaction.status = 'PAYMENT_CONFIRMED';
    transaction.metadata.confirmedAt = new Date();
    await transaction.save();

    // Update order status
    await Order.findByIdAndUpdate(orderId, { status: 'accepted' });

    logger.info('✅ MoMo payment confirmed:', transactionId);

    res.json({
      success: true,
      data: {
        transactionId: transaction._id,
        status: transaction.status,
        amount: transaction.amount,
      },
      message: 'Payment confirmed successfully',
    });
  } catch (error) {
    logger.error('❌ Error confirming MoMo payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      error: error.message,
    });
  }
};

/**
 * @desc    Request payout to user (for transporters/farmers)
 * @route   POST /api/payments/momo/payout
 * @access  Private
 */
exports.requestPayout = async (req, res) => {
  try {
    const {
      amount,
      phoneNumber,
      externalId = uuidv4(),
      reason = 'Earnings payout',
    } = req.body;

    // Validation
    if (!amount || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: amount, phoneNumber',
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number',
      });
    }

    logger.info('💸 Processing MoMo payout request:', {
      amount,
      phone: phoneNumber,
    });

    // Create payout record
    const payout = {
      userId: req.user._id,
      amount: parseFloat(amount),
      phoneNumber: phoneNumber,
      status: 'INITIATED',
      externalId: externalId,
      reason: reason,
      requestedAt: new Date(),
    };

    // Call MoMo service for payout
    const momoPayout = await momoService.initiatePayoutRequest({
      amount: parseFloat(amount),
      phoneNumber: phoneNumber,
      externalId: externalId,
      payeeNote: reason,
    });

    logger.info('✅ MoMo payout initiated:', momoPayout.referenceId);

    res.status(200).json({
      success: true,
      data: {
        referenceId: momoPayout.referenceId,
        amount: momoPayout.amount,
        phoneNumber: momoPayout.phoneNumber,
        status: momoPayout.status,
        timestamp: momoPayout.timestamp,
      },
      message: 'Payout request sent successfully',
    });
  } catch (error) {
    logger.error('❌ MoMo Payout Request Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payout',
      error: error.message,
    });
  }
};

/**
 * @desc    Handle MoMo webhook callbacks
 * @route   POST /api/payments/momo/callback
 * @access  Public (should be protected with signature validation in production)
 */
exports.handleCallback = async (req, res) => {
  try {
    logger.info('📨 MoMo callback received:', req.body);

    const { referenceId, status, amount, externalId } = req.body;

    if (!referenceId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required callback data',
      });
    }

    // Find transaction by reference
    const transaction = await Transaction.findOne({ paymentReference: referenceId });
    if (!transaction) {
      logger.warn('⚠️  Transaction not found for callback:', referenceId);
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    // Update transaction based on callback status
    if (status === 'SUCCESSFUL') {
      transaction.status = 'PAYMENT_CONFIRMED';
      transaction.metadata = {
        ...transaction.metadata,
        callbackReceivedAt: new Date(),
        callbackData: req.body,
      };
      await transaction.save();
      logger.info('✅ Payment confirmed via callback:', referenceId);
    } else if (status === 'FAILED') {
      transaction.status = 'FAILED';
      transaction.metadata = {
        ...transaction.metadata,
        failureReason: req.body.reason || 'Payment failed',
        callbackReceivedAt: new Date(),
      };
      await transaction.save();
      logger.warn('❌ Payment failed via callback:', referenceId);
    }

    res.json({
      success: true,
      message: 'Callback processed successfully',
    });
  } catch (error) {
    logger.error('❌ Error handling MoMo callback:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * @desc    Get MoMo service configuration status
 * @route   GET /api/payments/momo/config
 * @access  Private (Admin only)
 */
exports.getConfig = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view MoMo configuration',
      });
    }

    const config = momoService.getConfig();

    res.json({
      success: true,
      data: config,
      message: 'MoMo configuration retrieved',
    });
  } catch (error) {
    logger.error('Error fetching MoMo config:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};