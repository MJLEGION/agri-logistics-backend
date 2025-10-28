const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const auth = require('../middleware/auth');

// POST routes
router.post('/', auth, receiptController.createReceipt);

// GET routes - specific routes before generic /:id route
router.get('/my-receipts', auth, receiptController.getMyReceipts);
router.get('/transaction/:transactionId', auth, receiptController.getReceiptByTransaction);

// GET receipt by ID
router.get('/:receiptId', auth, receiptController.getReceiptById);

// GET receipt formats
router.get('/:receiptId/html', auth, receiptController.getReceiptHtml);
router.get('/:receiptId/json', auth, receiptController.getReceiptJson);

// PUT routes
router.put('/:receiptId/issue', auth, receiptController.issueReceipt);
router.put('/:receiptId/pay', auth, receiptController.markAsPaid);
router.put('/:receiptId/complete', auth, receiptController.completeReceipt);
router.put('/:receiptId/refund', auth, receiptController.refundReceipt);
router.put('/:receiptId/delivery-proof', auth, receiptController.addDeliveryProof);

module.exports = router;