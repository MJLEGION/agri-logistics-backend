const paymentService = require('../services/paymentService');
const escrowService = require('../services/escrowService');
const Transaction = require('../models/transaction');

/**
 * Initiate a payment transaction
 */
exports.initiatePayment = async (req, res) => {
  try {
    const {
      farmerId,
      transporterId,
      orderId,
      cropId,
      cargoDescription,
      pickupLocation,
      dropoffLocation,
      pickupTime,
      estimatedDeliveryTime,
      amount,
      currency,
      paymentMethod,
      metadata
    } = req.body;

    // Validation
    if (!farmerId || !transporterId || !orderId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: farmerId, transporterId, orderId, amount, paymentMethod'
      });
    }

    const transaction = await paymentService.initiatePayment({
      farmerId,
      transporterId,
      orderId,
      cropId,
      cargoDescription: cargoDescription || 'Farm produce delivery',
      pickupLocation,
      dropoffLocation,
      pickupTime,
      estimatedDeliveryTime,
      amount,
      currency,
      paymentMethod,
      metadata
    });

    res.status(201).json({
      success: true,
      message: 'Payment initiated successfully',
      data: transaction
    });
  } catch (error) {
    console.error('Error initiating payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error initiating payment'
    });
  }
};

/**
 * Process payment
 */
exports.processPayment = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const paymentDetails = req.body;

    if (!transactionId) {
      return res.status(400).json({ message: 'Transaction ID is required' });
    }

    const transaction = await paymentService.processPayment(transactionId, paymentDetails);

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: transaction
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing payment'
    });
  }
};

/**
 * Confirm payment and create escrow
 */
exports.confirmPayment = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.id;

    if (!transactionId) {
      return res.status(400).json({ message: 'Transaction ID is required' });
    }

    // Confirm the payment
    const transaction = await paymentService.confirmPayment(transactionId, userId);

    // Create escrow
    const escrow = await escrowService.createEscrow({
      transactionId: transaction._id,
      orderId: transaction.orderId,
      farmerId: transaction.farmerId,
      transporterId: transaction.transporterId,
      amount: transaction.amount,
      currency: transaction.currency,
      paymentMethod: transaction.paymentMethod
    });

    res.status(200).json({
      success: true,
      message: 'Payment confirmed and escrow created',
      data: {
        transaction,
        escrow
      }
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error confirming payment'
    });
  }
};

/**
 * Cancel payment
 */
exports.cancelPayment = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    if (!transactionId) {
      return res.status(400).json({ message: 'Transaction ID is required' });
    }

    const transaction = await paymentService.cancelPayment(transactionId, reason, userId);

    res.status(200).json({
      success: true,
      message: 'Payment cancelled successfully',
      data: transaction
    });
  } catch (error) {
    console.error('Error cancelling payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error cancelling payment'
    });
  }
};

/**
 * Get transaction by ID
 */
exports.getTransactionById = async (req, res) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({ message: 'Transaction ID is required' });
    }

    const transaction = await paymentService.getTransactionById(transactionId);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error getting transaction:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting transaction'
    });
  }
};

/**
 * Get my transactions
 */
exports.getMyTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { status, limit = 50, skip = 0 } = req.query;

    let transactions;

    if (status) {
      transactions = await paymentService.getTransactionsByStatus(status, parseInt(limit), parseInt(skip));
      // Filter by user
      transactions = transactions.filter(t =>
        t.farmerId.toString() === userId || t.transporterId.toString() === userId
      );
    } else {
      transactions = await paymentService.getTransactionsByUser(userId, role, parseInt(limit), parseInt(skip));
    }

    res.status(200).json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting transactions'
    });
  }
};

/**
 * Get all transactions (admin)
 */
exports.getAllTransactions = async (req, res) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;

    const transactions = await paymentService.getTransactionsByStatus(
      status || 'INITIATED',
      parseInt(limit),
      parseInt(skip)
    );

    res.status(200).json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting transactions'
    });
  }
};

/**
 * Get transaction stats
 */
exports.getTransactionStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const transactions = await paymentService.getTransactionsByUser(userId, 'all');

    const stats = {
      totalTransactions: transactions.length,
      completed: transactions.filter(t => t.status === 'COMPLETED').length,
      failed: transactions.filter(t => t.status === 'FAILED').length,
      pending: transactions.filter(t => ['INITIATED', 'PAYMENT_PROCESSING', 'ESCROW_HELD'].includes(t.status)).length,
      disputed: transactions.filter(t => t.status === 'DISPUTED').length,
      totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0)
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting transaction stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting transaction stats'
    });
  }
};

/**
 * Update transaction status (admin)
 */
exports.updateTransactionStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { status } = req.body;

    if (!transactionId || !status) {
      return res.status(400).json({ message: 'Transaction ID and status are required' });
    }

    const validStatuses = [
      'INITIATED', 'PAYMENT_PROCESSING', 'PAYMENT_CONFIRMED', 'ESCROW_HELD',
      'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'FAILED', 'CANCELLED', 'DISPUTED', 'REFUNDED'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status: ${status}` });
    }

    const transaction = await Transaction.findByIdAndUpdate(
      transactionId,
      { status },
      { new: true }
    ).populate('farmerId', 'name phone').populate('transporterId', 'name phone');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Transaction status updated successfully',
      data: transaction
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating transaction'
    });
  }
};