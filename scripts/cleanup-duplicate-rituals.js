/**
 * Find and (optionally) delete duplicate rituals.
 *
 * Two rituals are "duplicates" when they share:
 *   familyId + kind + sorted participantUserIds
 *
 * Default mode is DRY-RUN: prints what it would do without writing.
 * Pass --apply to actually delete the extras.
 *
 * The "canonical" ritual to KEEP per duplicate group:
 *   1. Prefer the deterministic-id doc (`solo_weekly_${uid}`,
 *      `partner_biweekly_${sortedPair}`) if one exists — newly seeded
 *      rituals will use these ids going forward.
 *   2. Otherwise, keep the OLDEST by createdAt (the original).
 *   3. lastRunMomentId, if any of the dupes has one, is preserved by
 *      copying it onto the keeper before the others are deleted, so
 *      ritual-closure history isn't dropped.
 *
 * Usage:
 *   node scripts/cleanup-duplicate-rituals.js
 *   node scripts/cleanup-duplicate-rituals.js --apply
 */

const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');

function dedupeKey(r) {
  const participants = [...(r.participantUserIds || [])].sort().join(',');
  return `${r.familyId}::${r.kind}::${participants}`;
}

function deterministicId(r) {
  if (r.kind === 'solo_weekly') {
    const uid = (r.participantUserIds || [])[0];
    return uid ? `solo_weekly_${uid}` : null;
  }
  if (r.kind === 'partner_biweekly') {
    const pair = [...(r.participantUserIds || [])].sort().join('_');
    return pair ? `partner_biweekly_${pair}` : null;
  }
  return null;
}

function pickKeeper(group) {
  // Prefer deterministic-id doc if present.
  const detId = deterministicId(group[0]);
  if (detId) {
    const det = group.find((r) => r.ritualId === detId);
    if (det) return det;
  }
  // Else oldest by createdAt.
  const sorted = [...group].sort((a, b) => {
    const am = a.createdAt?.toMillis?.() ?? 0;
    const bm = b.createdAt?.toMillis?.() ?? 0;
    return am - bm;
  });
  return sorted[0];
}

async function main() {
  console.log(`\n=== Duplicate ritual cleanup ${APPLY ? '(APPLY)' : '(DRY-RUN)'} ===\n`);

  const snap = await db.collection('rituals').get();
  const rituals = snap.docs.map((d) => ({ ritualId: d.id, ...d.data() }));
  console.log(`Loaded ${rituals.length} ritual docs.\n`);

  const groups = new Map();
  for (const r of rituals) {
    const key = dedupeKey(r);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const dupeGroups = [...groups.entries()].filter(([, arr]) => arr.length > 1);
  if (dupeGroups.length === 0) {
    console.log('No duplicates found.\n');
    process.exit(0);
  }

  console.log(`Found ${dupeGroups.length} duplicate group(s):\n`);

  let deleteCount = 0;
  let lastRunCarry = 0;

  for (const [key, group] of dupeGroups) {
    const keeper = pickKeeper(group);
    const extras = group.filter((r) => r.ritualId !== keeper.ritualId);

    console.log(`  ${key}`);
    console.log(`    KEEP   ${keeper.ritualId}  (status=${keeper.status}, nextRunAt=${keeper.nextRunAt?.toDate?.().toISOString?.() ?? 'n/a'})`);
    for (const x of extras) {
      console.log(`    DELETE ${x.ritualId}  (status=${x.status}, nextRunAt=${x.nextRunAt?.toDate?.().toISOString?.() ?? 'n/a'})`);
    }

    // If any extra has lastRunMomentId and the keeper doesn't, carry it.
    const carryFrom = extras.find((x) => x.lastRunMomentId && !keeper.lastRunMomentId);
    if (carryFrom) {
      console.log(`    CARRY  lastRunMomentId from ${carryFrom.ritualId} → keeper`);
      lastRunCarry++;
      if (APPLY) {
        await db.collection('rituals').doc(keeper.ritualId).update({
          lastRunMomentId: carryFrom.lastRunMomentId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    if (APPLY) {
      for (const x of extras) {
        await db.collection('rituals').doc(x.ritualId).delete();
        deleteCount++;
      }
    } else {
      deleteCount += extras.length;
    }
    console.log('');
  }

  if (APPLY) {
    console.log(`Done. Deleted ${deleteCount} extra ritual doc(s); carried lastRunMomentId on ${lastRunCarry} keeper(s).`);
  } else {
    console.log(`Dry-run summary: would delete ${deleteCount} extra ritual doc(s); would carry lastRunMomentId on ${lastRunCarry} keeper(s).`);
    console.log(`Re-run with --apply to actually delete.`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('cleanup-duplicate-rituals failed:', err);
  process.exit(1);
});
