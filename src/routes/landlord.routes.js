const express = require('express');
const router = express.Router();
const {
  submitLandlordVerification,
  uploadDocuments,
  reviewLandlordVerification,
  getPendingVerifications,
} = require('../controllers/landlord.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.post('/:id/verify-landlord',  protect, submitLandlordVerification);
// router.post('/:id/upload-documents', protect, upload.single('document'), uploadDocuments);
router.patch('/:id/review-landlord', protect, authorize('admin'), reviewLandlordVerification);
router.get('/pending',               protect, authorize('admin'), getPendingVerifications);

module.exports = router;