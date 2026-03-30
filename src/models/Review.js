const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Review text is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  }
}, {
  timestamps: true
});

ReviewSchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Review', ReviewSchema);