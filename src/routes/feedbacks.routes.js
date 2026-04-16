const express = require('express');
const router = express.Router();

const {
  getFeedbacks,
  createFeedback,
  updateFeedback,  // NEW
  markAsViewed,
  deleteFeedback
} = require('../controllers/feedbacks.controller');

const { protect, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.get('/', protect, authorize('admin'), getFeedbacks);
router.post('/', protect, upload.single('image'), createFeedback);
router.put('/:id', protect, upload.single('image'), updateFeedback);  // NEW
router.patch('/:id/view', protect, authorize('admin'), markAsViewed);
router.delete('/:id', protect, authorize('admin'), deleteFeedback);

module.exports = router;