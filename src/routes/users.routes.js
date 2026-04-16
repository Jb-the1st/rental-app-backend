// const express = require('express');
// const router = express.Router();
// const {
//   getUsers,
//   getUser,
//   updateUser,
//   deleteUser,
//   toggleRole,
//   switchToLandlord
// } = require('../controllers/users.controller');
// const { protect, authorize } = require('../middleware/auth.middleware');

// router.get('/', protect, authorize('admin'), getUsers);
// router.get('/:id', protect, getUser);
// router.put('/:id', protect, updateUser);
// router.delete('/:id', protect, authorize('admin'), deleteUser);
// router.patch('/:id/toggle-role', protect, authorize('admin'), toggleRole);
// router.patch('/:id/switch-to-landlord', protect, switchToLandlord);

// module.exports = router;

const express = require('express');
const router = express.Router();

const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  toggleRole,
  // switchToLandlord  // ← REPLACED: landlord upgrade now goes through /api/nin-verification/submit
} = require('../controllers/users.controller');

const { protect, authorize } = require('../middleware/auth.middleware');

router.get('/', protect, getUsers);
router.get('/:id', protect, getUser);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);
router.patch('/:id/toggle-role', protect, authorize('admin'), toggleRole);

// router.patch('/:id/switch-to-landlord', protect, switchToLandlord);
// ↑ REPLACED: the landlord upgrade flow now lives at POST /api/nin-verification/submit
//   and GET  /api/nin-verification/status
//   Keep this commented until NIMC API is integrated, then re-evaluate.

module.exports = router;