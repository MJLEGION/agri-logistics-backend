const Crop = require('../models/Crop');

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

    const { name, quantity, unit, pricePerUnit, harvestDate, location } = req.body;

    const crop = await Crop.create({
      farmerId: req.user._id,
      name,
      quantity,
      unit,
      pricePerUnit,
      harvestDate,
      location
    });

    res.status(201).json(crop);
  } catch (error) {
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
    if (crop.farmerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this crop' });
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
    if (crop.farmerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this crop' });
    }

    await Crop.findByIdAndDelete(req.params.id);
    res.json({ message: 'Crop deleted successfully' });
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