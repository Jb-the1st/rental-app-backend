const express = require('express');
const router = express.Router();
const {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  deletePropertyMedia,
  getPropertiesByOwner,
} = require('../controllers/properties.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.get('/',                        getProperties);
router.get('/owner/:userId',           getPropertiesByOwner);  // must be before /:id
router.get('/:id',                     getProperty);
router.post('/',                       protect, authorize('landlord', 'admin'), ...upload.propertyMedia, createProperty);
router.put('/:id',                     protect, ...upload.propertyMedia, updateProperty);
router.delete('/:id',                  protect, deleteProperty);
router.delete('/:id/media/:publicId',  protect, deletePropertyMedia);

module.exports = router;