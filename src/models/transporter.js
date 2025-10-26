const mongoose = require('mongoose');

const transporterSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  vehicle_type: {
    type: String,
    enum: ['bicycle', 'motorcycle', 'car', 'van', 'truck', 'lorry'],
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 0
  },
  rates: {
    type: Number,
    required: true,
    min: 0
  },
  available: {
    type: Boolean,
    default: true
  },
  location: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    default: 5,
    min: 0,
    max: 5
  },
  completedDeliveries: {
    type: Number,
    default: 0
  },
  phone: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transporter', transporterSchema);