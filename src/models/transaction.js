const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referenceId: {
    type: String,
    required: true,
    unique: true
  },
  flutterwaveId: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'RWF'
  },
  phoneNumber: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['momo', 'airtel'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'verified'],
    default: 'pending'
  },
  metadata: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);