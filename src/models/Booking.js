const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  day: {
    type: String,
    required: [true, 'Day is required']
  },
  time: {
    type: String,
    required: [true, 'Time is required']
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

BookingSchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Booking', BookingSchema);