const mongoose = require('mongoose');
const TempOtpSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true },
  otp:      { type: String, required: true },
  expiresAt:{ type: Date,   required: true },
  verified: { type: Boolean, default: false }
});
module.exports = mongoose.model('TempOtp', TempOtpSchema);