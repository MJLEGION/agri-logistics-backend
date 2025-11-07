const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const { protect } = require('../middleware/auth');

// POST routes
router.post('/', protect, receiptController.createReceipt);

// GET routes - specific routes before generic /:id route
router.get('/my-receipts', protect, receiptController.getMyReceipts);
router.get('/transaction/:transactionId', protect, receiptController.getReceiptByTransaction);

// GET receipt by ID
router.get('/:receiptId', protect, receiptController.getReceiptById);

// GET receipt formats
router.get('/:receiptId/html', protect, receiptController.getReceiptHtml);
router.get('/:receiptId/json', protect, receiptController.getReceiptJson);

// PUT routes
router.put('/:receiptId/issue', protect, receiptController.issueReceipt);
router.put('/:receiptId/pay', protect, receiptController.markAsPaid);
router.put('/:receiptId/complete', protect, receiptController.completeReceipt);
router.put('/:receiptId/refund', protect, receiptController.refundReceipt);
router.put('/:receiptId/delivery-proof', protect, receiptController.addDeliveryProof);

module.exports = router;