const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  toggleRole,
  switchToLandlord
} = require('../controllers/users.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.get('/', protect, authorize('admin'), getUsers);
router.get('/:id', protect, getUser);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);
router.patch('/:id/toggle-role', protect, authorize('admin'), toggleRole);
router.patch('/:id/switch-to-landlord', protect, switchToLandlord);

module.exports = router;