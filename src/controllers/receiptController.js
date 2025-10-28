const receiptService = require('../services/receiptService');

/**
 * Create a receipt
 */
exports.createReceipt = async (req, res) => {
  try {
    const {
      transactionId,
      orderId,
      escrowId,
      farmerId,
      transporterId,
      subtotal,
      platformFee = 0,
      tax = 0,
      total,
      currency = 'RWF',
      items = []
    } = req.body;

    if (!transactionId || !farmerId || !transporterId || !subtotal) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const receipt = await receiptService.createReceipt({
      transactionId,
      orderId,
      escrowId,
      farmerId,
      transporterId,
      subtotal,
      platformFee,
      tax,
      total: total || (subtotal + platformFee + tax),
      currency,
      items
    });

    res.status(201).json({
      success: true,
      message: 'Receipt created successfully',
      data: receipt
    });
  } catch (error) {
    console.error('Error creating receipt:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating receipt'
    });
  }
};

/**
 * Issue a receipt
 */
exports.issueReceipt = async (req, res) => {
  try {
    const { receiptId } = req.params;
    const userId = req.user.id;

    if (!receiptId) {
      return res.status(400).json({ message: 'Receipt ID is required' });
    }

    const receipt = await receiptService.issueReceipt(receiptId, userId);

    res.status(200).json({
      success: true,
      message: 'Receipt issued successfully',
      data: receipt
    });
  } catch (error) {
    console.error('Error issuing receipt:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error issuing receipt'
    });
  }
};

/**
 * Mark receipt as paid
 */
exports.markAsPaid = async (req, res) => {
  try {
    const { receiptId } = req.params;
    const userId = req.user.id;

    if (!receiptId) {
      return res.status(400).json({ message: 'Receipt ID is required' });
    }

    const receipt = await receiptService.markAsPaid(receiptId, userId);

    res.status(200).json({
      success: true,
      message: 'Receipt marked as paid',
      data: receipt
    });
  } catch (error) {
    console.error('Error marking receipt:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error marking receipt'
    });
  }
};

/**
 * Complete a receipt
 */
exports.completeReceipt = async (req, res) => {
  try {
    const { receiptId } = req.params;
    const userId = req.user.id;

    if (!receiptId) {
      return res.status(400).json({ message: 'Receipt ID is required' });
    }

    const receipt = await receiptService.completeReceipt(receiptId, userId);

    res.status(200).json({
      success: true,
      message: 'Receipt completed successfully',
      data: receipt
    });
  } catch (error) {
    console.error('Error completing receipt:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error completing receipt'
    });
  }
};

/**
 * Refund a receipt
 */
exports.refundReceipt = async (req, res) => {
  try {
    const { receiptId } = req.params;
    const userId = req.user.id;

    if (!receiptId) {
      return res.status(400).json({ message: 'Receipt ID is required' });
    }

    const receipt = await receiptService.refundReceipt(receiptId, userId);

    res.status(200).json({
      success: true,
      message: 'Receipt refunded successfully',
      data: receipt
    });
  } catch (error) {
    console.error('Error refunding receipt:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error refunding receipt'
    });
  }
};

/**
 * Get receipt by ID
 */
exports.getReceiptById = async (req, res) => {
  try {
    const { receiptId } = req.params;

    if (!receiptId) {
      return res.status(400).json({ message: 'Receipt ID is required' });
    }

    const receipt = await receiptService.getReceiptById(receiptId);

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    res.status(200).json({
      success: true,
      data: receipt
    });
  } catch (error) {
    console.error('Error getting receipt:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting receipt'
    });
  }
};

/**
 * Get receipt by transaction ID
 */
exports.getReceiptByTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({ message: 'Transaction ID is required' });
    }

    const receipt = await receiptService.getReceiptByTransactionId(transactionId);

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    res.status(200).json({
      success: true,
      data: receipt
    });
  } catch (error) {
    console.error('Error getting receipt:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting receipt'
    });
  }
};

/**
 * Get my receipts
 */
exports.getMyReceipts = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { status, limit = 50, skip = 0 } = req.query;

    let receipts;

    if (status) {
      receipts = await receiptService.getReceiptsByStatus(status, parseInt(limit), parseInt(skip));
      // Filter by user
      receipts = receipts.filter(r =>
        r.farmerId.toString() === userId || r.transporterId.toString() === userId
      );
    } else {
      receipts = await receiptService.getReceiptsByUser(userId, role, parseInt(limit), parseInt(skip));
    }

    res.status(200).json({
      success: true,
      data: receipts
    });
  } catch (error) {
    console.error('Error getting receipts:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting receipts'
    });
  }
};

/**
 * Add delivery proof to receipt
 */
exports.addDeliveryProof = async (req, res) => {
  try {
    const { receiptId } = req.params;
    const userId = req.user.id;
    const proofData = req.body;

    if (!receiptId) {
      return res.status(400).json({ message: 'Receipt ID is required' });
    }

    const receipt = await receiptService.addDeliveryProof(receiptId, proofData, userId);

    res.status(200).json({
      success: true,
      message: 'Delivery proof added successfully',
      data: receipt
    });
  } catch (error) {
    console.error('Error adding delivery proof:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error adding delivery proof'
    });
  }
};

/**
 * Get receipt in HTML format
 */
exports.getReceiptHtml = async (req, res) => {
  try {
    const { receiptId } = req.params;

    if (!receiptId) {
      return res.status(400).json({ message: 'Receipt ID is required' });
    }

    const receipt = await receiptService.getReceiptById(receiptId);

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    if (!receipt.htmlData) {
      return res.status(400).json({ message: 'Receipt HTML not available' });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(receipt.htmlData);
  } catch (error) {
    console.error('Error getting receipt HTML:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting receipt HTML'
    });
  }
};

/**
 * Get receipt in JSON format
 */
exports.getReceiptJson = async (req, res) => {
  try {
    const { receiptId } = req.params;

    if (!receiptId) {
      return res.status(400).json({ message: 'Receipt ID is required' });
    }

    const receipt = await receiptService.getReceiptById(receiptId);

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    const jsonData = receipt.jsonData ? JSON.parse(receipt.jsonData) : receipt.toObject();

    res.status(200).json({
      success: true,
      data: jsonData
    });
  } catch (error) {
    console.error('Error getting receipt JSON:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting receipt JSON'
    });
  }
};