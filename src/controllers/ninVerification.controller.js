const User = require('../models/User');
const NinVerification = require('../models/NinVerification');

// How many hours before the user is "verified" — tweak in .env
// e.g. NIN_VERIFICATION_DELAY_HOURS=24  (default: 24)
const getDelayMs = () => {
  const hours = parseFloat(process.env.NIN_VERIFICATION_DELAY_HOURS || 24);
  return hours * 60 * 60 * 1000;
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Submit NIN verification form (tenant → wants to become landlord)
// @route   POST /api/nin-verification/submit
// @access  Private (any logged-in tenant)
// ─────────────────────────────────────────────────────────────────────────────
exports.submitNinVerification = async (req, res) => {
  try {
    const { nin, firstName, lastName, currentAddress } = req.body;

    // Basic field check
    if (!nin || !firstName || !lastName || !currentAddress) {
      return res.status(400).json({
        success: false,
        message: 'nin, firstName, lastName and currentAddress are all required'
      });
    }

    // NIN must be exactly 11 digits
    if (!/^\d{11}$/.test(nin)) {
      return res.status(400).json({
        success: false,
        message: 'NIN must be exactly 11 digits'
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'landlord') {
      return res.status(400).json({
        success: false,
        message: 'You are already a landlord'
      });
    }

    // Name must match what was provided at sign-up (case-insensitive)
    const firstNameMatch = user.firstName.toLowerCase() === firstName.trim().toLowerCase();
    const lastNameMatch  = user.lastName.toLowerCase()  === lastName.trim().toLowerCase();

    if (!firstNameMatch || !lastNameMatch) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name must match your registered account information'
      });
    }

    // Check if a verification record already exists for this user
    const existing = await NinVerification.findOne({ user: user._id });

    if (existing) {
      if (['pending', 'processing', 'verified'].includes(existing.status)) {
        return res.status(400).json({
          success: false,
          message: `A verification request already exists with status: ${existing.status}`,
          verification: _safeVerification(existing)
        });
      }

      // If previously failed, allow re-submission by updating the record
      existing.nin             = nin;
      existing.firstName       = firstName.trim();
      existing.lastName        = lastName.trim();
      existing.currentAddress  = currentAddress.trim();
      existing.status          = 'pending';
      existing.submittedAt     = new Date();
      existing.verificationDeadline = new Date(Date.now() + getDelayMs());
      existing.adminNote       = '';
      existing.roleUpgraded    = false;
      await existing.save();

      return res.status(200).json({
        success: true,
        message: 'Verification re-submitted. Your information is being reviewed.',
        verification: _safeVerification(existing)
      });
    }

    // Create a fresh verification record
    const verification = await NinVerification.create({
      user: user._id,
      nin,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      currentAddress: currentAddress.trim(),
      status: 'processing', // jump straight to "processing" so it looks active
      submittedAt: new Date(),
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

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Check verification status for the logged-in user
//          Auto-promotes to landlord once the deadline has passed
// @route   GET /api/nin-verification/status
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
exports.getVerificationStatus = async (req, res) => {
  try {
    const verification = await NinVerification.findOne({ user: req.user.id });

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'No verification request found'
      });
    }

    // Auto-verify if deadline has passed and not yet upgraded
    if (
      verification.status === 'processing' &&
      !verification.roleUpgraded &&
      new Date() >= verification.verificationDeadline
    ) {
      verification.status      = 'verified';
      verification.roleUpgraded = true;
      await verification.save();

      // Upgrade the user's role
      await User.findByIdAndUpdate(req.user.id, { role: 'landlord' });
    }

    res.json({
      success: true,
      verification: _safeVerification(verification)
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Admin — get all pending/processing verifications
// @route   GET /api/nin-verification/admin/all
// @access  Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllVerifications = async (req, res) => {
  try {
    const { status } = req.query; // optional filter: ?status=processing

    const filter = {};
    if (status) filter.status = status;

    const verifications = await NinVerification.find(filter)
      .populate('user', 'firstName lastName email phone role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: verifications.length,
      verifications
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Admin — manually approve or reject a verification
// @route   PATCH /api/nin-verification/admin/:id/review
// @access  Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
exports.reviewVerification = async (req, res) => {
  try {
    const { action, adminNote } = req.body; // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "action must be 'approve' or 'reject'"
      });
    }

    const verification = await NinVerification.findById(req.params.id).populate('user');

    if (!verification) {
      return res.status(404).json({ success: false, message: 'Verification not found' });
    }

    if (verification.status === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'This verification has already been approved'
      });
    }

    if (action === 'approve') {
      verification.status       = 'verified';
      verification.roleUpgraded = true;
      verification.adminNote    = adminNote || '';
      await verification.save();

      // Promote user to landlord
      await User.findByIdAndUpdate(verification.user._id, { role: 'landlord' });

      return res.json({
        success: true,
        message: 'Verification approved. User has been promoted to landlord.',
        verification
      });
    }

    // Reject
    verification.status    = 'failed';
    verification.adminNote = adminNote || 'Verification rejected by admin';
    await verification.save();

    res.json({
      success: true,
      message: 'Verification rejected.',
      verification
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper — strip the raw NIN from user-facing responses for privacy
// ─────────────────────────────────────────────────────────────────────────────
function _safeVerification(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj.nin; // never expose the NIN back to the client
  return obj;
}