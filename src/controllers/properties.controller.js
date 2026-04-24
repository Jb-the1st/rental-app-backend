const Property = require('../models/Property');
const cloudinary = require('../config/cloudinary');

// Uploads one image to Cloudinary — handles buffer (multipart) or base64 string
const uploadOneToCloudinary = async (file) => {
  if (file.buffer) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'rental-app/properties' },
        (error, result) => { if (error) return reject(error); resolve(result); }
      );
      const { Readable } = require('stream');
      Readable.from(file.buffer).pipe(stream);
    });
    return result.secure_url;
  }
  if (typeof file === 'string' && file.startsWith('data:')) {
    const result = await cloudinary.uploader.upload(file, { folder: 'rental-app/properties' });
    return result.secure_url;
  }
  return null;
};

// Resolves imageUrls from request:
//   - req.files (multiple file upload — multer array)
//   - req.file  (single file upload — multer single)
//   - req.body.imageUrls (array of base64 strings or already-uploaded URLs)
//   - req.body.imageUrl  (single base64 — back-compat)
const resolveImageUrls = async (req) => {
  const urls = [];

  // Multiple files via multipart
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const url = await uploadOneToCloudinary(file);
      if (url) urls.push(url);
    }
    return urls;
  }

  // Single file via multipart
  if (req.file) {
    const url = await uploadOneToCloudinary(req.file);
    if (url) urls.push(url);
    return urls;
  }

  // Array of base64 or URLs in JSON body
  if (req.body.imageUrls && Array.isArray(req.body.imageUrls)) {
    for (const item of req.body.imageUrls) {
      if (item.startsWith('data:')) {
        const url = await uploadOneToCloudinary(item);
        if (url) urls.push(url);
      } else if (item.startsWith('http')) {
        urls.push(item); // already a Cloudinary URL
      }
    }
    return urls;
  }

  // Single base64 in body (back-compat with old imageUrl field)
  if (req.body.imageUrl && req.body.imageUrl.startsWith('data:')) {
    const url = await uploadOneToCloudinary(req.body.imageUrl);
    if (url) urls.push(url);
  }

  return urls;
};

exports.getProperties = async (req, res) => {
  try {
    const properties = await Property.find().populate('owner', 'firstName lastName email phone imageUrl');
    res.json({ success: true, count: properties.length, properties: properties.map(p => p.toJSON()) });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate('owner', 'firstName lastName email phone imageUrl');
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    res.json({ success: true, property: property.toJSON() });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createProperty = async (req, res) => {
  try {
    req.body.owner = req.user._id;

    // DEBUG — log exactly what the frontend sent so we can see image format
    console.log('=== createProperty DEBUG ===');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('req.file:', req.file ? { fieldname: req.file.fieldname, mimetype: req.file.mimetype, size: req.file.size } : 'NONE');
    console.log('req.files:', req.files ? req.files.map(f => ({ fieldname: f.fieldname, mimetype: f.mimetype, size: f.size })) : 'NONE');
    console.log('req.body keys:', Object.keys(req.body));
    console.log('req.body.imageUrl (first 80 chars):', req.body.imageUrl ? req.body.imageUrl.substring(0, 80) : 'NONE');
    console.log('req.body.imageUrls:', req.body.imageUrls ? (Array.isArray(req.body.imageUrls) ? req.body.imageUrls.length + ' items' : req.body.imageUrls.substring(0,80)) : 'NONE');
    console.log('============================');

    const imageUrls = await resolveImageUrls(req);
    if (imageUrls.length > 0) req.body.imageUrls = imageUrls;

    // Remove raw base64 / old field before saving
    delete req.body.imageUrl;

    const property = await Property.create(req.body);
    await property.populate('owner', 'firstName lastName email phone imageUrl');
    res.status(201).json({ success: true, property: property.toJSON() });
  } catch (error) {
    console.error('createProperty error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
      debug: {
        contentType: req.headers['content-type'],
        hasFile: !!req.file,
        hasFiles: !!(req.files && req.files.length),
        bodyKeys: Object.keys(req.body),
        imageUrlPresent: !!req.body.imageUrl,
        imageUrlsPresent: !!req.body.imageUrls
      }
    });
  }
};

exports.updateProperty = async (req, res) => {
  try {
    let property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    if (property.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });

    const imageUrls = await resolveImageUrls(req);
    if (imageUrls.length > 0) req.body.imageUrls = imageUrls;
    delete req.body.imageUrl;

    property = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('owner', 'firstName lastName email phone imageUrl');
    res.json({ success: true, property: property.toJSON() });
  } catch (error) {
    console.error('updateProperty error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    if (property.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });
    await property.deleteOne();
    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getPropertiesByOwner = async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.params.userId }).populate('owner', 'firstName lastName email phone imageUrl');
    res.json({ success: true, count: properties.length, properties: properties.map(p => p.toJSON()) });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};