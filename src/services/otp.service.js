const speakeasy = require('speakeasy');
// const { Resend } = require('resend');
const twilio = require('twilio');

// Resend client
// const resend = new Resend(process.env.RESEND_API_KEY);
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS
  }
});
// Twilio client (for SMS)
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

/**
 * Generate OTP code
 */
exports.generateOTP = () => {
  return speakeasy.totp({
    secret: process.env.OTP_SECRET || 'rental-app-secret',
    encoding: 'base32',
    digits: 6,
    step: 300
  });
};

/**
 * Verify OTP code
 */
exports.verifyOTP = (token, code) => {
  return speakeasy.totp.verify({
    secret: process.env.OTP_SECRET || 'rental-app-secret',
    encoding: 'base32',
    token: code,
    digits: 6,
    step: 300,
    window: 1
  });
};

/**
 * Send OTP via Email
 */
exports.sendEmailOTP = async (email, otp, firstName) => {
  try {
    await transporter.sendMail({
      from: 'noreply@axterra.com',  // ← change to your verified domain
                                        // or use 'onboarding@resend.dev' for testing
      to: email,
      subject: 'Verify Your Email - Axterra App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Verification</h2>
          <p>Hi ${firstName},</p>
          <p>Please use the code below to verify your email:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #4CAF50; margin: 0; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p style="color: #666;">This code will expire in 10 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      `
    });
    return { success: true };
  } catch (error) {
    console.error('Email OTP Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send OTP via SMS
 */
exports.sendSMSOTP = async (phone, otp) => {
  if (!twilioClient) {
    console.error('Twilio not configured');
    return { success: false, error: 'SMS service not configured' };
  }

  try {
    await twilioClient.messages.create({
      body: `Your Rental App verification code is: ${otp}. Valid for 5 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
    return { success: true };
  } catch (error) {
    console.error('SMS OTP Error:', error);
    return { success: false, error: error.message };
  }
};