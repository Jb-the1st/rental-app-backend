const express = require('express');
const router = express.Router();

const {
  register,
  login,
  getMe,
  logout,
  requestEmailOTP,  // NEW
  verifyEmail,      // CHANGED — now requires auth (called from profile)
  resendOTP         // CHANGED — now requires auth
} = require('../controllers/auth.controller');

const { protect } = require('../middleware/auth.middleware');
const passport = require('passport');
const { generateToken } = require('../utils/jwt');

// Email/Password auth
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

// Email verification — all three now require the user to be logged in
// The flow is: login → go to profile → click "Verify Email" → OTP sent → enter OTP
router.post('/request-email-otp', protect, requestEmailOTP); // NEW — triggers OTP send
router.post('/verify-email', protect, verifyEmail);          // CHANGED — now protected
router.post('/resend-otp', protect, resendOTP);              // CHANGED — now protected

// router.post('/verify-phone', protect, verifyPhone);
// ↑ Phone verification is not part of the current flow — kept commented out

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    const token = generateToken(req.user._id);
    res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}`);
  }
);

// // Facebook OAuth
// router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
// router.get('/facebook/callback',
//   passport.authenticate('facebook', { failureRedirect: '/login' }),
//   (req, res) => {
//     const token = generateToken(req.user._id);
//     res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}`);
//   }
// );

module.exports = router;