/**
 * One-off data fix: reassign the "What does Kaleb need to hear
 * about being valued?" growth item from Scott to Iris.
 *
 * Why: the item was originally hardcoded in the seed script
 * scripts/create-kaleb-sibling-activities.js under the "FOR SCOTT"
 * block, but the source conversation (manual_chat_sessions/
 * o9AelJSLjh4YwwP9WwAn) was authored by Iris. The practice is a
 * reflection on her insight and should be assigned to her.
 *
 * The cloud function `generateActivitiesFromChatContext` has been
 * fixed at the code level so future chat-derived practices will
 * default to the chat author. This script only fixes the one
 * legacy row.
 */

const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
  const usersSnap = await db.collection('users')
    .where('role', '==', 'parent')
    .get();
  const iris = usersSnap.docs
    .map((d) => ({ userId: d.id, ...d.data() }))
    .find((u) => (u.name || '').toLowerCase().includes('iris'));
  if (!iris) throw new Error('Iris not found among parents');

  console.log(`Iris: ${iris.name} (${iris.userId})`);

  const growthSnap = await db.collection('growth_items').get();
  const matches = growthSnap.docs.filter((d) => {
    const t = (d.data().title || '').toLowerCase();
    return t.includes('kaleb') && t.includes('valued');
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
