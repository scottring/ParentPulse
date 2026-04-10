const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
  const snap = await db.collection('growth_items').get();
  const matches = snap.docs.filter((d) => {
    const t = (d.data().title || '').toLowerCase();
    return t.includes('kaleb') && (t.includes('valued') || t.includes('being valued'));
  });

  console.log(`Found ${matches.length} matching item(s)\n`);

  for (const docSnap of matches) {
    const d = docSnap.data();
    console.log(`─── growth_items/${docSnap.id} ──────────────`);
    console.log(`  title:              ${d.title}`);
    console.log(`  type:               ${d.type}`);
    console.log(`  status:             ${d.status}`);
    console.log(`  assignedToUserId:   ${d.assignedToUserId}`);
    console.log(`  assignedToUserName: ${d.assignedToUserName}`);
    console.log(`  familyId:           ${d.familyId}`);
    console.log(`  targetPersonNames:  ${JSON.stringify(d.targetPersonNames)}`);
    console.log(`  createdAt:          ${d.createdAt?.toDate?.()?.toISOString() || 'n/a'}`);
    console.log(`  statusUpdatedAt:    ${d.statusUpdatedAt?.toDate?.()?.toISOString() || 'n/a'}`);
    console.log();
    console.log(`  feedback (legacy):`);
    if (d.feedback) {
      console.log(`    reaction:     ${d.feedback.reaction}`);
      console.log(`    impactRating: ${d.feedback.impactRating || '(none)'}`);
      console.log(`    note:         ${JSON.stringify(d.feedback.note || '(none)')}`);
      console.log(`    respondedAt:  ${d.feedback.respondedAt?.toDate?.()?.toISOString() || 'n/a'}`);
    } else {
      console.log(`    (none)`);
    }
    console.log();
    console.log(`  feedbackByUser (per-user):`);
    if (d.feedbackByUser && Object.keys(d.feedbackByUser).length > 0) {
      for (const [uid, fb] of Object.entries(d.feedbackByUser)) {
        console.log(`    userId=${uid}:`);
        console.log(`      reaction:     ${fb.reaction}`);
        console.log(`      impactRating: ${fb.impactRating || '(none)'}`);
        console.log(`      note:         ${JSON.stringify(fb.note || '(none)')}`);
        console.log(`      respondedAt:  ${fb.respondedAt?.toDate?.()?.toISOString() || 'n/a'}`);
      }
    } else {
      console.log(`    (none)`);
    }
    console.log();
  }

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
