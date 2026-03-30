const Property = require('../models/Property');
const cloudinary = require('../config/cloudinary');

// // Helper: extract media array from multer-cloudinary upload
// const files = req.files;
//   files.map((file) => ({
//   }));

// Helper: delete files from Cloudinary by public_id
const deleteFromCloudinary = async (mediaArray = []) => {
  await Promise.all(
    mediaArray.map((item) =>
      cloudinary.uploader.destroy(item.publicId, {
        resource_type: item.resourceType,
      })
    )
  );
};

// @desc  Get all properties
// @route GET /api/properties
// @access Public
exports.getProperties = async (req, res) => {
  try {
    const properties = await Property.find().populate(
      'owner',
      'firstName lastName email phone imageUrl'
    );
    res.json({
      success: true,
      count: properties.length,
      properties: properties.map((p) => p.toJSON()),
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
    const property = await Property.findById(req.params.id).populate(
      'owner',
      'firstName lastName email phone imageUrl'
    );
    if (!property)
      return res.status(404).json({ success: false, message: 'Property not found' });

    res.json({ success: true, property: property.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Create property
// @route POST /api/properties
// @access Private/Landlord
exports.createProperty = async (req, res) => {
  try {
    req.body.owner = req.user._id;

    // Attach uploaded media (images/videos) from Cloudinary
    if (req.uploadedMedia && req.uploadedMedia.length > 0) {
      req.body.media = req.uploadedMedia;
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
    if (!property)
      return res.status(404).json({ success: false, message: 'Property not found' });

    // Check ownership
    if (
      property.owner.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this property',
      });
    }

    // If new files uploaded, delete old ones from Cloudinary then replace
    if (req.uploadedMedia && req.uploadedMedia.length > 0) {
      await deleteFromCloudinary(property.media);
      req.body.media = req.uploadedMedia;
    }

    property = await Property.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('owner', 'firstName lastName email phone imageUrl');

    res.json({ success: true, property: property.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Delete a single media file from a property
// @route DELETE /api/properties/:id/media/:publicId
// @access Private/Owner
exports.deletePropertyMedia = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property)
      return res.status(404).json({ success: false, message: 'Property not found' });

    if (
      property.owner.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const publicId = decodeURIComponent(req.params.publicId);
    const mediaItem = property.media.find((m) => m.publicId === publicId);

    if (!mediaItem)
      return res.status(404).json({ success: false, message: 'Media file not found' });

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(publicId, {
      resource_type: mediaItem.resourceType,
    });

    // Remove from property's media array
    property.media = property.media.filter((m) => m.publicId !== publicId);
    await property.save();

    res.json({ success: true, message: 'Media deleted', property: property.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Delete property
// @route DELETE /api/properties/:id
// @access Private/Owner
exports.deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property)
      return res.status(404).json({ success: false, message: 'Property not found' });

    if (
      property.owner.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this property',
      });
    }

    // Delete all media from Cloudinary before removing the property
    await deleteFromCloudinary(property.media);

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
    const properties = await Property.find({ owner: req.params.userId }).populate(
      'owner',
      'firstName lastName email phone imageUrl'
    );
    res.json({
      success: true,
      count: properties.length,
      properties: properties.map((p) => p.toJSON()),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};