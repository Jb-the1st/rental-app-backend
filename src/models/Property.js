const mongoose = require('mongoose');

// Each uploaded file (image or video) stored as an object
const MediaSchema = new mongoose.Schema({
  url:          { type: String, required: true }, // Cloudinary URL
  publicId:     { type: String, required: true }, // Cloudinary public_id (needed to delete)
  resourceType: { type: String, enum: ['image', 'video'], required: true },
}, { _id: false });

const PropertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
  },
  state: {
    type: String,
    required: [true, 'State is required'],
  },
  city: {
    type: String,
    required: [true, 'City is required'],
  },
  // Array of images/videos — replaces single imageUrl
  media: {
    type: [MediaSchema],
    default: [],
  },
  type: {
    type: String,
    required: [true, 'Property type is required'],
    enum: ['apartment', 'house', 'condo', 'studio', 'townhouse'],
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

PropertySchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Property', PropertySchema);