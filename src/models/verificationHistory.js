const mongoose = require('mongoose');

const verificationHistorySchema = new mongoose.Schema(
  {
    transporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    badgeType: {
      type: String,
      enum: ['gold', 'silver', 'bronze'],
    },
    action: {
      type: String,
      enum: ['granted', 'revoked', 'downgraded'],
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    autoVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for performance
verificationHistorySchema.index({ transporterId: 1 });
verificationHistorySchema.index({ action: 1 });
verificationHistorySchema.index({ createdAt: 1 });

module.exports = mongoose.model('VerificationHistory', verificationHistorySchema);