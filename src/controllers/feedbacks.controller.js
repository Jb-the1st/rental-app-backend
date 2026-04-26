const Feedback = require('../models/Feedback');
const cloudinary = require('../config/cloudinary');

// Upload feedback image to Cloudinary (same pattern as properties)
const uploadFeedbackImage = async (req) => {
  if (req.file && req.file.buffer) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'rental-app/feedbacks' },
        (err, result) => { if (err) return reject(err); resolve(result); }
      );
      const { Readable } = require('stream');
      Readable.from(req.file.buffer).pipe(stream);
    });
    return result.secure_url;
  }
  if (req.body.imageUrl && req.body.imageUrl.startsWith('data:')) {
    const result = await cloudinary.uploader.upload(req.body.imageUrl, { folder: 'rental-app/feedbacks' });
    return result.secure_url;
  }
  return null;
};

exports.getFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find().populate('user', 'firstName lastName email imageUrl');
    res.json({ success: true, count: feedbacks.length, feedbacks: feedbacks.map(f => f.toJSON()) });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createFeedback = async (req, res) => {
  try {
    const imageUrl = await uploadFeedbackImage(req);
    const feedback = await Feedback.create({
      text:     req.body.text,
      user:     req.user._id,
      imageUrl: imageUrl || ''
    });
    await feedback.populate('user', 'firstName lastName email imageUrl');
    res.status(201).json({ success: true, feedback: feedback.toJSON() });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });
    if (feedback.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });
    if (req.body.text) feedback.text = req.body.text;
    const imageUrl = await uploadFeedbackImage(req);
    if (imageUrl) feedback.imageUrl = imageUrl;
    await feedback.save();
    await feedback.populate('user', 'firstName lastName email imageUrl');
    res.json({ success: true, feedback: feedback.toJSON() });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.markAsViewed = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(req.params.id, { isViewed: true }, { new: true })
      .populate('user', 'firstName lastName email imageUrl');
    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });
    res.json({ success: true, feedback: feedback.toJSON() });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });
    res.json({ success: true, message: 'Feedback deleted successfully' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};