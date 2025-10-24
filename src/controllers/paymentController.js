const Order = require('../models/order');
const Transaction = require('../models/transaction');

/**
 * PAYMENT MOCK ENDPOINTS
 * These simulate Flutterwave for demo/testing purposes
 * For production, integrate with real Flutterwave API
 */

// @desc    Initiate Payment (Mock)
// @route   POST /api/payments/flutterwave/initiate
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
    if (amount <= 0 || !Number.isInteger(amount)) {
      return res.status(400).json({
        success: false,
        status: 'failed',
        message: 'Amount must be a positive integer',
      });
    }

    // Payment method validation
    if (!['momo', 'airtel'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        status: 'failed',
        message: 'Invalid payment method. Use "momo" or "airtel"',
      });
    }

    console.log('💳 Processing payment request:', {
      amount,
      phone: phoneNumber,
      method: paymentMethod,
      orderId,
    });

    // Generate unique reference
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const referenceId = `FW_${orderId}_${timestamp}_${random}`;
    const flutterwaveId = Math.floor(Math.random() * 1000000);

    console.log('📝 Generated reference ID:', referenceId);

    // Save transaction to database
    try {
      const transaction = await Transaction.create({
        orderId,
        userId: req.userId,
        referenceId,
        flutterwaveId,
        phoneNumber,
        amount,
        currency: currency || 'RWF',
        paymentMethod,
        status: 'pending',
        metadata: { 
          initiatedAt: new Date(),
          email,
          customerName: `${firstName || ''} ${lastName || ''}`.trim()
        },
      });
      console.log('💾 Transaction saved:', transaction._id);
    } catch (dbError) {
      console.warn('⚠️ Failed to save transaction:', dbError.message);
      // Continue anyway - don't block payment if DB fails
    }

    return res.status(200).json({
      success: true,
      status: 'pending',
      referenceId,
      flutterwaveRef: flutterwaveId,
      message: 'Payment initiated successfully. Please check your phone for a payment prompt.',
    });
  } catch (error) {
    console.error('❌ Payment Initiation Error:', error.message);
    return res.status(500).json({
      success: false,
      status: 'failed',
      message: 'Payment service error',
    });
  }
};

// @desc    Check Payment Status (Mock - Auto-completes after 5 seconds)
// @route   GET /api/payments/flutterwave/status/:referenceId
// @access  Private
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { referenceId } = req.params;

    if (!referenceId) {
      return res.status(400).json({
        success: false,
        status: 'failed',
        message: 'Reference ID required',
      });
    }

    console.log('🔍 Checking payment status for:', referenceId);

    // Find transaction in database
    let transaction = await Transaction.findOne({ referenceId });

    if (!transaction) {
      return res.status(200).json({
        success: false,
        status: 'pending',
        referenceId,
        message: 'Payment status not found yet. Please try again.',
      });
    }

    // MOCK: Automatically mark as successful after a few seconds
    const timeSinceCreation = Date.now() - transaction.createdAt.getTime();
    const autoCompleteAfterMs = 3000; // Auto-complete after 3 seconds for demo

    if (timeSinceCreation > autoCompleteAfterMs && transaction.status === 'pending') {
      // Update transaction status
      transaction.status = 'completed';
      transaction.completedAt = new Date();
      await transaction.save();
      
      console.log('✅ Payment auto-completed (mock):', referenceId);

      return res.status(200).json({
        success: true,
        status: 'completed',
        transactionId: transaction.flutterwaveId,
        referenceId,
        amount: transaction.amount,
        currency: transaction.currency,
        message: 'Payment successful',
      });
    }

    // Still pending
    if (transaction.status === 'pending') {
      console.log('⏳ Payment still pending:', referenceId);
      return res.status(200).json({
        success: false,
        status: 'pending',
        referenceId,
        message: 'Payment is still being processed. Please wait.',
      });
    }

    // Already completed
    if (transaction.status === 'completed') {
      return res.status(200).json({
        success: true,
        status: 'completed',
        transactionId: transaction.flutterwaveId,
        referenceId,
        amount: transaction.amount,
        currency: transaction.currency,
        message: 'Payment successful',
      });
    }

    // Failed
    if (transaction.status === 'failed') {
      return res.status(200).json({
        success: false,
        status: 'failed',
        referenceId,
        message: 'Payment was declined',
      });
    }
  } catch (error) {
    console.error('❌ Status Check Error:', error.message);
    return res.status(500).json({
      success: false,
      status: 'failed',
      message: 'Failed to check payment status',
    });
  }
};

// @desc    Verify Payment (Mock)
// @route   POST /api/payments/flutterwave/verify
// @access  Private
exports.verifyPayment = async (req, res) => {
  try {
    const { transactionId, referenceId } = req.body;

    if (!transactionId || !referenceId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID and Reference ID required',
      });
    }

    console.log('🔐 Verifying payment:', { transactionId, referenceId });

    // Find and update transaction
    let transaction = await Transaction.findOne({ referenceId });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    if (transaction.status === 'completed') {
      transaction.status = 'verified';
      transaction.verifiedAt = new Date();
      await transaction.save();

      console.log('✅ Payment verified:', referenceId);

      return res.status(200).json({
        success: true,
        status: 'completed',
        message: 'Payment verified successfully',
        transactionId: transaction.flutterwaveId,
      });
    }

    return res.status(400).json({
      success: false,
      status: 'failed',
      message: 'Payment not in completed state',
    });
  } catch (error) {
    console.error('❌ Verification Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Payment verification error',
    });
  }
};