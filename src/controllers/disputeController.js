const disputeService = require('../services/disputeService');

/**
 * Raise a dispute
 */
exports.raiseDispute = async (req, res) => {
  try {
    const {
      escrowId,
      transactionId,
      orderId,
      reason,
      evidence
    } = req.body;

    if (!escrowId || !transactionId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: escrowId, transactionId, reason'
      });
    }

    const dispute = await disputeService.raiseDispute({
      escrowId,
      transactionId,
      orderId,
      raisedBy: req.user.id,
      raisedByRole: req.user.role,
      reason,
      evidence
    });

    res.status(201).json({
      success: true,
      message: 'Dispute raised successfully',
      data: dispute
    });
  } catch (error) {
    console.error('Error raising dispute:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error raising dispute'
    });
  }
};

/**
 * Review a dispute
 */
exports.reviewDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const userId = req.user.id;

    if (!disputeId) {
      return res.status(400).json({ message: 'Dispute ID is required' });
    }

    const dispute = await disputeService.reviewDispute(disputeId, userId);

    res.status(200).json({
      success: true,
      message: 'Dispute marked as under review',
      data: dispute
    });
  } catch (error) {
    console.error('Error reviewing dispute:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error reviewing dispute'
    });
  }
};

/**
 * Resolve a dispute
 */
exports.resolveDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { resolution, resolutionReason } = req.body;
    const userId = req.user.id;

    if (!disputeId || !resolution) {
      return res.status(400).json({ message: 'Dispute ID and resolution are required' });
    }

    const dispute = await disputeService.resolveDispute(
      disputeId,
      resolution,
      resolutionReason,
      userId
    );

    res.status(200).json({
      success: true,
      message: 'Dispute resolved successfully',
      data: dispute
    });
  } catch (error) {
    console.error('Error resolving dispute:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error resolving dispute'
    });
  }
};

/**
 * Close a dispute
 */
exports.closeDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const userId = req.user.id;

    if (!disputeId) {
      return res.status(400).json({ message: 'Dispute ID is required' });
    }

    const dispute = await disputeService.closeDispute(disputeId, userId);

    res.status(200).json({
      success: true,
      message: 'Dispute closed successfully',
      data: dispute
    });
  } catch (error) {
    console.error('Error closing dispute:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error closing dispute'
    });
  }
};

/**
 * Get dispute by ID
 */
exports.getDisputeById = async (req, res) => {
  try {
    const { disputeId } = req.params;

    if (!disputeId) {
      return res.status(400).json({ message: 'Dispute ID is required' });
    }

    const dispute = await disputeService.getDisputeById(disputeId);

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    res.status(200).json({
      success: true,
      data: dispute
    });
  } catch (error) {
    console.error('Error getting dispute:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting dispute'
    });
  }
};

/**
 * Get disputes for escrow
 */
exports.getDisputesByEscrow = async (req, res) => {
  try {
    const { escrowId } = req.params;

    if (!escrowId) {
      return res.status(400).json({ message: 'Escrow ID is required' });
    }

    const disputes = await disputeService.getDisputesByEscrow(escrowId);

    res.status(200).json({
      success: true,
      data: disputes
    });
  } catch (error) {
    console.error('Error getting disputes:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting disputes'
    });
  }
};

/**
 * Get my disputes
 */
exports.getMyDisputes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, skip = 0 } = req.query;

    const disputes = await disputeService.getDisputesByUser(userId, parseInt(limit), parseInt(skip));

    res.status(200).json({
      success: true,
      data: disputes
    });
  } catch (error) {
    console.error('Error getting disputes:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting disputes'
    });
  }
};

/**
 * Get open disputes (admin only)
 */
exports.getOpenDisputes = async (req, res) => {
  try {
    const disputes = await disputeService.getOpenDisputes();

    res.status(200).json({
      success: true,
      data: disputes
    });
  } catch (error) {
    console.error('Error getting open disputes:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting open disputes'
    });
  }
};

/**
 * Get disputes by status (admin only)
 */
exports.getDisputesByStatus = async (req, res) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const disputes = await disputeService.getDisputesByStatus(status, parseInt(limit), parseInt(skip));

    res.status(200).json({
      success: true,
      data: disputes
    });
  } catch (error) {
    console.error('Error getting disputes:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting disputes'
    });
  }
};