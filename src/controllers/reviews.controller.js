const Review = require('../models/Review');

// @desc  Get all reviews
// @route GET /api/reviews
// @access Public
exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('user', 'firstName lastName imageUrl')
      .populate('propertyId', 'title');
    res.json({
      success: true,
      count: reviews.length,
      reviews: reviews.map(r => r.toJSON())
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get reviews for a property
// @route GET /api/reviews/property/:propertyId
// @access Public
exports.getPropertyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ propertyId: req.params.propertyId })
      .populate('user', 'firstName lastName imageUrl');
    res.json({
      success: true,
      count: reviews.length,
      reviews: reviews.map(r => r.toJSON())
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Create review
// @route POST /api/reviews
// @access Private
exports.createReview = async (req, res) => {
  try {
    req.body.user = req.user._id;
    const review = await Review.create(req.body);
    await review.populate('user', 'firstName lastName imageUrl');
    res.status(201).json({ success: true, review: review.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Update review
// @route PUT /api/reviews/:id
// @access Private (owner only)
exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    // Only the owner can update their review
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }

    // Only allow updating the text field — user and propertyId are immutable
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'text is required' });
    }

    review.text = text;
    await review.save();
    await review.populate('user', 'firstName lastName imageUrl');

    res.json({ success: true, review: review.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Delete review
// @route DELETE /api/reviews/:id
// @access Private (owner or admin)
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    await review.deleteOne();
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};