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
  shippingCost: {
    type: Number,
    min: 0,
    default: 0
  },
  distance: {
    type: Number,
    min: 0,
    default: 0
  },
  eta: {
    type: Number,
    min: 0,
    default: 0
  },
  suggestedVehicle: {
    type: String,
    enum: ['moto', 'van', 'truck'],
    default: 'van'
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
  destination: {
    latitude: {
      type: Number,
      required: false
    },
    longitude: {
      type: Number,
      required: false
    },
    address: {
      type: String,
      required: false
    }
  },
  // GeoJSON for geospatial queries
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
  status: {
    type: String,
    enum: ['listed', 'matched', 'picked_up', 'in_transit', 'delivered'],
    default: 'listed'
  }
}, {
  timestamps: true
});

// Create 2dsphere index for geospatial queries
cropSchema.index({ coordinates: '2dsphere' });
cropSchema.index({ farmerId: 1, status: 1 });
cropSchema.index({ status: 1, createdAt: -1 });

// Middleware to automatically update coordinates before saving
cropSchema.pre('save', function(next) {
  if (this.location && this.location.latitude && this.location.longitude) {
    this.coordinates = {
      type: 'Point',
      coordinates: [this.location.longitude, this.location.latitude]
    };
  }
  next();
});

module.exports = mongoose.model('Crop', cropSchema);