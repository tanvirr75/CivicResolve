require('dotenv').config({ path: '../.env' });
const mongoose  = require('mongoose');
const WardBoundary = require('./models/WardBoundary');
const User      = require('./models/User');

/**
 * Ward Seeder — CivicResolve
 *
 * Defines a city-wide Ward 01 polygon (covers all of Greater Dhaka)
 * so ANY pin dropped in the city resolves correctly for testing.
 *
 * GeoJSON coordinate order is [longitude, latitude] — NOT [lat, lng].
 * Polygon vertices go counter-clockwise and the ring must be closed
 * (first === last point).
 *
 * Coverage box:  lng 90.28 → 90.55  (east-west)
 *                lat 23.65 → 23.96  (south-north)
 * This covers Uttara, Tongi, Mirpur, Gulshan, Dhanmondi,
 * Motijheel, Demra — i.e. the entire city footprint.
 */
async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas…');

    // Fetch the ward official's _id
    const wardOfficial = await User.findOne({ email: 'ward@civic.com' }).lean();
    if (!wardOfficial) throw new Error('ward@civic.com not found — run seed.js first');
    console.log(`Ward official _id: ${wardOfficial._id}`);

    // Update the ward official's wardId so the dashboard query works
    await User.updateOne({ _id: wardOfficial._id }, { $set: { wardId: 'W-01' } });
    console.log('Set wardId="W-01" on ward@civic.com user document.');

    // Clear then re-seed boundaries
    await WardBoundary.deleteMany({});
    console.log('Cleared old boundaries.');

    await WardBoundary.create({
      wardId: 'W-01',
      name: 'Ward 01 — Greater Dhaka',
      assignedOfficial: wardOfficial._id,
      polygon: {
        type: 'Polygon',
        // [longitude, latitude] pairs — counter-clockwise — closed ring
        coordinates: [[
          [90.28, 23.65],   // SW corner
          [90.55, 23.65],   // SE corner
          [90.55, 23.96],   // NE corner
          [90.28, 23.96],   // NW corner
          [90.28, 23.65],   // closed back to SW
        ]],
      },
    });
    console.log('Seeded Ward 01 with Greater Dhaka coverage.');

    // Ensure 2dsphere index exists (idempotent)
    await WardBoundary.collection.createIndex({ polygon: '2dsphere' });
    console.log('2dsphere index confirmed.');

    // Quick sanity-check: does Dhaka city centre resolve?
    const check = await WardBoundary.findOne({
      polygon: {
        $geoIntersects: {
          $geometry: { type: 'Point', coordinates: [90.4125, 23.8103] },
        },
      },
    }).lean();
    console.log(`Sanity check (23.8103, 90.4125) → ${check ? `Ward: ${check.wardId} ✓` : 'MISS ✗'}`);

    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();
