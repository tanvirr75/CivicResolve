const express = require('express');
const { exportReportsCsv } = require('../controllers/exportController');
const { authenticate, authorize } = require('../middleware/authenticate');

const router = express.Router();

// GET /api/export/reports — strictly restricted to System Admins
router.get(
  '/reports',
  authenticate,
  authorize('system_admin'),
  exportReportsCsv
);

module.exports = router;
