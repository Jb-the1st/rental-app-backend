const Notification    = require('../models/Notification');
const NinVerification = require('../models/NinVerification');
const User            = require('../models/User');

// GET /api/notifications
// User gets their own. Admin gets all.
exports.getNotifications = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { recipient: req.user._id };
    if (req.query.status === 'unread') filter.isRead = false;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .populate('recipient', 'firstName lastName email imageUrl role');

    res.json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/notifications  — internal or admin use
exports.createNotification = async (req, res) => {
  try {
    const { recipient, type, title, message, meta } = req.body;
    if (!recipient || !title || !message)
      return res.status(400).json({ success: false, message: 'recipient, title, and message are required' });

    const notification = await Notification.create({ recipient, type, title, message, meta: meta || {} });
    res.status(201).json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/notifications/:id/read  — mark one as read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification)
      return res.status(404).json({ success: false, message: 'Notification not found' });

    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/notifications/read-all  — mark all as read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/notifications/admin/:id/review  — approve or reject owner request + notify user
exports.reviewNotification = async (req, res) => {
  try {
    const { action, adminNote } = req.body;
    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({ success: false, message: "action must be 'approve' or 'reject'" });

    const v = await NinVerification.findById(req.params.id).populate('user', 'firstName lastName email role');
    if (!v) return res.status(404).json({ success: false, message: 'Verification request not found' });
    if (v.status === 'verified')
      return res.status(400).json({ success: false, message: 'Already approved' });

    if (action === 'approve') {
      v.status = 'verified';
      v.roleUpgraded = true;
      v.adminNote = adminNote || '';
      await v.save();
      await User.findByIdAndUpdate(v.user._id, { role: 'owner' });

      // Notify the user
      await Notification.create({
        recipient: v.user._id,
        type: 'owner_approved',
        title: 'owner Request Approved',
        message: `Congratulations ${v.firstName}! Your request to become a owner has been approved. You can now list properties.`,
        meta: { ninVerificationId: v._id }
      });

      // Notify all admins
      const admins = await User.find({ role: 'admin' }).select('_id');
      await Notification.insertMany(admins.map(admin => ({
        recipient: admin._id,
        type: 'owner_approved',
        title: 'owner Request Approved',
        message: `${v.firstName} ${v.lastName} has been approved as a owner.`,
        meta: { ninVerificationId: v._id, userId: v.user._id }
      })));

      return res.json({ success: true, message: `${v.firstName} ${v.lastName} approved as owner` });
    }

    // Reject
    v.status = 'failed';
    v.adminNote = adminNote || 'Rejected by admin';
    await v.save();

    // Notify the user
    await Notification.create({
      recipient: v.user._id,
      type: 'owner_rejected',
      title: 'owner Request Rejected',
      message: `Your request to become a owner was not approved. ${adminNote ? 'Reason: ' + adminNote : 'Please contact support for more information.'}`,
      meta: { ninVerificationId: v._id }
    });

    // Notify all admins
    const admins = await User.find({ role: 'admin' }).select('_id');
    await Notification.insertMany(admins.map(admin => ({
      recipient: admin._id,
      type: 'owner_rejected',
      title: 'owner Request Rejected',
      message: `${v.firstName} ${v.lastName}'s owner request has been rejected.`,
      meta: { ninVerificationId: v._id, userId: v.user._id }
    })));

    res.json({ success: true, message: `${v.firstName} ${v.lastName} rejected` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};