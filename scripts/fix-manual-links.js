/**
 * Fix Manual Links Script
 *
 * Finds people who have manuals but their Person document doesn't have hasManual: true
 * Updates the Person documents to link to their manuals
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function findUnlinkedManuals() {
  console.log('\n🔍 Searching for people with manuals but missing hasManual flag...\n');

  try {
    // Get all people
    const peopleSnapshot = await db.collection('people').get();
    const people = {};

    peopleSnapshot.forEach(doc => {
      people[doc.id] = {
        id: doc.id,
        ...doc.data()
      };
    });

    console.log(`Found ${peopleSnapshot.size} people total\n`);

    // Get all manuals
    const manualsSnapshot = await db.collection('person_manuals').get();
    const manuals = {};

    manualsSnapshot.forEach(doc => {
      const data = doc.data();
      manuals[data.personId] = {
        manualId: doc.id,
        ...data
      };
    });

    console.log(`Found ${manualsSnapshot.size} manuals total\n`);

    // Find people with manuals but hasManual !== true
    const unlinked = [];

    for (const [personId, person] of Object.entries(people)) {
      const manual = manuals[personId];

      if (manual && person.hasManual !== true) {
        unlinked.push({
          personId,
          person,
          manual
        });
      }
    }

    return unlinked;
  } catch (error) {
    console.error('❌ Error finding unlinked manuals:', error);
    throw error;
  }
}

async function fixManualLinks(unlinked) {
  console.log(`\n✅ Found ${unlinked.length} people needing manual link fixes:\n`);

  for (const { person, manual } of unlinked) {
    console.log(`- ${person.name}`);
    console.log(`  Person ID: ${person.id}`);
    console.log(`  Manual ID: ${manual.manualId}`);
    console.log(`  Current hasManual: ${person.hasManual}`);
    console.log(`  Manual has ${manual.totalTriggers || 0} triggers, ${manual.totalStrategies || 0} strategies, ${manual.totalBoundaries || 0} boundaries\n`);
  }

  const answer = await question('Fix all of these? (yes/no): ');

  if (answer.toLowerCase() !== 'yes') {
    console.log('\n❌ Cancelled');
    return;
  }

  console.log('\n🔧 Fixing manual links...\n');

  for (const { person, manual } of unlinked) {
    try {
      await db.collection('people').doc(person.id).update({
        hasManual: true,
        manualId: manual.manualId
      });

      console.log(`✅ Fixed ${person.name} (${person.id})`);
    } catch (error) {
      console.error(`❌ Failed to fix ${person.name}:`, error.message);
    }
  }

  console.log('\n✅ Done!');
}

async function main() {
  try {
    const unlinked = await findUnlinkedManuals();

    if (unlinked.length === 0) {
      console.log('✅ All people with manuals are properly linked!');
      rl.close();
      process.exit(0);
    }

    await fixManualLinks(unlinked);
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    rl.close();
    process.exit(1);
  }
}

main();
