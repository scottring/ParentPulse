const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({credential: admin.credential.cert(serviceAccount)});
const db = admin.firestore();

(async () => {
  const ref = db.collection('people').doc('rTlnx9t0YiGICl9uaRly');
  const snap = await ref.get();
  if (!snap.exists) {
    console.log('Not found');
    return;
  }
  const d = snap.data();
  console.log(JSON.stringify({
    personId: snap.id,
    name: d.name,
    relationshipType: d.relationshipType,
    dateOfBirth: d.dateOfBirth ? d.dateOfBirth.toDate().toISOString() : null,
    age: d.age,
    canSelfContribute: d.canSelfContribute,
    linkedUserId: d.linkedUserId,
  }, null, 2));
  process.exit(0);
})();
