const Feedback = require('../models/Feedback');

// @desc  Get all feedbacks
// @route GET /api/feedbacks
// @access Private/Admin
exports.getFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate('user', 'firstName lastName email imageUrl');
    res.json({
      success: true,
      count: feedbacks.length,
      feedbacks: feedbacks.map(f => f.toJSON())
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Create feedback
// @route POST /api/feedbacks
// @access Private
exports.createFeedback = async (req, res) => {
  try {
    req.body.user = req.user._id;

    if (req.file) {
      req.body.imageUrl = `/uploads/${req.file.filename}`;
    }

    const feedback = await Feedback.create(req.body);
    await feedback.populate('user', 'firstName lastName email imageUrl');

    res.status(201).json({ success: true, feedback: feedback.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Update feedback
// @route PUT /api/feedbacks/:id
// @access Private (owner only)
exports.updateFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    // Only the owner can edit their own feedback
    if (feedback.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this feedback'
      });
    }

    // Updatable fields: text and image
    if (req.body.text) feedback.text = req.body.text;

    if (req.file) {
      feedback.imageUrl = `/uploads/${req.file.filename}`;
    }

    // Prevent the owner from tampering with isViewed
    // isViewed is admin-only — ignore it even if sent in body
    await feedback.save();
    await feedback.populate('user', 'firstName lastName email imageUrl');

    res.json({ success: true, feedback: feedback.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Mark feedback as viewed
// @route PATCH /api/feedbacks/:id/view
// @access Private/Admin
exports.markAsViewed = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { isViewed: true },
      { new: true }
    ).populate('user', 'firstName lastName email imageUrl');

    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    res.json({ success: true, feedback: feedback.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Delete feedback
// @route DELETE /api/feedbacks/:id
// @access Private/Admin
exports.deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);

    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    res.json({ success: true, message: 'Feedback deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};