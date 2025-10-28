const reviewService = require('../services/reviewService');
const verificationService = require('../services/verificationService');
const Review = require('../models/review');
const FlaggedReview = require('../models/flaggedReview');

/**
 * Approve a review
 */
exports.approveReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { notes } = req.body;
    const approvedBy = req.user.id;

    const review = await reviewService.approveReview(reviewId, approvedBy, notes);

    res.json({
      success: true,
      data: {
        reviewId: review._id,
        isApproved: review.isApproved,
        approvalDate: review.approvalDate,
      },
    });
  } catch (error) {
    if (error.message === 'REVIEW_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'Review not found',
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Error approving review',
    });
  }
};

/**
 * Reject a review
 */
exports.rejectReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;

    const review = await reviewService.rejectReview(reviewId, reason);

    res.json({
      success: true,
      data: {
        reviewId: review._id,
        status: 'rejected',
        reason,
      },
    });
  } catch (error) {
    if (error.message === 'REVIEW_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'Review not found',
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Error rejecting review',
    });
  }
};

/**
 * Get pending reviews for moderation
 */
exports.getPendingReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const result = await reviewService.getPendingReviews(parseInt(page), parseInt(limit));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching pending reviews',
    });
  }
};

/**
 * Get flagged reviews
 */
exports.getFlaggedReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'pending' } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const flaggedReviews = await FlaggedReview.find({ status })
      .populate('reviewId')
      .populate('flaggedBy', 'name')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await FlaggedReview.countDocuments({ status });

    res.json({
      success: true,
      data: {
        flaggedReviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching flagged reviews',
    });
  }
};

/**
 * Review flagged review
 */
exports.reviewFlaggedReview = async (req, res) => {
  try {
    const { flagId } = req.params;
    const { status, notes } = req.body;
    const reviewedBy = req.user.id;

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be approved or rejected',
      });
    }

    const flaggedReview = await FlaggedReview.findByIdAndUpdate(
      flagId,
      {
        status,
        reviewedBy,
        reviewDate: new Date(),
        notes,
      },
      { new: true }
    );

    if (!flaggedReview) {
      return res.status(404).json({
        success: false,
        error: 'Flagged review not found',
      });
    }

    // If approved, remove the review
    if (status === 'approved') {
      await Review.findByIdAndRemove(flaggedReview.reviewId);
    }

    res.json({
      success: true,
      data: {
        flagId: flaggedReview._id,
        status: flaggedReview.status,
        reviewDate: flaggedReview.reviewDate,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error reviewing flagged review',
    });
  }
};

/**
 * Manually verify a transporter
 */
exports.verifyTransporter = async (req, res) => {
  try {
    const { transporterId } = req.params;
    const { badgeType, reason } = req.body;
    const verifiedBy = req.user.id;

    // Validation
    const validBadges = ['gold', 'silver', 'bronze'];
    if (!validBadges.includes(badgeType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid badge type. Must be gold, silver, or bronze',
      });
    }

    const stats = await verificationService.manuallyVerify(
      transporterId,
      badgeType,
      verifiedBy,
      reason
    );

    res.json({
      success: true,
      data: {
        transporterId: stats.transporterId,
        isVerified: stats.isVerified,
        badgeType: stats.verifiedBadgeType,
        verifiedDate: stats.verifiedDate,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error verifying transporter',
    });
  }
};

/**
 * Revoke transporter verification
 */
exports.revokeVerification = async (req, res) => {
  try {
    const { transporterId } = req.params;
    const { reason } = req.body;
    const revokedBy = req.user.id;

    const stats = await verificationService.revokeVerification(
      transporterId,
      revokedBy,
      reason
    );

    res.json({
      success: true,
      data: {
        transporterId: stats.transporterId,
        isVerified: stats.isVerified,
        revokedDate: new Date(),
      },
    });
  } catch (error) {
    if (error.message === 'TRANSPORTER_STATS_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'Transporter stats not found',
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Error revoking verification',
    });
  }
};

/**
 * Downgrade transporter verification
 */
exports.downgradeVerification = async (req, res) => {
  try {
    const { transporterId } = req.params;
    const { newBadgeType, reason } = req.body;
    const revokedBy = req.user.id;

    // Validation
    const validBadges = ['gold', 'silver', 'bronze'];
    if (!validBadges.includes(newBadgeType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid badge type. Must be gold, silver, or bronze',
      });
    }

    const stats = await verificationService.downgradeVerification(
      transporterId,
      newBadgeType,
      revokedBy,
      reason
    );

    res.json({
      success: true,
      data: {
        transporterId: stats.transporterId,
        newBadgeType: stats.verifiedBadgeType,
        reason,
      },
    });
  } catch (error) {
    if (error.message === 'TRANSPORTER_STATS_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'Transporter stats not found',
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Error downgrading verification',
    });
  }
};

/**
 * Get verification history
 */
exports.getVerificationHistory = async (req, res) => {
  try {
    const { transporterId } = req.params;

    const history = await verificationService.getVerificationHistory(transporterId);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching verification history',
    });
  }
};

/**
 * Get top verified transporters
 */
exports.getTopVerifiedTransporters = async (req, res) => {
  try {
    const { limit = 10, badgeType } = req.query;

    const transporters = await verificationService.getTopVerifiedTransporters(
      parseInt(limit),
      badgeType
    );

    res.json({
      success: true,
      data: transporters,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching verified transporters',
    });
  }
};