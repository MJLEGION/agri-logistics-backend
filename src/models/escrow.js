const mongoose = require('mongoose');

const escrowSchema = new mongoose.Schema({
  // References
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true,
    unique: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
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
  // Amount
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'RWF'
  },
  // Status
  status: {
    type: String,
    enum: ['HELD', 'RELEASED', 'REFUNDED', 'DISPUTED'],
    default: 'HELD'
  },
  // Dates
  heldAt: {
    type: Date,
    default: Date.now
  },
  heldUntil: {
    type: Date,
    required: true
  },
  releasedAt: {
    type: Date
  },
  refundedAt: {
    type: Date
  },
  // Reasons for action
  releaseReason: {
    type: String,
    trim: true
  },
  refundReason: {
    type: String,
    trim: true
  },
  disputeReason: {
    type: String,
    trim: true
  },
  disputedBy: {
    type: String,
    enum: ['farmer', 'transporter']
  },
  // Evidence
  disputeEvidence: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  // Payment method
  paymentMethod: {
    type: String,
    enum: ['momo', 'airtel', 'card', 'bank']
  },
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for performance
escrowSchema.index({ transactionId: 1 });
escrowSchema.index({ status: 1 });
escrowSchema.index({ heldUntil: 1 });
escrowSchema.index({ farmerId: 1 });
escrowSchema.index({ transporterId: 1 });

module.exports = mongoose.model('Escrow', escrowSchema);