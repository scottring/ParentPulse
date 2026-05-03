/**
 * Scrub assistant messages in chat_conversations that contain
 * hallucinated names from a model confabulation incident.
 *
 * Flagged messages are marked `excluded: true` rather than deleted —
 * the existing pipeline (retrieveChatContext + chatWithCoach) already
 * filters out excluded messages from both Claude context and past-
 * conversation feedback, so this stops the bad names from leaking
 * into future chats while preserving the user's chat history.
 *
 * Usage:
 *   # Dry-run, all families, default bad names (Tova, Gideon)
 *   node scripts/scrub-hallucinated-names.js
 *
 *   # Custom names list
 *   node scripts/scrub-hallucinated-names.js --names Tova,Gideon
 *
 *   # Scope to one family
 *   node scripts/scrub-hallucinated-names.js --family abc123
 *
 *   # Apply (defaults to dry-run otherwise)
 *   node scripts/scrub-hallucinated-names.js --apply
 *
 *   # Combined
 *   node scripts/scrub-hallucinated-names.js --names Tova,Gideon --family abc123 --apply
 */
const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({credential: admin.credential.cert(serviceAccount)});
const db = admin.firestore();

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {names: ['Tova', 'Gideon'], family: null, apply: false};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--apply') out.apply = true;
    else if (a === '--names') out.names = (args[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--family') out.family = args[++i];
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/scrub-hallucinated-names.js [--names A,B] [--family ID] [--apply]');
      process.exit(0);
    }
  }
  return out;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findBadName(text, badNames) {
  if (!text || typeof text !== 'string') return null;
  for (const name of badNames) {
    const re = new RegExp(`\\b${escapeRegex(name)}\\b`, 'i');
    if (re.test(text)) return name;
  }
  return null;
}

async function scrubChatConversations({names, family, apply}) {
  let q = db.collection('chat_conversations');
  if (family) q = q.where('familyId', '==', family);
  const snap = await q.get();

  let totalConvs = 0;
  let totalMsgsFlagged = 0;
  let convsTouched = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const messages = data.messages || [];
    let changed = false;
    let convFlags = 0;
    const hits = [];

    const newMessages = messages.map((m, i) => {
      if (m.role !== 'assistant') return m;
      if (m.excluded) return m;
      const hit = findBadName(m.content, names);
      if (!hit) return m;
      changed = true;
      convFlags += 1;
      const snippet = (m.content || '').slice(0, 140).replace(/\s+/g, ' ');
      hits.push({i, hit, snippet, full: m.content});
      return {
        ...m,
        excluded: true,
        excludedReason: 'scrub-hallucinated-name',
        excludedNameHit: hit,
        excludedAt: admin.firestore.Timestamp.now(),
      };
    });

    if (changed) {
      convsTouched += 1;
      totalMsgsFlagged += convFlags;
      console.log(`\nConversation ${doc.id} (familyId=${data.familyId})`);
      hits.forEach((h) => {
        console.log(`  msg #${h.i}: hit on "${h.hit}"`);
        console.log(`    "${h.snippet}${h.full.length > 140 ? '...' : ''}"`);
      });
      console.log(`  → ${convFlags} message(s) flagged`);
      if (apply) {
        await doc.ref.update({
          messages: newMessages,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastScrubbedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`  ✓ Updated.`);
      }
    }
    totalConvs += 1;
  }

  return {totalConvs, totalMsgsFlagged, convsTouched};
}

