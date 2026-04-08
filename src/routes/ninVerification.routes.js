const express = require('express');
const router = express.Router();

const {
  submitNinVerification,
  getVerificationStatus,
  getAllVerifications,
  reviewVerification
} = require('../controllers/ninVerification.controller');

const { protect, authorize } = require('../middleware/auth.middleware');

// User-facing routes
router.post('/submit', protect, submitNinVerification);
router.get('/status', protect, getVerificationStatus);

// Admin routes
router.get('/admin/all', protect, authorize('admin'), getAllVerifications);
router.patch('/admin/:id/review', protect, authorize('admin'), reviewVerification);

module.exports = router;