const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: [true, 'First name is required'], trim: true },
  lastName:  { type: String, required: [true, 'Last name is required'],  trim: true },
  company:   { type: String, default: '' },

  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },

  // String not Number — matches frontend interface
  phone: { type: String, required: [true, 'Phone number is required'] },

  password: { type: String, required: [true, 'Password is required'], minlength: 6, select: false },

  role: { type: String, enum: ['user', 'owner', 'admin'], default: 'user' },

  imageUrl: { type: String, default: '' },

  // ── Email verification ──────────────────────────────────────────────────
  isEmailVerified:          { type: Boolean, default: false },
  emailVerificationToken:   { type: String },
  emailVerificationExpires: { type: Date },

  // ── verifyOwner — embedded landlord verification data ───────────────────
  // Matches the frontend VerifyOwner interface exactly.
  // Populated when the user submits their NIN verification form.
  // The NinVerification collection still stores the raw NIN securely;
  // this embedded object stores only the safe display fields.
  verifyOwner: {
    NIN: {
      type: Number,
      default: undefined
      // NOTE: stored as Number to match frontend interface (NIN?: number)
      // Not returned to client — stripped in toJSON below
    },
    firstName: { type: String, default: '' },
    lastName:  { type: String, default: '' },
    DoB:       { type: String, default: '' }, // "YYYY-MM-DD" string — matches frontend
    address:   { type: String, default: '' },
    status: {
      type: String,
      enum: ['', 'pending', 'processing', 'verified', 'failed'],
      default: ''
    },
    verifiedAt: { type: String, default: '' } // ISO string — matches frontend
  }

}, { timestamps: true });

// ── Hooks ────────────────────────────────────────────────────────────────────
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Methods ──────────────────────────────────────────────────────────────────
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.toJSON = function () {
  const obj = this.toObject();

  // Map _id → id (frontend expects "id")
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;

  // Never expose these to client
  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;

  // Strip the raw NIN from verifyOwner before sending to client
  if (obj.verifyOwner) {
    delete obj.verifyOwner.NIN;
  }

  // phone comes back as string (already stored as String now)
  if (obj.phone !== undefined) {
    obj.phone = String(obj.phone);
  }

  return obj;
};

module.exports = mongoose.model('User', UserSchema);