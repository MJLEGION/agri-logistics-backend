const Order = require('../models/order');
const Crop = require('../models/crop');

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

    // Input validation
    if (!cropId || !quantity || totalPrice === undefined || !pickupLocation || !deliveryLocation) {
      return res.status(400).json({ message: 'Please provide all required fields: cropId, quantity, totalPrice, pickupLocation, deliveryLocation' });
    }

    // Validate quantity
    if (typeof quantity !== 'number' || quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive number' });
    }

    // Validate totalPrice
    if (typeof totalPrice !== 'number' || totalPrice < 0) {
      return res.status(400).json({ message: 'Total price must be a non-negative number' });
    }

    // Validate pickupLocation
    if (typeof pickupLocation !== 'object') {
      return res.status(400).json({ message: 'Pickup location must be an object' });
    }
    const { latitude: pickupLat, longitude: pickupLon, address: pickupAddr } = pickupLocation;
    if (pickupLat === undefined || pickupLon === undefined || !pickupAddr) {
      return res.status(400).json({ message: 'Pickup location must include latitude, longitude, and address' });
    }
    if (typeof pickupLat !== 'number' || pickupLat < -90 || pickupLat > 90) {
      return res.status(400).json({ message: 'Pickup location latitude must be between -90 and 90' });
    }
    if (typeof pickupLon !== 'number' || pickupLon < -180 || pickupLon > 180) {
      return res.status(400).json({ message: 'Pickup location longitude must be between -180 and 180' });
    }
    if (typeof pickupAddr !== 'string' || pickupAddr.trim().length === 0) {
      return res.status(400).json({ message: 'Pickup address must be a non-empty string' });
    }

    // Validate deliveryLocation
    if (typeof deliveryLocation !== 'object') {
      return res.status(400).json({ message: 'Delivery location must be an object' });
    }
    const { latitude: deliveryLat, longitude: deliveryLon, address: deliveryAddr } = deliveryLocation;
    if (deliveryLat === undefined || deliveryLon === undefined || !deliveryAddr) {
      return res.status(400).json({ message: 'Delivery location must include latitude, longitude, and address' });
    }
    if (typeof deliveryLat !== 'number' || deliveryLat < -90 || deliveryLat > 90) {
      return res.status(400).json({ message: 'Delivery location latitude must be between -90 and 90' });
    }
    if (typeof deliveryLon !== 'number' || deliveryLon < -180 || deliveryLon > 180) {
      return res.status(400).json({ message: 'Delivery location longitude must be between -180 and 180' });
    }
    if (typeof deliveryAddr !== 'string' || deliveryAddr.trim().length === 0) {
      return res.status(400).json({ message: 'Delivery address must be a non-empty string' });
    }

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
      buyerId: req.userId,
      quantity,
      totalPrice,
      pickupLocation: {
        latitude: pickupLat,
        longitude: pickupLon,
        address: pickupAddr.trim()
      },
      deliveryLocation: {
        latitude: deliveryLat,
        longitude: deliveryLon,
        address: deliveryAddr.trim()
      },
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
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).json({ message });
    }
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

    // Authorization: Check if user is involved in the order
    const isAuthorized = 
      req.userId.toString() === order.farmerId.toString() ||
      req.userId.toString() === order.buyerId.toString() ||
      (order.transporterId && req.userId.toString() === order.transporterId.toString());

    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to update this order' 
      });
    }

    // Only allow updates to specific fields based on user role
    const allowedUpdates = {};
    
    if (req.userRole === 'transporter' && req.userId.toString() === order.transporterId?.toString()) {
      // Transporters can only update status and delivery location
      if (req.body.status !== undefined) allowedUpdates.status = req.body.status;
      if (req.body.deliveryLocation !== undefined) allowedUpdates.deliveryLocation = req.body.deliveryLocation;
    } else {
      // Farmers, buyers can update other fields but not critical order details
      const forbiddenFields = ['cropId', 'farmerId', 'buyerId', 'transporterId'];
      Object.keys(req.body).forEach(key => {
        if (!forbiddenFields.includes(key)) {
          allowedUpdates[key] = req.body[key];
        }
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      allowedUpdates,
      { new: true, runValidators: true }
    ).populate('cropId farmerId buyerId transporterId');

    res.json(updatedOrder); 
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).json({ message });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Accept order (Transporter)
// @route   PUT /api/orders/:id/accept
// @access  Private (Transporter only)
exports.acceptOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    if (order.transporterId) {
      return res.status(400).json({ 
        success: false,
        message: 'Order already has a transporter' 
      });
    }

    order.transporterId = req.userId;
    order.status = 'in_progress';
    await order.save();

    // Update crop status to 'matched'
    await Crop.findByIdAndUpdate(order.cropId, { status: 'matched' });

    res.json({
      success: true,
      data: order,
      message: 'Order accepted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get orders by user
// @route   GET /api/orders/my-orders or /api/orders/user/:userId
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    let query = {};

    if (req.userRole === 'farmer') {
      query.farmerId = req.userId;
    } else if (req.userRole === 'buyer') {
      query.buyerId = req.userId;
    } else if (req.userRole === 'transporter') {
      query.transporterId = req.userId;
    }

    const orders = await Order.find(query)
      .populate('cropId', 'name quantity unit')
      .populate('farmerId', 'name phone')
      .populate('buyerId', 'name phone')
      .populate('transporterId', 'name phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private (Buyer or Farmer only)
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // Authorization: Only buyer or farmer can delete
    const isAuthorized = 
      req.userId.toString() === order.buyerId.toString() ||
      req.userId.toString() === order.farmerId.toString();

    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to delete this order' 
      });
    }

    // Restore crop quantity if order is not yet matched
    if (order.status === 'accepted' && order.cropId) {
      const crop = await Crop.findById(order.cropId);
      if (crop) {
        crop.quantity += order.quantity;
        crop.status = 'listed';
        await crop.save();
      }
    }

    await Order.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};