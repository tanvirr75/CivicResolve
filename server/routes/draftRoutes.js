const express = require('express');
const { syncDrafts } = require('../controllers/draftController');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();

// POST /api/drafts/sync — protected
router.post('/sync', authenticate, syncDrafts);

module.exports = router;
