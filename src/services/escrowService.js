const Escrow = require('../models/escrow');
const Transaction = require('../models/transaction');
const Wallet = require('../models/wallet');
const Dispute = require('../models/dispute');
const AuditLog = require('../models/auditLog');

class EscrowService {
  /**
   * Create an escrow hold for a transaction
   */
  async createEscrow(transactionData) {
    try {
      // Calculate hold until date (24 hours from now)
      const heldUntil = new Date();
      heldUntil.setHours(heldUntil.getHours() + 24);

      const escrowData = {
        transactionId: transactionData.transactionId,
        orderId: transactionData.orderId,
        farmerId: transactionData.farmerId,
        transporterId: transactionData.transporterId,
        amount: transactionData.amount,
        currency: transactionData.currency || 'RWF',
        heldUntil: heldUntil,
        paymentMethod: transactionData.paymentMethod,
        status: 'HELD'
      };

      const escrow = new Escrow(escrowData);
      await escrow.save();

      // Log the action
      await this.logAuditAction(
        'ESCROW_CREATED',
        transactionData.farmerId,
        'escrow',
        escrow._id,
        { amount: escrowData.amount, status: 'HELD' }
      );

      return escrow;
    } catch (error) {
      console.error('Error creating escrow:', error);
      throw error;
    }
  }

  /**
   * Release escrowed funds to transporter
   */
  async releaseEscrow(escrowId, releaseReason = '', userId = null) {
    try {
      const escrow = await Escrow.findById(escrowId);
      if (!escrow) {
        throw new Error('Escrow not found');
      }

      if (escrow.status !== 'HELD') {
        throw new Error(`Cannot release escrow with status: ${escrow.status}`);
      }

      // Update escrow
      escrow.status = 'RELEASED';
      escrow.releasedAt = new Date();
      escrow.releaseReason = releaseReason;
      await escrow.save();

      // Update transporter wallet
      const transporterWallet = await Wallet.findOne({ userId: escrow.transporterId });
      if (transporterWallet) {
        transporterWallet.balance += escrow.amount;
        transporterWallet.totalEarned += escrow.amount;
        await transporterWallet.save();
      }

      // Update transaction status
      await Transaction.findByIdAndUpdate(
        escrow.transactionId,
        { status: 'COMPLETED' }
      );

      // Log the action
      await this.logAuditAction(
        'ESCROW_RELEASED',
        userId,
        'escrow',
        escrow._id,
        { 
          amount: escrow.amount,
          status: 'RELEASED',
          reason: releaseReason
        }
      );

      return escrow;
    } catch (error) {
      console.error('Error releasing escrow:', error);
      throw error;
    }
  }

  /**
   * Refund escrowed funds to farmer
   */
  async refundEscrow(escrowId, refundReason = '', userId = null) {
    try {
      const escrow = await Escrow.findById(escrowId);
      if (!escrow) {
        throw new Error('Escrow not found');
      }

      if (escrow.status !== 'HELD' && escrow.status !== 'DISPUTED') {
        throw new Error(`Cannot refund escrow with status: ${escrow.status}`);
      }

      // Update escrow
      escrow.status = 'REFUNDED';
      escrow.refundedAt = new Date();
      escrow.refundReason = refundReason;
      await escrow.save();

      // Update farmer wallet
      const farmerWallet = await Wallet.findOne({ userId: escrow.farmerId });
      if (farmerWallet) {
        farmerWallet.balance += escrow.amount;
        farmerWallet.totalRefunded += escrow.amount;
        await farmerWallet.save();
      }

      // Update transaction status
      await Transaction.findByIdAndUpdate(
        escrow.transactionId,
        { status: 'REFUNDED' }
      );

      // Log the action
      await this.logAuditAction(
        'ESCROW_REFUNDED',
        userId,
        'escrow',
        escrow._id,
        { 
          amount: escrow.amount,
          status: 'REFUNDED',
          reason: refundReason
        }
      );

      return escrow;
    } catch (error) {
      console.error('Error refunding escrow:', error);
      throw error;
    }
  }

  /**
   * Mark escrow as disputed
   */
  async disputeEscrow(escrowId, disputeReason, disputedByRole, userId) {
    try {
      const escrow = await Escrow.findById(escrowId);
      if (!escrow) {
        throw new Error('Escrow not found');
      }

      if (escrow.status !== 'HELD') {
        throw new Error(`Cannot dispute escrow with status: ${escrow.status}`);
      }

      // Update escrow
      escrow.status = 'DISPUTED';
      escrow.disputeReason = disputeReason;
      escrow.disputedBy = disputedByRole;
      await escrow.save();

      // Update transaction status
      await Transaction.findByIdAndUpdate(
        escrow.transactionId,
        { status: 'DISPUTED' }
      );

      // Log the action
      await this.logAuditAction(
        'ESCROW_DISPUTED',
        userId,
        'escrow',
        escrow._id,
        { 
          status: 'DISPUTED',
          reason: disputeReason,
          raisedBy: disputedByRole
        }
      );

      return escrow;
    } catch (error) {
      console.error('Error disputing escrow:', error);
      throw error;
    }
  }

  /**
   * Get escrow by ID
   */
  async getEscrowById(escrowId) {
    try {
      const escrow = await Escrow.findById(escrowId)
        .populate('transactionId')
        .populate('orderId')
        .populate('farmerId', 'name phone')
        .populate('transporterId', 'name phone');
      
      return escrow;
    } catch (error) {
      console.error('Error getting escrow:', error);
      throw error;
    }
  }

  /**
   * Get escrow by transaction ID
   */
  async getEscrowByTransactionId(transactionId) {
    try {
      const escrow = await Escrow.findOne({ transactionId })
        .populate('transactionId')
        .populate('orderId')
        .populate('farmerId', 'name phone')
        .populate('transporterId', 'name phone');
      
      return escrow;
    } catch (error) {
      console.error('Error getting escrow by transaction:', error);
      throw error;
    }
  }

  /**
   * Get all escrows for a user
   */
  async getEscrowsByUser(userId, role) {
    try {
      const query = role === 'farmer' 
        ? { farmerId: userId }
        : { transporterId: userId };

      const escrows = await Escrow.find(query)
        .populate('transactionId')
        .populate('orderId')
        .populate('farmerId', 'name phone')
        .populate('transporterId', 'name phone')
        .sort({ createdAt: -1 });
      
      return escrows;
    } catch (error) {
      console.error('Error getting user escrows:', error);
      throw error;
    }
  }

  /**
   * Get escrows by status
   */
  async getEscrowsByStatus(status, limit = 50, skip = 0) {
    try {
      const escrows = await Escrow.find({ status })
        .populate('transactionId')
        .populate('farmerId', 'name phone')
        .populate('transporterId', 'name phone')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
      
      return escrows;
    } catch (error) {
      console.error('Error getting escrows by status:', error);
      throw error;
    }
  }

  /**
   * Auto-release held escrows after 24 hours
   */
  async autoReleaseExpiredEscrows() {
    try {
      const now = new Date();
      const expiredEscrows = await Escrow.find({
        status: 'HELD',
        heldUntil: { $lte: now }
      });

      const results = [];
      for (const escrow of expiredEscrows) {
        try {
          await this.releaseEscrow(escrow._id, 'Auto-released after 24 hours');
          results.push({ id: escrow._id, status: 'released' });
        } catch (error) {
          results.push({ id: escrow._id, status: 'error', error: error.message });
        }
      }

      return results;
    } catch (error) {
      console.error('Error auto-releasing escrows:', error);
      throw error;
    }
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

module.exports = new EscrowService();