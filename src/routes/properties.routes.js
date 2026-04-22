const express = require('express');
const router = express.Router();
const { getProperties, getProperty, createProperty, updateProperty, deleteProperty, getPropertiesByOwner }
  = require('../controllers/properties.controller');
const { protect }          = require('../middleware/auth.middleware');
const requireEmailVerified = require('../middleware/requireEmailVerified');
const upload               = require('../middleware/upload.middleware');

router.get('/', getProperties);
router.get('/owner/:userId', getPropertiesByOwner);
router.get('/:id', getProperty);

// upload.array('images', 10) accepts up to 10 files under field name "images"
// Also still works if frontend sends a single file under "image"
router.post('/', protect, upload.array('images', 10), createProperty);
router.put('/:id', protect, upload.array('images', 10), updateProperty);
router.delete('/:id', protect, deleteProperty);

module.exports = router;