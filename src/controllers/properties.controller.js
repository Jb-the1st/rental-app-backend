const Property = require('../models/Property');
const cloudinary = require('../config/cloudinary');

// ─── Cloudinary upload helper ─────────────────────────────────────────────────
// Handles THREE cases the frontend might send:
//   1. multipart/form-data file  → req.file  (buffer from memoryStorage)
//   2. base64 data URI in body   → req.body.imageUrl = "data:image/...;base64,..."
//   3. No image sent             → returns undefined, no imageUrl saved
const uploadImageToCloudinary = async (req) => {
  // Case 1: real file via multipart/form-data
  if (req.file) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'rental-app/properties' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      const { Readable } = require('stream');
      Readable.from(req.file.buffer).pipe(stream);
    });
    return result.secure_url;
  }

  // Case 2: base64 data URI sent as JSON body field
  if (req.body.imageUrl && req.body.imageUrl.startsWith('data:')) {
    const result = await cloudinary.uploader.upload(req.body.imageUrl, {
      folder: 'rental-app/properties'
    });
    return result.secure_url;
  }

  // Case 3: nothing — keep existing imageUrl or leave undefined
  return undefined;
};

// @desc  Get all properties
// @route GET /api/properties
// @access Public
exports.getProperties = async (req, res) => {
  try {
    const properties = await Property.find()
      .populate('owner', 'firstName lastName email phone imageUrl');
    res.json({
      success: true,
      count: properties.length,
      properties: properties.map(p => p.toJSON())
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get single property
// @route GET /api/properties/:id
// @access Public
exports.getProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('owner', 'firstName lastName email phone imageUrl');
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    res.json({ success: true, property: property.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Create property
// @route POST /api/properties
// @access Private/Landlord or Admin
exports.createProperty = async (req, res) => {
  try {
    req.body.owner = req.user._id;

    const cloudinaryUrl = await uploadImageToCloudinary(req);
    if (cloudinaryUrl) {
      req.body.imageUrl = cloudinaryUrl;
    } else {
      // Remove the raw base64 string if Cloudinary upload wasn't triggered
      // so we don't store a 100KB string in MongoDB
      delete req.body.imageUrl;
    }

    const property = await Property.create(req.body);
    await property.populate('owner', 'firstName lastName email phone imageUrl');

    res.status(201).json({ success: true, property: property.toJSON() });
  } catch (error) {
    console.error('createProperty error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Update property
// @route PUT /api/properties/:id
// @access Private/Owner or Admin
exports.updateProperty = async (req, res) => {
  try {
    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (
      property.owner.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this property' });
    }

    const cloudinaryUrl = await uploadImageToCloudinary(req);
    if (cloudinaryUrl) {
      req.body.imageUrl = cloudinaryUrl;
    } else {
      // Don't overwrite existing imageUrl if no new image was sent
      delete req.body.imageUrl;
    }

    property = await Property.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('owner', 'firstName lastName email phone imageUrl');

    res.json({ success: true, property: property.toJSON() });
  } catch (error) {
    console.error('updateProperty error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Delete property
// @route DELETE /api/properties/:id
// @access Private/Owner or Admin
exports.deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (
      property.owner.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this property' });
    }

    await property.deleteOne();
    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get properties by owner
// @route GET /api/properties/owner/:userId
// @access Public
exports.getPropertiesByOwner = async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.params.userId })
      .populate('owner', 'firstName lastName email phone imageUrl');
    res.json({
      success: true,
      count: properties.length,
      properties: properties.map(p => p.toJSON())
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};