const mongoose = require('mongoose');

const transporterStatsSchema = new mongoose.Schema(
  {
    transporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
      min: 0,
    },
    ratingDistribution: {
      '5': { type: Number, default: 0 },
      '4': { type: Number, default: 0 },
      '3': { type: Number, default: 0 },
      '2': { type: Number, default: 0 },
      '1': { type: Number, default: 0 },
    },
    onTimePercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    completionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    totalDeliveries: {
      type: Number,
      default: 0,
      min: 0,
    },
    successfulDeliveries: {
      type: Number,
      default: 0,
      min: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedBadgeType: {
      type: String,
      enum: ['gold', 'silver', 'bronze', null],
      default: null,
    },
    verifiedDate: {
      type: Date,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reputationScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for performance
transporterStatsSchema.index({ transporterId: 1 });
transporterStatsSchema.index({ averageRating: -1 });
transporterStatsSchema.index({ isVerified: 1 });
transporterStatsSchema.index({ verifiedBadgeType: 1 });
transporterStatsSchema.index({ reputationScore: -1 });

module.exports = mongoose.model('TransporterStats', transporterStatsSchema);