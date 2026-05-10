const User = require('../models/User');
const NinVerification = require('../models/NinVerification');
const { generateToken } = require('../utils/jwt');

const getDelayMs = () => parseFloat(process.env.NIN_VERIFICATION_DELAY_HOURS || 24) * 3600000;

// Keeps user.verifyOwner in sync so frontend always sees it on the user object
const syncVerifyOwner = async (userId, patch) => {
  await User.findByIdAndUpdate(userId, { $set: { verifyOwner: patch } });
};

// POST /api/nin-verification/submit
exports.submitNinVerification = async (req, res) => {
  try {
    console.log('NIN verification submit received:', {
      userId: req.user?.id,
      body: req.body
    });
    const { nin, firstName, lastName, currentAddress, DoB } = req.body;

    if (!nin || !firstName || !lastName || !currentAddress)
      return res.status(400).json({ success: false, message: 'nin, firstName, lastName and currentAddress are all required' });

    if (!/^\d{11}$/.test(nin))
      return res.status(400).json({ success: false, message: 'NIN must be exactly 11 digits' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'owner') return res.status(400).json({ success: false, message: 'Already a owner' });

    if (user.firstName.toLowerCase() !== firstName.trim().toLowerCase() ||
        user.lastName.toLowerCase()  !== lastName.trim().toLowerCase())
      return res.status(400).json({ success: false, message: 'Name must match your registered account information' });

    const existing = await NinVerification.findOne({ user: user._id });
    if (existing && ['pending', 'processing', 'verified'].includes(existing.status))
      return res.status(400).json({ success: false, message: `Request already exists with status: ${existing.status}` });

    const deadline = new Date(Date.now() + getDelayMs());

    if (existing) {
      Object.assign(existing, { nin, firstName: firstName.trim(), lastName: lastName.trim(),
        currentAddress: currentAddress.trim(), status: 'processing',
        submittedAt: new Date(), verificationDeadline: deadline, adminNote: '', roleUpgraded: false });
      await existing.save();
    } else {
      await NinVerification.create({ user: user._id, nin,
        firstName: firstName.trim(), lastName: lastName.trim(),
        currentAddress: currentAddress.trim(),
        status: 'processing', submittedAt: new Date(), verificationDeadline: deadline });
    }

    // Sync into user.verifyOwner — frontend reads this from the user object
    await syncVerifyOwner(user._id, {
      NIN: nin,  // Keep as string, not parseInt
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      DoB: (DoB && DoB.trim()) ? DoB : undefined,  // Only include if provided and not empty
      address: currentAddress.trim(),
      status: 'processing',
      verifiedAt: ''
    });

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
      response.message = 'You are now a owner. Save the new token.';
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

    const lookup = {
      $or: [
        { _id: req.params.id },
        { user: req.params.id }
      ]
    };

    const v = await NinVerification.findOne(lookup).populate('user');
    if (!v) return res.status(404).json({ success: false, message: 'Not found' });
    if (v.status === 'verified')
      return res.status(400).json({ success: false, message: 'Already approved' });

    const Notification = require('../models/Notification');

    if (status === 'approved') {
      v.status = 'verified'; v.roleUpgraded = true; v.adminNote = adminNote || '';
      await v.save();
      await User.findByIdAndUpdate(v.user._id, { role: 'owner' });

      await Notification.create({
        recipient: v.user._id,
        type: 'owner_approved',
        title: 'owner Request Approved',
        message: `Congratulations ${v.firstName}! Your request to become a owner has been approved.`,
        meta: { ninVerificationId: v._id }
      });

      return res.json({ success: true, message: 'Approved as owner' });
    }

    v.status = 'failed'; v.adminNote = adminNote || 'Rejected by admin';
    await v.save();

    await Notification.create({
      recipient: v.user._id,
      type: 'owner_rejected',
      title: 'owner Request Rejected',
      message: `Your owner request was not approved. ${adminNote ? 'Reason: ' + adminNote : ''}`,
      meta: { ninVerificationId: v._id }
    });

    res.json({ success: true, message: 'Rejected' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};