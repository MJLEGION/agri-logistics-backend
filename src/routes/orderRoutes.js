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
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getAllOrders)
  .post(protect, createOrder);

// Define specific routes before :id route to prevent :id from intercepting them
router.get('/my-orders', protect, getMyOrders);
router.put('/:id/accept', protect, acceptOrder);

router.route('/:id')
  .get(protect, getOrderById)
  .put(protect, updateOrder);

module.exports = router;