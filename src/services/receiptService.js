const Receipt = require('../models/receipt');
const Transaction = require('../models/transaction');
const AuditLog = require('../models/auditLog');

class ReceiptService {
  /**
   * Generate a unique receipt number
   */
  generateReceiptNumber() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9).toUpperCase();
    return `RCP-${timestamp}-${random}`;
  }

  /**
   * Create a receipt for a transaction
   */
  async createReceipt(receiptData) {
    try {
      const receiptNumber = this.generateReceiptNumber();

      const receipt = new Receipt({
        transactionId: receiptData.transactionId,
        orderId: receiptData.orderId,
        escrowId: receiptData.escrowId,
        farmerId: receiptData.farmerId,
        transporterId: receiptData.transporterId,
        receiptNumber,
        receiptDate: new Date(),
        subtotal: receiptData.subtotal,
        platformFee: receiptData.platformFee || 0,
        tax: receiptData.tax || 0,
        total: receiptData.total || (receiptData.subtotal + (receiptData.platformFee || 0) + (receiptData.tax || 0)),
        currency: receiptData.currency || 'RWF',
        items: receiptData.items || [],
        status: 'DRAFT'
      });

      await receipt.save();

      // Update transaction with receipt ID
      await Transaction.findByIdAndUpdate(
        receiptData.transactionId,
        { receiptId: receipt._id }
      );

      // Log the action
      await this.logAuditAction(
        'RECEIPT_CREATED',
        receiptData.farmerId,
        'receipt',
        receipt._id,
        { receiptNumber, total: receipt.total }
      );

      return receipt;
    } catch (error) {
      console.error('Error creating receipt:', error);
      throw error;
    }
  }

  /**
   * Issue a receipt (mark as issued)
   */
  async issueReceipt(receiptId, userId) {
    try {
      const receipt = await Receipt.findById(receiptId);
      if (!receipt) {
        throw new Error('Receipt not found');
      }

      if (receipt.status !== 'DRAFT') {
        throw new Error(`Cannot issue receipt with status: ${receipt.status}`);
      }

      receipt.status = 'ISSUED';
      receipt.jsonData = JSON.stringify(receipt.toObject());
      receipt.htmlData = this.generateHtmlReceipt(receipt);
      await receipt.save();

      // Log the action
      await this.logAuditAction(
        'RECEIPT_ISSUED',
        userId,
        'receipt',
        receipt._id,
        { status: 'ISSUED', receiptNumber: receipt.receiptNumber }
      );

      return receipt;
    } catch (error) {
      console.error('Error issuing receipt:', error);
      throw error;
    }
  }

  /**
   * Mark receipt as paid
   */
  async markAsPaid(receiptId, userId) {
    try {
      const receipt = await Receipt.findById(receiptId);
      if (!receipt) {
        throw new Error('Receipt not found');
      }

      receipt.status = 'PAID';
      await receipt.save();

      // Log the action
      await this.logAuditAction(
        'RECEIPT_PAID',
        userId,
        'receipt',
        receipt._id,
        { status: 'PAID' }
      );

      return receipt;
    } catch (error) {
      console.error('Error marking receipt as paid:', error);
      throw error;
    }
  }

  /**
   * Mark receipt as completed
   */
  async completeReceipt(receiptId, userId) {
    try {
      const receipt = await Receipt.findById(receiptId);
      if (!receipt) {
        throw new Error('Receipt not found');
      }

      receipt.status = 'COMPLETED';
      await receipt.save();

      // Log the action
      await this.logAuditAction(
        'RECEIPT_COMPLETED',
        userId,
        'receipt',
        receipt._id,
        { status: 'COMPLETED' }
      );

      return receipt;
    } catch (error) {
      console.error('Error completing receipt:', error);
      throw error;
    }
  }

  /**
   * Refund a receipt
   */
  async refundReceipt(receiptId, userId) {
    try {
      const receipt = await Receipt.findById(receiptId);
      if (!receipt) {
        throw new Error('Receipt not found');
      }

      receipt.status = 'REFUNDED';
      await receipt.save();

      // Log the action
      await this.logAuditAction(
        'RECEIPT_REFUNDED',
        userId,
        'receipt',
        receipt._id,
        { status: 'REFUNDED', amount: receipt.total }
      );

      return receipt;
    } catch (error) {
      console.error('Error refunding receipt:', error);
      throw error;
    }
  }

  /**
   * Get receipt by ID
   */
  async getReceiptById(receiptId) {
    try {
      const receipt = await Receipt.findById(receiptId)
        .populate('transactionId')
        .populate('orderId')
        .populate('escrowId')
        .populate('farmerId', 'name phone email')
        .populate('transporterId', 'name phone email');

      return receipt;
    } catch (error) {
      console.error('Error getting receipt:', error);
      throw error;
    }
  }

  /**
   * Get receipt by transaction ID
   */
  async getReceiptByTransactionId(transactionId) {
    try {
      const receipt = await Receipt.findOne({ transactionId })
        .populate('transactionId')
        .populate('orderId')
        .populate('farmerId', 'name phone email')
        .populate('transporterId', 'name phone email');

      return receipt;
    } catch (error) {
      console.error('Error getting receipt by transaction:', error);
      throw error;
    }
  }

  /**
   * Get receipts for a user
   */
  async getReceiptsByUser(userId, role, limit = 50, skip = 0) {
    try {
      const query = role === 'farmer'
        ? { farmerId: userId }
        : { transporterId: userId };

      const receipts = await Receipt.find(query)
        .populate('transactionId')
        .populate('orderId')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      return receipts;
    } catch (error) {
      console.error('Error getting user receipts:', error);
      throw error;
    }
  }

  /**
   * Get receipts by status
   */
  async getReceiptsByStatus(status, limit = 50, skip = 0) {
    try {
      const receipts = await Receipt.find({ status })
        .populate('transactionId')
        .populate('farmerId', 'name phone')
        .populate('transporterId', 'name phone')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      return receipts;
    } catch (error) {
      console.error('Error getting receipts by status:', error);
      throw error;
    }
  }

  /**
   * Add delivery proof to receipt
   */
  async addDeliveryProof(receiptId, proofData, userId) {
    try {
      const receipt = await Receipt.findById(receiptId);
      if (!receipt) {
        throw new Error('Receipt not found');
      }

      receipt.deliveryProof = {
        ...proofData,
        timestamp: new Date()
      };
      await receipt.save();

      // Log the action
      await this.logAuditAction(
        'RECEIPT_DELIVERY_PROOF_ADDED',
        userId,
        'receipt',
        receipt._id,
        { deliveryProof: proofData }
      );

      return receipt;
    } catch (error) {
      console.error('Error adding delivery proof:', error);
      throw error;
    }
  }

  /**
   * Generate HTML representation of receipt
   */
  generateHtmlReceipt(receipt) {
    const itemsHtml = receipt.items
      .map(item => `
        <tr>
          <td>${item.description}</td>
          <td>${item.quantity}</td>
          <td>${item.unitPrice}</td>
          <td>${item.total}</td>
        </tr>
      `)
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt ${receipt.receiptNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; }
          .receipt { max-width: 600px; margin: 20px auto; border: 1px solid #ccc; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .details { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          .total { font-weight: bold; font-size: 18px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h2>RECEIPT</h2>
            <p>Receipt #: ${receipt.receiptNumber}</p>
            <p>Date: ${new Date(receipt.receiptDate).toLocaleDateString()}</p>
          </div>
          <div class="details">
            <p><strong>Subtotal:</strong> ${receipt.subtotal} ${receipt.currency}</p>
            <p><strong>Platform Fee:</strong> ${receipt.platformFee} ${receipt.currency}</p>
            <p><strong>Tax:</strong> ${receipt.tax} ${receipt.currency}</p>
            <p class="total"><strong>Total:</strong> ${receipt.total} ${receipt.currency}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;
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

module.exports = new ReceiptService();