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
 * Resilience rules:
 * - API key from .env only — never hardcoded
 * - AI calls are wrapped in try/catch with explicit timeouts
 * - ALL failures return safe defaults so report creation is NEVER blocked
 * - Service health is checked once on startup; if unavailable, all methods
 *   skip the API call and return defaults immediately (no wasteful retries)
 */

const VALID_CATEGORIES = ['Road', 'Waste', 'Drainage', 'Lighting', 'Water', 'Other'];

// ── Service health flag ─────────────────────────────────────────────────────
// Set to false after the first confirmed 404/auth failure to prevent
// repeated slow API calls on every report submission.
let _serviceAvailable = !!process.env.GEMINI_API_KEY;

let genAI = null;
let model  = null;

if (_serviceAvailable) {
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use the latest available Flash model
    model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  } catch (initErr) {
    console.warn('[AI] Service init failed:', initErr.message);
    _serviceAvailable = false;
  }
}

/**
 * Internal helper — runs a Gemini prompt with a hard timeout.
 * Marks the service unavailable on 404 / auth errors so subsequent
 * calls skip the API entirely.
 *
 * @param {string|Array<any>} prompt - Either a string or an array of Parts for multimodal requests
 * @param {number} [timeoutMs=8000]
 * @returns {Promise<string|null>} raw text from AI, or null on failure
 */
async function _runPrompt(prompt, timeoutMs = 8000) {
  if (!_serviceAvailable || !model) return null;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.warn('[AI] Request timed out after', timeoutMs, 'ms');
      resolve(null);
    }, timeoutMs);

    model
      .generateContent(prompt)
      .then((result) => {
        clearTimeout(timer);
        resolve(result.response.text().trim());
      })
      .catch((err) => {
        clearTimeout(timer);
        // 404 means the model/API not available for this key — stop retrying
        if (err.message?.includes('404') || err.message?.includes('not found')) {
          console.warn('[AI] Service unavailable (404). Disabling AI for this session.');
          _serviceAvailable = false;
        } else {
          console.error('[AI] Prompt failed:', err.message);
        }
        resolve(null);
      });
  });
}

// ── FR-07: Auto-Categorise Report ──────────────────────────────────────────
/**
 * Analyses the report title + description and returns one of the valid categories.
 * Falls back to null (not 'Other') so the caller can apply its own fallback logic.
 *
 * @param {string} title
 * @param {string} description
 * @returns {Promise<string|null>} category or null if AI unavailable
 */
const categorizeReport = async (title, description, imageBase64 = null, mimeType = null) => {
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

  const parts = [prompt];
  if (imageBase64) {
    parts.push({
      inlineData: {
        data: imageBase64,
        mimeType: mimeType || 'image/jpeg',
      },
    });
  }

  const raw = await _runPrompt(parts);
  if (!raw) return null;

  const matched = VALID_CATEGORIES.find(
    (c) => c.toLowerCase() === raw.toLowerCase()
  );
  return matched ?? null;
};

// ── FR-08: Estimate Severity ────────────────────────────────────────────────
/**
 * Estimates issue severity (1–10) from the description and/or image.
 * Returns null if AI unavailable so caller can apply its own default (5).
 *
 * @param {string} description
 * @param {string|null} [imageBase64]
 * @param {string|null} [mimeType]
 * @returns {Promise<number|null>} severity 1–10 or null
 */
const estimateSeverity = async (description, imageBase64 = null, mimeType = null) => {
  const prompt = `
You are a city infrastructure analyst. Rate the severity of this civic issue on a scale of 1 to 10 based on the image (if provided) and description:
1-2 = Very minor (cosmetic, no safety risk)
3-4 = Minor (inconvenient but safe)
5-6 = Moderate (affects daily life)
7-8 = Serious (poses some danger)
9-10 = Critical (immediate public danger, emergency)

Rules:
- Return ONLY a single number from 1 to 10. No explanation.

Issue Description: "${description || 'No description provided'}"

Severity:`.trim();

  let parts = [prompt];

  if (imageBase64) {
    parts.push({
      inlineData: {
        data: imageBase64,
        mimeType: mimeType || 'image/jpeg',
      },
    });
  }

  const raw = await _runPrompt(parts);
  if (!raw) return null;

  const parsed = parseInt(raw, 10);
  return parsed >= 1 && parsed <= 10 ? parsed : null;
};

// ── FR-10: Spam Detection ───────────────────────────────────────────────────
/**
 * Returns true only if AI is confident the report is spam.
 * If AI is unavailable, returns false (fail-open: never block legitimate reports).
 *
 * @param {string} description
 * @returns {Promise<boolean>}
 */
const detectSpam = async (description, imageBase64 = null, mimeType = null) => {
  const prompt = `
You are a content moderator for a civic issue-reporting platform.
Determine if the following issue is spam, irrelevant, or not a real civic issue.
Use both the image (if provided) and description.

Rules:
- Return ONLY "true" (is spam) or "false" (is genuine civic report). No other text.

Description: "${description}"

Is spam:`.trim();

  let parts = [prompt];
  if (imageBase64) {
    parts.push({
      inlineData: {
        data: imageBase64,
        mimeType: mimeType || 'image/jpeg',
      },
    });
  }

  const raw = await _runPrompt(parts);
  if (!raw) return false; // Fail-open: do not block legitimate reports

  return raw.toLowerCase() === 'true';
};

/**
 * Returns the current health of the AI service.
 * Used by the /api/ai/categorize and /api/ai/severity endpoints
 * to immediately communicate service status to the frontend.
 */
const isServiceAvailable = () => _serviceAvailable;

module.exports = { categorizeReport, estimateSeverity, detectSpam, isServiceAvailable };
