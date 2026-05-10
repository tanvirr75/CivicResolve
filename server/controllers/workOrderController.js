const { validationResult } = require('express-validator');
const WorkOrder = require('../models/WorkOrder');
const Report    = require('../models/Report');
const User      = require('../models/User');
const { uploadBuffer }         = require('../services/cloudinaryService');
const { generateWorkOrderPdf } = require('../services/pdfService');
const logger                   = require('../utils/logger');

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Create a Work Order to dispatch Field Worker
// @route   POST /api/work-orders
// @access  Private (ward_official, system_admin)
// FR-13
// ─────────────────────────────────────────────────────────────────────────────
const createWorkOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed.', data: { errors: errors.array() } });
    }

    const { reportId, assignedTo, notes } = req.body;

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.', data: null });
    }

    const worker = await User.findById(assignedTo);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Assigned worker not found.', data: null });
    }

    // Generate the PDF stream dynamically in RAM
    const pdfBuffer = await generateWorkOrderPdf(report, worker, notes);
    
    // Upload the pure Buffer directly to Cloudinary bypassing the harddrive
    const { secure_url: pdfUrl } = await uploadBuffer(pdfBuffer, 'civicresolve/work-orders', { resource_type: 'auto' });

    // Create the Work Order
    const workOrder = await WorkOrder.create({
      report: reportId,
      assignedTo,
      assignedBy: req.user._id,
      notes: notes || '',
      status: 'Pending',
      pdfUrl: pdfUrl, // Save Cloudinary URL to database
    });

    // Link the fieldWorker to the Report and move status to In Progress
    report.fieldWorker = assignedTo;
    if (report.status === 'Open') {
      report.status = 'In Progress';
      report.statusHistory.push({
        status: 'In Progress',
        changedBy: req.user._id,
        note: 'Work Order generated. Field worker dispatched.',
        changedAt: new Date()
      });
    }
    await report.save();

    return res.status(201).json({
      success: true,
      message: 'Work order created and dispatched successfully.',
      data: { workOrder },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Submit Proof of Fix (resolve the report)
// @route   PUT /api/work-orders/:id/complete
// @access  Private (field_worker)
// FR-14
// ─────────────────────────────────────────────────────────────────────────────
const submitProofOfFix = async (req, res, next) => {
  try {
    const workOrder = await WorkOrder.findById(req.params.id);
    if (!workOrder) {
      return res.status(404).json({ success: false, message: 'Work Order not found.', data: null });
    }

    // Authorization strictly checking for the exact assigned worker (or fallback admin)
    if (workOrder.assignedTo.toString() !== req.user._id.toString() && req.user.role !== 'system_admin') {
      return res.status(403).json({ success: false, message: 'Not authorized. You are not assigned to this work order.', data: null });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Proof of fix image is required.', data: null });
    }

    // Stream image directly to cloudinary
    const { secure_url, public_id } = await uploadBuffer(req.file.buffer, 'civicresolve/proofs');

    // Save proof on the report — work order stays In Progress until ward official approves
    const report = await Report.findById(workOrder.report);
    if (report) {
      report.proofUrl = secure_url;
      report.proofPublicId = public_id;
      await report.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Proof submitted. Awaiting ward official review.',
      data: {
        workOrderStatus: workOrder.status,
        proofUrl: secure_url,
      },
    });

  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all Work Orders (with role-based filtering)
// @route   GET /api/work-orders
// @access  Private (field_worker, ward_official, system_admin)
// ─────────────────────────────────────────────────────────────────────────────
const getWorkOrders = async (req, res, next) => {
  try {
    const { assignedTo, status, page = 1, limit = 20 } = req.query;
    const query = {};

    // 1. Filter by assigned worker
    // If assignedTo=me, filter by current user's ID
    if (assignedTo === 'me') {
      query.assignedTo = req.user._id;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    // 2. Filter by status
    if (status) {
      query.status = status;
    }

    // ── 3. Authorization check per role ────────────────────────────────────────
    // field_worker: can only see their own orders.
    // ward_official: scoped to work orders whose report belongs to their ward.
    // system_admin: sees all.
    if (req.user.role === 'field_worker') {
      if (query.assignedTo?.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized. Field workers can only access their own work orders.',
          data: null,
        });
      }
    }

    if (req.user.role === 'ward_official') {
      // Find all report IDs that belong to this official's ward
      const wardReportIds = await Report
        .find({ wardId: req.user.wardId })
        .select('_id')
        .lean();
      query.report = { $in: wardReportIds.map((r) => r._id) };
    }

    // 4. Fetch with pagination and population
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'report', select: 'title category description latitude longitude status' },
        { path: 'assignedTo', select: 'name email' },
        { path: 'assignedBy', select: 'name email' }
      ],
      lean: true
    };

    const result = await WorkOrder.paginate(query, options);

    return res.status(200).json({
      success: true,
      message: `Fetched ${result.docs.length} work orders.`,
      data: {
        workOrders: result.docs,
        totalItems: result.totalDocs,
        totalPages: result.totalPages,
        currentPage: result.page
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get a single Work Order by ID
// @route   GET /api/work-orders/:id
// @access  Private (field_worker — own only; ward_official; system_admin)
// ─────────────────────────────────────────────────────────────────────────────
const getWorkOrderById = async (req, res, next) => {
  try {
    const workOrder = await WorkOrder.findById(req.params.id)
      .populate('report',     'title category description latitude longitude location status evidences wardId proofUrl comments')
      .populate('assignedTo', 'name email employeeId')
      .populate('assignedBy', 'name email')
      .lean();

    if (!workOrder) {
      return res.status(404).json({ success: false, message: 'Work Order not found.', data: null });
    }

    // field_worker may only access their own orders
    if (
      req.user.role === 'field_worker' &&
      workOrder.assignedTo?._id?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this work order.', data: null });
    }

    return res.status(200).json({ success: true, message: 'Work order fetched.', data: { workOrder } });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update work order status (progress updates by field worker)
// @route   PUT /api/work-orders/:id/status
// @access  Private (field_worker, system_admin)
// Allowed transitions: Pending → En Route → In Progress
// 'Completed' is locked behind submitProofOfFix (requires proof image)
// ─────────────────────────────────────────────────────────────────────────────
const ALLOWED_STATUSES = ['Pending', 'En Route', 'In Progress'];
const STATUS_ORDER = { Pending: 0, 'En Route': 1, 'In Progress': 2, Completed: 3 };

const updateWorkOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values via this endpoint: ${ALLOWED_STATUSES.join(', ')}. Use /complete to submit proof and mark as Completed.`,
        data: null,
      });
    }

    const workOrder = await WorkOrder.findById(req.params.id);
    if (!workOrder) {
      return res.status(404).json({ success: false, message: 'Work Order not found.', data: null });
    }

    // field_worker authorization: only assigned worker may update
    if (req.user.role === 'field_worker' && workOrder.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized. You are not assigned to this work order.', data: null });
    }

    // Enforce forward-only transitions
    if (STATUS_ORDER[status] <= STATUS_ORDER[workOrder.status]) {
      return res.status(400).json({
        success: false,
        message: `Cannot move status backwards. Current status is "${workOrder.status}".`,
        data: null,
      });
    }

    workOrder.status = status;
    workOrder.statusHistory.push({ status, note: note?.trim() || '', changedAt: new Date() });
    await workOrder.save();

    // Sync parent report to "In Progress" when field worker begins work
    if (status === 'In Progress') {
      try {
        const report = await Report.findById(workOrder.report);
        if (report && report.status === 'Assigned') {
          report.status = 'In Progress';
          report.statusHistory.push({
            status    : 'In Progress',
            changedBy : req.user._id,
            note      : 'Field worker started work.',
            changedAt : new Date(),
          });
          await report.save();
        }
      } catch (syncErr) {
        logger.error('[WorkOrder] Failed to sync report status to In Progress:', syncErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Work order status updated to "${status}".`,
      data: { status: workOrder.status, statusHistory: workOrder.statusHistory },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createWorkOrder, submitProofOfFix, getWorkOrders, getWorkOrderById, updateWorkOrderStatus };
