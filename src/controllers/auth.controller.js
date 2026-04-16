const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const otpService = require('../services/otp.service');

// @desc    Register user with OTP
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, company } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const emailOTP = otpService.generateOTP();
    const phoneOTP = otpService.generateOTP();

    const user = await User.create({
      firstName, lastName, email, phone, password,
      company: company || '',
      role: 'user',
      isEmailVerified: false,
      isPhoneVerified: false,
      emailVerificationToken: emailOTP,
      emailVerificationExpires: Date.now() + 5 * 60 * 1000,
      phoneVerificationCode: phoneOTP,
      phoneVerificationExpires: Date.now() + 5 * 60 * 1000,
    });

    await otpService.sendEmailOTP(email, emailOTP, firstName);

    if (process.env.TWILIO_ACCOUNT_SID) {
      await otpService.sendSMSOTP(phone, phoneOTP);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email and phone.',
      userId: user._id,
      email: user.email,
      phone: user.phone,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message});
  }
};

// @desc    Verify Email OTP
// @route   POST /api/auth/verify-email
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({
      email,
      emailVerificationToken: otp,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    let token = null;
    if (user.isEmailVerified && user.isPhoneVerified) {
      token = generateToken(user._id);
    }

    res.json({
      success: true,
      message: 'Email verified successfully',
      emailVerified: true,
      phoneVerified: user.isPhoneVerified,
      allVerified: user.isEmailVerified && user.isPhoneVerified,
      ...(token && { token, user: user.toJSON() }),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify Phone OTP
// @route   POST /api/auth/verify-phone
// @access  Public
exports.verifyPhone = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const user = await User.findOne({
      phone,
      phoneVerificationCode: otp,
      phoneVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    user.isPhoneVerified = true;
    user.phoneVerificationCode = undefined;
    user.phoneVerificationExpires = undefined;
    await user.save();

    let token = null;
    if (user.isEmailVerified && user.isPhoneVerified) {
      token = generateToken(user._id);
    }

    res.json({
      success: true,
      message: 'Phone verified successfully',
      emailVerified: user.isEmailVerified,
      phoneVerified: true,
      allVerified: user.isEmailVerified && user.isPhoneVerified,
      ...(token && { token, user: user.toJSON() }),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOTP = async (req, res) => {
  try {
    const { email, type } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (type === 'email') {
      if (user.isEmailVerified) {
        return res.status(400).json({ success: false, message: 'Email already verified' });
      }
      const otp = otpService.generateOTP();
      user.emailVerificationToken = otp;
      user.emailVerificationExpires = Date.now() + 5 * 60 * 1000;
      await user.save();
      await otpService.sendEmailOTP(user.email, otp, user.firstName);
      res.json({ success: true, message: 'Email OTP resent successfully' });

    } else if (type === 'phone') {
      if (user.isPhoneVerified) {
        return res.status(400).json({ success: false, message: 'Phone already verified' });
      }
      const otp = otpService.generateOTP();
      user.phoneVerificationCode = otp;
      user.phoneVerificationExpires = Date.now() + 5 * 60 * 1000;
      await user.save();
      await otpService.sendSMSOTP(user.phone, otp);
      res.json({ success: true, message: 'Phone OTP resent successfully' });

    } else {
      res.status(400).json({ success: false, message: 'Invalid type. Use "email" or "phone"' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account locked due to multiple failed attempts. Try again later.',
      });
    }

    if (!user.isEmailVerified || !user.isPhoneVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email and phone number first',
        emailVerified: user.isEmailVerified,
        phoneVerified: user.isPhoneVerified,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await user.resetLoginAttempts();
    const token = generateToken(user._id);

    res.json({ success: true, token, user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    res.json({ success: true, user: req.user.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};