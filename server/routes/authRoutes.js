const express = require('express');
const { body }  = require('express-validator');
const { register, login, getMe, logout, getFieldWorkers, getUsers, updateUserRole, toggleUserActive } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/authenticate');

const router = express.Router();

// ── Validation Rules ───────────────────────────────────────────────────────

const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.')
    .isLength({ max: 100 }).withMessage('Password cannot exceed 100 characters.'),

  body('role')
    .optional()
    .isIn(['citizen', 'ward_official', 'field_worker', 'system_admin'])
    .withMessage('Role must be one of: citizen, ward_official, field_worker, system_admin.'),

  body('language')
    .optional()
    .isIn(['en', 'bn'])
    .withMessage('Language must be either "en" or "bn".'),

  // Citizen-specific
  body('isAnonymous')
    .optional()
    .isBoolean().withMessage('isAnonymous must be a boolean.'),

  // Extended fields
  body('phone').optional().trim(),
  body('dob').optional().trim(),
  body('bloodGroup').optional().trim(),
  body('nationality').optional().trim(),
  body('address').optional().trim(),
  body('nid').optional().trim(),
  body('emergencyContact').optional().trim(),

  // WardOfficial-specific
  body('wardId')
    .optional()
    .trim()
    .notEmpty().withMessage('wardId cannot be blank.'),

  body('jurisdiction')
    .optional()
    .trim(),

  body('officeAddress').optional().trim(),
  body('contactNumber').optional().trim(),

  // FieldWorker-specific
  body('employeeId')
    .optional()
    .trim()
    .notEmpty().withMessage('employeeId cannot be blank.'),

  body('expertise')
    .optional()
    .trim(),

  body('vehicleType').optional().trim(),
  body('workingHours').optional().trim(),

  // SystemAdmin-specific
  body('adminLevel')
    .optional()
    .trim(),

  body('accessScope')
    .optional()
    .trim(),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

// ── Routes ─────────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', registerValidation, register);

// POST /api/auth/login
router.post('/login', loginValidation, login);

// GET /api/auth/me  — protected
router.get('/me', authenticate, getMe);

// POST /api/auth/logout — protected
router.post('/logout', authenticate, logout);

// GET /api/auth/workers — explicitly protected for FR-13 dispatch
router.get('/workers', authenticate, authorize('ward_official', 'system_admin'), getFieldWorkers);

// PUT /api/auth/profile — protected
const { updateProfile } = require('../controllers/authController');
router.put('/profile', authenticate, updateProfile);

// ── Admin-only user management ────────────────────────────────────────────────
// GET /api/auth/users — list all users (system_admin only)
router.get('/users', authenticate, authorize('system_admin'), getUsers);

// PATCH /api/auth/users/:id/role — change a user's role (system_admin only)
router.patch('/users/:id/role', authenticate, authorize('system_admin'), updateUserRole);

// PUT /api/auth/users/:id/deactivate — toggle isActive (system_admin only)
router.put('/users/:id/deactivate', authenticate, authorize('system_admin'), toggleUserActive);

module.exports = router;
