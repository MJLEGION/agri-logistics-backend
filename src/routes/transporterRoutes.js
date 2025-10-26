const express = require('express');
const router = express.Router();
const {
  getAllTransporters,
  getAvailableTransporters,
  getTransporterById,
  updateTransporterProfile,
  getMyProfile,
  createOrUpdateMyProfile
} = require('../controllers/transporterController');
const { protect, authorize } = require('../middleware/auth');

// Profile endpoints (specific routes before :id to avoid conflicts)
router.get('/profile/me', protect, authorize('transporter'), getMyProfile);
router.post('/profile/me', protect, authorize('transporter'), createOrUpdateMyProfile);

// Get all and available
router.get('/', protect, getAllTransporters);
router.get('/available', protect, getAvailableTransporters);

// Get by ID and update
router.get('/:id', protect, getTransporterById);
router.put('/:id', protect, updateTransporterProfile);

module.exports = router;