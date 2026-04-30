const express = require('express');
const { body } = require('express-validator');
const { createWorkOrder, submitProofOfFix, getWorkOrders, getWorkOrderById, updateWorkOrderStatus } = require('../controllers/workOrderController');
const { authenticate, authorize } = require('../middleware/authenticate');
const { uploadSingle } = require('../middleware/upload');

const router = express.Router();

const createWorkOrderValidation = [
  body('reportId').notEmpty().withMessage('reportId is required.'),
  body('assignedTo').notEmpty().withMessage('assignedTo (Field Worker ID) is required.'),
  body('notes').optional().trim(),
];

// GET /api/work-orders — accessible to field workers (own), officials, and admins
router.get(
  '/',
  authenticate,
  getWorkOrders
);

// GET /api/work-orders/:id — single work order (field_worker own; official; admin)
router.get(
  '/:id',
  authenticate,
  getWorkOrderById
);

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

// PUT /api/work-orders/:id/status — field worker advances progress (no proof required)
router.put(
  '/:id/status',
  authenticate,
  authorize('field_worker', 'system_admin'),
  updateWorkOrderStatus
);

module.exports = router;
