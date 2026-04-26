const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  day:  { type: String, required: [true, 'Day is required'] },
  time: { type: String, required: [true, 'Time is required'] },

  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },

  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  }

}, { timestamps: true });

BookingSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;

  // Frontend: propertyId not property object
  if (obj.property) {
    obj.propertyId = obj.property._id || obj.property;
    delete obj.property;
  }

  // Frontend: userId not user object
  if (obj.user) {
    obj.userId = obj.user._id || obj.user;
    delete obj.user;
  }

  return obj;
};

module.exports = mongoose.model('Booking', BookingSchema);