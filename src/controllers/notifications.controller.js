const Notification    = require('../models/Notification');
const NinVerification = require('../models/NinVerification');
const User            = require('../models/User');

// GET /api/notifications
// User gets their own. Admin gets all.
exports.getNotifications = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { userId: req.user._id };
    if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === 'true';

    const notifications = await Notification.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/notifications
exports.createNotification = async (req, res) => {
  try {
    const { userId, message, datetime, isRead } = req.body;

    if (!userId || !message || !datetime)
      return res.status(400).json({ success: false, message: 'userId, message and datetime are required' });

    const notification = await Notification.create({
      userId,
      message,
      datetime,
      isRead: isRead || false
    });

    res.status(201).json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
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

// PATCH /api/notifications/read-all
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/notifications/admin/:id/review
exports.reviewNotification = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!['approved', 'rejected'].includes(status))
      return res.status(400).json({ success: false, message: "status must be 'approved' or 'rejected'" });

    const v = await NinVerification.findOne({
      $or: [{ _id: req.params.id }, { user: req.params.id }]
    }).populate('user', 'firstName lastName email role');

    if (!v) return res.status(404).json({ success: false, message: 'Verification request not found' });
    if (v.status === 'verified')
      return res.status(400).json({ success: false, message: 'Already approved' });

    const datetime = new Date().toISOString();

    if (status === 'approved') {
      v.status = 'verified'; v.roleUpgraded = true; v.adminNote = adminNote || '';
      await v.save();
      await User.findByIdAndUpdate(v.user._id, { role: 'owner' });

      // Notify the user
      await Notification.create({
        userId:   v.user._id,
        message:  `Congratulations ${v.firstName}! Your request to become an owner has been approved. You can now list properties.`,
        datetime,
        isRead:   false
      });

      // Notify all admins
      const admins = await User.find({ role: 'admin' }).select('_id');
      if (admins.length > 0) {
        await Notification.insertMany(admins.map(admin => ({
          userId:   admin._id,
          message:  `${v.firstName} ${v.lastName} has been approved as an owner.`,
          datetime,
          isRead:   false
        })));
      }

      return res.json({ success: true, message: `${v.firstName} ${v.lastName} approved as owner` });
    }

    // Reject
    v.status = 'failed'; v.adminNote = adminNote || 'Rejected by admin';
    await v.save();

    await Notification.create({
      userId:   v.user._id,
      message:  `Your request to become an owner was not approved. ${adminNote ? 'Reason: ' + adminNote : 'Please contact support for more information.'}`,
      datetime,
      isRead:   false
    });

    const admins = await User.find({ role: 'admin' }).select('_id');
    if (admins.length > 0) {
      await Notification.insertMany(admins.map(admin => ({
        userId:   admin._id,
        message:  `${v.firstName} ${v.lastName}'s owner request has been rejected.`,
        datetime,
        isRead:   false
      })));
    }

    res.json({ success: true, message: `${v.firstName} ${v.lastName} rejected` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};