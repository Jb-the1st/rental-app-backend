const NinVerification = require('../models/NinVerification');

// @desc  Get all notifications for admin — users who have submitted NIN
//        verification requests (pending / processing / failed)
// @route GET /api/notifications
// @access Private/Admin
exports.getNotifications = async (req, res) => {
  try {
    // Optional ?status= filter, e.g. ?status=processing
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const verifications = await NinVerification.find(filter)
      .populate('user', 'firstName lastName email phone imageUrl role')
      .sort({ createdAt: -1 });

    // Shape the response so the frontend can render a notification list
    const notifications = verifications.map(v => ({
      id:          v._id,
      type:        'landlord_verification',
      status:      v.status,
      submittedAt: v.submittedAt,
      createdAt:   v.createdAt,
      user: {
        id:        v.user._id,
        firstName: v.user.firstName,
        lastName:  v.user.lastName,
        email:     v.user.email,
        phone:     v.user.phone,
        imageUrl:  v.user.imageUrl,
        role:      v.user.role
      },
      firstName:      v.firstName,
      lastName:       v.lastName,
      currentAddress: v.currentAddress,
      adminNote:      v.adminNote || '',
      roleUpgraded:   v.roleUpgraded,
      verificationDeadline: v.verificationDeadline
    }));

    res.json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Admin approves or rejects a single notification (NIN verification)
// @route PATCH /api/notifications/:id/review
// @access Private/Admin
exports.reviewNotification = async (req, res) => {
  try {
    const { action, adminNote } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "action must be 'approve' or 'reject'"
      });
    }

    const verification = await NinVerification.findById(req.params.id)
      .populate('user', 'firstName lastName email role');

    if (!verification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (verification.status === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been approved'
      });
    }

    const User = require('../models/User');

    if (action === 'approve') {
      verification.status       = 'verified';
      verification.roleUpgraded = true;
      verification.adminNote    = adminNote || '';
      await verification.save();

      await User.findByIdAndUpdate(verification.user._id, { role: 'landlord' });

      return res.json({
        success: true,
        message: `${verification.firstName} ${verification.lastName} has been approved as a landlord`
      });
    }

    verification.status    = 'failed';
    verification.adminNote = adminNote || 'Rejected by admin';
    await verification.save();

    res.json({
      success: true,
      message: `Verification for ${verification.firstName} ${verification.lastName} has been rejected`
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};