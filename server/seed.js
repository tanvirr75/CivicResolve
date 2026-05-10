const mongoose = require('mongoose');
const path     = require('path');
const User     = require('./models/User');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

/**
 * Seed script — populates the users collection with one account per role.
 * Run BEFORE seedWards.js (ward seeder looks up ward@civic.com).
 *
 * Usage:  node seed.js
 *
 * Credentials (plain-text here; bcrypt pre-save hook hashes automatically):
 *   system_admin  → admin@civic.com    / Admin1234
 *   ward_official → ward@civic.com     / Ward1234   (wardId: W-01)
 *   ward_official → ward2@civic.com    / Ward1234   (wardId: W-02)
 *   field_worker  → field@civic.com    / Field1234  (wardId: W-01, employeeId: EMP-001)
 *   field_worker  → field2@civic.com   / Field1234  (wardId: W-02, employeeId: EMP-002)
 *   citizen       → citizen@civic.com  / Citizen1234
 *   citizen2      → citizen2@civic.com / Citizen1234
 */
const seedUsers = async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI not set in .env');

    console.log('🔄 Connecting to MongoDB…');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected');

    console.log('🗑️  Clearing users collection…');
    await User.deleteMany({});

    const usersData = [
      // ── System Admin ─────────────────────────────────────────────
      {
        name:         'Admin User',
        email:        'admin@civic.com',
        passwordHash: 'Admin1234',
        role:         'system_admin',
        isActive:     true,
        adminLevel:   'super',
        accessScope:  'global',
      },

      // ── Ward Official (W-01 — Greater Dhaka) ─────────────────────
      {
        name:         'Ward Official',
        email:        'ward@civic.com',
        passwordHash: 'Ward1234',
        role:         'ward_official',
        isActive:     true,
        wardId:       'W-01',
        jurisdiction: 'Greater Dhaka',
      },

      // ── Ward Official (W-02 — Uttara / North Dhaka) ───────────────
      {
        name:         'Ward Official 2',
        email:        'ward2@civic.com',
        passwordHash: 'Ward1234',
        role:         'ward_official',
        isActive:     true,
        wardId:       'W-02',
        jurisdiction: 'Uttara',
      },

      // ── Field Worker (W-01) ───────────────────────────────────────
      {
        name:         'Field Worker',
        email:        'field@civic.com',
        passwordHash: 'Field1234',
        role:         'field_worker',
        isActive:     true,
        wardId:       'W-01',
        employeeId:   'EMP-001',
        expertise:    'Road Maintenance',
      },

      // ── Field Worker (W-02) ───────────────────────────────────────
      {
        name:         'Field Worker 2',
        email:        'field2@civic.com',
        passwordHash: 'Field1234',
        role:         'field_worker',
        isActive:     true,
        wardId:       'W-02',
        employeeId:   'EMP-002',
        expertise:    'Drainage & Lighting',
      },

      // ── Citizen A ─────────────────────────────────────────────────
      {
        name:         'Test Citizen',
        email:        'citizen@civic.com',
        passwordHash: 'Citizen1234',
        role:         'citizen',
        isActive:     true,
      },

      // ── Citizen B (for upvote / comment testing) ──────────────────
      {
        name:         'Citizen Two',
        email:        'citizen2@civic.com',
        passwordHash: 'Citizen1234',
        role:         'citizen',
        isActive:     true,
        isAnonymous:  false,
      },
    ];

    console.log('🌱 Seeding users (bcrypt hashing in pre-save hook)…');
    await User.create(usersData);
    console.log('✨ Seeded 5 users successfully.\n');
    console.log('  admin@civic.com    → system_admin  (Admin1234)');
    console.log('  ward@civic.com     → ward_official (Ward1234)');
    console.log('  field@civic.com    → field_worker  (Field1234)');
    console.log('  citizen@civic.com  → citizen       (Citizen1234)');
    console.log('  citizen2@civic.com → citizen       (Citizen1234)');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
};

seedUsers();

