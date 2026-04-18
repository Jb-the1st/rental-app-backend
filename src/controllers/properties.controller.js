const Property = require('../models/Property');
const cloudinary = require('../config/cloudinary');

// Helper — uploads a multer file buffer/path to Cloudinary
// Returns the secure URL or throws
const uploadToCloudinary = async (file) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'rental-app/properties' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    // multer stores the file in memory when using memoryStorage,
    // or on disk when using diskStorage.
    // We support both: buffer (memoryStorage) or path (diskStorage).
    if (file.buffer) {
      const { Readable } = require('stream');
      Readable.from(file.buffer).pipe(stream);
    } else {
      const fs = require('fs');
      fs.createReadStream(file.path).pipe(stream);
    }
  });
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

    // Upload image to Cloudinary if a file was attached
    if (req.file) {
      try {
        req.body.imageUrl = await uploadToCloudinary(req.file);
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: 'Image upload failed: ' + uploadError.message
        });
      }
    }

    const property = await Property.create(req.body);
    await property.populate('owner', 'firstName lastName email phone imageUrl');

    res.status(201).json({ success: true, property: property.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Update property
// @route PUT /api/properties/:id
// @access Private/Owner
exports.updateProperty = async (req, res) => {
  try {
    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Only the owner or admin can update
    if (property.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this property' });
    }

    // Upload new image to Cloudinary if a file was attached
    if (req.file) {
      try {
        req.body.imageUrl = await uploadToCloudinary(req.file);
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: 'Image upload failed: ' + uploadError.message
        });
      }
    }

    property = await Property.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('owner', 'firstName lastName email phone imageUrl');

    res.json({ success: true, property: property.toJSON() });
  } catch (error) {
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

    if (property.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
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