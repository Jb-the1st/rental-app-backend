const express = require('express');
const router = express.Router();

const {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertiesByOwner
} = require('../controllers/properties.controller');

const { protect, authorize }  = require('../middleware/auth.middleware');
const requireEmailVerified     = require('../middleware/requireEmailVerified');
const upload                   = require('../middleware/upload.middleware');

// Public — anyone can browse
router.get('/', getProperties);
router.get('/owner/:userId', getPropertiesByOwner);
router.get('/:id', getProperty);

// requireEmailVerified blocks unverified users with a clear message
router.post('/', protect, requireEmailVerified, authorize('landlord', 'admin'), upload.single('image'), createProperty);
router.put('/:id', protect, requireEmailVerified, upload.single('image'), updateProperty);
router.delete('/:id', protect, deleteProperty);

module.exports = router;