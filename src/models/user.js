const mongoose = require('mongoose');

// Phone validation function
const validatePhone = (phone) => {
  // Remove spaces and dashes
  const cleanPhone = phone.replace(/[\s\-]/g, '');
  
  // Nigerian: +234 or 0, followed by 10 digits (0801-0809, 0701-0709, etc.)
  const nigerianRegex = /^(\+234|0)[789]\d{9}$/;
  
  // Rwandan: +250 followed by 9-10 digits (typically 0788-0798)
  const rwandanRegex = /^(\+250|0)7[8-9]\d{7}$/;
  
  return nigerianRegex.test(cleanPhone) || rwandanRegex.test(cleanPhone);
};

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: validatePhone,
      message: 'Please provide a valid Nigerian (+234 or 0) or Rwandan (+250 or 0) phone number'
    }
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['farmer', 'buyer', 'transporter'],
    required: true
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockedUntil: {
    type: Date,
    default: null
  },
  lastFailedLogin: {
    type: Date,
    default: null
  },
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 604800 // 7 days in seconds
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);