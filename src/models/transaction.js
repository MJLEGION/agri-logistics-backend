const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
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
  // Order details
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  cropId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crop'
  },
  cargoDescription: {
    type: String,
    required: true,
    trim: true
  },
  pickupLocation: {
    type: String,
    required: true
  },
  dropoffLocation: {
    type: String,
    required: true
  },
  // Dates
  pickupTime: {
    type: Date,
    required: true
  },
  estimatedDeliveryTime: {
    type: Date,
    required: true
  },
  actualDeliveryTime: {
    type: Date
  },
  // Payment details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'RWF'
  },
  paymentMethod: {
    type: String,
    enum: ['momo', 'airtel', 'card', 'bank'],
    required: true
  },
  // Status
  status: {
    type: String,
    enum: [
      'INITIATED',
      'PAYMENT_PROCESSING',
      'PAYMENT_CONFIRMED',
      'ESCROW_HELD',
      'IN_TRANSIT',
      'DELIVERED',
      'COMPLETED',
      'FAILED',
      'CANCELLED',
      'DISPUTED',
      'REFUNDED'
    ],
    default: 'INITIATED'
  },
  // Reference IDs
  escrowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Escrow'
  },
  receiptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Receipt'
  },
  paymentReference: {
    type: String,
    unique: true,
    sparse: true
  },
  // Tracking
  trackingNumber: {
    type: String,
    unique: true,
    sparse: true
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
transactionSchema.index({ farmerId: 1 });
transactionSchema.index({ transporterId: 1 });
transactionSchema.index({ orderId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ paymentReference: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);