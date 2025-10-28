const mongoose = require('mongoose');

const flaggedReviewSchema = new mongoose.Schema(
  {
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
      required: true,
    },
    flaggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    flagReason: {
      type: String,
      required: true,
    },
    flagCategory: {
      type: String,
      enum: ['spam', 'profanity', 'inappropriate', 'fake', 'harassment', 'external'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewDate: {
      type: Date,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

// Index for performance
flaggedReviewSchema.index({ reviewId: 1 });
flaggedReviewSchema.index({ status: 1 });
flaggedReviewSchema.index({ createdAt: 1 });
flaggedReviewSchema.index({ flagCategory: 1 });

module.exports = mongoose.model('FlaggedReview', flaggedReviewSchema);