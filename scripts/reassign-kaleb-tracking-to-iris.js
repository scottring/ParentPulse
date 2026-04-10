/**
 * One-off: reassign the "Track when Kaleb says 'you love Ella more'"
 * growth item from Scott to Iris. Originally seeded by
 * scripts/create-kaleb-sibling-activities.js with the wrong owner.
 */

const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function main() {
  // Find Iris (parent in the family)
  const usersSnap = await db.collection('users')
    .where('role', '==', 'parent')
    .get();
  const iris = usersSnap.docs
    .map((d) => ({ userId: d.id, ...d.data() }))
    .find((u) => (u.name || '').toLowerCase().includes('iris'));
  if (!iris) throw new Error('Iris not found among parents');

  console.log(`Iris: ${iris.name} (${iris.userId})`);

  // Find the growth item by title prefix.
  const growthSnap = await db.collection('growth_items').get();
  const matches = growthSnap.docs.filter((d) => {
    const t = (d.data().title || '').toLowerCase();
    return t.includes('track when') && t.includes('love ella');
  });

  if (matches.length === 0) {
    console.log('No matching growth_item found. Nothing to do.');
    process.exit(0);
  }

  for (const docSnap of matches) {
    const data = docSnap.data();
    console.log(`\nFound: ${data.title}`);
    console.log(`  current assignedToUserName: ${data.assignedToUserName}`);
    console.log(`  current assignedToUserId:   ${data.assignedToUserId}`);

    if (data.assignedToUserId === iris.userId) {
      console.log(`  ✓ already assigned to Iris — skipping`);
      continue;
    }

    await docSnap.ref.update({
      assignedToUserId: iris.userId,
      assignedToUserName: iris.name,
    });
    console.log(`  ✓ reassigned to Iris`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
