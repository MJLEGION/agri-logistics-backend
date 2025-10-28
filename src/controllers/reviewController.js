const reviewService = require('../services/reviewService');
const ratingService = require('../services/ratingService');
const Review = require('../models/review');

/**
 * Create a review
 */
exports.createReview = async (req, res) => {
  try {
    const { ratingId, transporterId, reviewText, isPublic = true } = req.body;
    const farmerId = req.user.id;
    const farmerName = req.user.name;

    // Validation
    if (!reviewText || reviewText.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Review must be at least 10 characters long',
        code: 'REVIEW_TOO_SHORT',
      });
    }

    if (reviewText.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Review cannot exceed 5000 characters',
        code: 'REVIEW_TOO_LONG',
      });
    }

    // Create review
    const review = await reviewService.createReview(
      ratingId,
      transporterId,
      farmerId,
      farmerName,
      reviewText,
      isPublic
    );

    res.status(201).json({
      success: true,
      data: {
        reviewId: review._id,
        ratingId: review.ratingId,
        sentiment: review.sentiment,
        isApproved: review.isApproved,
        message: 'Review submitted for approval. You will see it published once approved.',
      },
    });
  } catch (error) {
    if (error.message === 'RATING_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'Rating not found',
        code: 'RATING_NOT_FOUND',
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Error creating review',
    });
  }
};

/**
 * Get transporter reviews (public)
 */
exports.getTransporterReviews = async (req, res) => {
  try {
    const { transporterId } = req.params;
    const { page = 1, limit = 10, sortBy = 'recent', sentiment } = req.query;

    const result = await reviewService.getTransporterReviews(
      transporterId,
      parseInt(page),
      parseInt(limit),
      sortBy,
      sentiment
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching reviews',
    });
  }
};

/**
 * Get review analytics (public)
 */
exports.getReviewAnalytics = async (req, res) => {
  try {
    const { transporterId } = req.params;

    const analytics = await reviewService.getReviewAnalytics(transporterId);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching analytics',
    });
  }
};

/**
 * Mark review as helpful
 */
exports.markAsHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { isHelpful } = req.body;
    const userId = req.user.id;

    const review = await reviewService.markAsHelpful(reviewId, userId, isHelpful);

    res.json({
      success: true,
      data: {
        reviewId: review._id,
        helpfulCount: review.helpfulCount,
        unhelpfulCount: review.unhelpfulCount,
      },
    });
  } catch (error) {
    if (error.message === 'REVIEW_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'Review not found',
        code: 'REVIEW_NOT_FOUND',
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Error marking review as helpful',
    });
  }
};

/**
 * Flag a review (moderation)
 */
exports.flagReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason, category } = req.body;
    const flaggedBy = req.user.id;

    // Validation
    const validCategories = ['spam', 'profanity', 'inappropriate', 'fake', 'harassment', 'external'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid flag category',
        code: 'INVALID_CATEGORY',
      });
    }

    const flaggedReview = await reviewService.flagReview(reviewId, flaggedBy, reason, category);

    res.status(201).json({
      success: true,
      data: {
        flagId: flaggedReview._id,
        reviewId: flaggedReview.reviewId,
        status: flaggedReview.status,
      },
    });
  } catch (error) {
    if (error.message === 'REVIEW_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'Review not found',
        code: 'REVIEW_NOT_FOUND',
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Error flagging review',
    });
  }
};

/**
 * Get review by ID
 */
exports.getReviewById = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await reviewService.getReviewById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found',
      });
    }

    res.json({
      success: true,
      data: review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching review',
    });
  }
};