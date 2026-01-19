const admin = require('firebase-admin');
const readline = require('readline');
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

async function resetManualForPerson() {
  console.log('\n=== RESET PERSON MANUAL ===\n');

  try {
    // Get person name from command line or prompt
    const personName = process.argv[2];

    if (!personName) {
      console.error('Usage: node scripts/reset-manual-for-person.js <person-name>');
      console.error('Example: node scripts/reset-manual-for-person.js Kaleb');
      rl.close();
      process.exit(1);
      return;
    }

    console.log(`Searching for person: ${personName}\n`);

    // Find the person
    const peopleSnapshot = await db.collection('people')
      .where('name', '==', personName)
      .get();

    if (peopleSnapshot.empty) {
      console.error(`❌ No person found with name: ${personName}`);
      rl.close();
      process.exit(1);
      return;
    }

    const personDoc = peopleSnapshot.docs[0];
    const personData = personDoc.data();

    console.log('✅ Found person:');
    console.log('  Name:', personData.name);
    console.log('  ID:', personDoc.id);
    console.log('  Relationship:', personData.relationshipType || 'N/A');
    console.log('');

    // Find their manual
    const manualsSnapshot = await db.collection('person_manuals')
      .where('personId', '==', personDoc.id)
      .get();

    if (manualsSnapshot.empty) {
      console.log('❌ No manual found for this person');
      rl.close();
      process.exit(1);
      return;
    }

    const manualDoc = manualsSnapshot.docs[0];
    const manualData = manualDoc.data();

    console.log('✅ Found manual:');
    console.log('  Manual ID:', manualDoc.id);
    console.log('  Current Content:');
    console.log('    Triggers:', manualData.totalTriggers || 0);
    console.log('    Strategies:', manualData.totalStrategies || 0);
    console.log('    Boundaries:', manualData.totalBoundaries || 0);
    console.log('    Patterns:', manualData.emergingPatterns?.length || 0);
    console.log('');

    const answer = await question(`⚠️  Reset this manual to empty state? This will clear all content! (yes/no): `);

    if (answer.toLowerCase() !== 'yes') {
      console.log('\nOperation cancelled. No changes made.');
      rl.close();
      process.exit(0);
      return;
    }

    console.log('\nResetting manual...\n');

    // Reset the manual to empty state
    await db.collection('person_manuals').doc(manualDoc.id).update({
      // Core information
      coreInfo: {},

      // Content arrays (empty)
      triggers: [],
      whatWorks: [],
      whatDoesntWork: [],
      boundaries: [],
      emergingPatterns: [],
      progressNotes: [],

      // Statistics
      totalTriggers: 0,
      totalStrategies: 0,
      totalBoundaries: 0,

      // Update metadata
      updatedAt: admin.firestore.Timestamp.now(),
      lastEditedAt: admin.firestore.Timestamp.now(),
      version: 1
    });

    console.log('✅ Manual reset successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Go to: http://localhost:3000/people/' + personDoc.id + '/manual/onboard');
    console.log('  2. Complete the onboarding questionnaire');
    console.log('  3. Your answers will now be saved to the manual!');
    console.log('');

  } catch (error) {
    console.error('Error:', error);
  }

  rl.close();
  process.exit(0);
}

resetManualForPerson().catch(console.error);
