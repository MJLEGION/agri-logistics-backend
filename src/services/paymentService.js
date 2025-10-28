const Transaction = require('../models/transaction');
const Wallet = require('../models/wallet');
const User = require('../models/user');
const AuditLog = require('../models/auditLog');

class PaymentService {
  /**
   * Initiate a payment transaction
   */
  async initiatePayment(paymentData) {
    try {
      const paymentReference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const trackingNumber = `TRK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const transaction = new Transaction({
        farmerId: paymentData.farmerId,
        transporterId: paymentData.transporterId,
        orderId: paymentData.orderId,
        cropId: paymentData.cropId,
        cargoDescription: paymentData.cargoDescription,
        pickupLocation: paymentData.pickupLocation,
        dropoffLocation: paymentData.dropoffLocation,
        pickupTime: paymentData.pickupTime,
        estimatedDeliveryTime: paymentData.estimatedDeliveryTime,
        amount: paymentData.amount,
        currency: paymentData.currency || 'RWF',
        paymentMethod: paymentData.paymentMethod,
        status: 'INITIATED',
        paymentReference,
        trackingNumber,
        metadata: paymentData.metadata || {}
      });

      await transaction.save();

      // Log the action
      await this.logAuditAction(
        'PAYMENT_INITIATED',
        paymentData.farmerId,
        'transaction',
        transaction._id,
        { 
          amount: paymentData.amount,
          paymentMethod: paymentData.paymentMethod,
          status: 'INITIATED'
        }
      );

      return transaction;
    } catch (error) {
      console.error('Error initiating payment:', error);
      throw error;
    }
  }

  /**
   * Process payment through payment provider (mock implementation)
   */
  async processPayment(transactionId, paymentDetails = {}) {
    try {
      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Update status to processing
      transaction.status = 'PAYMENT_PROCESSING';
      await transaction.save();

      // Mock payment processing - in production, call actual payment provider API
      // For now, we'll simulate the payment confirmation
      const paymentConfirmed = await this.mockPaymentProcessing(
        transaction.paymentMethod,
        transaction.amount,
        paymentDetails
      );

      if (paymentConfirmed) {
        transaction.status = 'PAYMENT_CONFIRMED';
        transaction.metadata = {
          ...transaction.metadata,
          processedAt: new Date(),
          paymentDetails: paymentDetails
        };
        await transaction.save();

        // Log the action
        await this.logAuditAction(
          'PAYMENT_CONFIRMED',
          transaction.farmerId,
          'transaction',
          transaction._id,
          { status: 'PAYMENT_CONFIRMED', amount: transaction.amount }
        );

        return transaction;
      } else {
        transaction.status = 'FAILED';
        await transaction.save();

        await this.logAuditAction(
          'PAYMENT_FAILED',
          transaction.farmerId,
          'transaction',
          transaction._id,
          { status: 'FAILED', reason: 'Payment processing failed' }
        );

        throw new Error('Payment processing failed');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  /**
   * Confirm payment and update wallet
   */
  async confirmPayment(transactionId, farmerId) {
    try {
      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== 'PAYMENT_CONFIRMED') {
        throw new Error(`Cannot confirm payment with status: ${transaction.status}`);
      }

      // Deduct from farmer wallet
      const farmerWallet = await Wallet.findOne({ userId: transaction.farmerId });
      if (!farmerWallet) {
        throw new Error('Farmer wallet not found');
      }

      if (farmerWallet.balance < transaction.amount) {
        throw new Error('Insufficient balance');
      }

      farmerWallet.balance -= transaction.amount;
      farmerWallet.totalSpent += transaction.amount;
      await farmerWallet.save();

      transaction.status = 'ESCROW_HELD';
      await transaction.save();

      // Log the action
      await this.logAuditAction(
        'PAYMENT_CONFIRMED',
        farmerId,
        'transaction',
        transaction._id,
        { 
          status: 'ESCROW_HELD',
          amount: transaction.amount,
          walletBalance: farmerWallet.balance
        }
      );

      return transaction;
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(transactionId, reason = '', userId = null) {
    try {
      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const allowedStatuses = ['INITIATED', 'PAYMENT_PROCESSING'];
      if (!allowedStatuses.includes(transaction.status)) {
        throw new Error(`Cannot cancel payment with status: ${transaction.status}`);
      }

      transaction.status = 'CANCELLED';
      transaction.metadata = {
        ...transaction.metadata,
        cancelledAt: new Date(),
        cancelReason: reason
      };
      await transaction.save();

      // Log the action
      await this.logAuditAction(
        'PAYMENT_CANCELLED',
        userId || transaction.farmerId,
        'transaction',
        transaction._id,
        { status: 'CANCELLED', reason }
      );

      return transaction;
    } catch (error) {
      console.error('Error cancelling payment:', error);
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(transactionId) {
    try {
      const transaction = await Transaction.findById(transactionId)
        .populate('farmerId', 'name phone')
        .populate('transporterId', 'name phone')
        .populate('orderId')
        .populate('escrowId')
        .populate('receiptId');

      return transaction;
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw error;
    }
  }

  /**
   * Get transactions by user
   */
  async getTransactionsByUser(userId, role = 'all', limit = 50, skip = 0) {
    try {
      let query = {};

      if (role === 'farmer') {
        query.farmerId = userId;
      } else if (role === 'transporter') {
        query.transporterId = userId;
      } else {
        query = { $or: [{ farmerId: userId }, { transporterId: userId }] };
      }

      const transactions = await Transaction.find(query)
        .populate('farmerId', 'name phone')
        .populate('transporterId', 'name phone')
        .populate('orderId')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      return transactions;
    } catch (error) {
      console.error('Error getting user transactions:', error);
      throw error;
    }
  }

  /**
   * Get transactions by status
   */
  async getTransactionsByStatus(status, limit = 50, skip = 0) {
    try {
      const transactions = await Transaction.find({ status })
        .populate('farmerId', 'name phone')
        .populate('transporterId', 'name phone')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      return transactions;
    } catch (error) {
      console.error('Error getting transactions by status:', error);
      throw error;
    }
  }

  /**
   * Mock payment processing
   */
  async mockPaymentProcessing(paymentMethod, amount, paymentDetails) {
    return new Promise((resolve) => {
      // Simulate payment processing delay
      setTimeout(() => {
        // Mock: 95% success rate
        const success = Math.random() < 0.95;
        resolve(success);
      }, 1000);
    });
  }

  /**
   * Log audit action
   */
  async logAuditAction(action, userId, entityType, entityId, changes = {}, metadata = {}) {
    try {
      const auditLog = new AuditLog({
        action,
        userId,
        entityType,
        entityId,
        changes,
        metadata,
        success: true
      });

      await auditLog.save();
      return auditLog;
    } catch (error) {
      console.error('Error logging audit action:', error);
      // Don't throw - logging should not break main flow
    }
  }
}

module.exports = new PaymentService();