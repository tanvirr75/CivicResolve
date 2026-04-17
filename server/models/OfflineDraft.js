const mongoose = require('mongoose');

/**
 * OfflineDraft schema — stores unsent reports locally (FR-19).
 * UML: OfflineDraft { draftId, message, isSynced } — +saveDraft(), +syncOnline(), +deleteDraft()
 * Synced to server when connectivity is restored; Socket.io emits 'draftSynced' on success.
 */
const offlineDraftSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Snapshot of the report fields at time of draft
    draftData: {
      title:       { type: String },
      description: { type: String },
      category:    { type: String },
      latitude:    { type: Number },
      longitude:   { type: Number },
      isAnonymous: { type: Boolean, default: false },
    },
    isSynced: {
      type: Boolean,
      default: false,
      index: true,
    },
    syncedAt: {
      type: Date,
    },
    // Reference to the Report created after successful sync
    syncedReport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
    },
  },
  { timestamps: true }
);

offlineDraftSchema.index({ user: 1, isSynced: 1 });

const OfflineDraft = mongoose.model('OfflineDraft', offlineDraftSchema);
module.exports = OfflineDraft;
