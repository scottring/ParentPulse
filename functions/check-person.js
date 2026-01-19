const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkPerson() {
  const personId = 'dXwrlaHfyjJsUFZJjJl4';
  const userId = 'KmZ3wn73MgZ2vnsNbat9MBR0oLB2';
  const familyId = 'AEOtxkLIp8f2G2dFdAbW';

  try {
    console.log('Expected familyId:', familyId);
    console.log('---');

    // Check person document
    const personDoc = await db.collection('people').doc(personId).get();
    if (personDoc.exists) {
      console.log('Person document:');
      console.log(JSON.stringify(personDoc.data(), null, 2));
      console.log('---');
    } else {
      console.log('Person document NOT FOUND:', personId);
      console.log('---');
    }

    // Check for person manuals
    const manualsSnapshot = await db.collection('person_manuals')
      .where('personId', '==', personId)
      .get();

    console.log(`Found ${manualsSnapshot.size} manual(s) for this person`);
    manualsSnapshot.forEach(doc => {
      console.log('Manual:', JSON.stringify(doc.data(), null, 2));
    });
    console.log('---');

    // Check for role sections
    const roleSectionsSnapshot = await db.collection('role_sections')
      .where('personId', '==', personId)
      .get();

    console.log(`Found ${roleSectionsSnapshot.size} role section(s) for this person`);
    roleSectionsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Role Section ID: ${doc.id}`);
      console.log(`  familyId: ${data.familyId}`);
      console.log(`  manualId: ${data.manualId}`);
      console.log(`  relationshipType: ${data.relationshipType}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

checkPerson();
