const express = require('express');
const router = express.Router();
const passport = require('passport');
const { generateToken } = require('../utils/jwt'); // ← was missing
const {
  register,
  login,
  verifyEmail,
  verifyPhone,
  resendOTP,
  getMe,
  logout,
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

// Registration & OTP
router.post('/register',    register);
router.post('/verify-email', verifyEmail);
router.post('/verify-phone', verifyPhone);
router.post('/resend-otp',  resendOTP);

// Login / Me / Logout
router.post('/login',  login);
router.get('/me',      protect, getMe);
router.post('/logout', protect, logout);

// Google OAuth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    const token = generateToken(req.user._id);
    res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}`);
  }
);

module.exports = router;