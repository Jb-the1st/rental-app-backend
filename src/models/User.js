const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: [true, 'First name is required'], trim: true },
  lastName:  { type: String, required: [true, 'Last name is required'],  trim: true },
  company:   { type: String, default: '' },

  email: {
    type:      String,
    required:  [true, 'Email is required'],
    unique:    true,
    lowercase: true,
    match:     [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },

  // ✅ Added googleId
  googleId: { type: String, default: '' },

  phone: { 
    type:     String, 
    required: false,  // ✅ not required — Google users won't have it
    default:  '' 
  },

  password: { 
    type:      String, 
    required:  false, // ✅ not required — Google users get random password
    minlength: 6, 
    select:    false 
  },

  role: { type: String, enum: ['user', 'owner', 'admin'], default: 'user' },

  imageUrl: { type: String, default: '' },

  // Email verification
  isEmailVerified:          { type: Boolean, default: false },
  emailVerificationToken:   { type: String },
  emailVerificationExpires: { type: Date },

  verifyOwner: {
    NIN: {
      type:    Number,
      default: undefined
    },
    firstName:  { type: String, default: '' },
    lastName:   { type: String, default: '' },
    DoB:        { type: String, default: '' },
    address:    { type: String, default: '' },
    status: {
      type:    String,
      enum:    ['', 'pending', 'processing', 'verified', 'failed'],
      default: ''
    },
    verifiedAt: { type: String, default: '' }
  }

}, { timestamps: true });

// ── Hooks ────────────────────────────────────────────────────────────────────
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  // ✅ Guard — skip hashing if password is somehow empty
  if (!this.password) return next();
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

  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;

  if (obj.verifyOwner) {
    delete obj.verifyOwner.NIN;
  }

  if (obj.phone !== undefined) {
    obj.phone = String(obj.phone);
  }

  return obj;
};

module.exports = mongoose.model('User', UserSchema);