const cloudinary = require('cloudinary').v2;

/**
 * Cloudinary Service — CivicResolve
 * Handles image uploads and deletions for report evidence (FR-02).
 *
 * Cloudinary is configured from .env — no keys hardcoded (audit rule).
 * Uses upload_stream so files never touch the disk (multer memoryStorage → buffer → stream).
 */

cloudinary.config({
  cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
  api_key    : process.env.CLOUDINARY_API_KEY,
  api_secret : process.env.CLOUDINARY_API_SECRET,
});

/**
 * uploadBuffer — streams a Buffer from multer memory storage to Cloudinary.
 *
 * @param {Buffer} buffer       - File buffer from req.file.buffer
 * @param {string} folder       - Cloudinary folder (e.g., 'civicresolve/reports')
 * @param {object} [options]    - Extra Cloudinary upload options
 * @returns {{ secure_url, public_id }} Cloudinary result
 */
const uploadBuffer = (buffer, folder = 'civicresolve/reports', options = {}) => {
  return new Promise((resolve, reject) => {
    const resourceType = options.resource_type || 'image';
    const uploadOptions = {
      folder,
      resource_type: resourceType,
      ...options,
    };

    // Only apply image transformations if we are explicitly handling images, not raw PDFs
    if (resourceType === 'image') {
      uploadOptions.transformation = [
        { quality: 'auto', fetch_format: 'auto' }, // auto-optimize
        { width: 1200, crop: 'limit' },            // cap at 1200px wide
      ];
    }

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

/**
 * deleteByPublicId — removes an asset from Cloudinary.
 * Used when a report or evidence is deleted.
 *
 * @param {string} publicId - Cloudinary public_id returned from upload
 */
const deleteByPublicId = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    // Log but don't throw — a failed delete should not block the user flow
    console.error(`[Cloudinary] Failed to delete asset ${publicId}:`, err.message);
  }
};

module.exports = { uploadBuffer, deleteByPublicId };
