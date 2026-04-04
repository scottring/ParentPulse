/**
 * fix-duplicate-persons.js
 *
 * One-time migration to merge duplicate Person records.
 *
 * When a spouse registers via invite, a second Person ("self") is created
 * even though a Person ("spouse") already exists for them. This script
 * finds those pairs, keeps the spouse record as canonical, and reassigns
 * all contributions/assessments/arcs from the duplicate.
 *
 * Usage:
 *   node scripts/fix-duplicate-persons.js            # dry-run (read-only)
 *   node scripts/fix-duplicate-persons.js --execute   # apply changes
 */

const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const DRY_RUN = !process.argv.includes('--execute');

async function findDuplicatePairs(familyId) {
  const peopleSnap = await db.collection('people')
    .where('familyId', '==', familyId)
    .get();

  const people = peopleSnap.docs.map(d => ({ personId: d.id, ...d.data() }));

  // Find "self" records that have a linkedUserId
  const selfRecords = people.filter(
    p => p.relationshipType === 'self' && p.linkedUserId
  );

  const pairs = [];

  for (const selfPerson of selfRecords) {
    const firstName = selfPerson.name.toLowerCase().trim().split(' ')[0];

    // Look for an unclaimed non-self record with matching first name
    const match = people.find(
      p =>
        p.personId !== selfPerson.personId &&
        p.relationshipType !== 'self' &&
        !p.linkedUserId &&
        p.name.toLowerCase().trim().split(' ')[0] === firstName
    );

    if (match) {
      pairs.push({
        canonical: match,        // the spouse/relationship record (keep this)
        duplicate: selfPerson,   // the self record created during registration (archive this)
      });
    }
  }

  return pairs;
}

async function getManualForPerson(personId) {
  const snap = await db.collection('person_manuals')
    .where('personId', '==', personId)
    .get();
  if (snap.empty) return null;
  return { manualId: snap.docs[0].id, ...snap.docs[0].data() };
}

