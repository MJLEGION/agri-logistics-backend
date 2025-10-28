const escrowService = require('../services/escrowService');
const paymentService = require('../services/paymentService');
const Wallet = require('../models/wallet');

/**
 * Create escrow for a transaction
 */
exports.createEscrow = async (req, res) => {
  try {
    const { transactionId, orderId, farmerId, transporterId, amount, currency, paymentMethod } = req.body;

    if (!transactionId || !orderId || !farmerId || !transporterId || !amount || !paymentMethod) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const escrow = await escrowService.createEscrow({
      transactionId,
      orderId,
      farmerId,
      transporterId,
      amount,
      currency,
      paymentMethod
    });

    res.status(201).json({
      success: true,
      message: 'Escrow created successfully',
      data: escrow
    });
  } catch (error) {
    console.error('Error creating escrow:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating escrow'
    });
  }
};

/**
 * Release escrow funds to transporter
 */
exports.releaseEscrow = async (req, res) => {
  try {
    const { escrowId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    if (!escrowId) {
      return res.status(400).json({ message: 'Escrow ID is required' });
    }

    const escrow = await escrowService.releaseEscrow(escrowId, reason, userId);

    res.status(200).json({
      success: true,
      message: 'Escrow released successfully',
      data: escrow
    });
  } catch (error) {
    console.error('Error releasing escrow:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error releasing escrow'
    });
  }
};

/**
 * Refund escrow to farmer
 */
exports.refundEscrow = async (req, res) => {
  try {
    const { escrowId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    if (!escrowId) {
      return res.status(400).json({ message: 'Escrow ID is required' });
    }

    const escrow = await escrowService.refundEscrow(escrowId, reason, userId);

    res.status(200).json({
      success: true,
      message: 'Escrow refunded successfully',
      data: escrow
    });
  } catch (error) {
    console.error('Error refunding escrow:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error refunding escrow'
    });
  }
};

/**
 * Dispute escrow
 */
exports.disputeEscrow = async (req, res) => {
  try {
    const { escrowId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!escrowId || !reason) {
      return res.status(400).json({ message: 'Escrow ID and reason are required' });
    }

    const escrow = await escrowService.disputeEscrow(
      escrowId,
      reason,
      userRole,
      userId
    );

    res.status(200).json({
      success: true,
      message: 'Escrow disputed successfully',
      data: escrow
    });
  } catch (error) {
    console.error('Error disputing escrow:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error disputing escrow'
    });
  }
};

/**
 * Get escrow by ID
 */
exports.getEscrowById = async (req, res) => {
  try {
    const { escrowId } = req.params;

    if (!escrowId) {
      return res.status(400).json({ message: 'Escrow ID is required' });
    }

    const escrow = await escrowService.getEscrowById(escrowId);

    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found' });
    }

    res.status(200).json({
      success: true,
      data: escrow
    });
  } catch (error) {
    console.error('Error getting escrow:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting escrow'
    });
  }
};

/**
 * Get escrow by transaction ID
 */
exports.getEscrowByTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({ message: 'Transaction ID is required' });
    }

    const escrow = await escrowService.getEscrowByTransactionId(transactionId);

    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found' });
    }

    res.status(200).json({
      success: true,
      data: escrow
    });
  } catch (error) {
    console.error('Error getting escrow:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting escrow'
    });
  }
};

/**
 * Get escrows for current user
 */
exports.getMyEscrows = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { status, limit = 50, skip = 0 } = req.query;

    let escrows;

    if (status) {
      escrows = await escrowService.getEscrowsByStatus(status, limit, skip);
      // Filter by user if specified
      if (userId) {
        escrows = escrows.filter(e => 
          e.farmerId.toString() === userId || e.transporterId.toString() === userId
        );
      }
    } else {
      escrows = await escrowService.getEscrowsByUser(userId, role);
    }

    res.status(200).json({
      success: true,
      data: escrows
    });
  } catch (error) {
    console.error('Error getting escrows:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting escrows'
    });
  }
};

/**
 * Get all escrows (admin only)
 */
exports.getAllEscrows = async (req, res) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;

    let escrows;

    if (status) {
      escrows = await escrowService.getEscrowsByStatus(status, parseInt(limit), parseInt(skip));
    } else {
      escrows = await escrowService.getEscrowsByStatus('HELD', parseInt(limit), parseInt(skip));
    }

    res.status(200).json({
      success: true,
      data: escrows
    });
  } catch (error) {
    console.error('Error getting escrows:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting escrows'
    });
  }
};

/**
 * Auto-release expired escrows (cron job)
 */
exports.autoReleaseEscrows = async (req, res) => {
  try {
    const results = await escrowService.autoReleaseExpiredEscrows();

    res.status(200).json({
      success: true,
      message: 'Auto-release completed',
      data: results
    });
  } catch (error) {
    console.error('Error auto-releasing escrows:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error auto-releasing escrows'
    });
  }
};

/**
 * Get escrow statistics for a user
 */
exports.getEscrowStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const heldEscrows = await escrowService.getEscrowsByUser(userId, req.user.role);
    
    const totalHeld = heldEscrows.reduce((sum, e) => sum + (e.status === 'HELD' ? e.amount : 0), 0);
    const totalReleased = heldEscrows.reduce((sum, e) => sum + (e.status === 'RELEASED' ? e.amount : 0), 0);
    const totalRefunded = heldEscrows.reduce((sum, e) => sum + (e.status === 'REFUNDED' ? e.amount : 0), 0);
    const disputed = heldEscrows.filter(e => e.status === 'DISPUTED').length;

    res.status(200).json({
      success: true,
      data: {
        totalHeld,
        totalReleased,
        totalRefunded,
        disputed,
        totalCount: heldEscrows.length
      }
    });
  } catch (error) {
    console.error('Error getting escrow stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting escrow stats'
    });
  }
};