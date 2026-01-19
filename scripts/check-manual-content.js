const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkManualContent() {
  const manualId = process.argv[2] || 'AEKdJ6SVXs4W'; // Kaleb's manual from screenshot

  console.log('\n=== CHECKING MANUAL CONTENT ===');
  console.log('Manual ID:', manualId);
  console.log('');

  try {
    // Check person_manuals collection
    const manualDoc = await db.collection('person_manuals').doc(manualId).get();

    if (!manualDoc.exists) {
      console.log('❌ Manual document not found in person_manuals collection');

      // Check if it might be in a different collection
      console.log('\nSearching other collections...\n');

      const collections = ['manuals', 'child_manuals', 'relationship_manuals'];
      for (const collectionName of collections) {
        const doc = await db.collection(collectionName).doc(manualId).get();
        if (doc.exists) {
          console.log(`✅ Found in ${collectionName} collection`);
          console.log(JSON.stringify(doc.data(), null, 2));
          return;
        }
      }

      console.log('❌ Manual not found in any collection');
      return;
    }

    const data = manualDoc.data();

    console.log('✅ Manual found!');
    console.log('');
    console.log('BASIC INFO:');
    console.log('  Person Name:', data.personName || 'N/A');
    console.log('  Person ID:', data.personId || 'N/A');
    console.log('  Relationship Type:', data.relationshipType || 'N/A');
    console.log('  Created:', data.createdAt?.toDate?.() || 'N/A');
    console.log('  Last Updated:', data.updatedAt?.toDate?.() || 'N/A');
    console.log('');

    console.log('CONTENT COUNTS:');
    console.log('  Total Triggers:', data.totalTriggers ?? 0);
    console.log('  Total Strategies:', data.totalStrategies ?? 0);
    console.log('  Total Boundaries:', data.totalBoundaries ?? 0);
    console.log('  Total Patterns:', data.totalPatterns ?? 0);
    console.log('');

    console.log('CONTENT ARRAYS:');
    console.log('  triggers:', data.triggers?.length ?? 0, 'items');
    console.log('  whatWorks:', data.whatWorks?.length ?? 0, 'items');
    console.log('  whatDoesntWork:', data.whatDoesntWork?.length ?? 0, 'items');
    console.log('  boundaries:', data.boundaries?.length ?? 0, 'items');
    console.log('  patterns:', data.patterns?.length ?? 0, 'items');
    console.log('  progressNotes:', data.progressNotes?.length ?? 0, 'items');
    console.log('');

    if (data.coreInfo) {
      console.log('CORE INFO:');
      console.log('  sensoryNeeds:', data.coreInfo.sensoryNeeds || 'empty');
      console.log('  interests:', data.coreInfo.interests || 'empty');
      console.log('  strengths:', data.coreInfo.strengths || 'empty');
      console.log('  notes:', data.coreInfo.notes || 'empty');
      console.log('');
    }

    // Show actual content if it exists
    if (data.triggers && data.triggers.length > 0) {
      console.log('TRIGGERS CONTENT:');
      data.triggers.forEach((trigger, i) => {
        console.log(`  ${i + 1}. ${trigger.name}`);
        console.log(`     Description: ${trigger.description || 'N/A'}`);
      });
      console.log('');
    }

    if (data.whatWorks && data.whatWorks.length > 0) {
      console.log('WHAT WORKS CONTENT:');
      data.whatWorks.forEach((strategy, i) => {
        console.log(`  ${i + 1}. ${strategy.name}`);
        console.log(`     Description: ${strategy.description || 'N/A'}`);
      });
      console.log('');
    }

    console.log('FULL DOCUMENT DATA:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('Error checking manual:', error);
  }

  process.exit(0);
}

checkManualContent().catch(console.error);
