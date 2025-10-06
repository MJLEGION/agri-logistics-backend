const Order = require('../models/Order');
const Crop = require('../models/Crop');

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('cropId', 'name quantity unit')
      .populate('farmerId', 'name phone')
      .populate('buyerId', 'name phone')
      .populate('transporterId', 'name phone');
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('cropId', 'name quantity unit')
      .populate('farmerId', 'name phone')
      .populate('buyerId', 'name phone')
      .populate('transporterId', 'name phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (Buyer only)
exports.createOrder = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({ message: 'Only buyers can place orders' });
    }

    const { cropId, quantity, totalPrice, pickupLocation, deliveryLocation } = req.body;

    // Check if crop exists
    const crop = await Crop.findById(cropId);
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    // Check if enough quantity available
    if (crop.quantity < quantity) {
      return res.status(400).json({ message: 'Insufficient crop quantity' });
    }

    const order = await Order.create({
      cropId,
      farmerId: crop.farmerId,
      buyerId: req.user._id,
      quantity,
      totalPrice,
      pickupLocation,
      deliveryLocation,
      status: 'accepted'
    });

    // Update crop quantity
    crop.quantity -= quantity;
    if (crop.quantity === 0) {
      crop.status = 'matched';
    }
    await crop.save();

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order
// @route   PUT /api/orders/:id
// @access  Private
exports.updateOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('cropId farmerId buyerId transporterId');

    res.json(updatedOrder); 
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Accept order (Transporter)
// @route   PUT /api/orders/:id/accept
// @access  Private (Transporter only)
exports.acceptOrder = async (req, res) => {
  try {
    if (req.user.role !== 'transporter') {
      return res.status(403).json({ message: 'Only transporters can accept orders' });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.transporterId) {
      return res.status(400).json({ message: 'Order already has a transporter' });
    }

    order.transporterId = req.user._id;
    order.status = 'in_progress';
    await order.save();

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get orders by user
// @route   GET /api/orders/my-orders
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'farmer') {
      query.farmerId = req.user._id;
    } else if (req.user.role === 'buyer') {
      query.buyerId = req.user._id;
    } else if (req.user.role === 'transporter') {
      query.transporterId = req.user._id;
    }

    const orders = await Order.find(query)
      .populate('cropId', 'name quantity unit')
      .populate('farmerId', 'name phone')
      .populate('buyerId', 'name phone')
      .populate('transporterId', 'name phone');

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};