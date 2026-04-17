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
      // WardOfficial
      wardId, jurisdiction,
      // FieldWorker
      employeeId, expertise,
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
      // WardOfficial
      ...(wardId       && { wardId }),
      ...(jurisdiction && { jurisdiction }),
      // FieldWorker
      ...(employeeId   && { employeeId }),
      ...(expertise    && { expertise }),
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
    const workers = await User.find({ role: 'field_worker' }).select('_id name email active');
    
    return res.status(200).json({
      success: true,
      message: `Found ${workers.length} active field workers.`,
      data: { workers }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, logout, getFieldWorkers };
