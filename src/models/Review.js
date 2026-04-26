const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  text: { type: String, required: [true, 'Review text is required'] },

  // stored as ObjectId ref internally
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true }

}, { timestamps: true });

ReviewSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;

  // Frontend interface: userId: number  (not user object)
  if (obj.user) {
    obj.userId = obj.user._id || obj.user;
    delete obj.user;
  }

  // propertyId stays as-is (already named correctly)
  if (obj.propertyId && obj.propertyId._id) {
    obj.propertyId = obj.propertyId._id;
  }

  return obj;
};

module.exports = mongoose.model('Review', ReviewSchema);