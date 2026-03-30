const express = require('express');
const router = express.Router();
const {
  getReviews,
  getPropertyReviews,
  createReview,
  deleteReview
} = require('../controllers/reviews.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', getReviews);
router.get('/property/:propertyId', getPropertyReviews);
router.post('/', protect, createReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;
