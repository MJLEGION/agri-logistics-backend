const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  cropId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crop',
    required: true
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  pickupLocation: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  pickupCoordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: null
    }
  },
  deliveryLocation: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  deliveryCoordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: null
    }
  }
}, {
  timestamps: true
});

// Create 2dsphere indexes for geospatial queries
orderSchema.index({ pickupCoordinates: '2dsphere' });
orderSchema.index({ deliveryCoordinates: '2dsphere' });
orderSchema.index({ farmerId: 1, status: 1 });
orderSchema.index({ buyerId: 1, status: 1 });
orderSchema.index({ transporterId: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });

// Middleware to automatically update coordinates before saving
orderSchema.pre('save', function(next) {
  if (this.pickupLocation && this.pickupLocation.latitude && this.pickupLocation.longitude) {
    this.pickupCoordinates = {
      type: 'Point',
      coordinates: [this.pickupLocation.longitude, this.pickupLocation.latitude]
    };
  }
  if (this.deliveryLocation && this.deliveryLocation.latitude && this.deliveryLocation.longitude) {
    this.deliveryCoordinates = {
      type: 'Point',
      coordinates: [this.deliveryLocation.longitude, this.deliveryLocation.latitude]
    };
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);