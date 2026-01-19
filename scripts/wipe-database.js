/**
 * Wipe Database Script
 *
 * DANGER: This will delete ALL data from Firestore collections
 * Use only in development/testing
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteCollection(collectionPath, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query, resolve) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}

async function wipeDatabase() {
  console.log('🔥 Starting database wipe...\n');

  const collections = [
    'people',
    'person_manuals',
    'role_sections',
    'users',
    'families',
    'relationship_manuals',
    'chip_economy',
    'journal_entries',
    'knowledge_base',
    'daily_actions',
    'strategic_plans',
    'family_manuals'
  ];

  for (const collectionName of collections) {
    try {
      console.log(`Deleting collection: ${collectionName}...`);
      await deleteCollection(collectionName);
      console.log(`✅ Deleted ${collectionName}`);
    } catch (error) {
      console.error(`❌ Error deleting ${collectionName}:`, error);
    }
  }

  console.log('\n✨ Database wipe complete!');
  process.exit(0);
}

// Run the wipe
wipeDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
