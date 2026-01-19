const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function listPeople() {
  const familyId = 'AEOtxkLIp8f2G2dFdAbW';

  try {
    console.log('Checking for people in familyId:', familyId);
    console.log('---');

    const peopleSnapshot = await db.collection('people')
      .where('familyId', '==', familyId)
      .get();

    console.log(`Found ${peopleSnapshot.size} person/people in your family:`);
    console.log('');

    if (peopleSnapshot.empty) {
      console.log('NO PEOPLE FOUND!');
      console.log('You need to create a person first before creating their manual.');
      console.log('Go to /people and create a person.');
    } else {
      peopleSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`Person ID: ${doc.id}`);
        console.log(`  Name: ${data.name}`);
        console.log(`  Relationship: ${data.relationshipType}`);
        console.log(`  URL: http://localhost:3000/people/${doc.id}/manual`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

listPeople();
