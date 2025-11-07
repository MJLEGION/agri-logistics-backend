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
  // Current location coordinates for geospatial queries
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: null
    }
  },
  // Detailed location object with lat/lon
  currentLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
    lastUpdated: Date
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

// Create 2dsphere index for geospatial queries
transporterSchema.index({ coordinates: '2dsphere' });
transporterSchema.index({ available: 1, rating: -1 });
transporterSchema.index({ userId: 1 });
transporterSchema.index({ 'currentLocation.lastUpdated': -1 });

// Middleware to automatically update coordinates before saving
transporterSchema.pre('save', function(next) {
  if (this.currentLocation && this.currentLocation.latitude && this.currentLocation.longitude) {
    this.coordinates = {
      type: 'Point',
      coordinates: [this.currentLocation.longitude, this.currentLocation.latitude]
    };
  }
  next();
});

module.exports = mongoose.model('Transporter', transporterSchema);