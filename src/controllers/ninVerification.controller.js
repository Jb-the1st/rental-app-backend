const User = require('../models/User');
const NinVerification = require('../models/NinVerification');
const { generateToken } = require('../utils/jwt');

const getDelayMs = () => {
  const hours = parseFloat(process.env.NIN_VERIFICATION_DELAY_HOURS || 24);
  return hours * 60 * 60 * 1000;
};

// @desc  Submit NIN verification form
// @route POST /api/nin-verification/submit
// @access Private
exports.submitNinVerification = async (req, res) => {
  try {
    const { nin, firstName, lastName, currentAddress } = req.body;

    if (!nin || !firstName || !lastName || !currentAddress) {
      return res.status(400).json({
        success: false,
        message: 'nin, firstName, lastName and currentAddress are all required'
      });
    }

    if (!/^\d{11}$/.test(nin)) {
      return res.status(400).json({
        success: false,
        message: 'NIN must be exactly 11 digits'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.role === 'landlord') {
      return res.status(400).json({ success: false, message: 'You are already a landlord' });
    }

    const firstNameMatch = user.firstName.toLowerCase() === firstName.trim().toLowerCase();
    const lastNameMatch  = user.lastName.toLowerCase()  === lastName.trim().toLowerCase();

    if (!firstNameMatch || !lastNameMatch) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name must match your registered account information'
      });
    }

    const existing = await NinVerification.findOne({ user: user._id });

    if (existing) {
      if (['pending', 'processing', 'verified'].includes(existing.status)) {
        return res.status(400).json({
          success: false,
          message: `A verification request already exists with status: ${existing.status}`,
          verification: _safeVerification(existing)
        });
      }

      existing.nin                  = nin;
      existing.firstName            = firstName.trim();
      existing.lastName             = lastName.trim();
      existing.currentAddress       = currentAddress.trim();
      existing.status               = 'processing';
      existing.submittedAt          = new Date();
      existing.verificationDeadline = new Date(Date.now() + getDelayMs());
      existing.adminNote            = '';
      existing.roleUpgraded         = false;
      await existing.save();

      return res.status(200).json({
        success: true,
        message: 'Verification re-submitted. Your information is being reviewed.',
        verification: _safeVerification(existing)
      });
    }

    const verification = await NinVerification.create({
      user:                 user._id,
      nin,
      firstName:            firstName.trim(),
      lastName:             lastName.trim(),
      currentAddress:       currentAddress.trim(),
      status:               'processing',
      submittedAt:          new Date(),
      verificationDeadline: new Date(Date.now() + getDelayMs())
    });

    res.status(201).json({
      success: true,
      message: 'Verification submitted. Your NIN is being verified — this usually takes up to 24 hours.',
      verification: _safeVerification(verification)
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Check verification status — auto-promotes + returns FRESH TOKEN
// @route GET /api/nin-verification/status
// @access Private
exports.getVerificationStatus = async (req, res) => {
  try {
    const verification = await NinVerification.findOne({ user: req.user.id });

    if (!verification) {
      return res.status(404).json({ success: false, message: 'No verification request found' });
    }

    let freshToken = null;

    if (
      verification.status === 'processing' &&
      !verification.roleUpgraded &&
      new Date() >= verification.verificationDeadline
    ) {
      verification.status       = 'verified';
      verification.roleUpgraded = true;
      await verification.save();

      await User.findByIdAndUpdate(req.user.id, { role: 'landlord' });

      // Fresh token with updated role — frontend must store this and use it going forward
      freshToken = generateToken(req.user.id);
    }

    const response = {
      success: true,
      verification: _safeVerification(verification)
    };

    if (freshToken) {
      response.token   = freshToken;
      response.message = 'Congratulations! You are now verified as a landlord. Please use the new token.';
    }

    res.json(response);

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Admin — get all verifications
// @route GET /api/nin-verification/admin/all
// @access Private/Admin
exports.getAllVerifications = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const verifications = await NinVerification.find(filter)
      .populate('user', 'firstName lastName email phone role')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: verifications.length, verifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Admin — approve or reject
// @route PATCH /api/nin-verification/admin/:id/review
// @access Private/Admin
exports.reviewVerification = async (req, res) => {
  try {
    const { action, adminNote } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: "action must be 'approve' or 'reject'" });
    }

    const verification = await NinVerification.findById(req.params.id).populate('user');
    if (!verification) return res.status(404).json({ success: false, message: 'Verification not found' });

    if (verification.status === 'verified') {
      return res.status(400).json({ success: false, message: 'Already approved' });
    }

    if (action === 'approve') {
      verification.status       = 'verified';
      verification.roleUpgraded = true;
      verification.adminNote    = adminNote || '';
      await verification.save();
      await User.findByIdAndUpdate(verification.user._id, { role: 'landlord' });
      return res.json({ success: true, message: 'User approved as landlord', verification });
    }

    verification.status    = 'failed';
    verification.adminNote = adminNote || 'Rejected by admin';
    await verification.save();

    res.json({ success: true, message: 'Verification rejected', verification });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

function _safeVerification(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj.nin;
  return obj;
}