const express = require('express');
const { body }  = require('express-validator');
const { syncDrafts } = require('../controllers/draftController');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();

// ── Validation: POST /api/drafts/sync ─────────────────────────────────────
// Each item inside the drafts[] array must have sensible, non-empty fields.
const syncDraftsValidation = [
  body('drafts')
    .isArray({ min: 1 }).withMessage('drafts must be a non-empty array.'),

  body('drafts.*.title')
    .trim()
    .notEmpty().withMessage('Each draft must have a title.')
    .isLength({ max: 150 }).withMessage('Draft title cannot exceed 150 characters.'),

  body('drafts.*.description')
    .trim()
    .notEmpty().withMessage('Each draft must have a description.')
    .isLength({ min: 10 }).withMessage('Draft description must be at least 10 characters.'),

  body('drafts.*.latitude')
    .notEmpty().withMessage('Each draft must have a latitude.')
    .isFloat({ min: -90, max: 90 }).withMessage('Draft latitude must be between -90 and 90.'),

  body('drafts.*.longitude')
    .notEmpty().withMessage('Each draft must have a longitude.')
    .isFloat({ min: -180, max: 180 }).withMessage('Draft longitude must be between -180 and 180.'),

  body('drafts.*.isAnonymous')
    .optional()
    .isBoolean().withMessage('isAnonymous must be true or false.'),
];

// POST /api/drafts/sync — protected, requires authentication + valid payload
router.post('/sync', authenticate, syncDraftsValidation, syncDrafts);

module.exports = router;