async function mergePair(pair) {
  const { canonical, duplicate } = pair;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`MERGING: "${duplicate.name}" (self, ${duplicate.personId})`);
  console.log(`   INTO: "${canonical.name}" (${canonical.relationshipType}, ${canonical.personId})`);
  console.log(`${'='.repeat(60)}`);

  const canonicalManual = await getManualForPerson(canonical.personId);
  const duplicateManual = await getManualForPerson(duplicate.personId);

  console.log(`  Canonical manual: ${canonicalManual?.manualId || 'NONE'}`);
  console.log(`  Duplicate manual: ${duplicateManual?.manualId || 'NONE'}`);

  // 1. Update canonical Person: claim with linkedUserId
  console.log(`\n  [1] Claiming canonical Person with linkedUserId=${duplicate.linkedUserId}`);
  if (!DRY_RUN) {
    await db.collection('people').doc(canonical.personId).update({
      linkedUserId: duplicate.linkedUserId,
      canSelfContribute: true,
      name: duplicate.name, // Use the full registered name
    });
  }

  // 2. Reassign contributions from duplicate's manual to canonical's manual
  if (duplicateManual) {
    const contribSnap = await db.collection('contributions')
      .where('personId', '==', duplicate.personId)
      .get();

    console.log(`  [2] Reassigning ${contribSnap.size} contributions from duplicate Person`);

    for (const contribDoc of contribSnap.docs) {
      const updates = { personId: canonical.personId };
      if (canonicalManual && contribDoc.data().manualId === duplicateManual.manualId) {
        updates.manualId = canonicalManual.manualId;
      }
      console.log(`      - Contribution ${contribDoc.id}: personId → ${canonical.personId}${updates.manualId ? `, manualId → ${updates.manualId}` : ''}`);
      if (!DRY_RUN) {
        await db.collection('contributions').doc(contribDoc.id).update(updates);
      }
    }

    // 3. Merge contributionIds and perspectives into canonical manual
    if (canonicalManual) {
      const dupeContribIds = duplicateManual.contributionIds || [];
      const canonContribIds = canonicalManual.contributionIds || [];
      const mergedContribIds = [...new Set([...canonContribIds, ...dupeContribIds])];

      const dupeObservers = duplicateManual.perspectives?.observers || [];
      const canonObservers = canonicalManual.perspectives?.observers || [];
      // Merge observers by contributorId to avoid duplicates
      const observerMap = new Map();
      for (const obs of [...canonObservers, ...dupeObservers]) {
        observerMap.set(obs.contributorId || obs.userId, obs);
      }
      const mergedObservers = Array.from(observerMap.values());

      const selfPerspective = duplicateManual.perspectives?.self || canonicalManual.perspectives?.self;

      console.log(`  [3] Merging manual metadata: ${dupeContribIds.length} contrib IDs, ${dupeObservers.length} observers from duplicate`);

      if (!DRY_RUN) {
        const manualUpdate = {
          contributionIds: mergedContribIds,
          'perspectives.observers': mergedObservers,
          personName: duplicate.name,
        };
        if (selfPerspective) {
          manualUpdate['perspectives.self'] = selfPerspective;
        }
        await db.collection('person_manuals').doc(canonicalManual.manualId).update(manualUpdate);
      }
    }

    // 4. Archive duplicate manual
    console.log(`  [4] Archiving duplicate manual ${duplicateManual.manualId}`);
    if (!DRY_RUN) {
      await db.collection('person_manuals').doc(duplicateManual.manualId).update({
        archived: true,
        archivedAt: admin.firestore.Timestamp.now(),
        archivedReason: `duplicate_merged_into_${canonical.personId}`,
      });
    }
  }

  // 5. Update dimension_assessments
  const assessSnap = await db.collection('dimension_assessments')
    .where('participantIds', 'array-contains', duplicate.personId)
    .get();

  if (!assessSnap.empty) {
    console.log(`  [5] Updating ${assessSnap.size} dimension_assessments`);
    for (const assessDoc of assessSnap.docs) {
      const data = assessDoc.data();
      const newParticipantIds = data.participantIds.map(
        id => id === duplicate.personId ? canonical.personId : id
      );
      // Also update subjectPersonId if it matches
      const updates = { participantIds: newParticipantIds };
      if (data.subjectPersonId === duplicate.personId) {
        updates.subjectPersonId = canonical.personId;
      }
      console.log(`      - Assessment ${assessDoc.id}`);
      if (!DRY_RUN) {
        await db.collection('dimension_assessments').doc(assessDoc.id).update(updates);
      }
    }
  } else {
    console.log(`  [5] No dimension_assessments to update`);
  }

  // 6. Update growth_arcs
  const arcsSnap = await db.collection('growth_arcs')
    .where('participantIds', 'array-contains', duplicate.personId)
    .get();

  if (!arcsSnap.empty) {
    console.log(`  [6] Updating ${arcsSnap.size} growth_arcs`);
    for (const arcDoc of arcsSnap.docs) {
      const data = arcDoc.data();
      const newParticipantIds = data.participantIds.map(
        id => id === duplicate.personId ? canonical.personId : id
      );
      const updates = { participantIds: newParticipantIds };
      if (data.subjectPersonId === duplicate.personId) {
        updates.subjectPersonId = canonical.personId;
      }
      console.log(`      - Arc ${arcDoc.id}`);
      if (!DRY_RUN) {
        await db.collection('growth_arcs').doc(arcDoc.id).update(updates);
      }
    }
  } else {
    console.log(`  [6] No growth_arcs to update`);
  }

  // 7. Update role_sections
  const sectionsSnap = await db.collection('role_sections')
    .where('personId', '==', duplicate.personId)
    .get();

  if (!sectionsSnap.empty) {
    console.log(`  [7] Updating ${sectionsSnap.size} role_sections`);
    for (const sectionDoc of sectionsSnap.docs) {
      const updates = { personId: canonical.personId };
      if (canonicalManual && sectionDoc.data().manualId === duplicateManual?.manualId) {
        updates.manualId = canonicalManual.manualId;
      }
      console.log(`      - Section ${sectionDoc.id}`);
      if (!DRY_RUN) {
        await db.collection('role_sections').doc(sectionDoc.id).update(updates);
      }
    }
  } else {
    console.log(`  [7] No role_sections to update`);
  }

  // 8. Archive the duplicate Person
  console.log(`  [8] Archiving duplicate Person ${duplicate.personId}`);
  if (!DRY_RUN) {
    await db.collection('people').doc(duplicate.personId).update({
      archived: true,
      archivedAt: admin.firestore.Timestamp.now(),
      archivedReason: `duplicate_merged_into_${canonical.personId}`,
    });
  }

  console.log(`\n  ✅ ${DRY_RUN ? '[DRY RUN] Would merge' : 'Merged'} "${duplicate.name}" into "${canonical.name}"`);
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  FIX DUPLICATE PERSONS${DRY_RUN ? ' (DRY RUN — no changes will be made)' : ' (EXECUTING — changes will be written!)'}`);
  console.log(`${'='.repeat(60)}\n`);

  // Find all families
  const usersSnap = await db.collection('users').get();
  const familyIds = new Set();
  usersSnap.forEach(d => {
    const data = d.data();
    if (data.familyId) familyIds.add(data.familyId);
  });

  console.log(`Found ${familyIds.size} family/families to check.\n`);

  let totalPairs = 0;

  for (const familyId of familyIds) {
    console.log(`\nChecking family: ${familyId}`);
    const pairs = await findDuplicatePairs(familyId);

    if (pairs.length === 0) {
      console.log('  No duplicate pairs found.');
      continue;
    }

    console.log(`  Found ${pairs.length} duplicate pair(s)!`);
    totalPairs += pairs.length;

    for (const pair of pairs) {
      await mergePair(pair);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  if (totalPairs === 0) {
    console.log('  No duplicates found across any family.');
  } else if (DRY_RUN) {
    console.log(`  DRY RUN COMPLETE: Found ${totalPairs} pair(s) to merge.`);
    console.log(`  Run with --execute to apply changes.`);
  } else {
    console.log(`  DONE: Merged ${totalPairs} duplicate pair(s).`);
  }
  console.log(`${'='.repeat(60)}\n`);

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
