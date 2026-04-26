/**
 * migrate.js — Run once after deploying updated models
 *   node migrate.js
 * Idempotent — safe to run multiple times.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');
  const db = mongoose.connection.db;

  // ── Users ─────────────────────────────────────────────────────────────────
  console.log('👤 Migrating users...');
  const users = await db.collection('users').find({}).toArray();
  let phoneFixed = 0, roleFixed = 0, verifyOwnerAdded = 0;
  for (const user of users) {
    const updates = {};
    if (typeof user.phone === 'number')  { updates.phone = String(user.phone); phoneFixed++; }
    if (user.role === 'tenant')   { updates.role = 'user';  roleFixed++; }
    if (user.role === 'landlord') { updates.role = 'owner'; roleFixed++; }
    if (!user.verifyOwner) {
      updates.verifyOwner = { firstName:'', lastName:'', DoB:'', address:'', status:'', verifiedAt:'' };
      verifyOwnerAdded++;
    }
    if (Object.keys(updates).length > 0)
      await db.collection('users').updateOne({ _id: user._id }, { $set: updates });
  }
  console.log(`   ✅ ${phoneFixed} phones → String`);
  console.log(`   ✅ ${roleFixed} roles renamed (tenant→user, landlord→owner)`);
  console.log(`   ✅ ${verifyOwnerAdded} users got verifyOwner`);

  // ── Properties ────────────────────────────────────────────────────────────
  console.log('\n🏠 Migrating properties...');
  const props = await db.collection('properties').find({}).toArray();
  let imageFixed = 0;
  for (const prop of props) {
    const updates = {};
    if ((!prop.imageUrls || prop.imageUrls.length === 0) && prop.imageUrl) { updates.imageUrls = [prop.imageUrl]; imageFixed++; }
    else if (!prop.imageUrls) { updates.imageUrls = []; }
    if (prop.listingType === undefined) updates.listingType = '';
    if (prop.duration    === undefined) updates.duration    = '';
    if (Object.keys(updates).length > 0)
      await db.collection('properties').updateOne({ _id: prop._id }, { $set: updates });
  }
  console.log(`   ✅ ${imageFixed} imageUrl → imageUrls array`);

  // ── Bookings ──────────────────────────────────────────────────────────────
  console.log('\n📅 Migrating bookings...');
  const r = await db.collection('bookings').updateMany({ status: { $exists: false } }, { $set: { status: 'pending' } });
  console.log(`   ✅ ${r.modifiedCount} bookings got status: "pending"`);

  console.log('\n🎉 Done!\n');
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(err => { console.error('❌', err); process.exit(1); });