const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: [true, 'First name is required'], trim: true },
  lastName:  { type: String, required: [true, 'Last name is required'],  trim: true },
  company:   { type: String, default: '' },
  email: {
    type: String, required: [true, 'Email is required'],
    unique: true, lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
 phone: {
  type: String,
  required: [true, 'Phone number is required'],
  trim: true,
  match: [/^0(?:70|80|81|90|91)\d{8}$/, 'Please enter a valid Nigerian phone number'],
},
  password: {
    type: String, required: [true, 'Password is required'], minlength: 8, select: false,
    match: [/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, 'Password must include uppercase, lowercase, number, and special character'],
  },
  role: { type: String, enum: ['tenant', 'landlord', 'admin'], default: 'tenant' },

  // NIN
  NIN: {
    type: String, sparse: true,
    validate: {
      validator: (v) => !v || /^\d{11}$/.test(v),
      message: 'NIN must be exactly 11 digits',
    },
  },
  ninVerified: { type: Boolean, default: false },
  ninVerificationData: {
    fullName: String, dateOfBirth: Date, gender: String, verifiedAt: Date,
  },

  // Profile
  imageUrl:    { type: String, default: '' },
  dateOfBirth: { type: Date },
  address: {
    street: String, city: String, state: String, country: String, zipCode: String,
  },

  // Verification
  isEmailVerified:          { type: Boolean, default: false },
  isPhoneVerified:          { type: Boolean, default: false },
  emailVerificationToken:   { type: String,  select: false },
  emailVerificationExpires: { type: Date,    select: false },
  phoneVerificationCode:    { type: String,  select: false },
  phoneVerificationExpires: { type: Date,    select: false },

  // Landlord Verification
  landlordVerification: {
    status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
    submittedAt:  Date,
    reviewedAt:   Date,
    reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: String,

    documents: [{
      type: {
        type: String,
        enum: ['proof_of_ownership', 'government_id', 'utility_bill', 'bank_statement', 'other'],
      },
      url:       String, // Cloudinary URL
      publicId:  String, // Cloudinary public_id (for deletion)
      uploadedAt: { type: Date, default: Date.now },
      verified:   { type: Boolean, default: false },
    }],

    businessName:               String,
    businessRegistrationNumber: String,
    taxId:                      String,
    yearsOfExperience:          Number,
    numberOfProperties:         Number,
    references: [{ name: String, phone: String, relationship: String }],
  },

  // Security
  lastLogin:          Date,
  loginAttempts:      { type: Number, default: 0 },
  lockUntil:          Date,
  twoFactorEnabled:   { type: Boolean, default: false },
  twoFactorSecret:    { type: String, select: false },

}, { timestamps: true });

// ── Pre-save: hash password ────────────────────────────────────────────────
// ✅ async hook WITHOUT next() — required for Mongoose 7+
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ── Methods ───────────────────────────────────────────────────────────────
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

UserSchema.methods.incLoginAttempts = function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  return this.updateOne(updates);
};

UserSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0, lastLogin: Date.now() },
    $unset: { lockUntil: 1 },
  });
};

UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.phoneVerificationCode;
  delete obj.phoneVerificationExpires;
  delete obj.twoFactorSecret;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);