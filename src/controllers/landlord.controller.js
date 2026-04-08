const User = require('../models/User');
const ninService = require('../services/nin.service');

// @desc    Submit landlord verification request
// @route   POST /api/landlord/:id/verify-landlord
// @access  Private
exports.submitLandlordVerification = async (req, res) => {
  try {
    const {
      NIN, businessName, businessRegistrationNumber,
      taxId, yearsOfExperience, numberOfProperties, references,
    } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!ninService.validateNINFormat(NIN)) {
      return res.status(400).json({ success: false, message: 'Invalid NIN format. Must be 11 digits.' });
    }

    const ninExists = await ninService.checkNINExists(NIN, user._id);
    if (ninExists) {
      return res.status(400).json({ success: false, message: 'This NIN is already registered by another user' });
    }

    const ninVerification = await ninService.verifyNIN(NIN, {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
    });

    if (!ninVerification.success) {
      return res.status(400).json({ success: false, message: ninVerification.error || 'NIN verification failed' });
    }

    user.NIN = NIN;
    user.ninVerified = true;
    user.ninVerificationData = { ...ninVerification.data, verifiedAt: new Date() };

    user.landlordVerification.status = 'pending';
    user.landlordVerification.submittedAt = new Date();
    user.landlordVerification.businessName = businessName;
    user.landlordVerification.businessRegistrationNumber = businessRegistrationNumber;
    user.landlordVerification.taxId = taxId;
    user.landlordVerification.yearsOfExperience = yearsOfExperience;
    user.landlordVerification.numberOfProperties = numberOfProperties;
    user.landlordVerification.references = references || [];

    await user.save();

    res.json({
      success: true,
      message: 'Landlord verification request submitted. Pending admin review.',
      user: user.toJSON(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload verification documents
// @route   POST /api/landlord/:id/upload-documents
// @access  Private
exports.uploadDocuments = async (req, res) => {
  try {
    const { documentType } = req.body;

    // req.uploadedMedia is set by our Cloudinary upload middleware
    if (!req.uploadedMedia || req.uploadedMedia.length === 0) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const uploaded = req.uploadedMedia[0]; // single document upload

    user.landlordVerification.documents.push({
      type: documentType,
      url: uploaded.url,           // Cloudinary URL
      publicId: uploaded.publicId, // stored so we can delete from Cloudinary later
      uploadedAt: new Date(),
    });

    await user.save();

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      document: {
        type: documentType,
        url: uploaded.url,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin: Approve/Reject landlord verification
// @route   PATCH /api/landlord/:id/review-landlord
// @access  Private/Admin
exports.reviewLandlordVerification = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.landlordVerification.status = status;
    user.landlordVerification.reviewedAt = new Date();
    user.landlordVerification.reviewedBy = req.user._id;

    if (status === 'approved') {
      user.role = 'landlord';
      user.landlordVerification.rejectionReason = undefined;
    } else if (status === 'rejected') {
      user.landlordVerification.rejectionReason = rejectionReason;
    }

    await user.save();

    res.json({
      success: true,
      message: `Landlord verification ${status}`,
      user: user.toJSON(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get pending landlord verifications
// @route   GET /api/landlord/pending
// @access  Private/Admin
exports.getPendingVerifications = async (req, res) => {
  try {
    const pendingUsers = await User.find({
      'landlordVerification.status': 'pending',
    }).sort({ 'landlordVerification.submittedAt': -1 });

    res.json({
      success: true,
      count: pendingUsers.length,
      verifications: pendingUsers.map((u) => u.toJSON()),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;