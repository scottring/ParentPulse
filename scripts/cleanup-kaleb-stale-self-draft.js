/**
 * Delete the stale Kaleb "self" draft that was created by someone
 * navigating to /self-onboard on a child's manual (wrong route).
 * It has perspectiveType='self' and relationshipToSubject='self', but
 * children cannot self-onboard via that route — their route is
 * /kid-session which writes drafts with relationshipToSubject='child-session'.
 *
 * Leaving this draft in place confuses findDraft lookups and is junk data.
 */
const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({credential: admin.credential.cert(serviceAccount)});
const db = admin.firestore();

const STALE_DRAFT_ID = 'UnOFCbRJ3nmLhIOmxFN5';

async function main() {
  const ref = db.collection('contributions').doc(STALE_DRAFT_ID);
  const snap = await ref.get();
  if (!snap.exists) {
    console.log('Draft not found — already cleaned up.');
    return;
  }

  const data = snap.data();
  console.log('Found stale draft:');
  console.log(`  contributionId:        ${STALE_DRAFT_ID}`);
  console.log(`  perspectiveType:       ${data.perspectiveType}`);
  console.log(`  status:                ${data.status}`);
  console.log(`  relationshipToSubject: ${data.relationshipToSubject}`);
  console.log(`  personId:              ${data.personId}`);
  console.log(`  manualId:              ${data.manualId}`);
  console.log(`  contributorName:       ${data.contributorName}`);
  console.log(`  updatedAt:             ${data.updatedAt.toDate().toLocaleString()}`);

  // Safety checks before deleting
  if (data.status !== 'draft') {
    console.error('ABORT: document is not a draft — refusing to delete.');
    process.exit(1);
  }
  if (data.personId !== 'rTlnx9t0YiGICl9uaRly') {
    console.error('ABORT: document is not for Kaleb — refusing to delete.');
    process.exit(1);
  }
  if (data.perspectiveType !== 'self' || data.relationshipToSubject !== 'self') {
    console.error('ABORT: document is not a self/self draft — refusing to delete.');
    process.exit(1);
  }

  await ref.delete();
  console.log('\n✓ Deleted.');
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
