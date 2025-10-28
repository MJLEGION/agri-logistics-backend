const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  // References
  escrowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Escrow',
    required: true
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  // Participants
  raisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  raisedByRole: {
    type: String,
    enum: ['farmer', 'transporter'],
    required: true
  },
  // Details
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  evidence: {
    type: mongoose.Schema.Types.Mixed,
    default: null
    // Photos, documents
  },
  // Status
  status: {
    type: String,
    enum: ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'],
    default: 'OPEN'
  },
  resolution: {
    type: String,
    enum: ['REFUNDED', 'RELEASED', 'PARTIAL_REFUND']
  },
  resolutionReason: {
    type: String,
    trim: true
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Dates
  raisedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for performance
disputeSchema.index({ escrowId: 1 });
disputeSchema.index({ transactionId: 1 });
disputeSchema.index({ status: 1 });
disputeSchema.index({ raisedBy: 1 });
disputeSchema.index({ raisedAt: -1 });

module.exports = mongoose.model('Dispute', disputeSchema);