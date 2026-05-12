/**
 * QA: inspect a check-in journal entry.
 *
 * Usage:  node functions/check-checkin-entry.js <entryId>
 * Default entryId is the one Scott reported (k0Siey713GmFTG9wHZhA).
 *
 * Prints the entry's persisted fields with a focus on:
 *   - text (the body — likely the bland fallback)
 *   - checkIn.{selfFeelings, bodySpots, relTargets} (the real data)
 *   - tags (feel-self:*, feel-rel:*, body:* encoded as strings)
 *   - subjectType / subjectPersonId / sharedWithUserIds
 *
 * Also lists the 5 most-recent child_proxy entries from the same
 * subjectPersonId so we can tell whether multiple check-ins were
 * saved last night or only one.
 */

const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const TARGET_ID = process.argv[2] || 'k0Siey713GmFTG9wHZhA';

function fmtTimestamp(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
  return String(ts);
}

async function inspectEntry() {
  console.log(`\n━━━ journal_entries/${TARGET_ID} ━━━\n`);

  const ref = db.collection('journal_entries').doc(TARGET_ID);
  const snap = await ref.get();

  if (!snap.exists) {
    console.log('❌ Entry does not exist.');
    process.exit(1);
  }

  const data = snap.data();

  console.log('text:');
  console.log('  ', JSON.stringify(data.text));
  console.log('');

  console.log('category:', data.category);
  console.log('subjectType:', data.subjectType);
  console.log('subjectPersonId:', data.subjectPersonId);
  console.log('createdAt:', fmtTimestamp(data.createdAt));
  console.log('updatedAt:', fmtTimestamp(data.updatedAt));
  console.log('createdByUserId:', data.createdByUserId);
  console.log('familyId:', data.familyId);
  console.log('');

  console.log('tags:');
  if (Array.isArray(data.tags) && data.tags.length) {
    for (const t of data.tags) console.log('  -', t);
  } else {
    console.log('  (none)');
  }
  console.log('');

  console.log('personMentions:', data.personMentions || '(none)');
  console.log('sharedWithUserIds:', data.sharedWithUserIds || '(none)');
  console.log('visibleToUserIds:', data.visibleToUserIds || '(none)');
  console.log('');

  console.log('checkIn (the structured feeling data):');
  if (data.checkIn) {
    console.log(JSON.stringify(data.checkIn, null, 2));
  } else {
    console.log('  ❌ NOT PRESENT — data was not saved to this entry.');
  }
  console.log('');

  console.log('enrichment (server-side AI synthesis, if any):');
  if (data.enrichment) {
    console.log(JSON.stringify(data.enrichment, null, 2));
  } else {
    console.log('  (none)');
  }
  console.log('');

  // If we know the subject person, list recent siblings of this entry
  // so we can tell whether other check-ins exist from the same person.
  if (data.subjectPersonId) {
    console.log(
      `\n━━━ 5 most-recent child_proxy entries for subjectPersonId=${data.subjectPersonId} ━━━\n`,
    );
    // No composite index needed: filter only on subjectPersonId,
    // sort client-side.
    const siblings = await db
      .collection('journal_entries')
      .where('subjectPersonId', '==', data.subjectPersonId)
      .limit(50)
      .get();

    if (siblings.empty) {
      console.log('  (no other entries found for this subjectPersonId)');
    } else {
      const sorted = siblings.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        })
        .slice(0, 8);
      for (const d of sorted) {
        const hasCheckIn = d.checkIn ? '✓' : '✗';
        const feelsSelf =
          d.checkIn && Array.isArray(d.checkIn.selfFeelings)
            ? d.checkIn.selfFeelings.join(',')
            : '';
        console.log(
          `  ${fmtTimestamp(d.createdAt)}  ${d.id}  subjectType=${d.subjectType || '?'}  checkIn=${hasCheckIn}  selfFeelings=[${feelsSelf}]`,
        );
        console.log(`      text: ${JSON.stringify(d.text)}`);
      }
    }
  }

  process.exit(0);
}

inspectEntry().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
