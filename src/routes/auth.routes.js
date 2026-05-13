const express = require('express');
const router = express.Router();
const crypto = require('crypto');

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

// Temporary in-memory store for auth codes
const tempTokenStore = new Map();

// Email/Password auth
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

// Email verification
router.post('/request-email-otp', requestEmailOTP);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOTP);

// Google OAuth — Step 1: initiate
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false
}));

// Google OAuth — Step 2: callback from Google
router.get('/google/callback',
  (req, res, next) => {
    passport.authenticate('google', {
      failureRedirect: `${process.env.FRONTEND_URL}/?error=google_auth_failed`,
      session: false
    }, (err, user) => {
      if (err || !user) {
        console.error('❌ Passport error:', err);
        return res.redirect(`${process.env.FRONTEND_URL}/?error=auth_failed`);
      }
      req.user = user;
      next();
    })(req, res, next);
  },
  (req, res) => {
    try {
      const token = generateToken(req.user._id);

      // Generate a short-lived one-time code
      const code = crypto.randomBytes(20).toString('hex');

      // Store token + user against code, expires in 2 minutes
      tempTokenStore.set(code, {
        token,
        user: req.user.toJSON(),
        expiresAt: Date.now() + 2 * 60 * 1000
      });

      console.log('✅ Code generated, redirecting to /auth/success');

      // Redirect with short code — NOT the token
      res.redirect(`${process.env.FRONTEND_URL}/auth/success?code=${code}`);
    } catch (err) {
      console.error('❌ Google callback error:', err);
      res.redirect(`${process.env.FRONTEND_URL}/?error=server_error`);
    }
  }
);

// Google OAuth — Step 3: frontend exchanges code for token
// Returns same shape as normal login
router.get('/google/token', (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ success: false, message: 'No code provided' });
  }

  const data = tempTokenStore.get(code);

  if (!data) {
    return res.status(400).json({ success: false, message: 'Invalid or expired code' });
  }

  if (Date.now() > data.expiresAt) {
    tempTokenStore.delete(code);
    return res.status(400).json({ success: false, message: 'Code expired, please login again' });
  }

  // Delete so code can't be reused
  tempTokenStore.delete(code);

  // ✅ Identical response to normal login
  res.json({
    success: true,
    token: data.token,
    user: data.user
  });
});

module.exports = router;