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

// Google OAuth — Step 1: initiate
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false
}));

// Google OAuth — Step 2: Google redirects back here after login
router.get('/google/callback',
  (req, res, next) => {
    passport.authenticate('google', {
      failureRedirect: `${process.env.FRONTEND_URL}/?error=google_auth_failed`,
      session: false
    }, (err, user) => {
      if (err || !user) {
        console.error('❌ Passport error:', err);
        // ✅ Send error back to popup
        return res.send(`
          <script>
            window.opener.postMessage(
              ${JSON.stringify({ success: false, message: 'Google auth failed' })},
              '${process.env.FRONTEND_URL}'
            );
            window.close();
          </script>
        `);
      }
      req.user = user;
      next();
    })(req, res, next);
  },
  (req, res) => {
    try {
      const token = generateToken(req.user._id);
      const user = req.user.toJSON();

      // ✅ Send token + user back to the frontend popup
      // This is the same shape as normal login: { success, token, user }
      res.send(`
        <script>
          window.opener.postMessage(
            ${JSON.stringify({ success: true, token, user })},
            '${process.env.FRONTEND_URL}'
          );
          window.close();
        </script>
      `);
    } catch (err) {
      console.error('❌ Google callback error:', err);
      res.send(`
        <script>
          window.opener.postMessage(
            ${JSON.stringify({ success: false, message: 'Server error' })},
            '${process.env.FRONTEND_URL}'
          );
          window.close();
        </script>
      `);
    }
  }
);

module.exports = router;