const express = require('express');
const router = express.Router();

const {
  getBookings,
  getMyBookings,
  createBooking,
  updateBooking,  // NEW
  deleteBooking,
  updateBookingStatus  // NEW
} = require('../controllers/bookings.controller');

const { protect, authorize }  = require('../middleware/auth.middleware');
const requireEmailVerified     = require('../middleware/requireEmailVerified');

router.get('/', protect, getBookings);
router.get('/my-bookings', protect, getMyBookings);

// requireEmailVerified blocks unverified users with a clear message
router.patch('/:id/status', protect, updateBookingStatus);
router.post('/', protect, createBooking);
router.put('/:id', protect, updateBooking);
router.delete('/:id', protect, deleteBooking);

module.exports = router;