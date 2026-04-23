const { validationResult } = require('express-validator');
const OfflineDraft = require('../models/OfflineDraft');

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Sync locally stored offline drafts to the backend online queue
// @route   POST /api/drafts/sync
// @access  Private (auth required)
// FR-19 (Offline Drafting Mode)
// ─────────────────────────────────────────────────────────────────────────────
const syncDrafts = async (req, res, next) => {
  try {
    // ── 1. Validate incoming payload ───────────────────────────────
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        data: { errors: errors.array() },
      });
    }

    const { drafts } = req.body;

    if (!Array.isArray(drafts) || drafts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No drafts array provided for syncing.',
        data: null,
      });
    }

    const savedDrafts = [];
    for (const data of drafts) {
      const draft = await OfflineDraft.create({
        user: req.user._id,
        draftData: {
          title: data.title,
          description: data.description,
          category: data.category,
          latitude: data.latitude,
          longitude: data.longitude,
          isAnonymous: data.isAnonymous || false,
        },
        isSynced: true, // Marked as successfully synced INTO the backend database queue
        syncedAt: new Date(),
      });
      savedDrafts.push(draft);
    }

    return res.status(201).json({
      success: true,
      message: `Successfully synced ${savedDrafts.length} offline drafts to the server.`,
      data: { drafts: savedDrafts }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { syncDrafts };
