const mongoose = require('mongoose');

/**
 * WardBoundary schema — stores GeoJSON polygons for each ward.
 * Used for FR-11 auto-routing: GPS coordinates → $geoIntersects → wardId → WardOfficial.
 * UML: WardBoundary { wardId, name, polygon }
 */
const wardBoundarySchema = new mongoose.Schema(
  {
    wardId: {
      type: String,
      required: [true, 'Ward ID is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Ward name is required'],
      trim: true,
    },
    // GeoJSON Polygon — used with $geoIntersects for point-in-polygon queries
    polygon: {
      type: {
        type: String,
        enum: ['Polygon'],
        required: true,
        default: 'Polygon',
      },
      coordinates: {
        type: [[[Number]]], // Array of rings, each ring is array of [lng, lat] pairs
        required: true,
      },
    },
    // The official responsible for this ward
    assignedOfficial: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

wardBoundarySchema.index({ polygon: '2dsphere' });

const WardBoundary = mongoose.model('WardBoundary', wardBoundarySchema);
module.exports = WardBoundary;
