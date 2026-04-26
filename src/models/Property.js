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

  // userId — flat ID the frontend interface expects
  // owner  — keep the populated object so property cards can display owner info
  if (obj.owner) {
    if (obj.owner._id) {
      // owner is populated (has full object)
      obj.userId = obj.owner._id;
      // keep obj.owner intact so frontend can read owner.firstName etc.
    } else {
      // owner is just an ObjectId (not populated)
      obj.userId = obj.owner;
      delete obj.owner;
    }
  }

  // Back-compat: old docs may have imageUrl (string) — wrap into array
  if (!obj.imageUrls || obj.imageUrls.length === 0) {
    obj.imageUrls = obj.imageUrl ? [obj.imageUrl] : [];
  }
  delete obj.imageUrl;

  return obj;
};

module.exports = mongoose.model('Property', PropertySchema);