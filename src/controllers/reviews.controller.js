const Review = require('../models/Review');

exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('user', 'firstName lastName imageUrl')
      .populate('propertyId', 'title');
    res.json({ success: true, count: reviews.length, reviews: reviews.map(r => r.toJSON()) });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getPropertyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ propertyId: req.params.propertyId })
      .populate('user', 'firstName lastName imageUrl');
    res.json({ success: true, count: reviews.length, reviews: reviews.map(r => r.toJSON()) });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createReview = async (req, res) => {
  try {
    // Frontend sends userId and propertyId — map to internal field names
    const review = await Review.create({
      text:       req.body.text,
      user:       req.user._id,           // always from auth, never trust body
      propertyId: req.body.propertyId
    });
    await review.populate('user', 'firstName lastName imageUrl');
    res.status(201).json({ success: true, review: review.toJSON() });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    if (review.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized to update this review' });
    if (!req.body.text) return res.status(400).json({ success: false, message: 'text is required' });
    review.text = req.body.text;
    await review.save();
    await review.populate('user', 'firstName lastName imageUrl');
    res.json({ success: true, review: review.toJSON() });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });
    await review.deleteOne();
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};