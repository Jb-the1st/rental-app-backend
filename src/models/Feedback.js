const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  text:     { type: String, required: [true, 'Feedback text is required'] },
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String, default: '' },
  isViewed: { type: Boolean, default: false }

}, { timestamps: true });

FeedbackSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;

  // Frontend interface: userId: number  (not user object)
  if (obj.user) {
    obj.userId = obj.user._id || obj.user;
    delete obj.user;
  }

  return obj;
};

module.exports = mongoose.model('Feedback', FeedbackSchema);