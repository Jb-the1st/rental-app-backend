const Booking = require('../models/Booking');

exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'firstName lastName email phone')
      .populate('property', 'title price city state');
    res.json({ success: true, count: bookings.length, bookings: bookings.map(b => b.toJSON()) });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('property', 'title price city state imageUrls');
    res.json({ success: true, count: bookings.length, bookings: bookings.map(b => b.toJSON()) });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createBooking = async (req, res) => {
  try {
    // Frontend sends propertyId — map to internal field name 'property'
    const booking = await Booking.create({
      day:      req.body.day,
      time:     req.body.time,
      status:   req.body.status || 'pending',
      property: req.body.propertyId,   // frontend sends propertyId
      user:     req.user._id           // always from auth token
    });
    await booking.populate('property', 'title price city state');
    await booking.populate('user', 'firstName lastName email phone');
    res.status(201).json({ success: true, booking: booking.toJSON() });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });
    const { day, time, status } = req.body;
    if (!day && !time && !status)
      return res.status(400).json({ success: false, message: 'Provide at least one field: day, time, or status' });
    if (day)    booking.day    = day;
    if (time)   booking.time   = time;
    if (status) booking.status = status;
    await booking.save();
    await booking.populate('property', 'title price city state');
    await booking.populate('user', 'firstName lastName email phone');
    res.json({ success: true, booking: booking.toJSON() });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });
    await booking.deleteOne();
    res.json({ success: true, message: 'Booking deleted successfully' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};