const User = require('../models/User');
 
// @desc Get all users
// @route GET /api/users
// @access Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json({
      success: true,
      count: users.length,
      users: users.map(u => u.toJSON())
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
 
// @desc Get single user
// @route GET /api/users/:id
// @access Private
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
 
// @desc Update user
// @route PUT /api/users/:id
// @access Private
exports.updateUser = async (req, res) => {
  try {
    // Don't allow updating password through this route
    delete req.body.password;
 
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
 
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
 
    res.json({ success: true, user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
 
// @desc Delete user
// @route DELETE /api/users/:id
// @access Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
 
// @desc Toggle user role (admin ↔ tenant)
// @route PATCH /api/users/:id/toggle-role
// @access Private/Admin
exports.toggleRole = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
 
    // Toggle between admin and tenant
    user.role = user.role === 'admin' ? 'tenant' : 'admin';
    await user.save();
 
    res.json({ success: true, user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// const User = require('../models/User');

// // @desc    Get all users
// // @route   GET /api/users
// // @access  Private/Admin
// exports.getUsers = async (req, res) => {
//   try {
//     const users = await User.find();
    
//     res.json({
//       success: true,
//       count: users.length,
//       users: users.map(u => u.toJSON())
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// // @desc    Get single user
// // @route   GET /api/users/:id
// // @access  Private
// exports.getUser = async (req, res) => {
//   try {
//     const user = await User.findById(req.params.id);

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found'
//       });
//     }

//     res.json({
//       success: true,
//       user: user.toJSON()
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// // @desc    Update user
// // @route   PUT /api/users/:id
// // @access  Private
// exports.updateUser = async (req, res) => {
//   try {
//     // Don't allow updating password through this route
//     delete req.body.password;

//     const user = await User.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       {
//         new: true,
//         runValidators: true
//       }
//     );

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found'
//       });
//     }

//     res.json({
//       success: true,
//       user: user.toJSON()
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// // @desc    Delete user
// // @route   DELETE /api/users/:id
// // @access  Private/Admin
// exports.deleteUser = async (req, res) => {
//   try {
//     const user = await User.findByIdAndDelete(req.params.id);

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found'
//       });
//     }

//     res.json({
//       success: true,
//       message: 'User deleted successfully'
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// // @desc    Toggle user role
// // @route   PATCH /api/users/:id/toggle-role
// // @access  Private/Admin
// exports.toggleRole = async (req, res) => {
//   try {
//     const user = await User.findById(req.params.id);

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found'
//       });
//     }

//     // Toggle between admin and user (tenant)
//     user.role = user.role === 'admin' ? 'tenant' : 'admin';
//     await user.save();

//     res.json({
//       success: true,
//       user: user.toJSON()
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// // @desc    Switch to landlord (requires NIN)
// // @route   PATCH /api/users/:id/switch-to-landlord
// // @access  Private
// exports.switchToLandlord = async (req, res) => {
//   try {
//     const { NIN } = req.body;

//     if (!NIN) {
//       return res.status(400).json({
//         success: false,
//         message: 'NIN is required to become a landlord'
//       });
//     }

//     const user = await User.findById(req.params.id);

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found'
//       });
//     }

//     if (user.role === 'landlord') {
//       return res.status(400).json({
//         success: false,
//         message: 'User is already a landlord'
//       });
//     }

//     user.role = 'landlord';
//     user.NIN = NIN;
//     await user.save();

//     res.json({
//       success: true,
//       message: 'Successfully switched to landlord',
//       user: user.toJSON()
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };