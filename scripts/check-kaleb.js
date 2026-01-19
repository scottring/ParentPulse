const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkKaleb() {
  const childrenSnapshot = await db.collection('children').get();

  console.log('\n=== ALL CHILDREN ===');
  childrenSnapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log('\nChild ID:', doc.id);
    console.log('Name:', data.name);
    console.log('Age:', data.age || 'N/A');
    console.log('Manual ID:', data.manualId || 'NO MANUAL');
  });

  process.exit(0);
}

checkKaleb().catch(console.error);
