const mongoose = require('mongoose');
const Crop = require('../models/crop');

// @desc    Get all crops
// @route   GET /api/crops
// @access  Public
exports.getAllCrops = async (req, res) => {
  try {
    const crops = await Crop.find().populate('farmerId', 'name phone');
    res.json(crops);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get crop by ID
// @route   GET /api/crops/:id
// @access  Public
exports.getCropById = async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id).populate('farmerId', 'name phone');
    
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    res.json(crop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new crop
// @route   POST /api/crops
// @access  Private (Farmer only)
exports.createCrop = async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can list crops' });
    }

    const {
      name,
      quantity,
      unit,
      pricePerUnit,
      harvestDate,
      location,
      destination,
      shippingCost,
      distance,
      eta,
      suggestedVehicle
    } = req.body;

    // Input validation
    if (!name || !quantity || !harvestDate || !location) {
      return res.status(400).json({ message: 'Please provide all required fields: name, quantity, harvestDate, location' });
    }

    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ message: 'Crop name must be a non-empty string' });
    }

    if (typeof quantity !== 'number' || quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive number' });
    }

    if (unit && !['kg', 'tons', 'bags'].includes(unit)) {
      return res.status(400).json({ message: 'Unit must be one of: kg, tons, bags' });
    }

    if (pricePerUnit !== undefined && (typeof pricePerUnit !== 'number' || pricePerUnit < 0)) {
      return res.status(400).json({ message: 'Price per unit must be a non-negative number' });
    }

    const harvestDateObj = new Date(harvestDate);
    if (isNaN(harvestDateObj.getTime())) {
      return res.status(400).json({ message: 'Invalid harvest date format' });
    }

    if (!location || typeof location !== 'object') {
      return res.status(400).json({ message: 'Location must be an object' });
    }

    const { latitude, longitude, address } = location;
    if (latitude === undefined || longitude === undefined || !address) {
      return res.status(400).json({ message: 'Location must include latitude, longitude, and address' });
    }

    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
      return res.status(400).json({ message: 'Latitude must be a number between -90 and 90' });
    }

    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: 'Longitude must be a number between -180 and 180' });
    }

    if (typeof address !== 'string' || address.trim().length === 0) {
      return res.status(400).json({ message: 'Address must be a non-empty string' });
    }

    const crop = await Crop.create({
      farmerId: req.userId,
      name: name.trim(),
      quantity,
      unit: unit || 'kg',
      pricePerUnit,
      harvestDate: harvestDateObj,
      location: {
        latitude,
        longitude,
        address: address.trim()
      },
      destination: destination || undefined,
      shippingCost: shippingCost || 0,
      distance: distance || 0,
      eta: eta || 0,
      suggestedVehicle: suggestedVehicle || 'van'
    });

    res.status(201).json(crop);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).json({ message });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update crop
// @route   PUT /api/crops/:id
// @access  Private (Farmer only - own crops)
exports.updateCrop = async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id);

    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    // Check ownership
    if (!crop.farmerId.equals(new mongoose.Types.ObjectId(req.userId))) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to update this crop' 
      });
    }

    const updatedCrop = await Crop.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json(updatedCrop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete crop
// @route   DELETE /api/crops/:id
// @access  Private (Farmer only - own crops)
exports.deleteCrop = async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id);

    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    // Check ownership
    if (!crop.farmerId.equals(new mongoose.Types.ObjectId(req.userId))) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to delete this crop' 
      });
    }

    await Crop.findByIdAndDelete(req.params.id);
    res.json({ 
      success: true,
      message: 'Crop deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get crops by farmer
// @route   GET /api/crops/farmer/:farmerId
// @access  Public
exports.getCropsByFarmer = async (req, res) => {
  try {
    const crops = await Crop.find({ farmerId: req.params.farmerId });
    res.json(crops);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};