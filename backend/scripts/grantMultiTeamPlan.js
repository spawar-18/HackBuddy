require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const EMAILS = ['aryasankhe1@student.sfit.ac.in'];
const PLAN = 'TEAM';

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;

  // Drop the stale user_1 index (blocks inserts with user: null)
  try {
    await db.collection('subscriptions').dropIndex('user_1');
    console.log('✅ Dropped stale user_1 index\n');
  } catch (e) {
    if (e.codeName === 'IndexNotFound') {
      console.log('ℹ️  user_1 index not present (already dropped)\n');
    } else {
      console.warn('⚠️  Could not drop index:', e.message);
    }
  }

  for (const email of EMAILS) {
    console.log('── Processing:', email);

    // Update User document
    const user = await db.collection('users').findOneAndUpdate(
      { email },
      { $set: { subscriptionPlan: PLAN } },
      { returnDocument: 'after' }
    );

    if (!user) {
      console.warn('  ⚠️  User not found:', email);
      continue;
    }

    const userId = user._id;
    console.log(`  ✅ User.subscriptionPlan → ${PLAN}  (userId: ${userId})`);

    // Upsert Subscription document
    const existing = await db.collection('subscriptions').findOne({ userId });
    if (existing) {
      await db.collection('subscriptions').updateOne(
        { _id: existing._id },
        { $set: { plan: PLAN, status: 'active', updatedAt: new Date() } }
      );
      console.log(`  ✅ Subscription updated  → plan: ${PLAN}, status: active\n`);
    } else {
      await db.collection('subscriptions').insertOne({
        userId,
        plan:      PLAN,
        status:    'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`  ✅ Subscription created  → plan: ${PLAN}, status: active\n`);
    }
  }

  console.log(`🎉  Done! All ${EMAILS.length} accounts now have full TEAM plan access.`);
  await mongoose.disconnect();
  process.exit(0);
}).catch(err => {
  console.error('❌  Fatal:', err.message);
  process.exit(1);
});
