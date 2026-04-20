const express = require('express');
const router = express.Router();

const {
  getNotifications,
  reviewNotification
} = require('../controllers/notifications.controller');

const { protect, authorize } = require('../middleware/auth.middleware');

// Admin only
router.get('/', protect, authorize('admin'), getNotifications);
router.patch('/:id/review', protect, authorize('admin'), reviewNotification);

module.exports = router;