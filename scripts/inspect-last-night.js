const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

(async () => {
  const usersSnap = await db.collection('users').get();
  const userById = {};
  usersSnap.forEach((d) => { userById[d.id] = d.data(); });

  const peopleSnap = await db.collection('people').get();
  const personById = {};
  peopleSnap.forEach((d) => { personById[d.id] = d.data(); });

  const since = new Date(Date.now() - 24 * 3600 * 1000);

  const snap = await db.collection('journal_entries')
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(since))
    .orderBy('createdAt', 'desc')
    .get();

  console.log(`\nFull dump of ${snap.size} entries in the last 24h:\n`);
  snap.forEach((doc) => {
    const e = doc.data();
    const author = userById[e.authorId];
    const createdAt = e.createdAt?.toDate?.() ?? null;
    const named = (ids) =>
      (ids ?? []).map((id) => personById[id]?.name ?? id).join(', ') || '(none)';

    console.log('═'.repeat(70));
    console.log('entryId        :', doc.id);
    console.log('createdAt      :', createdAt?.toLocaleString?.() ?? 'unknown');
    console.log('author         :', author?.name, '<' + author?.email + '>');
    console.log('category       :', e.category);
    console.log('subjectType    :', e.subjectType ?? '(none)');
    console.log('subjectPersonId:', e.subjectPersonId
      ? `${e.subjectPersonId} (${personById[e.subjectPersonId]?.name ?? '?'})`
      : '(none)');
    console.log('personMentions :', named(e.personMentions));
    console.log('sharedWith     :', (e.sharedWithUserIds ?? []).map(id => userById[id]?.name ?? id).join(', ') || '(just author)');
    console.log('tags           :', (e.tags ?? []).join(' | ') || '(none)');
    console.log('checkIn        :', e.checkIn ? JSON.stringify(e.checkIn, null, 2).split('\n').map((l, i) => i === 0 ? l : '                  ' + l).join('\n') : '(none)');
    console.log('media          :', e.media?.length ? `${e.media.length} item(s)` : '(none)');
    console.log('--- text ---');
    console.log(e.text || '(empty)');
    if (e.enrichment) {
      console.log('--- enrichment ---');
      if (e.enrichment.summary) console.log('summary :', e.enrichment.summary);
      if (e.enrichment.themes?.length) console.log('themes  :', e.enrichment.themes.join(', '));
      if (e.enrichment.aiPeople?.length) console.log('aiPeople:', e.enrichment.aiPeople.join(', '));
    }
    console.log('');
  });

  process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
