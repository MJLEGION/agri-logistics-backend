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

router.get('/my-orders', protect, getMyOrders);

router.route('/:id')
  .get(protect, getOrderById)
  .put(protect, updateOrder);

router.put('/:id/accept', protect, acceptOrder);

module.exports = router;