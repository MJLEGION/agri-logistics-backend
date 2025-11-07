const Transaction = require('../models/transaction');
const Order = require('../models/order');
const Wallet = require('../models/wallet');
const Escrow = require('../models/escrow');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * PAYMENT CONTROLLER
 * Handles payment initiation, verification, and status checks
 */

// @desc    Initiate payment
// @route   POST /api/payments/initiate
// @access  Private
exports.initiatePayment = async (req, res) => {
  try {
    const {
      amount,
      phoneNumber,
      orderId,
      email,
      firstName,
      lastName,
      currency,
      paymentMethod,
    } = req.body;

    // Validation
    if (!amount || !phoneNumber || !orderId || !email || !paymentMethod) {
      return res.status(400).json({
        success: false,
        status: 'failed',
        message: 'Missing required fields: amount, phoneNumber, orderId, email, paymentMethod',
      });
    }

    // Amount validation
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        status: 'failed',
        message: 'Amount must be a positive number',
      });
    }

    // Payment method validation
    const validMethods = ['momo', 'airtel', 'bank', 'card'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        status: 'failed',
        message: `Invalid payment method. Use one of: ${validMethods.join(', ')}`,
      });
    }

    // Verify order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Generate unique references
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const paymentReference = `PAY_${orderId}_${timestamp}_${random}`;
    const transactionId = uuidv4();

    logger.info('💳 Processing payment request:', {
      amount,
      phone: phoneNumber,
      method: paymentMethod,
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
      currency: currency || 'RWF',
      paymentMethod,
      status: 'INITIATED',
      paymentReference,
      metadata: {
        initiatedAt: new Date(),
        email,
        customerName: `${firstName || ''} ${lastName || ''}`.trim(),
        phoneNumber,
      },
    });

    await transaction.save();

    logger.info('💾 Transaction created:', transaction._id);

    res.status(200).json({
      success: true,
      status: 'pending',
      data: {
        transactionId: transaction._id,
        paymentReference,
        amount,
        currency: currency || 'RWF',
        paymentMethod,
      },
      message: 'Payment initiated successfully. Please check your phone for a payment prompt.',
    });
  } catch (error) {
    logger.error('❌ Payment Initiation Error:', error);
    res.status(500).json({
      success: false,
      status: 'failed',
      error: error.message,
    });
  }
};

// @desc    Check payment status
// @route   GET /api/payments/:id
// @access  Private
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Payment ID or reference required',
      });
    }

    logger.info('🔍 Checking payment status for:', id);

    // Find transaction by ID or reference
    let transaction = await Transaction.findById(id);
    if (!transaction) {
      transaction = await Transaction.findOne({ paymentReference: id });
    }

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    // Auto-complete payment after 3 seconds (for demo purposes)
    const timeSinceCreation = Date.now() - transaction.createdAt.getTime();
    const autoCompleteAfterMs = 3000;

    if (timeSinceCreation > autoCompleteAfterMs && transaction.status === 'INITIATED') {
      transaction.status = 'PAYMENT_CONFIRMED';
      transaction.metadata.confirmedAt = new Date();
      await transaction.save();
      logger.info('✅ Payment auto-confirmed:', id);
    }

    res.json({
      success: true,
      data: {
        transactionId: transaction._id,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        paymentMethod: transaction.paymentMethod,
        createdAt: transaction.createdAt,
      },
      message: `Payment status: ${transaction.status}`,
    });
  } catch (error) {
    logger.error('Error checking payment status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Confirm payment
// @route   POST /api/payments/confirm
// @access  Private
exports.confirmPayment = async (req, res) => {
  try {
    const { transactionId, orderId } = req.body;

    if (!transactionId || !orderId) {
      return res.status(400).json({
        success: false,
        error: 'Transaction ID and Order ID required',
      });
    }

    logger.info('🔐 Confirming payment:', { transactionId, orderId });

    // Find transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    // Verify transaction is in correct state
    if (transaction.status !== 'PAYMENT_CONFIRMED' && transaction.status !== 'INITIATED') {
      return res.status(400).json({
        success: false,
        error: `Payment cannot be confirmed. Current status: ${transaction.status}`,
      });
    }

    // Update transaction status
    transaction.status = 'PAYMENT_CONFIRMED';
    transaction.metadata.confirmedAt = new Date();
    await transaction.save();

    // Update order status
    await Order.findByIdAndUpdate(orderId, { status: 'accepted' });

    logger.info('✅ Payment confirmed:', transactionId);

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
    logger.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get payment history
// @route   GET /api/payments/history
// @access  Private
exports.getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const filter = { $or: [{ farmerId: req.user.id }, { transporterId: req.user.id }] };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await Transaction.find(filter)
      .populate('orderId')
      .populate('farmerId', 'name phone')
      .populate('transporterId', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(filter);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get payment details
// @route   GET /api/payments/:id/details
// @access  Private
exports.getPaymentDetails = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('orderId')
      .populate('farmerId', 'name phone')
      .populate('transporterId', 'name phone')
      .populate('escrowId');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Refund payment
// @route   POST /api/payments/:id/refund
// @access  Private (Admin only)
exports.refundPayment = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can process refunds',
      });
    }

    const { reason } = req.body;

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    if (!['PAYMENT_CONFIRMED', 'ESCROW_HELD'].includes(transaction.status)) {
      return res.status(400).json({
        success: false,
        error: 'Payment cannot be refunded in current status',
      });
    }

    transaction.status = 'REFUNDED';
    transaction.metadata.refundReason = reason;
    transaction.metadata.refundedAt = new Date();
    await transaction.save();

    logger.info(`Payment refunded: ${req.params.id}`, { reason });

    res.json({
      success: true,
      data: transaction,
      message: 'Payment refunded successfully',
    });
  } catch (error) {
    logger.error('Error refunding payment:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get earnings/wallet balance
// @route   GET /api/payments/earnings
// @access  Private
exports.getEarnings = async (req, res) => {
  try {
    // Calculate total earnings from completed trips
    const earnings = await Transaction.aggregate([
      {
        $match: {
          transporterId: req.user._id,
          status: 'COMPLETED',
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$amount' },
          completedPayments: { $sum: 1 },
        },
      },
    ]);

    const data = earnings[0] || { totalEarnings: 0, completedPayments: 0 };

    res.json({
      success: true,
      data: {
        totalEarnings: data.totalEarnings,
        completedPayments: data.completedPayments,
        pendingPayments: await Transaction.countDocuments({
          transporterId: req.user._id,
          status: { $in: ['INITIATED', 'PAYMENT_PROCESSING'] },
        }),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @deprecated Use initiatePayment instead
exports.initiatePaymentOld = exports.initiatePayment;

// @deprecated Use checkPaymentStatus instead
exports.checkPaymentStatusOld = exports.checkPaymentStatus;

// @deprecated Use confirmPayment instead
exports.confirmPaymentOld = exports.confirmPayment;