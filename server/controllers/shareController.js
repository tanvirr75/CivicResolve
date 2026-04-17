const Report = require('../models/Report');

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Return raw HTML with OpenGraph tags for Facebook/Twitter scraping
// @route   GET /api/share/:id
// @access  Public
// FR-06 (Social Media Integration)
// ─────────────────────────────────────────────────────────────────────────────
const getShareableCard = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).send('CivicResolve: Report not found');

    const frontendUrl = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    const reactAppTarget = `${frontendUrl}/reports/${report._id}`;
    
    // Sanitize string content to prevent HTML injection errors in rendering
    const safeTitle = report.title ? report.title.replace(/"/g, '&quot;') : 'CivicResolve - Urban Issue Recorded';
    const safeDesc = report.description ? report.description.replace(/"/g, '&quot;') : 'A citizen has flagged a critical urban issue for resolution.';
    const imageUrl = report.imageUrl || 'https://res.cloudinary.com/demo/image/upload/sample.jpg';

    // ── Generate the static HTML meta properties block ──
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${safeTitle} - CivicResolve</title>
      <meta property="og:title" content="${safeTitle}">
      <meta property="og:description" content="${safeDesc}">
      <meta property="og:image" content="${imageUrl}">
      <meta property="og:url" content="${reactAppTarget}">
      <meta property="og:type" content="website">
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="${safeTitle}">
      <meta name="twitter:description" content="${safeDesc}">
      <meta name="twitter:image" content="${imageUrl}">
      <style>
        body { font-family: sans-serif; text-align: center; margin-top: 20%; color: #555; }
        a { color: #007bff; text-decoration: none; }
      </style>
      <script>
        // If a real human clicks the link, forcefully redirect them to the frontend React UI!
        window.location.href = "${reactAppTarget}";
      </script>
    </head>
    <body>
      <p>Redirecting you to the CivicResolve Platform...</p>
      <p><a href="${reactAppTarget}">Click here if not redirected automatically.</a></p>
    </body>
    </html>
    `;

    res.send(html);
  } catch (err) {
    next(err);
  }
};

module.exports = { getShareableCard };
