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

  const since = new Date(Date.now() - 36 * 3600 * 1000);

  const snap = await db.collection('journal_entries')
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(since))
    .orderBy('createdAt', 'desc')
    .get();

  console.log(`\nFound ${snap.size} entries in the last 36h:\n`);
  snap.forEach((doc) => {
    const e = doc.data();
    const author = userById[e.authorId];
    const createdAt = e.createdAt?.toDate?.() ?? null;
    const named = (ids) =>
      (ids ?? []).map((id) => personById[id]?.name ?? id).join(', ') || '(none)';
    console.log('—'.repeat(60));
    console.log('entryId   :', doc.id);
    console.log('createdAt :', createdAt?.toLocaleString?.() ?? 'unknown');
    console.log('author    :', author?.name, '<' + author?.email + '>');
    console.log('category  :', e.category);
    console.log('text      :', (e.text ?? '').slice(0, 120).replace(/\n/g, ' ⏎ '));
    console.log('personMentions (user-tagged):', named(e.personMentions));
    console.log('enrichment.aiPeople (AI)    :', named(e.enrichment?.aiPeople));
    console.log('enrichment present          :', Boolean(e.enrichment));
    console.log('respondsToEntryId           :', e.respondsToEntryId ?? '(none)');
  });

  process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
