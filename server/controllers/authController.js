const jwt  = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

// ── Helper: sign a JWT ─────────────────────────────────────────────────────
const signToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ── Helper: send token response ────────────────────────────────────────────
const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id, user.role);

  return res.status(statusCode).json({
    success: true,
    message: statusCode === 201 ? 'Registration successful.' : 'Login successful.',
    data: {
      token,
      user: {
        id:       user._id,
        name:     user.name,
        email:    user.email,
        role:     user.role,
        language: user.language,
        // Role-specific fields (only present when relevant)
        ...(user.wardId     && { wardId:     user.wardId }),
        ...(user.jurisdiction && { jurisdiction: user.jurisdiction }),
        ...(user.employeeId && { employeeId: user.employeeId }),
        ...(user.expertise  && { expertise:  user.expertise }),
        ...(user.adminLevel && { adminLevel: user.adminLevel }),
      },
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    // 1. Run express-validator results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        data: { errors: errors.array() },
      });
    }

    const {
      name, email, password, role, language,
      // Citizen
      isAnonymous,
      // Extended profile
      phone, dob, bloodGroup, nationality, address, nid, emergencyContact,
      // WardOfficial
      wardId, jurisdiction, officeAddress, contactNumber,
      // FieldWorker
      employeeId, expertise, vehicleType, workingHours,
      // SystemAdmin
      adminLevel, accessScope,
    } = req.body;

    // 2. Check for duplicate email
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
        data: null,
      });
    }

    // 3. Validate role-specific required fields
    if (role === 'ward_official' && !wardId) {
      return res.status(400).json({
        success: false,
        message: 'wardId is required for ward_official role.',
        data: null,
      });
    }
    if (role === 'field_worker' && !employeeId) {
      return res.status(400).json({
        success: false,
        message: 'employeeId is required for field_worker role.',
        data: null,
      });
    }

    // 4. Build user document — passwordHash pre-save hook handles bcrypt hashing
    let isActiveStatus = true;
    if (role === 'ward_official' || role === 'field_worker') {
      isActiveStatus = false; // "Pending" status requires admin approval!
    }

    const userData = {
      name,
      email,
      passwordHash: password, // plain-text here; bcrypt hook in User.js hashes it
      role: role || 'citizen',
      language: language || 'en',
      isActive: isActiveStatus,
      // Citizen
      ...(isAnonymous !== undefined && { isAnonymous }),
      // Extended fields
      ...(phone        && { phone }),
      ...(dob          && { dob }),
      ...(bloodGroup   && { bloodGroup }),
      ...(nationality  && { nationality }),
      ...(address      && { address }),
      ...(nid          && { nid }),
      ...(emergencyContact && { emergencyContact }),
      // WardOfficial
      ...(wardId       && { wardId }),
      ...(jurisdiction && { jurisdiction }),
      ...(officeAddress && { officeAddress }),
      ...(contactNumber && { contactNumber }),
      // FieldWorker
      ...(employeeId   && { employeeId }),
      ...(expertise    && { expertise }),
      ...(vehicleType  && { vehicleType }),
      ...(workingHours && { workingHours }),
      // SystemAdmin
      ...(adminLevel   && { adminLevel }),
      ...(accessScope  && { accessScope }),
    };

    const user = await User.create(userData);

    // 5. Return JWT
    return sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Login existing user
// @route   POST /api/auth/login
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        data: { errors: errors.array() },
      });
    }

    const { email, password } = req.body;

    // 1. Find user — explicitly select passwordHash (it's excluded by default)
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        data: null,
      });
    }

    // 2. Check account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact support.',
        data: null,
      });
    }

    // 3. Compare password using bcrypt instance method from User model
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        data: null,
      });
    }

    // 4. Update lastLogin timestamp (non-blocking)
    User.findByIdAndUpdate(user._id, { lastLogin: new Date() }).exec();

    // 5. Return JWT
    return sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get current logged-in user's profile
