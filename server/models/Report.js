const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

/**
 * Report schema — core entity of CivicResolve.
 * UML: Report has Evidence[], Comment[], WorkOrder, is routed via WardBoundary,
 *      processed by AIService, visualised by Heatmap, triggers Notification.
 * SRS FR-01 to FR-17 touch this collection.
 */

// ── Sub-schema: Evidence (FR-02) ───────────────────────────────────────────
const evidenceSchema = new mongoose.Schema(
  {
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
    },
    fileType: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    publicId: {
      type: String, // Cloudinary public_id for deletion
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// ── Sub-schema: Comment (FR-05) ────────────────────────────────────────────
const commentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: {
      type: String, // Denormalized for anonymous display
    },
    content: {
      type: String,
      required: [true, 'Comment content cannot be empty'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// ── Main Report Schema ─────────────────────────────────────────────────────
const reportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Report title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },

    // ── Category (set by AI FR-07 or user) ──────────────────────────────
    category: {
      type: String,
      enum: ['Road', 'Waste', 'Drainage', 'Lighting', 'Water', 'Other'],
      default: 'Other',
    },

    // ── Geospatial (FR-01) — GeoJSON Point for $near / $geoWithin ───────
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude] — GeoJSON order
        required: [true, 'Location coordinates are required'],
        validate: {
          validator: function (v) {
            return (
              v.length === 2 &&
              v[0] >= -180 && v[0] <= 180 && // longitude
              v[1] >= -90  && v[1] <= 90      // latitude
            );
          },
          message: 'Coordinates must be [longitude, latitude] with valid ranges',
        },
      },
    },

    // ── Flat lat/lng (convenience for FR-01 pin-drop form) ───────────────
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be >= -90'],
      max: [90, 'Latitude must be <= 90'],
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be >= -180'],
      max: [180, 'Longitude must be <= 180'],
    },

    // ── Status Workflow (FR-12) ───────────────────────────────────────────
    status: {
      type: String,
      enum: ['Open', 'Assigned', 'In Progress', 'Resolved'],
      default: 'Open',
    },
    statusHistory: [
      {
        status: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
        note: String,
      },
    ],

    // ── Priority Score (FR-15): score = (upvotes*2) + (severity*10) + ageBonus
    priorityScore: {
      type: Number,
      default: 0,
    },

    // ── AI Results (FR-07, FR-08, FR-09, FR-10) ──────────────────────────
    aiCategory: {
      type: String,
    },
    severity: {
      type: Number,
      min: 1,
      max: 5,
    },
    isSpam: {
      type: Boolean,
      default: false,
    },
    isDuplicate: {
      type: Boolean,
      default: false,
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
    },

    // ── Evidence (FR-02) ─────────────────────────────────────────────────
    evidences: [evidenceSchema],

    // ── Proof of Fix (FR-14) ──────────────────────────────────────────────
    proofUrl: {
      type: String,
    },
    proofPublicId: {
      type: String,
    },

    // ── Comments (FR-05) ─────────────────────────────────────────────────
    comments: [commentSchema],

    // ── Upvotes / Community Verification (FR-04) ─────────────────────────
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    upvoteCount: {
      type: Number,
      default: 0,
    },

    // ── Relations ─────────────────────────────────────────────────────────
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    wardId: {
      type: String, // Set by FR-11 auto-routing via WardBoundary
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // WardOfficial
    },
    fieldWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // FieldWorker assigned via WorkOrder
    },

    // ── Timestamps for resolution tracking ───────────────────────────────
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // createdAt + updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
reportSchema.index({ location: '2dsphere' });    // Geospatial queries (FR-09, FR-11)
reportSchema.index({ status: 1 });
reportSchema.index({ wardId: 1, status: 1 });
reportSchema.index({ submittedBy: 1 });
reportSchema.index({ priorityScore: -1 });
reportSchema.index({ category: 1 });
reportSchema.index({ createdAt: -1 });

// ── Virtual: upvote count from array length ────────────────────────────────
reportSchema.virtual('totalUpvotes').get(function () {
  return this.upvotes ? this.upvotes.length : 0;
});

// ── Virtual: resolution time in hours ─────────────────────────────────────
reportSchema.virtual('resolutionTimeHours').get(function () {
  if (!this.resolvedAt) return null;
  return Math.round((this.resolvedAt - this.createdAt) / (1000 * 60 * 60));
});

// ── Pre-save: Sync flat lat/lng ↔ GeoJSON coordinates ─────────────────────
// NOTE: Mongoose 9 — no next() parameter needed; Mongoose handles completion.
reportSchema.pre('save', function () {
  if (this.isModified('latitude') || this.isModified('longitude')) {
    this.location = {
      type: 'Point',
      coordinates: [this.longitude, this.latitude], // GeoJSON: [lng, lat]
    };
  }
});

// ── Pre-save: Recalculate priority score (FR-15) ──────────────────────────
reportSchema.pre('save', function () {
  const upvotes  = this.upvoteCount || 0;
  const severity = this.severity    || 0;
  const ageHours = this.createdAt
    ? Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60))
    : 0;
  const ageBonus = Math.floor(ageHours / 24) * 5;

  this.priorityScore = upvotes * 2 + severity * 10 + ageBonus;
});

// ── Plugin: pagination ─────────────────────────────────────────────────────
reportSchema.plugin(mongoosePaginate);

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;
