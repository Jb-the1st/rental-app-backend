const express = require('express');
const router = express.Router();

const {
  getBookings,
  getMyBookings,
  createBooking,
  updateBooking,  // NEW
  deleteBooking
} = require('../controllers/bookings.controller');

const { protect, authorize } = require('../middleware/auth.middleware');

router.get('/', protect, authorize('admin'), getBookings);
router.get('/my-bookings', protect, getMyBookings);
router.post('/', protect, createBooking);
router.put('/:id', protect, updateBooking);     // NEW
router.delete('/:id', protect, deleteBooking);

module.exports = router;