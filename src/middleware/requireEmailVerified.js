// middleware/requireEmailVerified.js
//
// Attach this AFTER protect() on any route that should be blocked
// for unverified users.
//
// Usage in a route file:
//   const { protect } = require('../middleware/auth.middleware');
//   const requireEmailVerified = require('../middleware/requireEmailVerified');
//
//   router.post('/', protect, requireEmailVerified, createBooking);

const requireEmailVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email address to continue. Go to your profile and click "Verify Email".',
      emailVerified: false
    });
  }

  next();
};

module.exports = requireEmailVerified;