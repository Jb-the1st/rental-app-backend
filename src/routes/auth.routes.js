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
router.get('/me', protect, getMe);
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

router.get('/google/callback', (req, res, next) => {
  console.log('Google callback request:', {
    url: req.url,
    method: req.method,
    headers: req.headers,
    query: req.query,
    body: req.body
  });

  // ✅ Validate the request looks like it comes from Google
  if (!req.query.iss || !req.query.iss.startsWith('https://accounts.google.com')) {
    console.error('Invalid Google callback: missing or invalid iss', req.query);
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_callback`);
  }

  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err) {
      console.error('Google callback auth error:', err);
      console.error('Google callback query:', req.query);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_auth_failed&reason=${encodeURIComponent(err.message)}`);
    }

    if (!user) {
      console.error('Google callback no user', { info, query: req.query });
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_user`);
    }

    try {
      const token = generateToken(user._id);
      return res.redirect(`${process.env.FRONTEND_URL}/callback?token=${token}`);
    } catch (err) {
      console.error('Google callback token error:', err);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
    }
  })(req, res, next);
});

module.exports = router;