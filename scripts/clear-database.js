#!/usr/bin/env node

/**
 * Clear Firestore Database Script
 *
 * Clears all data from the Firestore database for a fresh start.
 * Use with caution - this will delete all data!
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Collections to clear
const COLLECTIONS = [
  'people',
  'person_manuals',
  'role_sections',
  'weekly_workbooks',
  'workbook_observations',
  'daily_actions',
  'journal_entries',
  'knowledge_base',
  'strategic_plans'
];

async function deleteCollection(collectionPath, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve, reject);
  });
}

async function deleteQueryBatch(query, resolve, reject) {
  query.get()
    .then((snapshot) => {
      // When there are no documents left, we are done
      if (snapshot.size === 0) {
        return 0;
      }

      // Delete documents in a batch
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      return batch.commit().then(() => {
        return snapshot.size;
      });
    })
    .then((numDeleted) => {
      if (numDeleted === 0) {
        resolve();
        return;
      }

      // Recurse on the next process tick, to avoid exploding the stack
      process.nextTick(() => {
        deleteQueryBatch(query, resolve, reject);
      });
    })
    .catch(reject);
}

async function confirmClear() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('⚠️  WARNING: This will DELETE ALL DATA from Firestore!\nType "yes" to confirm: ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function clearDatabase() {
  console.log('🔥 Firestore Database Cleanup Script\n');

  const confirmed = await confirmClear();

  if (!confirmed) {
    console.log('❌ Cleanup cancelled.');
    process.exit(0);
  }

  console.log('\n🗑️  Starting database cleanup...\n');

  for (const collection of COLLECTIONS) {
    try {
      console.log(`Clearing collection: ${collection}...`);
      await deleteCollection(collection);
      console.log(`✅ Cleared: ${collection}`);
    } catch (error) {
      console.error(`❌ Error clearing ${collection}:`, error.message);
    }
  }

  console.log('\n✅ Database cleanup complete!\n');
  process.exit(0);
}

clearDatabase();
