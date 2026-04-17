const express = require('express');
const { getShareableCard } = require('../controllers/shareController');

const router = express.Router();

// GET /api/share/:id — Returns raw HTML proxy
router.get('/:id', getShareableCard);

module.exports = router;
