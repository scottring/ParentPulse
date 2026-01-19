const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkManuals() {
  const people = [
    { id: 'Ct3bKZTaufo2WA4Cr90J', name: 'Scott Kaufman' },
    { id: 'dXwAdhYqJsUFZsjF2kPW', name: 'Kaleb' }
  ];

  for (const person of people) {
    console.log(`\n=== ${person.name} (${person.id}) ===`);

    // Check for manual
    const manualsSnapshot = await db.collection('person_manuals')
      .where('personId', '==', person.id)
      .get();

    if (manualsSnapshot.empty) {
      console.log('  ❌ No manual found');
      console.log(`  → Create manual: http://localhost:3000/people/${person.id}/create-manual`);
    } else {
      manualsSnapshot.forEach(doc => {
        const manual = doc.data();
        console.log(`  ✓ Manual found: ${doc.id}`);
        console.log(`    Relationship: ${manual.relationshipType}`);
        console.log(`    Created: ${manual.createdAt.toDate()}`);
        console.log(`  → View manual: http://localhost:3000/people/${person.id}/manual`);
        console.log(`  → Onboarding: http://localhost:3000/people/${person.id}/manual/onboard`);
      });
    }
  }

  process.exit(0);
}

checkManuals();
