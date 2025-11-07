const Rating = require('../models/rating');
const Review = require('../models/review');
const Transporter = require('../models/transporter');
const Order = require('../models/order');
const User = require('../models/user');
const logger = require('../config/logger');

/**
 * RATING CONTROLLER
 * Handles ratings and reviews for transporters and users
 */

// @desc    Create rating
// @route   POST /api/ratings
// @access  Private
exports.createRating = async (req, res) => {
  try {
    const {
      ratedUserId,
      tripId,
      rating,
      comment,
      cleanliness,
      professionalism,
      timeliness,
      communication,
    } = req.body;

    // Validation
    if (!ratedUserId || !rating) {
      return res.status(400).json({
        success: false,
        error: 'Rated user ID and rating score required',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5',
      });
    }

    // Verify trip exists if provided
    if (tripId) {
      const trip = await Order.findById(tripId);
      if (!trip) {
        return res.status(404).json({
          success: false,
          error: 'Trip not found',
        });
      }

      // Verify trip is completed
      if (trip.status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Can only rate completed trips',
        });
      }
    }

    // Check if user already rated this transporter for this trip
    const existingRating = await Rating.findOne({
      ratedUserId,
      ratingUserId: req.user.id,
      tripId,
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        error: 'You have already rated this transporter for this trip',
      });
    }

    // Create rating
    const newRating = new Rating({
      ratedUserId,
      ratingUserId: req.user.id,
      tripId,
      rating,
      comment: comment || '',
      cleanliness: cleanliness || rating,
      professionalism: professionalism || rating,
      timeliness: timeliness || rating,
      communication: communication || rating,
    });

    await newRating.save();

    // Update transporter average rating
    await updateTransporterRating(ratedUserId);

    logger.info(`Rating created: ${newRating._id} for user ${ratedUserId}`);

    res.status(201).json({
      success: true,
      data: await newRating.populate('ratingUserId', 'name phone'),
      message: 'Rating submitted successfully',
    });
  } catch (error) {
    logger.error('Error creating rating:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get ratings for user
// @route   GET /api/ratings/user/:userId
// @access  Public
exports.getUserRatings = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const ratings = await Rating.find({ ratedUserId: req.params.userId })
      .populate('ratingUserId', 'name phone role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Rating.countDocuments({ ratedUserId: req.params.userId });

    // Calculate statistics
    const stats = await Rating.aggregate([
      { $match: { ratedUserId: req.params.userId } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          avgCleanliness: { $avg: '$cleanliness' },
          avgProfessionalism: { $avg: '$professionalism' },
          avgTimeliness: { $avg: '$timeliness' },
          avgCommunication: { $avg: '$communication' },
          totalRatings: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: ratings,
      stats: stats[0] || {
        avgRating: 0,
        avgCleanliness: 0,
        avgProfessionalism: 0,
        avgTimeliness: 0,
        avgCommunication: 0,
        totalRatings: 0,
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get transporter ratings and stats
// @route   GET /api/ratings/transporter/:transporterId/stats
// @access  Public
exports.getTransporterStats = async (req, res) => {
  try {
    const { transporterId } = req.params;

    // Get user info
    const user = await User.findById(transporterId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Transporter not found',
      });
    }

    // Get transporter profile
    const transporter = await Transporter.findOne({ userId: transporterId });

    // Get ratings stats
    const stats = await Rating.aggregate([
      { $match: { ratedUserId: transporterId } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          avgCleanliness: { $avg: '$cleanliness' },
          avgProfessionalism: { $avg: '$professionalism' },
          avgTimeliness: { $avg: '$timeliness' },
          avgCommunication: { $avg: '$communication' },
          totalRatings: { $sum: 1 },
          fiveStarCount: {
            $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] },
          },
          fourStarCount: {
            $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] },
          },
          threeStarCount: {
            $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] },
          },
          twoStarCount: {
            $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] },
          },
          oneStarCount: {
            $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] },
          },
        },
      },
    ]);

    const ratingStats = stats[0] || {
      avgRating: 0,
      avgCleanliness: 0,
      avgProfessionalism: 0,
      avgTimeliness: 0,
      avgCommunication: 0,
      totalRatings: 0,
      fiveStarCount: 0,
      fourStarCount: 0,
      threeStarCount: 0,
      twoStarCount: 0,
      oneStarCount: 0,
    };

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
        transporter: transporter || null,
        ratings: {
          average: parseFloat(ratingStats.avgRating.toFixed(2)),
          total: ratingStats.totalRatings,
          breakdown: {
            fiveStar: ratingStats.fiveStarCount,
            fourStar: ratingStats.fourStarCount,
            threeStar: ratingStats.threeStarCount,
            twoStar: ratingStats.twoStarCount,
            oneStar: ratingStats.oneStarCount,
          },
          categories: {
            cleanliness: parseFloat(ratingStats.avgCleanliness.toFixed(2)),
            professionalism: parseFloat(ratingStats.avgProfessionalism.toFixed(2)),
            timeliness: parseFloat(ratingStats.avgTimeliness.toFixed(2)),
            communication: parseFloat(ratingStats.avgCommunication.toFixed(2)),
          },
        },
        completedTrips: transporter?.completedDeliveries || 0,
      },
    });
  } catch (error) {
    logger.error('Error fetching transporter stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get top rated transporters
// @route   GET /api/ratings/leaderboard
// @access  Public
exports.getLeaderboard = async (req, res) => {
  try {
    const { limit = 10, period } = req.query;

    const topTransporters = await Rating.aggregate([
      {
        $group: {
          _id: '$ratedUserId',
          avgRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
        },
      },
      { $match: { totalRatings: { $gte: 5 } } }, // At least 5 ratings
      { $sort: { avgRating: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $lookup: {
          from: 'transporters',
          localField: '_id',
          foreignField: 'userId',
          as: 'transporter',
        },
      },
    ]);

    res.json({
      success: true,
      data: topTransporters.map((t) => ({
        userId: t._id,
        name: t.user[0]?.name || 'Unknown',
        phone: t.user[0]?.phone || '',
        rating: parseFloat(t.avgRating.toFixed(2)),
        totalRatings: t.totalRatings,
        vehicleType: t.transporter[0]?.vehicle_type || '',
        completedTrips: t.transporter[0]?.completedDeliveries || 0,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get reviews for transporter
// @route   GET /api/ratings/:userId/reviews
// @access  Public
exports.getTransporterReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Rating.find({ ratedUserId: req.params.userId })
      .populate('ratingUserId', 'name phone')
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Rating.countDocuments({ ratedUserId: req.params.userId });

    res.json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Update rating (owner only)
// @route   PUT /api/ratings/:id
// @access  Private
exports.updateRating = async (req, res) => {
  try {
    const { comment, rating } = req.body;

    const ratingDoc = await Rating.findById(req.params.id);

    if (!ratingDoc) {
      return res.status(404).json({
        success: false,
        error: 'Rating not found',
      });
    }

    if (ratingDoc.ratingUserId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this rating',
      });
    }

    if (comment) ratingDoc.comment = comment;
    if (rating) ratingDoc.rating = rating;

    await ratingDoc.save();

    logger.info(`Rating updated: ${req.params.id}`);

    res.json({
      success: true,
      data: ratingDoc,
      message: 'Rating updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Delete rating
// @route   DELETE /api/ratings/:id
// @access  Private (Owner or Admin)
exports.deleteRating = async (req, res) => {
  try {
    const ratingDoc = await Rating.findById(req.params.id);

    if (!ratingDoc) {
      return res.status(404).json({
        success: false,
        error: 'Rating not found',
      });
    }

    if (
      ratingDoc.ratingUserId.toString() !== req.user.id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this rating',
      });
    }

    await Rating.findByIdAndDelete(req.params.id);

    logger.info(`Rating deleted: ${req.params.id}`);

    res.json({
      success: true,
      message: 'Rating deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Helper function to update transporter rating
async function updateTransporterRating(transporterId) {
  try {
    const stats = await Rating.aggregate([
      { $match: { ratedUserId: transporterId } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
        },
      },
    ]);

    if (stats.length > 0) {
      await Transporter.findOneAndUpdate(
        { userId: transporterId },
        { rating: Math.round(stats[0].avgRating * 10) / 10 }
      );
    }
  } catch (error) {
    logger.error('Error updating transporter rating:', error);
  }
}