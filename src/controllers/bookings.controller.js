const Booking = require('../models/Booking');

// @desc  Get all bookings
// @route GET /api/bookings
// @access Private/Admin
exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'firstName lastName email phone')
      .populate('property', 'title price city state');
    res.json({
      success: true,
      count: bookings.length,
      bookings: bookings.map(b => b.toJSON())
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get user bookings
// @route GET /api/bookings/my-bookings
// @access Private
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('property', 'title price city state imageUrl');
    res.json({
      success: true,
      count: bookings.length,
      bookings: bookings.map(b => b.toJSON())
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Create booking
// @route POST /api/bookings
// @access Private
exports.createBooking = async (req, res) => {
  try {
    req.body.user = req.user._id;
    const booking = await Booking.create(req.body);
    await booking.populate('property', 'title price city state');
    await booking.populate('user', 'firstName lastName email phone');
    res.status(201).json({ success: true, booking: booking.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Update booking (day and/or time)
// @route PUT /api/bookings/:id
// @access Private (owner only)
exports.updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Only the owner can reschedule their booking
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }

    // Only day and time are reschedulable — property and user are immutable
    const { day, time } = req.body;

    if (!day && !time) {
      return res.status(400).json({
        success: false,
        message: 'Provide at least one field to update: day or time'
      });
    }

    if (day) booking.day = day;
    if (time) booking.time = time;

    await booking.save();
    await booking.populate('property', 'title price city state');
    await booking.populate('user', 'firstName lastName email phone');

    res.json({ success: true, booking: booking.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Delete booking
// @route DELETE /api/bookings/:id
// @access Private (owner or admin)
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this booking'
      });
    }

    await booking.deleteOne();
    res.json({ success: true, message: 'Booking deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};