const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const otpService = require('../services/otp.service');
const TempOtp = require('../models/TempOtp');  // ← add this

// @desc    Register user — only allowed after email is verified via OTP
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, company } = req.body;

    // Check email was pre-verified
    const tempOtp = await TempOtp.findOne({ email, verified: true });
    if (!tempOtp) {
      return res.status(403).json({ success: false, message: 'Please verify your email before registering' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ success: false, message: 'User already exists with this email' });

    const phoneExists = await User.findOne({ phone });
    if (phoneExists) return res.status(400).json({ success: false, message: 'User already exists with this phone number' });

    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      company: company || '',
      role: 'tenant',
      isEmailVerified: true  // already verified via OTP flow
    });

    // Clean up temp record
    await TempOtp.deleteOne({ email });

    const token = generateToken(user._id);
    res.status(201).json({ success: true, token, user: user.toJSON() });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
}; 

// @desc    Verify Email OTP
// @route   POST /api/auth/verify-email
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

    const record = await TempOtp.findOne({ email, otp, expiresAt: { $gt: Date.now() } });
    if (!record) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

    // Mark as verified — register will check this
    await TempOtp.findOneAndUpdate({ email }, { verified: true });

    res.json({ success: true, message: 'Email verified. Proceed to complete registration.' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// // @desc    Verify Phone OTP
// // @route   POST /api/auth/verify-phone
// // @access  Public
// exports.verifyPhone = async (req, res) => {
//   try {
//     const { phone, otp } = req.body;

//     const user = await User.findOne({
//       phone,
//       phoneVerificationCode: otp,
//       phoneVerificationExpires: { $gt: Date.now() },
//     });

//     if (!user) {
//       return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
//     }

//     user.isPhoneVerified = true;
//     user.phoneVerificationCode = undefined;
//     user.phoneVerificationExpires = undefined;
//     await user.save();

//     let token = null;
//     if (user.isEmailVerified && user.isPhoneVerified) {
//       token = generateToken(user._id);
//     }

//     res.json({
//       success: true,
//       message: 'Phone verified successfully',
//       emailVerified: user.isEmailVerified,
//       phoneVerified: true,
//       allVerified: user.isEmailVerified && user.isPhoneVerified,
//       ...(token && { token, user: user.toJSON() }),
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // @desc    Resend OTP
// // @route   POST /api/auth/resend-otp
// // @access  Public
// exports.resendOTP = async (req, res) => {
//   try {
//     const { email, type } = req.body;

//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({ success: false, message: 'User not found' });
//     }

//     if (type === 'email') {
//       if (user.isEmailVerified) {
//         return res.status(400).json({ success: false, message: 'Email already verified' });
//       }
//       const otp = otpService.generateOTP();
//       user.emailVerificationToken = otp;
//       user.emailVerificationExpires = Date.now() + 5 * 60 * 1000;
//       await user.save();
//       await otpService.sendEmailOTP(user.email, otp, user.firstName);
//       res.json({ success: true, message: 'Email OTP resent successfully' });

//     } else if (type === 'phone') {
//       if (user.isPhoneVerified) {
//         return res.status(400).json({ success: false, message: 'Phone already verified' });
//       }
//       const otp = otpService.generateOTP();
//       user.phoneVerificationCode = otp;
//       user.phoneVerificationExpires = Date.now() + 5 * 60 * 1000;
//       await user.save();
//       await otpService.sendSMSOTP(user.phone, otp);
//       res.json({ success: true, message: 'Phone OTP resent successfully' });

//     } else {
//       res.status(400).json({ success: false, message: 'Invalid type. Use "email" or "phone"' });
//     }
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// @desc  Login user — works whether or not email is verified
// @route POST /api/auth/login
// @access Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ success: false, message: 'Please provide email and password' });

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = generateToken(user._id);
    res.json({ success: true, token, user: user.toJSON() });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

 
// @desc  Get logged-in user profile + always returns a fresh token
//        Call this on every app load and store the returned token.
//        This way any role change in the DB is reflected immediately —
//        no more stale token / 403 issues after manual DB edits.
// @route GET /api/auth/me
// @access Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const freshToken = generateToken(user._id);
    res.json({ success: true, token: freshToken, user: user.toJSON() });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};


// @desc  Logout
// @route POST /api/auth/logout
// @access Private
exports.logout = async (req, res) => {
  try {
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL VERIFICATION FLOW (triggered from profile, not from register)
// ─────────────────────────────────────────────────────────────────────────────
 
// @desc  User requests OTP to verify their email — called from profile page
// @route POST /api/auth/request-email-otp
// @access Private
exports.requestEmailOTP = async (req, res) => {
  try {
    const { email, firstName } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    // Block if already registered
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'User already exists with this email' });

    const otp = otpService.generateOTP();
    await TempOtp.findOneAndUpdate(
      { email },
      { otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000), verified: false },
      { upsert: true, new: true }
    );

    await otpService.sendEmailOTP(email, otp, firstName || 'there');
    res.json({ success: true, message: 'Verification code sent to your email address' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// @desc  Resend email OTP — in case it expired
// @route POST /api/auth/resend-otp
// @access Private
exports.resendOTP = async (req, res) => {
  try {
    const { email, firstName } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    // Block if already registered
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'User already exists with this email' });

    const otp = otpService.generateOTP();
    await TempOtp.findOneAndUpdate(
      { email },
      { otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000), verified: false },
      { upsert: true, new: true }
    );

    await otpService.sendEmailOTP(email, otp, firstName || 'there');
    res.json({ success: true, message: 'Verification code resent to your email address' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
 