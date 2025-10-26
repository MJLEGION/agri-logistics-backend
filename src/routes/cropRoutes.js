const express = require('express');
const router = express.Router();
const {
  getAllCrops,
  getCropById,
  createCrop,
  updateCrop,
  deleteCrop,
  getCropsByFarmer
} = require('../controllers/cropController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getAllCrops)
  .post(protect, authorize('farmer'), createCrop);

router.route('/:id')
  .get(protect, getCropById)
  .put(protect, authorize('farmer'), updateCrop)
  .delete(protect, authorize('farmer'), deleteCrop);

// Endpoints for getting user's crops (both support the same controller)
router.get('/user/:userId', getCropsByFarmer);
router.get('/farmer/:farmerId', getCropsByFarmer);

module.exports = router;