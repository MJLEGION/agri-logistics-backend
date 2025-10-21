const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Token blacklist (in production, use Redis)
const tokenBlacklist = new Set();

// Generate Access Token (1 hour)
const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '1h'
  });
};

// Generate Refresh Token (7 days)
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// Helper: Reset failed login attempts
const resetFailedAttempts = async (user) => {
  user.failedLoginAttempts = 0;
  user.lastFailedLogin = null;
  user.accountLockedUntil = null;
  await user.save();
};

// Helper: Increment failed login attempts
const incrementFailedAttempts = async (user) => {
  user.failedLoginAttempts += 1;
  user.lastFailedLogin = new Date();
  
  // Lock account after 5 failed attempts for 15 minutes
  if (user.failedLoginAttempts >= 5) {
    user.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
  }
  
  await user.save();
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;

    // Validation
    if (!name || !phone || !password || !role) {
      return res.status(400).json({ message: 'Please provide all fields: name, phone, password, role' });
    }

    // Validate name
    if (name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters long' });
    }

    // Validate phone format
    const cleanPhone = phone.replace(/[\s\-]/g, '');
    const nigerianRegex = /^(\+234|0)[789]\d{9}$/;
    const rwandanRegex = /^(\+250|0)7[8-9]\d{7}$/;
    
    if (!nigerianRegex.test(cleanPhone) && !rwandanRegex.test(cleanPhone)) {
      return res.status(400).json({ 
        message: 'Invalid phone number. Please use Nigerian (0801-0809, 0701-0709, +234...) or Rwandan (+250 7xx...) format' 
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Validate role
    if (!['farmer', 'buyer', 'transporter'].includes(role.toLowerCase())) {
      return res.status(400).json({ message: 'Role must be: farmer, buyer, or transporter' });
    }

    // Check if user exists
    const userExists = await User.findOne({ phone: cleanPhone });
    if (userExists) {
      return res.status(400).json({ message: 'This phone number is already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name: name.trim(),
      phone: cleanPhone,
      password: hashedPassword,
      role: role.toLowerCase(),
      failedLoginAttempts: 0
    });

    if (user) {
      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);
      
      // Save refresh token
      user.refreshTokens.push({ token: refreshToken });
      await user.save();

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        user: {
          _id: user._id,
          name: user.name,
          phone: user.phone,
          role: user.role
        },
        accessToken,
        refreshToken
      });
    }
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).json({ message });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Validation
    if (!phone || !password) {
      return res.status(400).json({ message: 'Please provide phone number and password' });
    }

    // Validate phone format
    const cleanPhone = phone.replace(/[\s\-]/g, '');
    const nigerianRegex = /^(\+234|0)[789]\d{9}$/;
    const rwandanRegex = /^(\+250|0)7[8-9]\d{7}$/;
    
    if (!nigerianRegex.test(cleanPhone) && !rwandanRegex.test(cleanPhone)) {
      return res.status(400).json({ 
        message: 'Invalid phone number format. Please use Nigerian (0801-0809, +234...) or Rwandan (+250 7xx...) format' 
      });
    }

    // Check user
    const user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      return res.status(401).json({ message: 'Invalid phone number or password' });
    }

    // Check if account is locked
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.accountLockedUntil - new Date()) / 60000);
      return res.status(429).json({ 
        message: `Account locked due to multiple failed login attempts. Try again in ${minutesLeft} minutes` 
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await incrementFailedAttempts(user);
      const attemptsLeft = 5 - user.failedLoginAttempts;
      return res.status(401).json({ 
        message: `Invalid phone number or password. ${attemptsLeft > 0 ? `${attemptsLeft} attempts remaining` : 'Account locked'}` 
      });
    }

    // Reset failed attempts on successful login
    await resetFailedAttempts(user);

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    // Save refresh token
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
exports.refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    // Check if token is blacklisted
    if (tokenBlacklist.has(refreshToken)) {
      return res.status(401).json({ message: 'Refresh token is invalid' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Check if refresh token exists in user's tokens
    const tokenExists = user.refreshTokens.some(t => t.token === refreshToken);
    if (!tokenExists) {
      return res.status(401).json({ message: 'Refresh token invalid' });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user._id);

    res.json({
      accessToken: newAccessToken
    });
  } catch (error) {
    res.status(401).json({ message: 'Token refresh failed' });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const user = req.user;

    if (refreshToken) {
      // Remove refresh token from database
      user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
      await user.save();
      
      // Add to blacklist
      tokenBlacklist.add(refreshToken);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshTokens');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};