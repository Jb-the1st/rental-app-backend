const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
  title:       { type: String, required: [true, 'Title is required'],       trim: true },
  price:       { type: Number, required: [true, 'Price is required'],       min: 0 },
  description: { type: String, required: [true, 'Description is required'] },
  country:     { type: String, required: [true, 'Country is required'] },
  state:       { type: String, required: [true, 'State is required'] },
  city:        { type: String, required: [true, 'City is required'] },

  // imageUrls is now an ARRAY — matches frontend interface (imageUrls?: string[])
  // Old single imageUrl field is kept as a fallback for existing documents
  imageUrls: { type: [String], default: [] },

  type: {
    type: String,
    required: [true, 'Property type is required'],
    enum: ['apartment', 'house', 'condo', 'studio', 'townhouse']
  },

  // ── NEW fields expected by frontend ──────────────────────────────────────
  listingType: {
    type: String,
    enum: ['rent', 'sale', 'shortlet', ''],
    default: ''
    // frontend: listingType: string (required in interface)
  },

  duration: {
    type: String,
    default: ''
    // frontend: duration?: string (optional — e.g. "6 months", "1 year")
  },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  isAvailable: { type: Boolean, default: true }

}, { timestamps: true });

PropertySchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;

  // Back-compat: if old document has imageUrl (string) but no imageUrls array,
  // wrap it so the frontend always gets imageUrls as an array
  if (!obj.imageUrls || obj.imageUrls.length === 0) {
    if (obj.imageUrl) {
      obj.imageUrls = [obj.imageUrl];
    } else {
      obj.imageUrls = [];
    }
  }
  delete obj.imageUrl; // never send the old single field

  return obj;
};

module.exports = mongoose.model('Property', PropertySchema);