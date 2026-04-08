const mongoose = require('mongoose');

// Verification statuses:
// 'pending'    - Form submitted, waiting for "processing"
// 'processing' - Simulated verification in progress (timed delay)
// 'verified'   - Approved after delay elapses
// 'failed'     - Rejected by admin or name mismatch caught

const NinVerificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // one verification record per user
  },

  // Fields collected from the form
  nin: {
    type: String,
    required: [true, 'NIN is required'],
    trim: true,
    minlength: [11, 'NIN must be 11 characters'],
    maxlength: [11, 'NIN must be 11 characters']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  currentAddress: {
    type: String,
    required: [true, 'Current address is required'],
    trim: true
  },

  // Verification flow
  status: {
    type: String,
    enum: ['pending', 'processing', 'verified', 'failed'],
    default: 'pending'
  },

  // When the simulated verification window opens and closes
  // The user is auto-verified once verificationDeadline is passed
  // (checked on GET /status — no cron job needed)
  submittedAt: {
    type: Date,
    default: Date.now
  },
  verificationDeadline: {
    type: Date
    // Set on submission: submittedAt + NIN_VERIFICATION_DELAY_HOURS
  },

  // Optional admin note (e.g. reason for failure)
  adminNote: {
    type: String,
    default: ''
  },

  // Set to true once the user's role has been promoted to 'landlord'
  roleUpgraded: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('NinVerification', NinVerificationSchema);