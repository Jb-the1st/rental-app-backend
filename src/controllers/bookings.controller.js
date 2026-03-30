const Booking = require('../models/Booking');

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res) => {
  try {
    req.body.user = req.user._id;

    const booking = await Booking.create(req.body);
    await booking.populate('property', 'title price city state');
    await booking.populate('user', 'firstName lastName email phone');

    res.status(201).json({
      success: true,
      booking: booking.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete booking
// @route   DELETE /api/bookings/:id
// @access  Private
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check ownership
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this booking'
      });
    }

    await booking.deleteOne();

    res.json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};