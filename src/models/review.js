const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    ratingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rating',
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
    farmerName: {
      type: String,
      required: true,
    },
    reviewText: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 5000,
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      required: true,
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
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvalDate: {
      type: Date,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flagReason: {
      type: String,
    },
    flaggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    flaggedAt: {
      type: Date,
    },
    usersWhoFound: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    usersWhoDisliked: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
  },
  { timestamps: true }
);

// Index for performance
reviewSchema.index({ transporterId: 1 });
reviewSchema.index({ isApproved: 1 });
reviewSchema.index({ isFlagged: 1 });
reviewSchema.index({ sentiment: 1 });
reviewSchema.index({ createdAt: 1 });
reviewSchema.index({ transporterId: 1, isApproved: 1 });

module.exports = mongoose.model('Review', reviewSchema);