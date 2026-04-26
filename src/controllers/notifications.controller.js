const NinVerification = require('../models/NinVerification');
const User = require('../models/User');

// GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};

    const verifications = await NinVerification.find(filter)
      .populate('user', 'firstName lastName email phone imageUrl role')
      .sort({ createdAt: -1 });

    // Shape to match frontend Notification interface:
    // { id, userId, datetime, message, isRead }
    const notifications = verifications.map(v => ({
      id:       v._id,
      userId:   v.user._id,
      datetime: v.createdAt,
      message:  buildMessage(v),
      isRead:   v.status === 'verified' || v.status === 'failed',
      // extra fields useful for admin actions
      status:             v.status,
      verificationId:     v._id,
      applicantName:      `${v.firstName} ${v.lastName}`,
      applicantEmail:     v.user.email,
      applicantPhone:     v.user.phone,
      currentAddress:     v.currentAddress,
      adminNote:          v.adminNote || '',
      roleUpgraded:       v.roleUpgraded,
      verificationDeadline: v.verificationDeadline
    }));

    res.json({ success: true, count: notifications.length, notifications });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// PATCH /api/notifications/:id/review
exports.reviewNotification = async (req, res) => {
  try {
    const { action, adminNote } = req.body;

    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({ success: false, message: "action must be 'approve' or 'reject'" });

    const verification = await NinVerification.findById(req.params.id)
      .populate('user', 'firstName lastName email role');

    if (!verification) return res.status(404).json({ success: false, message: 'Notification not found' });
    if (verification.status === 'verified')
      return res.status(400).json({ success: false, message: 'Already approved' });

    const now = new Date().toISOString();

    if (action === 'approve') {
      verification.status       = 'verified';
      verification.roleUpgraded = true;
      verification.adminNote    = adminNote || '';
      await verification.save();
      await User.findByIdAndUpdate(verification.user._id, {
        role: 'owner',
        'verifyOwner.status':     'verified',
        'verifyOwner.verifiedAt': now
      });
      return res.json({ success: true, message: `${verification.firstName} ${verification.lastName} approved as owner` });
    }

    verification.status    = 'failed';
    verification.adminNote = adminNote || 'Rejected by admin';
    await verification.save();
    await User.findByIdAndUpdate(verification.user._id, { 'verifyOwner.status': 'failed' });

    res.json({ success: true, message: `${verification.firstName} ${verification.lastName} rejected` });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

function buildMessage(v) {
  const name = `${v.firstName} ${v.lastName}`;
  switch (v.status) {
    case 'processing': return `${name} has submitted a request to become an owner`;
    case 'verified':   return `${name} has been verified as an owner`;
    case 'failed':     return `${name}'s verification was rejected`;
    default:           return `${name} has a pending verification request`;
  }
}