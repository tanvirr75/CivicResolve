const multer = require('multer');

/**
 * Multer middleware configured with memory storage.
 * Files are kept as Buffer in req.file.buffer — never written to disk.
 * The buffer is passed directly to Cloudinary's upload_stream (FR-02).
 *
 * Audit rule: "Use multer + Cloudinary for file uploads; never store files locally."
 */

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_MB   = 5;

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WEBP, GIF.`),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, // bytes
  },
});

/**
 * uploadSingle('image') — use on routes that accept one image field named "image".
 * Wraps multer's error into a clean 400 response instead of crashing.
 */
const uploadSingle = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
    if (!err) return next();

    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`,
        data: null,
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error.',
      data: null,
    });
  });
};

module.exports = { uploadSingle };
