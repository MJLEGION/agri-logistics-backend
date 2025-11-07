const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const { protect, authorize } = require('../middleware/auth');

/**
 * RATING ROUTES
 * All rating and review endpoints
 */

// POST create rating (protected)
router.post('/', protect, ratingController.createRating);

// GET user's ratings
router.get('/user/:userId', ratingController.getUserRatings);

// GET transporter stats
router.get('/transporter/:transporterId/stats', ratingController.getTransporterStats);

// GET transporter reviews
router.get('/:userId/reviews', ratingController.getTransporterReviews);

// GET leaderboard (top transporters)
router.get('/leaderboard', ratingController.getLeaderboard);

// PUT update rating (protected, owner only)
router.put('/:id', protect, ratingController.updateRating);

// DELETE rating (protected, owner or admin only)
router.delete('/:id', protect, ratingController.deleteRating);

module.exports = router;