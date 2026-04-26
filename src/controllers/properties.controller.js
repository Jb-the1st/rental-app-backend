const Property = require('../models/Property');
const cloudinary = require('../config/cloudinary');

const uploadOneToCloudinary = async (file) => {
  if (file && file.buffer) {
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

const resolveImageUrls = async (req) => {
  const urls = [];

  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const url = await uploadOneToCloudinary(file);
      if (url) urls.push(url);
    }
    return urls;
  }

  if (req.file) {
    const url = await uploadOneToCloudinary(req.file);
    if (url) urls.push(url);
    return urls;
  }

  if (req.body.imageUrls && Array.isArray(req.body.imageUrls)) {
    for (const item of req.body.imageUrls) {
      if (item.startsWith('data:')) {
        const url = await uploadOneToCloudinary(item);
        if (url) urls.push(url);
      } else if (item.startsWith('http')) {
        urls.push(item);
      }
    }
    return urls;
  }

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
    const imageUrls = await resolveImageUrls(req);

    const property = await Property.create({
      title:       req.body.title,
      price:       req.body.price,
      description: req.body.description,
      country:     req.body.country,
      state:       req.body.state,
      city:        req.body.city,
      type:        req.body.type,
      listingType: req.body.listingType || '',
      duration:    req.body.duration    || '',
      isAvailable: req.body.isAvailable !== undefined ? req.body.isAvailable : true,
      imageUrls:   imageUrls,
      owner:       req.user._id   // always from auth token
    });

    await property.populate('owner', 'firstName lastName email phone imageUrl');
    res.status(201).json({ success: true, property: property.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProperty = async (req, res) => {
  try {
    let property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    if (property.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });

    const imageUrls = await resolveImageUrls(req);
    const update = { ...req.body };
    delete update.owner;      // never allow owner change
    delete update.userId;     // frontend field — ignore
    delete update.imageUrl;   // old field — ignore
    if (imageUrls.length > 0) update.imageUrls = imageUrls;

    property = await Property.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
      .populate('owner', 'firstName lastName email phone imageUrl');
    res.json({ success: true, property: property.toJSON() });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
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
    // Frontend sends userId — query by owner field
    const properties = await Property.find({ owner: req.params.userId })
      .populate('owner', 'firstName lastName email phone imageUrl');
    res.json({ success: true, count: properties.length, properties: properties.map(p => p.toJSON()) });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};