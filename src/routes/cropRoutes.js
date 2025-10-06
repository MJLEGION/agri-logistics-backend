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
const { protect } = require('../middleware/auth');

router.route('/')
  .get(getAllCrops)
  .post(protect, createCrop);

router.route('/:id')
  .get(getCropById)
  .put(protect, updateCrop)
  .delete(protect, deleteCrop);

router.get('/farmer/:farmerId', getCropsByFarmer);

module.exports = router;