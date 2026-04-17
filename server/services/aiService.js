const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * AI Service — CivicResolve
 * Wraps Gemini API calls for report intelligence features.
 *
 * FR-07: Auto-categorize report by description text
 * FR-08: Estimate severity from description/image
 * FR-09: (Duplicate detection handled by MongoDB $near — not AI)
 * FR-10: Spam detection
 *
 * Audit rules:
 * - API key from .env only — never hardcoded
 * - AI calls are wrapped in try/catch; failures return safe defaults (non-blocking)
 */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const VALID_CATEGORIES = ['Road', 'Waste', 'Drainage', 'Lighting', 'Water', 'Other'];

// ── FR-07: Auto-Categorise Report ─────────────────────────────────────────
/**
 * Analyses the report title + description and returns one of the valid categories.
 * Falls back to 'Other' on any error so report creation is never blocked by AI.
 *
 * @param {string} title
 * @param {string} description
 * @returns {Promise<string>} category
 */
const categorizeReport = async (title, description) => {
  try {
    const prompt = `
You are an AI assistant for a city issue-reporting platform called CivicResolve.
Classify the following civic issue into EXACTLY ONE of these categories:
Road, Waste, Drainage, Lighting, Water, Other

Rules:
- Return ONLY the single category word. No explanation, no punctuation, no extra text.
- If unsure, return "Other".

Report Title: "${title}"
Report Description: "${description}"

Category:`.trim();

    const result = await model.generateContent(prompt);
    const raw    = result.response.text().trim();

    // Validate — only accept known categories
    const matched = VALID_CATEGORIES.find(
      (c) => c.toLowerCase() === raw.toLowerCase()
    );

    return matched || 'Other';
  } catch (err) {
    console.error('[AI] categorizeReport failed:', err.message);
    return 'Other'; // Safe default — never block report creation
  }
};

// ── FR-08: Estimate Severity ───────────────────────────────────────────────
/**
 * Estimates issue severity (1–5) from the description.
 * 1 = minor cosmetic issue, 5 = immediate danger / infrastructure failure.
 * Falls back to 3 (medium) on error.
 *
 * @param {string} description
 * @returns {Promise<number>} severity 1–5
 */
const estimateSeverity = async (description) => {
  try {
    const prompt = `
You are a city infrastructure analyst. Rate the severity of this civic issue on a scale of 1 to 5:
1 = Very minor (cosmetic, no safety risk)
2 = Minor (inconvenient but safe)
3 = Moderate (affects daily life)
4 = Serious (poses some danger)
5 = Critical (immediate public danger)

Rules:
- Return ONLY a single digit (1, 2, 3, 4, or 5). No explanation.

Issue Description: "${description}"

Severity:`.trim();

    const result = await model.generateContent(prompt);
    const raw    = parseInt(result.response.text().trim(), 10);

    if (raw >= 1 && raw <= 5) return raw;
    return 3; // Safe default
  } catch (err) {
    console.error('[AI] estimateSeverity failed:', err.message);
    return 3;
  }
};

// ── FR-10: Spam Detection ──────────────────────────────────────────────────
/**
 * Returns true if the description appears to be spam / irrelevant.
 * Falls back to false (not spam) on error — better to allow than block.
 *
 * @param {string} description
 * @returns {Promise<boolean>}
 */
const detectSpam = async (description) => {
  try {
    const prompt = `
You are a content moderator for a civic issue-reporting platform.
Determine if the following description is spam, irrelevant, or not a real civic issue.

Rules:
- Return ONLY "true" (is spam) or "false" (is genuine civic report). No other text.

Description: "${description}"

Is spam:`.trim();

    const result = await model.generateContent(prompt);
    const raw    = result.response.text().trim().toLowerCase();

    return raw === 'true';
  } catch (err) {
    console.error('[AI] detectSpam failed:', err.message);
    return false; // Fail-open: do not block legitimate reports
  }
};

module.exports = { categorizeReport, estimateSeverity, detectSpam };
