const WardBoundary = require('../models/WardBoundary');

/**
 * Ward Routing Service — CivicResolve
 * FR-11: Ward-Based Auto-Routing
 *
 * Uses MongoDB $geoIntersects to find which ward polygon contains the
 * report's GPS coordinates and returns the wardId.
 *
 * Spec-builder rule:
 *   WardBoundary.findOne({
 *     polygon: { $geoIntersects: { $geometry: { type: "Point", coordinates: [lng, lat] } } }
 *   })
 */

/**
 * resolveWard — finds the ward that geographically contains the given point.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{ wardId: string, wardName: string } | null>}
 *          Returns null if no matching ward found (e.g., outside coverage area).
 */
const resolveWard = async (latitude, longitude) => {
  try {
    const ward = await WardBoundary.findOne({
      polygon: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude], // GeoJSON order: [lng, lat]
          },
        },
      },
    })
      .select('wardId name assignedOfficial')
      .lean();

    if (!ward) return null;

    return {
      wardId           : ward.wardId,
      wardName         : ward.name,
      assignedOfficial : ward.assignedOfficial || null,
    };
  } catch (err) {
    console.error('[WardService] resolveWard failed:', err.message);
    return null; // Non-blocking — report saves without wardId if lookup fails
  }
};

module.exports = { resolveWard };
