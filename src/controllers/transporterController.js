const Transporter = require('../models/transporter');
const User = require('../models/user');

// @desc    Get all transporters
// @route   GET /api/transporters
// @access  Private
exports.getAllTransporters = async (req, res) => {
  try {
    const transporters = await Transporter.find()
      .populate('userId', 'name phone');
    
    res.json(transporters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get available transporters
// @route   GET /api/transporters/available
// @access  Private
exports.getAvailableTransporters = async (req, res) => {
  try {
    const transporters = await Transporter.find({ available: true })
      .populate('userId', 'name phone');
    
    res.json(transporters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get transporter by ID
// @route   GET /api/transporters/:id
// @access  Private
exports.getTransporterById = async (req, res) => {
  try {
    const transporter = await Transporter.findById(req.params.id)
      .populate('userId', 'name phone');
    
    if (!transporter) {
      return res.status(404).json({ message: 'Transporter not found' });
    }

    res.json(transporter);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update transporter profile
// @route   PUT /api/transporters/:id
// @access  Private (Own profile or admin)
exports.updateTransporterProfile = async (req, res) => {
  try {
    const transporter = await Transporter.findById(req.params.id);

    if (!transporter) {
      return res.status(404).json({ message: 'Transporter not found' });
    }

    // Check authorization - only own profile
    if (transporter.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ 
        message: 'Not authorized to update this transporter profile' 
      });
    }

    const allowedUpdates = ['vehicle_type', 'capacity', 'rates', 'available', 'location'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedTransporter = await Transporter.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('userId', 'name phone');

    res.json(updatedTransporter);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get my transporter profile (current user)
// @route   GET /api/transporters/profile/me
// @access  Private (Transporter only)
exports.getMyProfile = async (req, res) => {
  try {
    if (req.userRole !== 'transporter') {
      return res.status(403).json({ message: 'Only transporters can access this' });
    }

    const transporter = await Transporter.findOne({ userId: req.userId })
      .populate('userId', 'name phone');

    if (!transporter) {
      return res.status(404).json({ message: 'Transporter profile not found' });
    }

    res.json(transporter);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create or update my transporter profile
// @route   POST /api/transporters/profile/me
// @access  Private (Transporter only)
exports.createOrUpdateMyProfile = async (req, res) => {
  try {
    if (req.userRole !== 'transporter') {
      return res.status(403).json({ message: 'Only transporters can create/update profile' });
    }

    const user = await User.findById(req.userId);
    
    let transporter = await Transporter.findOne({ userId: req.userId });

    if (transporter) {
      // Update existing profile
      const allowedUpdates = ['vehicle_type', 'capacity', 'rates', 'available', 'location'];
      const updates = {};

      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      transporter = await Transporter.findByIdAndUpdate(
        transporter._id,
        updates,
        { new: true, runValidators: true }
      ).populate('userId', 'name phone');
    } else {
      // Create new profile
      const { vehicle_type, capacity, rates, location } = req.body;

      if (!vehicle_type || !capacity || !rates) {
        return res.status(400).json({ 
          message: 'Please provide vehicle_type, capacity, and rates' 
        });
      }

      transporter = await Transporter.create({
        userId: req.userId,
        vehicle_type,
        capacity,
        rates,
        location: location || '',
        name: user.name,
        phone: user.phone
      });

      transporter = await transporter.populate('userId', 'name phone');
    }

    res.json(transporter);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).json({ message });
    }
    res.status(500).json({ message: error.message });
  }
};