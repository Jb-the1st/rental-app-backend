const express = require('express');
const router = express.Router();

const {
  getBookings,
  getMyBookings,
  createBooking,
  updateBooking,  // NEW
  deleteBooking
} = require('../controllers/bookings.controller');

const { protect, authorize }  = require('../middleware/auth.middleware');
const requireEmailVerified     = require('../middleware/requireEmailVerified');

router.get('/', protect, authorize('admin'), getBookings);
router.get('/my-bookings', protect, getMyBookings);

// requireEmailVerified blocks unverified users with a clear message
router.post('/', protect, requireEmailVerified, createBooking);
router.put('/:id', protect, requireEmailVerified, updateBooking);
router.delete('/:id', protect, deleteBooking);

module.exports = router;