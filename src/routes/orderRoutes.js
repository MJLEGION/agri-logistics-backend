const express = require('express');
const router = express.Router();
const {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  acceptOrder,
  getMyOrders
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

// Define specific routes before :id route to prevent :id from intercepting them
router.get('/my-orders', protect, getMyOrders);
router.put('/:id/accept', protect, authorize('transporter'), acceptOrder);

router.route('/')
  .get(protect, getAllOrders)
  .post(protect, authorize('buyer'), createOrder);

router.route('/:id')
  .get(protect, getOrderById)
  .put(protect, updateOrder);

module.exports = router;