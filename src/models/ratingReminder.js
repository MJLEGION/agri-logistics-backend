const mongoose = require('mongoose');

const ratingReminderSchema = new mongoose.Schema(
  {
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
      unique: true,
    },
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    transporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reminderCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastReminderSent: {
      type: Date,
    },
    isRated: {
      type: Boolean,
      default: false,
    },
    ratedAt: {
      type: Date,
    },
    reminderSchedule: {
      type: [Date],
      default: [],
    },
  },
  { timestamps: true }
);

// Index for performance
ratingReminderSchema.index({ farmerId: 1 });
ratingReminderSchema.index({ isRated: 1 });
ratingReminderSchema.index({ transactionId: 1 });
ratingReminderSchema.index({ lastReminderSent: 1 });

module.exports = mongoose.model('RatingReminder', ratingReminderSchema);