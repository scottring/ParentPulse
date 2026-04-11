/**
 * Audit contributions — show per-person what's actually saved in Firestore
 * so we can confirm onboarding data is registering correctly.
 *
 * Usage: node scripts/audit-contributions.js
 */
const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({credential: admin.credential.cert(serviceAccount)});
const db = admin.firestore();

async function main() {
  // Find parent users
  const usersSnap = await db.collection('users').get();
  const parents = [];
  usersSnap.forEach((doc) => {
    const u = doc.data();
    if (u.role === 'parent') {
      parents.push({userId: doc.id, name: u.name, email: u.email, familyId: u.familyId});
    }
  });

  if (parents.length === 0) {
    console.log('No parent users found.');
    return;
  }

  for (const parent of parents) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`USER: ${parent.name} <${parent.email}>`);
    console.log(`  userId:   ${parent.userId}`);
    console.log(`  familyId: ${parent.familyId}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const peopleSnap = await db.collection('people')
        .where('familyId', '==', parent.familyId)
        .get();

    const people = [];
    peopleSnap.forEach((d) => people.push({personId: d.id, ...d.data()}));
    console.log(`\n${people.length} people in family:`);

    // Load all contributions and manuals once
    const contribSnap = await db.collection('contributions')
        .where('familyId', '==', parent.familyId)
        .get();
    const contributions = [];
    contribSnap.forEach((d) => contributions.push({contributionId: d.id, ...d.data()}));

    const manualsSnap = await db.collection('person_manuals')
        .where('familyId', '==', parent.familyId)
        .get();
    const manuals = [];
    manualsSnap.forEach((d) => manuals.push({manualId: d.id, ...d.data()}));

    console.log(`  (${contributions.length} total contributions, ${manuals.length} manuals in this family)\n`);

    // Per-person breakdown
    for (const p of people) {
      const manual = manuals.find((m) => m.personId === p.personId);
      const personContribs = contributions.filter(
          (c) => c.personId === p.personId ||
            (manual && c.manualId === manual.manualId),
      );
      const selfComplete = personContribs.filter(
          (c) => c.perspectiveType === 'self' && c.status === 'complete',
      );
      const selfDraft = personContribs.filter(
          (c) => c.perspectiveType === 'self' && c.status === 'draft',
      );
      const observerComplete = personContribs.filter(
          (c) => c.perspectiveType === 'observer' && c.status === 'complete',
      );
      const observerDraft = personContribs.filter(
          (c) => c.perspectiveType === 'observer' && c.status === 'draft',
      );

      console.log(`  • ${p.name} (${p.relationshipType || '?'})`);
      console.log(`      personId: ${p.personId}`);
      console.log(`      manualId: ${manual ? manual.manualId : 'NO MANUAL'}`);
      console.log(`      self:     complete=${selfComplete.length}  draft=${selfDraft.length}`);
      console.log(`      observer: complete=${observerComplete.length}  draft=${observerDraft.length}`);

      if (personContribs.length === 0) {
        console.log(`      ⚠ NO CONTRIBUTIONS AT ALL`);
      }

      // Detail each contribution
      for (const c of personContribs) {
        const answerSections = c.answers ? Object.keys(c.answers).length : 0;
        const totalAnswers = c.answers ?
          Object.values(c.answers).reduce((sum, sec) => sum + (typeof sec === 'object' ? Object.keys(sec).length : 0), 0) :
          0;
        const byName = c.contributorName || c.contributorId || '?';
        const when = c.updatedAt ? c.updatedAt.toDate().toLocaleString() : '?';
        console.log(`        - ${c.perspectiveType}/${c.status}  ` +
          `by ${byName}  ${totalAnswers} answers in ${answerSections} sections  ${when}`);
        if (c.manualId && manual && c.manualId !== manual.manualId) {
          console.log(`          ⚠ manualId mismatch: ${c.manualId} vs person's manual ${manual.manualId}`);
        }
        if (!manual) {
          console.log(`          ⚠ no manual doc — orphaned contribution`);
        }
      }
      console.log('');
    }

    // Also flag any contributions that don't match any person in the family
    const orphaned = contributions.filter((c) => {
      const hasPerson = people.some((p) => p.personId === c.personId);
      const hasManual = manuals.some((m) => m.manualId === c.manualId);
      return !hasPerson && !hasManual;
    });
    if (orphaned.length > 0) {
      console.log(`  ⚠ ${orphaned.length} orphaned contributions (no matching person or manual):`);
      for (const c of orphaned) {
        console.log(`    - ${c.contributionId}  personId=${c.personId}  manualId=${c.manualId}  status=${c.status}`);
      }
    }
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