async function scrubJournalEntryChats({names, family, apply}) {
  let q = db.collection('journal_entries');
  if (family) q = q.where('familyId', '==', family);
  const entrySnap = await q.get();

  let totalEntries = 0;
  let totalTurnsFlagged = 0;
  let entriesTouched = 0;

  for (const entryDoc of entrySnap.docs) {
    const chatSnap = await entryDoc.ref.collection('chat').get();
    totalEntries += 1;
    if (chatSnap.empty) continue;

    let entryFlags = 0;
    const hits = [];

    for (const turnDoc of chatSnap.docs) {
      const t = turnDoc.data();
      if (t.role !== 'assistant') continue;
      if (t.excluded) continue;
      const hit = findBadName(t.content, names);
      if (!hit) continue;

      entryFlags += 1;
      const snippet = (t.content || '').slice(0, 140).replace(/\s+/g, ' ');
      hits.push({turnId: turnDoc.id, hit, snippet, full: t.content});

      if (apply) {
        await turnDoc.ref.update({
          excluded: true,
          excludedReason: 'scrub-hallucinated-name',
          excludedNameHit: hit,
          excludedAt: admin.firestore.Timestamp.now(),
        });
      }
    }

    if (hits.length > 0) {
      entriesTouched += 1;
      totalTurnsFlagged += entryFlags;
      console.log(`\nJournal entry ${entryDoc.id} (familyId=${entryDoc.data().familyId})`);
      hits.forEach((h) => {
        console.log(`  turn ${h.turnId}: hit on "${h.hit}"`);
        console.log(`    "${h.snippet}${h.full.length > 140 ? '...' : ''}"`);
      });
      console.log(`  → ${entryFlags} turn(s) flagged${apply ? ' and updated' : ''}`);
    }
  }

  return {totalEntries, totalTurnsFlagged, entriesTouched};
}

async function scanOtherCollections({names, family}) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Other collections — read-only scan (manual cleanup if needed):');

  const collections = [
    'journal_entries',
    'distilled_insights',
    'growth_items',
    'person_manuals',
    'therapy_briefs',
    'daily_actions',
    'weekly_workbooks',
  ];
  const findings = {};

  for (const coll of collections) {
    let cq = db.collection(coll);
    if (family) cq = cq.where('familyId', '==', family);
    let csnap;
    try {
      csnap = await cq.get();
    } catch (e) {
      console.log(`  ${coll}: skipped (${e.message})`);
      continue;
    }
    const hits = [];
    csnap.forEach((d) => {
      const json = JSON.stringify(d.data());
      for (const name of names) {
        const re = new RegExp(`\\b${escapeRegex(name)}\\b`, 'i');
        if (re.test(json)) {
          hits.push({id: d.id, familyId: d.data().familyId || 'n/a', name});
          break;
        }
      }
    });
    if (hits.length === 0) {
      console.log(`  ${coll}: clean`);
    } else {
      console.log(`  ${coll}: ${hits.length} doc(s) contain bad names`);
      hits.forEach((h) => console.log(`    - ${coll}/${h.id} (familyId=${h.familyId}, hit=${h.name})`));
    }
    findings[coll] = hits;
  }
  return findings;
}

async function main() {
  const args = parseArgs();
  const mode = args.apply ? 'APPLY' : 'DRY-RUN';
  console.log(`Mode:       ${mode}`);
  console.log(`Bad names:  ${args.names.join(', ')}`);
  console.log(`Scope:      ${args.family ? `family ${args.family}` : 'ALL families'}`);

  const stats = await scrubChatConversations(args);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`chat_conversations summary`);
  console.log(`  Scanned: ${stats.totalConvs}`);
  console.log(`  Flagged: ${stats.totalMsgsFlagged} message(s) across ${stats.convsTouched} conversation(s)`);
  console.log(`  Mode:    ${mode}${args.apply ? '' : ' — re-run with --apply to write changes'}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Scrubbing journal_entries/{id}/chat subcollections...');
  const jstats = await scrubJournalEntryChats(args);
  console.log(`\njournal_entries chat summary`);
  console.log(`  Scanned: ${jstats.totalEntries} journal entries`);
  console.log(`  Flagged: ${jstats.totalTurnsFlagged} turn(s) across ${jstats.entriesTouched} entry chat(s)`);
  console.log(`  Mode:    ${mode}${args.apply ? '' : ' — re-run with --apply to write changes'}`);

  await scanOtherCollections(args);

  console.log('\nDone.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
