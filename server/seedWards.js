require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const WardBoundary = require('./models/WardBoundary');
const User = require('./models/User');

/**
 * Ward Seeder — CivicResolve
 *
 * Seeds two ward boundaries covering Greater Dhaka split north/south,
 * links each to a ward official, and stamps wardId on their field workers.
 *
 * W-01 — South Dhaka (Dhanmondi, Motijheel, Old Dhaka, Demra)
 *         lat 23.65 → 23.81 | lng 90.28 → 90.55
 *
 * W-02 — North Dhaka (Uttara, Tongi, Mirpur, Gulshan)
 *         lat 23.81 → 23.96 | lng 90.28 → 90.55
 *
 * Run after seed.js:  node seedWards.js
 */
async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas…');

    // ── Fetch officials ───────────────────────────────────────────────────
    const official1 = await User.findOne({ email: 'ward@civic.com' }).lean();
    const official2 = await User.findOne({ email: 'ward2@civic.com' }).lean();
    if (!official1) throw new Error('ward@civic.com not found — run seed.js first');
    if (!official2) throw new Error('ward2@civic.com not found — run seed.js first');

    // ── Stamp wardIds on officials (seed.js already does this, but idempotent) ─
    await User.updateOne({ _id: official1._id }, { $set: { wardId: 'W-01' } });
    await User.updateOne({ _id: official2._id }, { $set: { wardId: 'W-02' } });

    // ── Stamp wardIds on field workers ────────────────────────────────────
    await User.updateOne({ email: 'field@civic.com'  }, { $set: { wardId: 'W-01' } });
    await User.updateOne({ email: 'field2@civic.com' }, { $set: { wardId: 'W-02' } });
    console.log('wardId stamped on officials and field workers.');

    // ── Clear then re-seed boundaries ─────────────────────────────────────
    await WardBoundary.deleteMany({});
    console.log('Cleared old boundaries.');

    await WardBoundary.insertMany([
      {
        wardId: 'W-01',
        name: 'Ward 01 — South Dhaka',
        assignedOfficial: official1._id,
        polygon: {
          type: 'Polygon',
          coordinates: [[
            [90.28, 23.65],
            [90.55, 23.65],
            [90.55, 23.81],
            [90.28, 23.81],
            [90.28, 23.65],
          ]],
        },
      },
      {
        wardId: 'W-02',
        name: 'Ward 02 — North Dhaka',
        assignedOfficial: official2._id,
        polygon: {
          type: 'Polygon',
          coordinates: [[
            [90.28, 23.81],
            [90.55, 23.81],
            [90.55, 23.96],
            [90.28, 23.96],
            [90.28, 23.81],
          ]],
        },
      },
    ]);
    console.log('Seeded W-01 (South Dhaka) and W-02 (North Dhaka).');

    // ── Ensure 2dsphere index ─────────────────────────────────────────────
    await WardBoundary.collection.createIndex({ polygon: '2dsphere' });
    console.log('2dsphere index confirmed.');

    // ── Sanity checks ─────────────────────────────────────────────────────
    const checkSouth = await WardBoundary.findOne({
      polygon: { $geoIntersects: { $geometry: { type: 'Point', coordinates: [90.4125, 23.73] } } },
    }).lean();
    const checkNorth = await WardBoundary.findOne({
      polygon: { $geoIntersects: { $geometry: { type: 'Point', coordinates: [90.4125, 23.87] } } },
    }).lean();
    console.log(`Sanity South (23.73, 90.41) → ${checkSouth ? checkSouth.wardId + ' ✓' : 'MISS ✗'}`);
    console.log(`Sanity North (23.87, 90.41) → ${checkNorth ? checkNorth.wardId + ' ✓' : 'MISS ✗'}`);

    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();
