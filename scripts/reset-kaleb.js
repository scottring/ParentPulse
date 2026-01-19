const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function resetKaleb() {
  const childrenSnapshot = await db.collection('children')
    .where('name', '==', 'Kaleb')
    .get();

  if (childrenSnapshot.empty) {
    console.log('No child named Kaleb found');
    process.exit(0);
  }

  const kalebDoc = childrenSnapshot.docs[0];
  const kalebData = kalebDoc.data();

  console.log('Found Kaleb:', kalebDoc.id);
  console.log('Current manualId:', kalebData.manualId || 'none');

  // Delete the manual if it exists
  if (kalebData.manualId) {
    console.log('Deleting manual:', kalebData.manualId);
    await db.collection('child_manuals').doc(kalebData.manualId).delete();
  }

  // Remove manualId from child
  console.log('Removing manualId from Kaleb...');
  await db.collection('children').doc(kalebDoc.id).update({
    manualId: admin.firestore.FieldValue.delete()
  });

  console.log('✅ Kaleb reset! Ready for onboarding.');

  process.exit(0);
}

resetKaleb().catch(console.error);
