/**
 * One-time admin script: Grant TEAM plan to a specific user by email.
 * Run with: node backend/scripts/grantTeamPlan.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const EMAIL = 'ojharamakant48@gmail.com';
const PLAN  = 'TEAM';

async function run() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌  MONGO_URI not found in .env');
    process.exit(1);
  }

  console.log('🔗  Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅  Connected');

  const db = mongoose.connection.db;

  // ── 1. Update User document ───────────────────────────────────────────────
  const userResult = await db.collection('users').findOneAndUpdate(
    { email: EMAIL },
    { $set: { subscriptionPlan: PLAN } },
    { returnDocument: 'after' }
  );

  if (!userResult) {
    console.error(`❌  No user found with email: ${EMAIL}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const userId = userResult._id;
  console.log(`✅  User updated → subscriptionPlan: ${PLAN}  (userId: ${userId})`);

  // ── 2. Upsert Subscription document ──────────────────────────────────────
  await db.collection('subscriptions').updateOne(
    { userId: userId },
    {
      $set: {
        userId,
        plan:   PLAN,
        status: 'active',
        updatedAt: new Date()
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );
  console.log(`✅  Subscription upserted → plan: ${PLAN}, status: active`);

  console.log(`\n🎉  ${EMAIL} now has full TEAM plan access (all AI features unlocked).`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal error:', err);
  mongoose.disconnect();
  process.exit(1);
});
