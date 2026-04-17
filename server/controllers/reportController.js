const { validationResult } = require('express-validator');
const Report               = require('../models/Report');
const Notification         = require('../models/Notification');
const { getIo }            = require('../services/socketService');
const { uploadBuffer }     = require('../services/cloudinaryService');
const { categorizeReport, estimateSeverity, detectSpam } = require('../services/aiService');
const { resolveWard }      = require('../services/wardService');

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Create a new civic report
// @route   POST /api/reports
// @access  Private — any authenticated user (citizen, ward_official, system_admin)
// FR-01 (geo), FR-02 (evidence), FR-07 (AI category), FR-08 (severity),
// FR-10 (spam), FR-11 (ward routing), FR-15 (priority score)
// ─────────────────────────────────────────────────────────────────────────────
const createReport = async (req, res, next) => {
  try {
    // ── 1. Validate incoming fields ──────────────────────────────────────
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        data: { errors: errors.array() },
      });
    }

    const { title, description, latitude, longitude, isAnonymous } = req.body;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // ── 2. Run AI pipeline in parallel (non-blocking best-effort) ────────
    const [aiCategory, severity, isSpam] = await Promise.all([
      categorizeReport(title, description),
      estimateSeverity(description),
      detectSpam(description),
    ]);

    // ── 3. Spam gate (FR-10) ─────────────────────────────────────────────
    if (isSpam) {
      return res.status(400).json({
        success: false,
        message: 'Your report was flagged as spam or irrelevant. Please describe a genuine civic issue.',
        data: null,
      });
    }

    // ── 4. Ward auto-routing (FR-11) ─────────────────────────────────────
    const wardResult = await resolveWard(lat, lng);

    // ── 5. Image upload to Cloudinary (FR-02) ────────────────────────────
    let evidences = [];
    if (req.file) {
      const { secure_url, public_id } = await uploadBuffer(
        req.file.buffer,
        'civicresolve/reports'
      );
      evidences = [{
        fileUrl  : secure_url,
        fileType : 'image',
        publicId : public_id,
      }];
    }

    // ── 6. Build & save Report document ──────────────────────────────────
    const report = await Report.create({
      title,
      description,
      latitude  : lat,
      longitude : lng,
      // GeoJSON location built by pre-save hook in Report.js
      location: {
        type        : 'Point',
        coordinates : [lng, lat],
      },
      category    : aiCategory,
      aiCategory  : aiCategory,
      severity,
      isSpam      : false, // passed spam gate above
      submittedBy : req.user._id,
      isAnonymous : isAnonymous === 'true' || isAnonymous === true || false,
      evidences,

      // Ward routing results (FR-11)
      ...(wardResult && {
        wardId     : wardResult.wardId,
        assignedTo : wardResult.assignedOfficial || undefined,
        status     : wardResult.assignedOfficial ? 'Assigned' : 'Open',
      }),

      // Initial status history entry
      statusHistory: [{
        status    : wardResult?.assignedOfficial ? 'Assigned' : 'Open',
        changedBy : req.user._id,
        note      : 'Report submitted',
      }],
    });

    return res.status(201).json({
      success : true,
      message : 'Report submitted successfully.',
      data    : {
        report: {
          id          : report._id,
          title       : report.title,
          description : report.description,
          category    : report.category,
          severity    : report.severity,
          status      : report.status,
          wardId      : report.wardId   || null,
          wardName    : wardResult?.wardName || null,
          location    : report.location,
          latitude    : report.latitude,
          longitude   : report.longitude,
          imageUrl    : evidences[0]?.fileUrl || null,
          priorityScore: report.priorityScore,
          isAnonymous : report.isAnonymous,
          submittedBy : report.submittedBy,
          createdAt   : report.createdAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all reports (paginated, filterable)
// @route   GET /api/reports
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const getReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, category, wardId } = req.query;

    const filter = { isSpam: false };
    if (status)   filter.status   = status;
    if (category) filter.category = category;
    if (wardId)   filter.wardId   = wardId;

    const options = {
      page     : parseInt(page),
      limit    : parseInt(limit),
      sort     : { priorityScore: -1, createdAt: -1 },
      populate : [
        { path: 'submittedBy', select: 'name role' },
      ],
      lean: true,
    };

    const result = await Report.paginate(filter, options);

    return res.status(200).json({
      success : true,
      message : 'Reports fetched.',
      data    : {
        reports    : result.docs,
        totalDocs  : result.totalDocs,
        totalPages : result.totalPages,
        page       : result.page,
        limit      : result.limit,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get single report by ID
// @route   GET /api/reports/:id
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const getReportById = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('submittedBy', 'name role')
      .populate('assignedTo',  'name role wardId')
      .lean();

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.',
        data: null,
      });
    }

    return res.status(200).json({
      success : true,
      message : 'Report fetched.',
      data    : { report },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Toggle upvote (community verification) on a report
// @route   PUT /api/reports/:id/upvote
// @access  Private — any authenticated user
// FR-04 (Upvote & Community Verification)
// ─────────────────────────────────────────────────────────────────────────────
const toggleUpvote = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.',
        data: null,
      });
    }

    const userId = req.user._id;

    // Check if user has already upvoted
    const hasUpvoted = report.upvotes.some((id) => id.toString() === userId.toString());

    if (hasUpvoted) {
      // Undo upvote
      report.upvotes = report.upvotes.filter((id) => id.toString() !== userId.toString());
    } else {
      // Add upvote
      report.upvotes.push(userId);
    }

    // Sync count for Priority Score Hook (FR-15)
    report.upvoteCount = report.upvotes.length;

    await report.save();

    return res.status(200).json({
      success: true,
      message: hasUpvoted ? 'Upvote removed.' : 'Upvote added successfully.',
      data: {
        upvoteCount: report.upvoteCount,
        priorityScore: report.priorityScore,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Add a comment to a report
// @route   POST /api/reports/:id/comments
// @access  Private — any authenticated user
// FR-05 (Comment & Discussion Threads)
// ─────────────────────────────────────────────────────────────────────────────
const addComment = async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required.',
        data: null,
      });
    }

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.',
        data: null,
      });
    }

    const authorName = req.user.isAnonymous ? 'Anonymous Citizen' : req.user.name;

    const newComment = {
      author: req.user._id,
      authorName,
      content: content.trim(),
    };

    report.comments.push(newComment);
    await report.save();

    return res.status(201).json({
      success: true,
      message: 'Comment added successfully.',
      data: { comments: report.comments },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get nearby reports (Duplicate Detection)
// @route   GET /api/reports/nearby
// @access  Public
// FR-09 (Duplicate Detection via $near geospatial query)
// ─────────────────────────────────────────────────────────────────────────────
const getNearbyReports = async (req, res, next) => {
  try {
    const { lat, lng, radius = 10 } = req.query; // Default 10 meters per audit_code.md

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude query parameters are required.',
        data: null,
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const maxDistance = parseInt(radius, 10);

    const reports = await Report.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude], // GeoJSON: [lng, lat]
          },
          $maxDistance: maxDistance,
        },
      },
      isSpam: false,
    }).lean();

    return res.status(200).json({
      success: true,
      message: `Found ${reports.length} nearby reports within ${maxDistance}m.`,
      data: { reports },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update report status
// @route   PUT /api/reports/:id/status
// @access  Private (ward_official, system_admin)
// FR-12 (Status Workflow Management)
// ─────────────────────────────────────────────────────────────────────────────
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const validStatuses = ['Open', 'Assigned', 'In Progress', 'Resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`,
        data: null,
      });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.',
        data: null,
      });
    }

    // Update main status field
    report.status = status;

    // Push into history array
    report.statusHistory.push({
      status,
      changedBy: req.user._id,
      note: note || '',
      changedAt: new Date(),
    });

    // Handle resolution timestamp logic automatically
    if (status === 'Resolved') {
      report.resolvedAt = new Date();
    } else {
      report.resolvedAt = undefined;
    }

    await report.save();

    // ── Generate and Emit Socket.io Notification (FR-16) ──
    try {
      if (report.submittedBy && report.submittedBy.toString() !== req.user._id.toString()) {
        const notifMsg = `Your reported issue "${report.title}" status has been updated to "${status}".`;
        
        // 1. Build DB Notification History
        const notification = await Notification.create({
          recipient: report.submittedBy,
          report: report._id,
          message: notifMsg,
          type: 'status_update'
        });

        // 2. Blast out the Real-Time live update to the private room
        const io = getIo();
        io.to(report.submittedBy.toString()).emit('statusUpdated', notification);
      }
    } catch(err) {
      console.error("[Notifications] Socket emission skipped or failed:", err.message);
    }

    return res.status(200).json({
      success: true,
      message: `Report status updated to ${status}.`,
      data: {
        status: report.status,
        statusHistory: report.statusHistory,
        resolvedAt: report.resolvedAt,
        resolutionTimeHours: report.resolutionTimeHours,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createReport, getReports, getReportById, toggleUpvote, addComment, getNearbyReports, updateStatus };
