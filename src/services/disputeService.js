const Dispute = require('../models/dispute');
const Escrow = require('../models/escrow');
const AuditLog = require('../models/auditLog');

class DisputeService {
  /**
   * Raise a dispute
   */
  async raiseDispute(disputeData) {
    try {
      const escrow = await Escrow.findById(disputeData.escrowId);
      if (!escrow) {
        throw new Error('Escrow not found');
      }

      const dispute = new Dispute({
        escrowId: disputeData.escrowId,
        transactionId: disputeData.transactionId,
        orderId: disputeData.orderId,
        raisedBy: disputeData.raisedBy,
        raisedByRole: disputeData.raisedByRole,
        reason: disputeData.reason,
        evidence: disputeData.evidence || null,
        status: 'OPEN'
      });

      await dispute.save();

      // Update escrow status
      await Escrow.findByIdAndUpdate(
        disputeData.escrowId,
        {
          status: 'DISPUTED',
          disputeReason: disputeData.reason,
          disputedBy: disputeData.raisedByRole,
          disputeEvidence: disputeData.evidence
        }
      );

      // Log the action
      await this.logAuditAction(
        'DISPUTE_RAISED',
        disputeData.raisedBy,
        'dispute',
        dispute._id,
        {
          reason: disputeData.reason,
          raisedBy: disputeData.raisedByRole
        }
      );

      return dispute;
    } catch (error) {
      console.error('Error raising dispute:', error);
      throw error;
    }
  }

  /**
   * Review a dispute
   */
  async reviewDispute(disputeId, userId) {
    try {
      const dispute = await Dispute.findById(disputeId);
      if (!dispute) {
        throw new Error('Dispute not found');
      }

      if (dispute.status !== 'OPEN') {
        throw new Error(`Cannot review dispute with status: ${dispute.status}`);
      }

      dispute.status = 'UNDER_REVIEW';
      dispute.reviewedAt = new Date();
      await dispute.save();

      // Log the action
      await this.logAuditAction(
        'DISPUTE_UNDER_REVIEW',
        userId,
        'dispute',
        dispute._id,
        { status: 'UNDER_REVIEW' }
      );

      return dispute;
    } catch (error) {
      console.error('Error reviewing dispute:', error);
      throw error;
    }
  }

  /**
   * Resolve a dispute
   */
  async resolveDispute(disputeId, resolution, resolutionReason, resolvedBy) {
    try {
      const dispute = await Dispute.findById(disputeId);
      if (!dispute) {
        throw new Error('Dispute not found');
      }

      const validResolutions = ['REFUNDED', 'RELEASED', 'PARTIAL_REFUND'];
      if (!validResolutions.includes(resolution)) {
        throw new Error(`Invalid resolution: ${resolution}`);
      }

      dispute.status = 'RESOLVED';
      dispute.resolution = resolution;
      dispute.resolutionReason = resolutionReason;
      dispute.resolvedBy = resolvedBy;
      dispute.resolvedAt = new Date();
      await dispute.save();

      // Log the action
      await this.logAuditAction(
        'DISPUTE_RESOLVED',
        resolvedBy,
        'dispute',
        dispute._id,
        {
          status: 'RESOLVED',
          resolution: resolution,
          reason: resolutionReason
        }
      );

      return dispute;
    } catch (error) {
      console.error('Error resolving dispute:', error);
      throw error;
    }
  }

  /**
   * Close a dispute
   */
  async closeDispute(disputeId, userId) {
    try {
      const dispute = await Dispute.findById(disputeId);
      if (!dispute) {
        throw new Error('Dispute not found');
      }

      if (dispute.status !== 'RESOLVED') {
        throw new Error(`Cannot close dispute with status: ${dispute.status}`);
      }

      dispute.status = 'CLOSED';
      await dispute.save();

      // Log the action
      await this.logAuditAction(
        'DISPUTE_CLOSED',
        userId,
        'dispute',
        dispute._id,
        { status: 'CLOSED' }
      );

      return dispute;
    } catch (error) {
      console.error('Error closing dispute:', error);
      throw error;
    }
  }

  /**
   * Get dispute by ID
   */
  async getDisputeById(disputeId) {
    try {
      const dispute = await Dispute.findById(disputeId)
        .populate('escrowId')
        .populate('transactionId')
        .populate('orderId')
        .populate('raisedBy', 'name phone')
        .populate('resolvedBy', 'name phone');

      return dispute;
    } catch (error) {
      console.error('Error getting dispute:', error);
      throw error;
    }
  }

  /**
   * Get disputes by escrow
   */
  async getDisputesByEscrow(escrowId) {
    try {
      const disputes = await Dispute.find({ escrowId })
        .populate('raisedBy', 'name phone')
        .populate('resolvedBy', 'name phone')
        .sort({ createdAt: -1 });

      return disputes;
    } catch (error) {
      console.error('Error getting disputes by escrow:', error);
      throw error;
    }
  }

  /**
   * Get disputes by status
   */
  async getDisputesByStatus(status, limit = 50, skip = 0) {
    try {
      const disputes = await Dispute.find({ status })
        .populate('escrowId')
        .populate('raisedBy', 'name phone')
        .sort({ raisedAt: -1 })
        .limit(limit)
        .skip(skip);

      return disputes;
    } catch (error) {
      console.error('Error getting disputes by status:', error);
      throw error;
    }
  }

  /**
   * Get all open disputes
   */
  async getOpenDisputes() {
    try {
      const disputes = await Dispute.find({ status: { $in: ['OPEN', 'UNDER_REVIEW'] } })
        .populate('escrowId')
        .populate('raisedBy', 'name phone')
        .sort({ raisedAt: -1 });

      return disputes;
    } catch (error) {
      console.error('Error getting open disputes:', error);
      throw error;
    }
  }

  /**
   * Get disputes for a user
   */
  async getDisputesByUser(userId, limit = 50, skip = 0) {
    try {
      const disputes = await Dispute.find({ raisedBy: userId })
        .populate('escrowId')
        .populate('transactionId')
        .sort({ raisedAt: -1 })
        .limit(limit)
        .skip(skip);

      return disputes;
    } catch (error) {
      console.error('Error getting user disputes:', error);
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

module.exports = new DisputeService();