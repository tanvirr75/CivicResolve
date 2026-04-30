const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Abstract base for all users — extended via discriminators.
 * Roles: citizen | ward_official | field_worker | system_admin
 * UML: User (abstract) → Citizen, WardOfficial, FieldWorker, SystemAdmin
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Never returned in queries by default
    },
    role: {
      type: String,
      enum: ['citizen', 'ward_official', 'field_worker', 'system_admin'],
      required: true,
    },
    language: {
      type: String,
      enum: ['en', 'bn'],
      default: 'en',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },

    // ── Extended Profile Fields (Common) ─────────
    dob: { type: Date },
    nationality: { type: String, trim: true },
    bloodGroup: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    nid: { type: String, trim: true },
    emergencyContact: { type: String, trim: true },

    // ── Citizen-specific ─────────────────────────────
    isAnonymous: {
      type: Boolean,
      default: false,
    },

    // ── WardOfficial-specific ────────────────────────
    wardId: {
      type: String,
      trim: true,
    },
    jurisdiction: {
      type: String,
      trim: true,
    },
    officeAddress: { type: String, trim: true },
    contactNumber: { type: String, trim: true },

    // ── FieldWorker-specific ─────────────────────────
    employeeId: {
      type: String,
      trim: true,
    },
    expertise: {
      type: String,
      trim: true,
    },
    vehicleType: { type: String, trim: true },
    workingHours: { type: String, trim: true },

    // ── SystemAdmin-specific ─────────────────────────
    adminLevel: {
      type: String,
      trim: true,
    },
    accessScope: {
      type: String,
      trim: true,
    },

    // ── Avatar ───────────────────────────────────────
    avatar: {
      type: String,
      trim: true,
    },

    // ── User Settings ────────────────────────────────
    settings: {
      // Common
      emailNotifications: { type: Boolean, default: true },
      pushNotifications:  { type: Boolean, default: true },
      profilePublic:      { type: Boolean, default: true },
      // Citizen
      defaultAnonymous:   { type: Boolean, default: false },
      notifyStatusChange: { type: Boolean, default: true },
      // Ward Official
      aiDailyBriefing:    { type: Boolean, default: true },
      emailNewReport:     { type: Boolean, default: true },
      // Field Worker
      availableForWork:   { type: Boolean, default: true },
      notifyWorkOrder:    { type: Boolean, default: true },
      // System Admin
      weeklyDigest:       { type: Boolean, default: true },
      autoSpamFlagging:   { type: Boolean, default: true },
    },
  },
  {
    timestamps: true, // createdAt + updatedAt auto-managed
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
// email index is auto-created by unique:true on the schema field — no duplicate needed
userSchema.index({ role: 1 });
userSchema.index({ wardId: 1 });

// ── Pre-save: Hash password ────────────────────────────────────────────────
// NOTE: Mongoose 9 — async hooks must NOT use next(). Mongoose awaits the
//       returned Promise; calling next() here would throw "next is not a function".
userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return; // plain return, not next()
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  // async function resolves here — Mongoose takes it from this point
});

// ── Instance method: Compare password ─────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// ── Instance method: Safe profile (no password hash) ──────────────────────
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  obj.profileCompleteness = this.calculateProfileCompleteness();
  return obj;
};

// ── Instance method: Calculate Profile Completeness ────────────────────────
userSchema.methods.calculateProfileCompleteness = function () {
  const commonFields = ['name', 'email', 'phone', 'dob', 'bloodGroup', 'nationality', 'address', 'nid', 'emergencyContact'];
  let roleFields = [];
  
  if (this.role === 'ward_official') {
    roleFields = ['wardId', 'jurisdiction', 'officeAddress', 'contactNumber'];
  } else if (this.role === 'field_worker') {
    roleFields = ['employeeId', 'expertise', 'vehicleType', 'workingHours'];
  } else if (this.role === 'system_admin') {
    roleFields = ['adminLevel', 'accessScope'];
  }

  const allFields = [...commonFields, ...roleFields];
  let filledFields = 0;

  allFields.forEach(field => {
    if (this[field] !== undefined && this[field] !== null && this[field] !== '') {
      filledFields++;
    }
  });

  return Math.round((filledFields / allFields.length) * 100);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
