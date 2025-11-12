const express = require('express');
const router = express.Router();
const {
  getAllCrops,
  getCropById,
  createCrop,
  updateCrop,
  deleteCrop,
  getCropsByFarmer,
  assignTransporter,
  updateCargoStatus
} = require('../controllers/cropController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getAllCrops)
  .post(protect, authorize('farmer'), createCrop);

router.route('/:id')
  .get(protect, getCropById)
  .put(protect, authorize('farmer'), updateCrop)
  .delete(protect, authorize('farmer'), deleteCrop);

// Assign transporter to cargo
router.put('/:id/assign-transporter', protect, authorize('transporter'), assignTransporter);

// Update cargo status by transporter
router.put('/:id/update-status', protect, authorize('transporter'), updateCargoStatus);

// Endpoints for getting user's crops (both support the same controller)
router.get('/user/:userId', getCropsByFarmer);
router.get('/farmer/:farmerId', getCropsByFarmer);

module.exports = router;