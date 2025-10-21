const express = require('express');
const router = express.Router();
const { register, login, getMe, refreshAccessToken, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshAccessToken);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;