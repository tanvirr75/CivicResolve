const express    = require('express');
const { categorize, severity } = require('../controllers/aiController');
const { authenticate }         = require('../middleware/authenticate');

const router = express.Router();

// POST /api/ai/categorize — real-time category suggestion (FR-07)
router.post('/categorize', authenticate, categorize);

// POST /api/ai/severity — real-time severity estimation (FR-08)
router.post('/severity', authenticate, severity);

module.exports = router;
