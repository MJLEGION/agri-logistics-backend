const Rating = require('../models/rating');
const Review = require('../models/review');
const TransporterStats = require('../models/transporterStats');
const VerificationHistory = require('../models/verificationHistory');
const RatingReminder = require('../models/ratingReminder');

/**
 * Analyze sentiment based on rating
 */
const analyzeSentiment = (rating, comment = '') => {
  if (rating >= 4) {
    return 'positive';
  } else if (rating === 3) {
    return 'neutral';
  } else {
    return 'negative';
  }
};

/**
 * Create a new rating
 */
const createRating = async (transactionId, transporterId, farmerId, farmername, ratingValue, comment) => {
  try {
    // Check if rating already exists
    const existingRating = await Rating.findOne({ transactionId });
    if (existingRating) {
      throw new Error('DUPLICATE_RATING');
    }

    const sentiment = analyzeSentiment(ratingValue, comment);

    const rating = new Rating({
      transactionId,
      transporterId,
      farmerId,
      rating: ratingValue,
      comment,
      sentiment,
    });

    await rating.save();

    // Update transporter stats
    await updateTransporterStats(transporterId);

    // Mark rating reminder as rated
    await RatingReminder.findOneAndUpdate(
      { transactionId },
      { isRated: true, ratedAt: new Date() }
    );

    return rating;
  } catch (error) {
    throw error;
  }
};

/**
 * Update transporter statistics
 */
const updateTransporterStats = async (transporterId) => {
  try {
    const ratings = await Rating.find({ transporterId });

    if (ratings.length === 0) {
      return;
    }

    // Calculate average rating
    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = (totalRating / ratings.length).toFixed(2);

    // Calculate rating distribution
    const distribution = {
      '5': ratings.filter(r => r.rating === 5).length,
      '4': ratings.filter(r => r.rating === 4).length,
      '3': ratings.filter(r => r.rating === 3).length,
      '2': ratings.filter(r => r.rating === 2).length,
      '1': ratings.filter(r => r.rating === 1).length,
    };

    // Calculate reputation score
    const reputationScore =
      distribution['5'] * 10 +
      distribution['4'] * 7 +
      distribution['3'] * 5 +
      distribution['2'] * 2 +
      distribution['1'] * 0;

    // Determine verification badge
    let verificationUpdate = {};
    const currentStats = await TransporterStats.findOne({ transporterId });

    if (!currentStats || !currentStats.isVerified) {
      // Auto-verification criteria
      if (ratings.length >= 20 && averageRating >= 4.5) {
        verificationUpdate.isVerified = true;
        verificationUpdate.verifiedBadgeType = 'gold';
        verificationUpdate.verifiedDate = new Date();

        // Record verification
        await VerificationHistory.create({
          transporterId,
          badgeType: 'gold',
          action: 'granted',
          reason: 'Auto-verified: Achieved 20+ ratings with 4.5+ average',
          autoVerified: true,
        });
      } else if (ratings.length >= 10 && averageRating >= 4.0) {
        verificationUpdate.isVerified = true;
        verificationUpdate.verifiedBadgeType = 'silver';
        verificationUpdate.verifiedDate = new Date();

        // Record verification
        await VerificationHistory.create({
          transporterId,
          badgeType: 'silver',
          action: 'granted',
          reason: 'Auto-verified: Achieved 10+ ratings with 4.0+ average',
          autoVerified: true,
        });
      } else if (ratings.length >= 5 && averageRating >= 3.5) {
        verificationUpdate.isVerified = true;
        verificationUpdate.verifiedBadgeType = 'bronze';
        verificationUpdate.verifiedDate = new Date();

        // Record verification
        await VerificationHistory.create({
          transporterId,
          badgeType: 'bronze',
          action: 'granted',
          reason: 'Auto-verified: Achieved 5+ ratings with 3.5+ average',
          autoVerified: true,
        });
      }
    }

    // Update or create stats
    const updatedStats = await TransporterStats.findOneAndUpdate(
      { transporterId },
      {
        averageRating,
        totalRatings: ratings.length,
        ratingDistribution: distribution,
        reputationScore,
        lastUpdated: new Date(),
        ...verificationUpdate,
      },
      { upsert: true, new: true }
    );

    return updatedStats;
  } catch (error) {
    console.error('Error updating transporter stats:', error);
    throw error;
  }
};

/**
 * Get transporter statistics
 */
const getTransporterStats = async (transporterId) => {
  try {
    let stats = await TransporterStats.findOne({ transporterId });

    if (!stats) {
      stats = new TransporterStats({ transporterId });
      await stats.save();
    }

    return stats;
  } catch (error) {
    throw error;
  }
};

/**
 * Mark review as helpful
 */
const markAsHelpful = async (reviewId, userId, isHelpful) => {
  try {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new Error('REVIEW_NOT_FOUND');
    }

    if (isHelpful) {
      // Add to helpful
      if (!review.usersWhoFound.includes(userId)) {
        review.usersWhoFound.push(userId);
        review.helpfulCount = review.usersWhoFound.length;

        // Remove from disliked if present
        review.usersWhoDisliked = review.usersWhoDisliked.filter(
          id => id.toString() !== userId.toString()
        );
        review.unhelpfulCount = review.usersWhoDisliked.length;
      }
    } else {
      // Add to unhelpful
      if (!review.usersWhoDisliked.includes(userId)) {
        review.usersWhoDisliked.push(userId);
        review.unhelpfulCount = review.usersWhoDisliked.length;

        // Remove from helpful if present
        review.usersWhoFound = review.usersWhoFound.filter(
          id => id.toString() !== userId.toString()
        );
        review.helpfulCount = review.usersWhoFound.length;
      }
    }

    await review.save();
    return review;
  } catch (error) {
    throw error;
  }
};

/**
 * Get rating by ID with populated references
 */
const getRatingById = async (ratingId) => {
  try {
    const rating = await Rating.findById(ratingId)
      .populate('transporterId', 'name phone')
      .populate('farmerId', 'name phone');

    return rating;
  } catch (error) {
    throw error;
  }
};

/**
 * Get transporter ratings
 */
const getTransporterRatings = async (transporterId, limit = 10, skip = 0) => {
  try {
    const ratings = await Rating.find({ transporterId })
      .populate('farmerId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Rating.countDocuments({ transporterId });

    return { ratings, total };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createRating,
  updateTransporterStats,
  getTransporterStats,
  markAsHelpful,
  getRatingById,
  getTransporterRatings,
  analyzeSentiment,
};