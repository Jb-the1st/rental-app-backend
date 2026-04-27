const express = require('express');
const router = express.Router();

const {
  getNotifications,
  reviewNotification
} = require('../controllers/notifications.controller');

const { protect, authorize } = require('../middleware/auth.middleware');

// Admin only
router.get('/', protect, authorize('admin', 'owner', 'user'), getNotifications);
router.patch('/:id/review', protect, authorize('admin', 'owner'), reviewNotification);

module.exports = router;