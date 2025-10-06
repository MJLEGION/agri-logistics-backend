const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    enum: ['kg', 'tons', 'bags'],
    default: 'kg'
  },
  pricePerUnit: {
    type: Number,
    min: 0
  },
  harvestDate: {
    type: Date,
    required: true
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['listed', 'matched', 'picked_up', 'in_transit', 'delivered'],
    default: 'listed'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Crop', cropSchema);