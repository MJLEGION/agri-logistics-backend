const mongoose = require('mongoose');

const locationTrackingSchema = new mongoose.Schema({
  transporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transporter',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  // GeoJSON Point for MongoDB geospatial queries
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  // Also store separately for easier access
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
    default: ''
  },
  // Trip context
  tripStatus: {
    type: String,
    enum: ['in_transit', 'arrived', 'completed'],
    default: 'in_transit'
  },
  // Metadata
  accuracy: {
    type: Number, // Accuracy in meters
    default: 0
  },
  altitude: {
    type: Number,
    default: 0
  },
  speed: {
    type: Number, // Speed in km/h
    default: 0
  },
  heading: {
    type: Number, // Direction in degrees
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create 2dsphere index for geospatial queries
locationTrackingSchema.index({ coordinates: '2dsphere' });
locationTrackingSchema.index({ transporterId: 1, timestamp: -1 });
locationTrackingSchema.index({ orderId: 1, timestamp: -1 });
locationTrackingSchema.index({ isActive: 1, timestamp: -1 });
locationTrackingSchema.index({ timestamp: -1 }, { expireAfterSeconds: 604800 }); // 7 days TTL

module.exports = mongoose.model('LocationTracking', locationTrackingSchema);