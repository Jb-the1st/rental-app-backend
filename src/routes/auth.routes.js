const express = require('express');
const router = express.Router();

const {
  register,
  login,
  getMe,
  logout,
  requestEmailOTP,
  verifyEmail,
  resendOTP
} = require('../controllers/auth.controller');

const { protect } = require('../middleware/auth.middleware');
const passport = require('passport');
const { generateToken } = require('../utils/jwt');

// Email/Password auth
router.post('/register', register);
router.post('/login', login);
router.get('/me', getMe);
router.post('/logout', protect, logout);

// Email verification
router.post('/request-email-otp', requestEmailOTP);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOTP);

// Google OAuth
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  session: false // ✅ no session, we use JWT
}));

// auth.js — add these logs temporarily
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
    session: false
  }),
  (req, res) => {
    try {
      console.log('✅ Callback handler reached');
      console.log('✅ req.user:', req.user);

      if (!req.user) {
        console.log('❌ No user on req');
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_user`);
      }

      const token = generateToken(req.user._id);
      console.log('✅ Token generated:', token);
      console.log('✅ Redirecting to:', `${process.env.FRONTEND_URL}/home?token=${token}`);

      res.redirect(`${process.env.FRONTEND_URL}/callback?token=${token}`);
    } catch (err) {
      console.error('❌ Google callback error:', err);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
    }
  }
);

module.exports = router;