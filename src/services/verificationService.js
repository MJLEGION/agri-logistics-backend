const TransporterStats = require('../models/transporterStats');
const VerificationHistory = require('../models/verificationHistory');
const Rating = require('../models/rating');

/**
 * Manually verify a transporter
 */
const manuallyVerify = async (transporterId, badgeType, verifiedBy, reason) => {
  try {
    let stats = await TransporterStats.findOne({ transporterId });

    if (!stats) {
      stats = new TransporterStats({ transporterId });
    }

    stats.isVerified = true;
    stats.verifiedBadgeType = badgeType;
    stats.verifiedDate = new Date();
    stats.verifiedBy = verifiedBy;

    await stats.save();

    // Record in verification history
    await VerificationHistory.create({
      transporterId,
      badgeType,
      action: 'granted',
      reason,
      verifiedBy,
      autoVerified: false,
    });

    return stats;
  } catch (error) {
    throw error;
  }
};

/**
 * Revoke verification
 */
const revokeVerification = async (transporterId, revokedBy, reason) => {
  try {
    let stats = await TransporterStats.findOne({ transporterId });

    if (!stats) {
      throw new Error('TRANSPORTER_STATS_NOT_FOUND');
    }

    const previousBadgeType = stats.verifiedBadgeType;

    stats.isVerified = false;
    stats.verifiedBadgeType = null;
    stats.verifiedDate = null;
    stats.verifiedBy = null;

    await stats.save();

    // Record in verification history
    await VerificationHistory.create({
      transporterId,
      badgeType: previousBadgeType,
      action: 'revoked',
      reason,
      verifiedBy: revokedBy,
    });

    return stats;
  } catch (error) {
    throw error;
  }
};

/**
 * Downgrade verification badge
 */
const downgradeVerification = async (transporterId, newBadgeType, revokedBy, reason) => {
  try {
    let stats = await TransporterStats.findOne({ transporterId });

    if (!stats) {
      throw new Error('TRANSPORTER_STATS_NOT_FOUND');
    }

    const previousBadgeType = stats.verifiedBadgeType;

    stats.verifiedBadgeType = newBadgeType;

    await stats.save();

    // Record in verification history
    await VerificationHistory.create({
      transporterId,
      badgeType: newBadgeType,
      action: 'downgraded',
      reason: `Downgraded from ${previousBadgeType} to ${newBadgeType}: ${reason}`,
      verifiedBy: revokedBy,
    });

    return stats;
  } catch (error) {
    throw error;
  }
};

/**
 * Get verification history
 */
const getVerificationHistory = async (transporterId) => {
  try {
    const history = await VerificationHistory.find({ transporterId })
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 });

    return history;
  } catch (error) {
    throw error;
  }
};

/**
 * Check if auto-verification criteria are met
 */
const checkAutoVerification = async (transporterId) => {
  try {
    const ratings = await Rating.find({ transporterId });

    if (ratings.length === 0) {
      return null;
    }

    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / ratings.length;

    let badgeEligible = null;

    if (ratings.length >= 20 && averageRating >= 4.5) {
      badgeEligible = 'gold';
    } else if (ratings.length >= 10 && averageRating >= 4.0) {
      badgeEligible = 'silver';
    } else if (ratings.length >= 5 && averageRating >= 3.5) {
      badgeEligible = 'bronze';
    }

    return badgeEligible;
  } catch (error) {
    throw error;
  }
};

/**
 * Get transporter verification status
 */
const getVerificationStatus = async (transporterId) => {
  try {
    const stats = await TransporterStats.findOne({ transporterId });

    if (!stats) {
      return {
        isVerified: false,
        badgeType: null,
      };
    }

    return {
      isVerified: stats.isVerified,
      badgeType: stats.verifiedBadgeType,
      verifiedDate: stats.verifiedDate,
      verifiedBy: stats.verifiedBy,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get top verified transporters
 */
const getTopVerifiedTransporters = async (limit = 10, badgeType = null) => {
  try {
    let query = { isVerified: true };

    if (badgeType) {
      query.verifiedBadgeType = badgeType;
    }

    const transporters = await TransporterStats.find(query)
      .sort({ averageRating: -1, totalRatings: -1 })
      .limit(limit)
      .populate('transporterId', 'name phone');

    return transporters;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  manuallyVerify,
  revokeVerification,
  downgradeVerification,
  getVerificationHistory,
  checkAutoVerification,
  getVerificationStatus,
  getTopVerifiedTransporters,
};