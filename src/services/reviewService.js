const Review = require('../models/review');
const Rating = require('../models/rating');
const FlaggedReview = require('../models/flaggedReview');
const TransporterStats = require('../models/transporterStats');

/**
 * Create a new review
 */
const createReview = async (ratingId, transporterId, farmerId, farmerName, reviewText, isPublic = true) => {
  try {
    // Get rating to get sentiment
    const rating = await Rating.findById(ratingId);
    if (!rating) {
      throw new Error('RATING_NOT_FOUND');
    }

    // Analyze sentiment
    const sentiment = analyzeSentiment(reviewText);

    const review = new Review({
      ratingId,
      transporterId,
      farmerId,
      farmerName,
      reviewText,
      sentiment,
      isApproved: false, // Reviews need approval
    });

    await review.save();

    return review;
  } catch (error) {
    throw error;
  }
};

/**
 * Analyze sentiment from review text
 */
const analyzeSentiment = (text) => {
  const positiveWords = [
    'excellent',
    'great',
    'good',
    'amazing',
    'fantastic',
    'professional',
    'reliable',
    'on time',
    'satisfied',
    'perfect',
    'wonderful',
    'helpful',
  ];
  const negativeWords = [
    'bad',
    'terrible',
    'poor',
    'disappointing',
    'late',
    'unprofessional',
    'rude',
    'unreliable',
    'damaged',
    'broken',
  ];

  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

  if (positiveCount > negativeCount) {
    return 'positive';
  } else if (negativeCount > positiveCount) {
    return 'negative';
  } else {
    return 'neutral';
  }
};

/**
 * Get reviews for a transporter
 */
const getTransporterReviews = async (
  transporterId,
  page = 1,
  limit = 10,
  sortBy = 'recent',
  sentiment = null
) => {
  try {
    limit = Math.min(limit, 50); // Max 50
    const skip = (page - 1) * limit;

    let query = {
      transporterId,
      isApproved: true,
      isFlagged: false,
    };

    if (sentiment) {
      query.sentiment = sentiment;
    }

    let sortOptions = {};
    switch (sortBy) {
      case 'helpful':
        sortOptions = { helpfulCount: -1 };
        break;
      case 'rating':
        sortOptions = { createdAt: -1 }; // Get highest rated first (by join with Rating)
        break;
      default: // 'recent'
        sortOptions = { createdAt: -1 };
    }

    const reviews = await Review.find(query)
      .populate('farmerId', 'name')
      .populate('ratingId', 'rating')
      .sort(sortOptions)
      .limit(limit)
      .skip(skip);

    const total = await Review.countDocuments(query);

    const enrichedReviews = reviews.map(review => ({
      id: review._id,
      ratingId: review.ratingId._id,
      rating: review.ratingId.rating,
      farmerName: review.farmerName,
      reviewText: review.reviewText,
      sentiment: review.sentiment,
      sentimentEmoji: getSentimentEmoji(review.sentiment),
      helpfulCount: review.helpfulCount,
      unhelpfulCount: review.unhelpfulCount,
      isApproved: review.isApproved,
      createdAt: review.createdAt,
    }));

    return {
      reviews: enrichedReviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get sentiment emoji
 */
const getSentimentEmoji = (sentiment) => {
  switch (sentiment) {
    case 'positive':
      return '😊';
    case 'negative':
      return '😞';
    default:
      return '😐';
  }
};

/**
 * Get review analytics
 */
const getReviewAnalytics = async (transporterId) => {
  try {
    const totalReviews = await Review.countDocuments({ transporterId });
    const approvedReviews = await Review.countDocuments({ transporterId, isApproved: true });
    const pendingReviews = await Review.countDocuments({ transporterId, isApproved: false });
    const flaggedReviews = await Review.countDocuments({ transporterId, isFlagged: true });

    const reviews = await Review.find({ transporterId, isApproved: true });

    const sentimentBreakdown = {
      positive: reviews.filter(r => r.sentiment === 'positive').length,
      neutral: reviews.filter(r => r.sentiment === 'neutral').length,
      negative: reviews.filter(r => r.sentiment === 'negative').length,
    };

    const totalHelpfulness = reviews.reduce((sum, r) => sum + r.helpfulCount, 0);
    const averageHelpfulness =
      reviews.length > 0 ? (totalHelpfulness / reviews.length).toFixed(1) : 0;

    const mostHelpfulReview = reviews.reduce((max, review) =>
      review.helpfulCount > (max?.helpfulCount || 0) ? review : max
    );

    const reviewApprovalRate =
      totalReviews > 0 ? ((approvedReviews / totalReviews) * 100).toFixed(1) : 0;

    return {
      totalReviews,
      approvedReviews,
      pendingReviews,
      flaggedReviews,
      sentimentBreakdown,
      averageHelpfulness,
      mostHelpfulReviewId: mostHelpfulReview?._id || null,
      reviewApprovalRate,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Flag a review
 */
const flagReview = async (reviewId, flaggedBy, reason, category) => {
  try {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new Error('REVIEW_NOT_FOUND');
    }

    const flaggedReview = new FlaggedReview({
      reviewId,
      flaggedBy,
      flagReason: reason,
      flagCategory: category,
    });

    await flaggedReview.save();

    // Update review flag status
    review.isFlagged = true;
    review.flagReason = reason;
    review.flaggedBy = flaggedBy;
    review.flaggedAt = new Date();
    await review.save();

    return flaggedReview;
  } catch (error) {
    throw error;
  }
};

/**
 * Approve review
 */
const approveReview = async (reviewId, approvedBy, notes) => {
  try {
    const review = await Review.findByIdAndUpdate(
      reviewId,
      {
        isApproved: true,
        approvalDate: new Date(),
        approvedBy,
      },
      { new: true }
    );

    if (!review) {
      throw new Error('REVIEW_NOT_FOUND');
    }

    return review;
  } catch (error) {
    throw error;
  }
};

/**
 * Reject review
 */
const rejectReview = async (reviewId, reason) => {
  try {
    const review = await Review.findByIdAndRemove(reviewId);

    if (!review) {
      throw new Error('REVIEW_NOT_FOUND');
    }

    return review;
  } catch (error) {
    throw error;
  }
};

/**
 * Get pending reviews for moderation
 */
const getPendingReviews = async (page = 1, limit = 20) => {
  try {
    limit = Math.min(limit, 50);
    const skip = (page - 1) * limit;

    const pendingReviews = await Review.find({ isApproved: false })
      .populate('transporterId', 'name')
      .populate('farmerId', 'name')
      .sort({ createdAt: 1 })
      .limit(limit)
      .skip(skip);

    const total = await Review.countDocuments({ isApproved: false });

    const enrichedReviews = await Promise.all(
      pendingReviews.map(async review => {
        const flagCount = await FlaggedReview.countDocuments({ reviewId: review._id });
        return {
          id: review._id,
          transporterId: review.transporterId._id,
          transporterName: review.transporterId.name,
          farmerName: review.farmerName,
          reviewText: review.reviewText,
          flagCount,
          isFlagged: review.isFlagged,
          submittedAt: review.createdAt,
        };
      })
    );

    return {
      reviews: enrichedReviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get review by ID
 */
const getReviewById = async (reviewId) => {
  try {
    const review = await Review.findById(reviewId)
      .populate('ratingId')
      .populate('transporterId', 'name phone')
      .populate('farmerId', 'name phone');

    return review;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createReview,
  getTransporterReviews,
  getReviewAnalytics,
  flagReview,
  approveReview,
  rejectReview,
  getPendingReviews,
  getReviewById,
  analyzeSentiment,
};