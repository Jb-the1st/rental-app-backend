/**
 * migrate.js — One-time migration script
 *
 * Run ONCE after deploying the new models:
 *   node migrate.js
 *
 * Safe to run multiple times — all operations are idempotent.
 *
 * What it does:
 *   1. Users   — convert phone from Number → String
 *   2. Users   — initialise empty verifyOwner on users that don't have it
 *   3. Properties — migrate imageUrl (string) → imageUrls (array)
 *   4. Properties — add missing listingType and duration fields
 *   5. Bookings   — add missing status field defaulting to "pending"
 */

require('dotenv').config();
const mongoose = require('mongoose');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;

  // ── 1. Users: phone Number → String ──────────────────────────────────────
  console.log('\n📋 Migrating users.phone Number → String...');
  const users = await db.collection('users').find({}).toArray();
  let phoneFixed = 0;
  for (const user of users) {
    const updates = {};

    // Fix phone type
    if (typeof user.phone === 'number') {
      updates.phone = String(user.phone);
      phoneFixed++;
    }

    // Initialise verifyOwner if missing
    if (!user.verifyOwner) {
      updates.verifyOwner = {
        NIN: undefined,
        firstName: '',
        lastName: '',
        DoB: '',
        address: '',
        status: '',
        verifiedAt: ''
      };
    }

    if (Object.keys(updates).length > 0) {
      await db.collection('users').updateOne({ _id: user._id }, { $set: updates });
    }
  }
  console.log(`   ✅ ${phoneFixed} users had phone converted to String`);
  console.log(`   ✅ verifyOwner initialised on users that were missing it`);

  // ── 2. Properties: imageUrl → imageUrls array ─────────────────────────────
  console.log('\n🏠 Migrating properties.imageUrl → imageUrls array...');
  const properties = await db.collection('properties').find({}).toArray();
  let propFixed = 0;
  for (const prop of properties) {
    const updates = {};

    // If imageUrls array is missing or empty but imageUrl string exists, migrate it
    if ((!prop.imageUrls || prop.imageUrls.length === 0) && prop.imageUrl) {
      updates.imageUrls = [prop.imageUrl];
      propFixed++;
    } else if (!prop.imageUrls) {
      updates.imageUrls = [];
    }

    // Add missing fields
    if (prop.listingType === undefined) updates.listingType = '';
    if (prop.duration === undefined)    updates.duration = '';

    if (Object.keys(updates).length > 0) {
      await db.collection('properties').updateOne({ _id: prop._id }, { $set: updates });
    }
  }
  console.log(`   ✅ ${propFixed} properties had imageUrl migrated to imageUrls array`);
  console.log(`   ✅ listingType and duration initialised where missing`);

  // ── 3. Bookings: add missing status field ─────────────────────────────────
  console.log('\n📅 Migrating bookings — adding status field...');
  const bookingResult = await db.collection('bookings').updateMany(
    { status: { $exists: false } },
    { $set: { status: 'pending' } }
  );
  console.log(`   ✅ ${bookingResult.modifiedCount} bookings updated with status: "pending"`);

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\n🎉 Migration complete!\n');
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});