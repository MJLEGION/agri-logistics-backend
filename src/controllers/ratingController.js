const ratingService = require('../services/ratingService');
const Rating = require('../models/rating');
const TransporterStats = require('../models/transporterStats');

/**
 * Create a rating
 */
exports.createRating = async (req, res) => {
  try {
    const { transactionId, transporterId, rating, comment } = req.body;
    const farmerId = req.user.id;
    const farmerName = req.user.name;

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5',
        code: 'INVALID_RATING',
      });
    }

    if (comment && comment.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Comment cannot exceed 1000 characters',
        code: 'COMMENT_TOO_LONG',
      });
    }

    // Create rating
    const newRating = await ratingService.createRating(
      transactionId,
      transporterId,
      farmerId,
      farmerName,
      rating,
      comment
    );

    // Get updated stats
    const stats = await ratingService.getTransporterStats(transporterId);

    res.status(201).json({
      success: true,
      data: {
        ratingId: newRating._id,
        transactionId: newRating.transactionId,
        transporterId: newRating.transporterId,
        rating: newRating.rating,
        comment: newRating.comment,
        sentiment: newRating.sentiment,
        created: true,
        verificationUpdated: !!stats.verifiedBadgeType,
        newVerificationStatus: {
          isVerified: stats.isVerified,
          badgeType: stats.verifiedBadgeType,
          reason: stats.isVerified
            ? `${stats.verifiedBadgeType.toUpperCase()} badge awarded`
            : null,
        },
      },
    });
  } catch (error) {
    if (error.message === 'DUPLICATE_RATING') {
      return res.status(400).json({
        success: false,
        error: 'Rating already exists for this transaction',
        code: 'DUPLICATE_RATING',
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Error creating rating',
    });
  }
};

/**
 * Get transporter stats (public)
 */
exports.getTransporterStats = async (req, res) => {
  try {
    const { transporterId } = req.params;

    const stats = await ratingService.getTransporterStats(transporterId);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Transporter not found',
      });
    }

    res.json({
      success: true,
      data: {
        transporterId: stats.transporterId,
        averageRating: stats.averageRating,
        totalRatings: stats.totalRatings,
        ratingDistribution: stats.ratingDistribution,
        onTimePercentage: stats.onTimePercentage,
        completionPercentage: stats.completionPercentage,
        totalDeliveries: stats.totalDeliveries,
        isVerified: stats.isVerified,
        verifiedBadge: stats.isVerified
          ? {
              badgeType: stats.verifiedBadgeType,
              earnedDate: stats.verifiedDate,
            }
          : null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching stats',
    });
  }
};

/**
 * Get all transporter ratings
 */
exports.getTransporterRatings = async (req, res) => {
  try {
    const { transporterId } = req.params;
    const { limit = 10, skip = 0 } = req.query;

    const { ratings, total } = await ratingService.getTransporterRatings(
      transporterId,
      Math.min(parseInt(limit), 50),
      parseInt(skip)
    );

    res.json({
      success: true,
      data: {
        ratings,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching ratings',
    });
  }
};

/**
 * Get rating by ID
 */
exports.getRatingById = async (req, res) => {
  try {
    const { ratingId } = req.params;

    const rating = await ratingService.getRatingById(ratingId);

    if (!rating) {
      return res.status(404).json({
        success: false,
        error: 'Rating not found',
      });
    }

    res.json({
      success: true,
      data: rating,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching rating',
    });
  }
};

/**
 * Mark rating as helpful
 */
exports.markAsHelpful = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { isHelpful } = req.body;
    const userId = req.user.id;

    const rating = await Rating.findById(ratingId);
    if (!rating) {
      return res.status(404).json({
        success: false,
        error: 'Rating not found',
      });
    }

    if (isHelpful) {
      if (!rating.helpfulUsers) {
        rating.helpfulUsers = [];
      }
      if (!rating.helpfulUsers.includes(userId)) {
        rating.helpfulUsers.push(userId);
        rating.helpfulCount = rating.helpfulUsers.length;
      }
    } else {
      if (!rating.unhelpfulUsers) {
        rating.unhelpfulUsers = [];
      }
      if (!rating.unhelpfulUsers.includes(userId)) {
        rating.unhelpfulUsers.push(userId);
        rating.unhelpfulCount = rating.unhelpfulUsers.length;
      }
    }

    await rating.save();

    res.json({
      success: true,
      data: {
        ratingId: rating._id,
        helpfulCount: rating.helpfulCount,
        unhelpfulCount: rating.unhelpfulCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error marking rating as helpful',
    });
  }
};

/**
 * Get rating statistics
 */
exports.getRatingStats = async (req, res) => {
  try {
    const { transporterId } = req.params;

    const stats = await TransporterStats.findOne({ transporterId });

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Transporter stats not found',
      });
    }

    const ratings = await Rating.find({ transporterId });

    res.json({
      success: true,
      data: {
        totalRatings: stats.totalRatings,
        averageRating: parseFloat(stats.averageRating),
        ratingDistribution: stats.ratingDistribution,
        reputationScore: stats.reputationScore,
        totalReviewCount: ratings.length,
        isVerified: stats.isVerified,
        verifiedBadge: stats.verifiedBadgeType,
        verificationDate: stats.verifiedDate,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching rating stats',
    });
  }
};