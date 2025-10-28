const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  // References
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true,
    unique: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  escrowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Escrow'
  },
  // Participants
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Receipt details
  receiptNumber: {
    type: String,
    required: true,
    unique: true
  },
  receiptDate: {
    type: Date,
    default: Date.now
  },
  // Amounts (breakdown)
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  platformFee: {
    type: Number,
    default: 0,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'RWF'
  },
  // Line items
  items: {
    type: Array,
    required: true,
    // Array of {description, quantity, unitPrice, total}
  },
  // Status
  status: {
    type: String,
    enum: ['DRAFT', 'ISSUED', 'PAID', 'COMPLETED', 'REFUNDED'],
    default: 'DRAFT'
  },
  // Delivery proof
  deliveryProof: {
    type: mongoose.Schema.Types.Mixed,
    default: null
    // {location, photo, timestamp, signature, otp}
  },
  // Formats
  jsonData: {
    type: String
  },
  htmlData: {
    type: String
  },
  // Email tracking
  emailSentToFarmer: {
    type: Boolean,
    default: false
  },
  emailSentToTransporter: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date
  },
  // Print tracking
  printCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastPrintedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for performance
receiptSchema.index({ transactionId: 1 });
receiptSchema.index({ receiptNumber: 1 });
receiptSchema.index({ farmerId: 1 });
receiptSchema.index({ transporterId: 1 });
receiptSchema.index({ status: 1 });
receiptSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Receipt', receiptSchema);