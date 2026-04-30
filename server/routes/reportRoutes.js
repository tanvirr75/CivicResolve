const express = require('express');
const { body, query } = require('express-validator');
const { createReport, createAnonReport, getReports, getReportById, toggleUpvote, addComment, getNearbyReports, updateStatus, getMyStats, getAnalytics, getWardPublicStats, getWardAISummary } = require('../controllers/reportController');
const { authenticate, authorize, optionalAuthenticate } = require('../middleware/authenticate');
const { uploadSingle }  = require('../middleware/upload');

const router = express.Router();

// ── Validation: POST /api/reports ──────────────────────────────────────────
const createReportValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required.')
    .isLength({ max: 150 }).withMessage('Title cannot exceed 150 characters.'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required.')
    .isLength({ min: 10  }).withMessage('Description must be at least 10 characters.')
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters.'),

  body('latitude')
    .notEmpty().withMessage('Latitude is required.')
    .isFloat({ min: -90,  max: 90  }).withMessage('Latitude must be between -90 and 90.'),

  body('longitude')
    .notEmpty().withMessage('Longitude is required.')
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180.'),

  body('isAnonymous')
    .optional()
    .isBoolean().withMessage('isAnonymous must be true or false.'),

  body('streetAddress')
    .optional()
    .trim(),
];

// ── Validation: GET /api/reports ───────────────────────────────────────────
const getReportsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1–100.'),
  query('status').optional(),
  query('category').optional().isIn(['Road', 'Waste', 'Drainage', 'Lighting', 'Water', 'Other']),
];

// ── Routes ─────────────────────────────────────────────────────────────────

// POST /api/reports — protected, accepts multipart/form-data with one image field "image"
// Middleware order: authenticate → uploadSingle (multer) → validation → controller
router.post(
  '/',
  authenticate,
  uploadSingle('image'),
  createReportValidation,
  createReport
);

// POST /api/reports/anon — public, guest anonymous report (no account required)
router.post(
  '/anon',
  optionalAuthenticate,
  uploadSingle('image'),
  createReportValidation,
  createAnonReport
);

// GET /api/reports — public, paginated list.
// optionalAuthenticate: if a ward_official sends their JWT, getReports
// auto-scopes results to their wardId. Citizens/public get all non-spam reports.
router.get('/', optionalAuthenticate, getReportsValidation, getReports);

// GET /api/reports/nearby — public, duplicate detection (MUST be before /:id route)
router.get('/nearby', getNearbyReports);

// GET /api/reports/stats — private, citizen own-report aggregate counts
// MUST be before /:id to prevent 'stats' being matched as a Mongo ObjectId
router.get('/stats', authenticate, getMyStats);

// GET /api/reports/analytics — private, admin-only platform-wide aggregation
router.get('/analytics', authenticate, authorize('system_admin'), getAnalytics);

// GET /api/reports/ward/summary — private, AI daily briefing for ward official
router.get('/ward/summary', authenticate, authorize('ward_official', 'system_admin'), getWardAISummary);

// GET /api/reports/ward/:wardId/stats — public, per-ward accountability stats
router.get('/ward/:wardId/stats', getWardPublicStats);

// GET /api/reports/:id — public, single report
router.get('/:id', getReportById);

// PUT /api/reports/:id/upvote — protected, toggle upvote
router.put('/:id/upvote', authenticate, toggleUpvote);

// POST /api/reports/:id/comments — protected, add comment
router.post('/:id/comments', authenticate, addComment);

// PUT /api/reports/:id/status — protected, ward officials and admins only
router.put('/:id/status', authenticate, authorize('ward_official', 'system_admin'), updateStatus);

module.exports = router;
