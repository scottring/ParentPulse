/**
 * Dump Kaleb's contributions with full field detail to understand
 * which drafts are lingering and why the kid-session isn't resuming.
 */
const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({credential: admin.credential.cert(serviceAccount)});
const db = admin.firestore();

const KALEB_PERSON_ID = 'rTlnx9t0YiGICl9uaRly';
const FAMILY_ID = '9BVjicrgjpe8jUGYN68j';

async function main() {
  const snap = await db.collection('contributions')
      .where('familyId', '==', FAMILY_ID)
      .where('personId', '==', KALEB_PERSON_ID)
      .get();

  console.log(`Found ${snap.size} contributions for Kaleb:\n`);

  const docs = [];
  snap.forEach((d) => docs.push({id: d.id, ...d.data()}));
  docs.sort((a, b) => {
    const at = a.updatedAt ? a.updatedAt.toMillis() : 0;
    const bt = b.updatedAt ? b.updatedAt.toMillis() : 0;
    return bt - at;
  });

  for (const c of docs) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`contributionId:        ${c.id}`);
    console.log(`  perspectiveType:     ${c.perspectiveType}`);
    console.log(`  status:              ${c.status}`);
    console.log(`  contributorName:     ${c.contributorName}`);
    console.log(`  contributorId:       ${c.contributorId}`);
    console.log(`  relationshipToSubject: ${c.relationshipToSubject || '(not set)'}`);
    console.log(`  topicCategory:       ${c.topicCategory || '(not set)'}`);
    console.log(`  manualId:            ${c.manualId}`);
    console.log(`  createdAt:           ${c.createdAt ? c.createdAt.toDate().toLocaleString() : '?'}`);
    console.log(`  updatedAt:           ${c.updatedAt ? c.updatedAt.toDate().toLocaleString() : '?'}`);
    if (c.draftProgress) {
      console.log(`  draftProgress:       section=${c.draftProgress.sectionIndex} question=${c.draftProgress.questionIndex}`);
    }
    if (c.answers) {
      const totalAnswers = Object.values(c.answers)
          .reduce((sum, sec) => sum + (typeof sec === 'object' && sec !== null ? Object.keys(sec).length : 0), 0);
      console.log(`  answers:             ${totalAnswers} total across ${Object.keys(c.answers).length} sections`);
      for (const [secId, secAnswers] of Object.entries(c.answers)) {
        if (typeof secAnswers === 'object' && secAnswers !== null) {
          console.log(`    ${secId}: ${Object.keys(secAnswers).length} answers`);
        }
      }
    }
    console.log('');
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
