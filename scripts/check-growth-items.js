const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const itemIds = ['sVq8EVrjHDjVfU9aG64o', 'a96VctROw9DkuGG9kD77'];

async function main() {
  // Get both parent users for reference
  const usersSnap = await db.collection('users').where('role', '==', 'parent').get();
  const parents = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log('Parents in the system:');
  parents.forEach(p => console.log(`  ${p.name}: userId=${p.id}, familyId=${p.familyId}`));
  console.log();

  const scott = parents.find(p => p.name === 'Scott Kaufman');
  if (scott) {
    const scottDoc = await db.collection('users').doc(scott.id).get();
    console.log('Scott user doc full contents:');
    console.log(JSON.stringify(scottDoc.data(), null, 2));
    console.log();
  }

  for (const id of itemIds) {
    const snap = await db.collection('growth_items').doc(id).get();
    console.log(`--- growth_items/${id} ---`);
    if (!snap.exists) {
      console.log('  DOES NOT EXIST');
      continue;
    }
    const d = snap.data();
    console.log(`  familyId:           ${d.familyId ?? '(MISSING)'}`);
    console.log(`  assignedToUserId:   ${d.assignedToUserId ?? '(none)'}`);
    console.log(`  assignedToUserName: ${d.assignedToUserName ?? '(none)'}`);
    console.log(`  title:              ${d.title ?? '(none)'}`);
    console.log(`  status:             ${d.status ?? '(none)'}`);
    console.log(`  targetPersonNames:  ${JSON.stringify(d.targetPersonNames ?? [])}`);
    console.log(`  all keys:           ${Object.keys(d).join(', ')}`);
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
