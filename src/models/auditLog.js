const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // What happened
  action: {
    type: String,
    required: true,
    trim: true
    // Examples: PAYMENT_INITIATED, ESCROW_CREATED, TRANSACTION_COMPLETED
  },
  // Who did it
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  // What changed
  entityType: {
    type: String,
    trim: true
    // 'transaction', 'escrow', 'payment', 'receipt', 'dispute', etc.
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
    // Before/after values
  },
  // Context
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Status
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String,
    trim: true
  }
}, {
  timestamps: {
    createdAt: true,
    updatedAt: false
  }
});

// Indexes for performance
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ entityType: 1 });
auditLogSchema.index({ entityId: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);