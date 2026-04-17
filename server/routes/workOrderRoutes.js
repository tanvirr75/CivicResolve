const express = require('express');
const { body } = require('express-validator');
const { createWorkOrder, submitProofOfFix } = require('../controllers/workOrderController');
const { authenticate, authorize } = require('../middleware/authenticate');
const { uploadSingle } = require('../middleware/upload');

const router = express.Router();

const createWorkOrderValidation = [
  body('reportId').notEmpty().withMessage('reportId is required.'),
  body('assignedTo').notEmpty().withMessage('assignedTo (Field Worker ID) is required.'),
  body('notes').optional().trim(),
];

// POST /api/work-orders — strictly ward_official or system_admin
router.post(
  '/',
  authenticate,
  authorize('ward_official', 'system_admin'),
  createWorkOrderValidation,
  createWorkOrder
);

// PUT /api/work-orders/:id/complete — field worker submits proof with image
router.put(
  '/:id/complete',
  authenticate,
  authorize('field_worker', 'system_admin'),
  uploadSingle('image'), // Expects form-data with an "image" file
  submitProofOfFix
);

module.exports = router;
