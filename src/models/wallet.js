const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'RWF'
  },
  // Transaction statistics
  totalEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  totalRefunded: {
    type: Number,
    default: 0,
    min: 0
  },
  // Linked payment accounts
  momoPhoneNumber: {
    type: String,
    trim: true
  },
  airtelPhoneNumber: {
    type: String,
    trim: true
  },
  bankAccount: {
    type: String,
    trim: true
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'frozen', 'closed'],
    default: 'active'
  },
  // Account verification
  kycVerified: {
    type: Boolean,
    default: false
  },
  kycVerifiedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for quick lookups
walletSchema.index({ userId: 1 });
walletSchema.index({ status: 1 });

module.exports = mongoose.model('Wallet', walletSchema);