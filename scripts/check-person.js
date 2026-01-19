const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkPerson() {
  console.log('\n=== CHECKING ALL PEOPLE AND THEIR MANUALS ===\n');

  try {
    // Get your family ID first
    const usersSnapshot = await db.collection('users').get();
    let familyId = null;

    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.role === 'parent') {
        familyId = userData.familyId;
        console.log('Family ID:', familyId);
        console.log('Parent:', userData.name, '(' + doc.id + ')');
        console.log('');
      }
    });

    if (!familyId) {
      console.log('No family found');
      return;
    }

    // Get all people in this family
    const peopleSnapshot = await db.collection('people')
      .where('familyId', '==', familyId)
      .get();

    if (peopleSnapshot.empty) {
      console.log('❌ No people found in the people collection for this family');
      console.log('');
      return;
    }

    console.log(`Found ${peopleSnapshot.size} person/people:\n`);

    // Check each person and their manuals
    for (const personDoc of peopleSnapshot.docs) {
      const personData = personDoc.data();
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('PERSON:', personData.name);
      console.log('  Person ID:', personDoc.id);
      console.log('  Relationship:', personData.relationshipType || 'N/A');
      console.log('  Created:', personData.createdAt?.toDate?.() || 'N/A');
      console.log('');

      // Check for person_manuals with this personId
      const manualsSnapshot = await db.collection('person_manuals')
        .where('personId', '==', personDoc.id)
        .get();

      if (manualsSnapshot.empty) {
        console.log('  ❌ NO MANUAL FOUND');
      } else {
        console.log(`  ✅ Found ${manualsSnapshot.size} manual(s):`);
        manualsSnapshot.forEach(manualDoc => {
          const manualData = manualDoc.data();
          console.log('');
          console.log('    Manual ID:', manualDoc.id);
          console.log('    Relationship Type:', manualData.relationshipType || 'N/A');
          console.log('    Triggers:', manualData.totalTriggers ?? 0);
          console.log('    Strategies:', manualData.totalStrategies ?? 0);
          console.log('    Boundaries:', manualData.totalBoundaries ?? 0);
          console.log('    Patterns:', manualData.totalPatterns ?? 0);
          console.log('    Last Updated:', manualData.updatedAt?.toDate?.() || 'N/A');
        });
      }
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

checkPerson().catch(console.error);