// @route   GET /api/auth/me
// @access  Private (requires authenticate middleware)
// ─────────────────────────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    // req.user is already populated by the authenticate middleware
    return res.status(200).json({
      success: true,
      message: 'Profile fetched successfully.',
      data: { user: req.user },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Logout (client-side token deletion; server-side is stateless)
// @route   POST /api/auth/logout
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    // JWT is stateless — actual token removal happens on the client.
    // A future enhancement could maintain a server-side token blacklist.
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully. Please delete your token on the client.',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all active field workers for Work Order assignment
// @route   GET /api/auth/workers
// @access  Private (ward_official, system_admin)
// FR-13 Helper endpoint
// ─────────────────────────────────────────────────────────────────────────────
const getFieldWorkers = async (req, res, next) => {
  try {
    const workers = await User.find({ role: 'field_worker', isActive: true })
      .select('_id name email employeeId isActive')
      .lean();

    return res.status(200).json({
      success: true,
      message: `Found ${workers.length} active field workers.`,
      data: { workers },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const {
      name, phone, dob, bloodGroup, nationality, address, nid, emergencyContact,
      wardId, jurisdiction, officeAddress, contactNumber,
      employeeId, expertise, vehicleType, workingHours
    } = req.body;

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (dob !== undefined) user.dob = dob;
    if (bloodGroup !== undefined) user.bloodGroup = bloodGroup;
    if (nationality !== undefined) user.nationality = nationality;
    if (address !== undefined) user.address = address;
    if (nid !== undefined) user.nid = nid;
    if (emergencyContact !== undefined) user.emergencyContact = emergencyContact;

    if (user.role === 'ward_official') {
      if (wardId !== undefined) user.wardId = wardId;
      if (jurisdiction !== undefined) user.jurisdiction = jurisdiction;
      if (officeAddress !== undefined) user.officeAddress = officeAddress;
      if (contactNumber !== undefined) user.contactNumber = contactNumber;
    }

    if (user.role === 'field_worker') {
      if (employeeId !== undefined) user.employeeId = employeeId;
      if (expertise !== undefined) user.expertise = expertise;
      if (vehicleType !== undefined) user.vehicleType = vehicleType;
      if (workingHours !== undefined) user.workingHours = workingHours;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user: user.toSafeObject() },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all users (paginated)
// @route   GET /api/auth/users
// @access  Private (system_admin only)
// ─────────────────────────────────────────────────────────────────────────────
const getUsers = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  ?? '1',  10));
    const limit = Math.min(100, parseInt(req.query.limit ?? '50', 10));
    const skip  = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({})
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({}),
    ]);

    return res.status(200).json({
      success: true,
      message: `Found ${users.length} users.`,
      data: {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update a user's role
// @route   PATCH /api/auth/users/:id/role
// @access  Private (system_admin only)
// ─────────────────────────────────────────────────────────────────────────────
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const validRoles = ['citizen', 'ward_official', 'field_worker', 'system_admin'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Allowed: ${validRoles.join(', ')}`,
        data: null,
      });
    }

    // Prevent admin from demoting themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role.',
        data: null,
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, select: '-passwordHash' }
    ).lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.', data: null });
    }

    return res.status(200).json({
      success: true,
      message: `Role updated to ${role}.`,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Toggle user isActive (deactivate / reactivate)
// @route   PUT /api/auth/users/:id/deactivate
// @access  Private (system_admin only)
// ─────────────────────────────────────────────────────────────────────────────
const toggleUserActive = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account.',
        data: null,
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.', data: null });
    }

    user.isActive = !user.isActive;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'reactivated' : 'deactivated'} successfully.`,
      data: { userId: user._id, isActive: user.isActive },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Force-reset a user's password (admin generates a temp password)
// @route   PUT /api/auth/users/:id/reset-password
// @access  Private (system_admin only)
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const resetUserPassword = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Use the regular profile update to change your own password.',
        data: null,
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.', data: null });
    }

    // Generate a cryptographically random 12-char temp password (unambiguous chars)
    const chars   = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const tempPwd = Array.from({ length: 12 }, () => chars[crypto.randomInt(chars.length)]).join('');

    // Assign plain text — the pre-save hook in User.js will bcrypt-hash it automatically
    user.passwordHash = tempPwd;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. Share the temporary password with the user securely.',
      data: {
        userId:       user._id,
        userName:     user.name,
        tempPassword: tempPwd,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Change own password (authenticated user)
// @route   PUT /api/auth/change-password
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'currentPassword and newPassword are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const match = await user.comparePassword(currentPassword);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }
    user.passwordHash = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, logout, getFieldWorkers, updateProfile, getUsers, updateUserRole, toggleUserActive, resetUserPassword, changePassword };
