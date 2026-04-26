const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
  title:       { type: String, required: [true, 'Title is required'], trim: true },
  price:       { type: Number, required: [true, 'Price is required'], min: 0 },
  description: { type: String, required: [true, 'Description is required'] },
  country:     { type: String, required: [true, 'Country is required'] },
  state:       { type: String, required: [true, 'State is required'] },
  city:        { type: String, required: [true, 'City is required'] },

  imageUrls: { type: [String], default: [] },

  type: {
    type: String,
    required: [true, 'Property type is required'],
    // open string — no enum so frontend can send any type value freely
  },

  listingType: {
    type: String,
    default: ''
  },

  duration: {
    type: String,
    default: ''
  },

  // stored as ObjectId ref internally
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  isAvailable: { type: Boolean, default: true }

}, { timestamps: true });

PropertySchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;

  // Frontend interface: userId: number  (not owner object)
  if (obj.owner) {
    obj.userId = obj.owner._id || obj.owner;
    delete obj.owner;
  }

  // Back-compat: old docs may have imageUrl (string) — wrap into array
  if (!obj.imageUrls || obj.imageUrls.length === 0) {
    obj.imageUrls = obj.imageUrl ? [obj.imageUrl] : [];
  }
  delete obj.imageUrl;

  return obj;
};

module.exports = mongoose.model('Property', PropertySchema);