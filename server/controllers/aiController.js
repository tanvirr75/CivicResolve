const { categorizeReport, estimateSeverity, isServiceAvailable } = require('../services/aiService');

/**
 * AI Controller — CivicResolve
 *
 * Exposes lightweight real-time AI endpoints consumed by the frontend
 * SubmitReport form for instant feedback before the final POST /api/reports.
 *
 * FR-07: /categorize — auto-categorise by title + description
 * FR-08: /severity   — estimate severity from description
 */

// ── POST /api/ai/categorize ──────────────────────────────────────────────────
// @desc    Auto-categorise a report description in real time (on textarea blur)
// @access  Private — any authenticated user
const categorize = async (req, res, next) => {
  try {
    if (!isServiceAvailable()) {
      return res.status(200).json({
        success: false,
        message: 'AI categorization service is currently unavailable. Please select a category manually.',
        data: { category: null, serviceAvailable: false },
      });
    }

    const { title = '', description = '' } = req.body;

    if (!description || description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Description must be at least 10 characters for AI categorization.',
        data: null,
      });
    }

    const category = await categorizeReport(title.trim(), description.trim());

    if (!category) {
      return res.status(200).json({
        success: false,
        message: 'AI could not determine a category. Please select one manually.',
        data: { category: null, serviceAvailable: isServiceAvailable() },
      });
    }

    return res.status(200).json({
      success: true,
      message: `AI categorized report as "${category}".`,
      data: { category, serviceAvailable: true },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/ai/severity ────────────────────────────────────────────────────
// @desc    Estimate report severity from description in real time
// @access  Private — any authenticated user
const severity = async (req, res, next) => {
  try {
    if (!isServiceAvailable()) {
      return res.status(200).json({
        success: false,
        message: 'AI severity service is currently unavailable.',
        data: { severity: null, serviceAvailable: false },
      });
    }

    const { description = '', imageUrl } = req.body;

    if (!description && !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Either a description or imageUrl is required.',
        data: null,
      });
    }

    // Use description and image for severity estimation via Gemini Flash
    const score = await estimateSeverity(description.trim(), imageUrl);

    if (score === null) {
      return res.status(200).json({
        success: false,
        message: 'AI could not estimate severity.',
        data: { severity: null, serviceAvailable: isServiceAvailable() },
      });
    }

    return res.status(200).json({
      success: true,
      message: `AI estimated severity as ${score}/5.`,
      data: { severity: score, serviceAvailable: true },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { categorize, severity };
