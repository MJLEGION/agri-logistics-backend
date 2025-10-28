const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
    },
    transporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      maxlength: 1000,
      trim: true,
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral',
    },
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    unhelpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isVerifiedRating: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for performance
ratingSchema.index({ transporterId: 1 });
ratingSchema.index({ farmerId: 1 });
ratingSchema.index({ createdAt: 1 });
ratingSchema.index({ rating: 1 });
ratingSchema.index({ transactionId: 1 }, { unique: true }); // One rating per transaction

module.exports = mongoose.model('Rating', ratingSchema);