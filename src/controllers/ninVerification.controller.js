const User            = require('../models/User');
const NinVerification = require('../models/NinVerification');
const Notification    = require('../models/Notification');
const { generateToken } = require('../utils/jwt');

const getDelayMs = () => parseFloat(process.env.NIN_VERIFICATION_DELAY_HOURS || 24) * 3600000;

const syncVerifyOwner = async (userId, patch) => {
  await User.findByIdAndUpdate(userId, { $set: { verifyOwner: patch } });
};

// POST /api/nin-verification/submit
exports.submitNinVerification = async (req, res) => {
  try {
    const { nin, firstName, lastName, currentAddress } = req.body;

    if (!nin || !firstName || !lastName || !currentAddress)
      return res.status(400).json({ success: false, message: 'nin, firstName, lastName and currentAddress are all required' });

    if (!/^\d{11}$/.test(nin))
      return res.status(400).json({ success: false, message: 'NIN must be exactly 11 digits' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'owner') return res.status(400).json({ success: false, message: 'Already an owner' });

    if (user.firstName.toLowerCase() !== firstName.trim().toLowerCase() ||
        user.lastName.toLowerCase()  !== lastName.trim().toLowerCase())
      return res.status(400).json({ success: false, message: 'Name must match your registered account information' });

    const existing = await NinVerification.findOne({ user: user._id });
    if (existing && ['pending', 'processing', 'verified'].includes(existing.status))
      return res.status(400).json({ success: false, message: `Request already exists with status: ${existing.status}` });

    const deadline = new Date(Date.now() + getDelayMs());
    let ninRecord;

    if (existing) {
      Object.assign(existing, {
        nin, firstName: firstName.trim(), lastName: lastName.trim(),
        currentAddress: currentAddress.trim(), status: 'processing',
        submittedAt: new Date(), verificationDeadline: deadline,
        adminNote: '', roleUpgraded: false
      });
      await existing.save();
      ninRecord = existing;
    } else {
      ninRecord = await NinVerification.create({
        user: user._id, nin,
        firstName: firstName.trim(), lastName: lastName.trim(),
        currentAddress: currentAddress.trim(),
        status: 'processing', submittedAt: new Date(), verificationDeadline: deadline
      });
    }

    await syncVerifyOwner(user._id, {
      NIN: nin,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      address: currentAddress.trim(),
      status: 'processing',
      verifiedAt: ''
    });

    // Notify all admins of new owner request
    const datetime = new Date().toISOString();
    const admins = await User.find({ role: 'admin' }).select('_id');
    if (admins.length > 0) {
      await Notification.insertMany(admins.map(admin => ({
        userId:   admin._id,
        message:  `${firstName.trim()} ${lastName.trim()} has submitted a request to become an owner.`,
        datetime,
        isRead:   false
      })));
    }

    const updatedUser = await User.findById(user._id);
    res.status(201).json({
      success: true,
      message: 'Verification submitted. Your NIN is being verified.',
      user: updatedUser.toJSON()
    });

  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// GET /api/nin-verification/status
exports.getVerificationStatus = async (req, res) => {
  try {
    const verification = await NinVerification.findOne({ user: req.user.id });
    if (!verification) return res.status(404).json({ success: false, message: 'No verification request found' });

    let freshToken = null;

    if (verification.status === 'processing' && !verification.roleUpgraded && new Date() >= verification.verificationDeadline) {
      verification.status = 'verified';
      verification.roleUpgraded = true;
      await verification.save();

      const now = new Date().toISOString();
      await User.findByIdAndUpdate(req.user.id, {
        role: 'owner',
        'verifyOwner.status': 'verified',
        'verifyOwner.verifiedAt': now
      });

      freshToken = generateToken(req.user.id);
    }

    const obj = verification.toObject();
    delete obj.nin;

    const response = { success: true, verification: obj };
    if (freshToken) {
      const updatedUser = await User.findById(req.user.id);
      response.token = freshToken;
      response.message = 'You are now an owner. Save the new token.';
      response.user = updatedUser.toJSON();
    }

    res.json(response);
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// GET /api/nin-verification/admin/all
exports.getAllVerifications = async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const verifications = await NinVerification.find(filter)
      .populate('user', 'firstName lastName email phone role verifyOwner')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: verifications.length, verifications });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// PATCH /api/nin-verification/admin/:id/review
exports.reviewVerification = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!['approved', 'rejected'].includes(status))
      return res.status(400).json({ success: false, message: "status must be 'approved' or 'rejected'" });

    const v = await NinVerification.findOne({
      $or: [{ _id: req.params.id }, { user: req.params.id }]
    }).populate('user');

    if (!v) return res.status(404).json({ success: false, message: 'Not found' });
    if (v.status === 'verified')
      return res.status(400).json({ success: false, message: 'Already approved' });

    const datetime = new Date().toISOString();

    if (status === 'approved') {
      v.status = 'verified'; v.roleUpgraded = true; v.adminNote = adminNote || '';
      await v.save();
      await User.findByIdAndUpdate(v.user._id, {
        role: 'owner',
        'verifyOwner.status': 'verified',
        'verifyOwner.verifiedAt': datetime
      });

      // Notify the user
      await Notification.create({
        userId:  v.user._id,
        message: `Congratulations ${v.firstName}! Your request to become an owner has been approved. You can now list properties.`,
        datetime,
        isRead:  false
      });

      // Notify all admins
      const admins = await User.find({ role: 'admin' }).select('_id');
      if (admins.length > 0) {
        await Notification.insertMany(admins.map(admin => ({
          userId:  admin._id,
          message: `${v.firstName} ${v.lastName} has been approved as an owner.`,
          datetime,
          isRead:  false
        })));
      }

      return res.json({ success: true, message: 'Approved as owner' });
    }

    // Reject
    v.status = 'failed'; v.adminNote = adminNote || 'Rejected by admin';
    await v.save();
    await User.findByIdAndUpdate(v.user._id, { 'verifyOwner.status': 'failed' });

    // Notify the user
    await Notification.create({
      userId:  v.user._id,
      message: `Your request to become an owner was not approved. ${adminNote ? 'Reason: ' + adminNote : 'Please contact support for more information.'}`,
      datetime,
      isRead:  false
    });

    // Notify all admins
    const admins = await User.find({ role: 'admin' }).select('_id');
    if (admins.length > 0) {
      await Notification.insertMany(admins.map(admin => ({
        userId:  admin._id,
        message: `${v.firstName} ${v.lastName}'s owner request has been rejected.`,
        datetime,
        isRead:  false
      })));
    }

    res.json({ success: true, message: 'Rejected' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};