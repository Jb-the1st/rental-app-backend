const express = require('express');
const router  = express.Router();
const {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  reviewNotification
} = require('../controllers/notifications.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.get('/',                   protect, getNotifications);
router.post('/',                  protect, createNotification);
router.patch('/read-all',         protect, markAllAsRead);
router.patch('/:id/read',         protect, markAsRead);
router.patch('/admin/:id/review', protect, authorize('admin'), reviewNotification);

module.exports = router;