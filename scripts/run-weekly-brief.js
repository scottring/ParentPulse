#!/usr/bin/env node
/* eslint-disable no-console */
// Backfill/manual-run invocation of generateWeeklyBrief.
//
// Usage:
//   ANTHROPIC_API_KEY=... node scripts/run-weekly-brief.js \
//     --email smkaufman@gmail.com \
//     --week 2026-04-19
//
// Script mode scopes to what the caller can see (includes their
// private entries). Scheduled Cloud Function stays stricter
// (family-shared entries only).

const admin = require('firebase-admin');
const Anthropic = require('@anthropic-ai/sdk');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 2) {
    out[argv[i].replace(/^--/, '')] = argv[i + 1];
  }
  return out;
}

function weekBounds(weekEnding) {
  const end = new Date(weekEnding);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  const dow = end.getDay();
  const daysBack = dow === 0 ? 6 : dow - 1;
  start.setDate(start.getDate() - daysBack);
  start.setHours(0, 0, 0, 0);
  return {start, end};
}

function briefId(familyId, weekEnding) {
  const y = weekEnding.getFullYear();
  const m = String(weekEnding.getMonth() + 1).padStart(2, '0');
  const d = String(weekEnding.getDate()).padStart(2, '0');
  return `${familyId}_${y}-${m}-${d}`;
}

async function main() {
  const args = parseArgs(process.argv);
  const email = args.email;
  const weekArg = args.week;

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY required in env');
  }
  if (!email) throw new Error('--email <user@example.com> required');

  admin.initializeApp({projectId: 'parentpulse-d68ba'});
  const db = admin.firestore();
  const anthropic = new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY});

  const userSnap = await db.collection('users')
      .where('email', '==', email).limit(1).get();
  if (userSnap.empty) throw new Error(`No user with email ${email}`);
  const userDoc = userSnap.docs[0];
  const familyId = userDoc.data().familyId;
  console.log(`→ Family: ${familyId}`);

  let weekEnding;
  if (weekArg) {
    weekEnding = new Date(`${weekArg}T23:59:59`);
    if (isNaN(weekEnding.getTime())) {
      throw new Error(`Invalid --week ${weekArg}`);
    }
  } else {
    weekEnding = new Date();
    const dow = weekEnding.getDay();
    if (dow !== 0) weekEnding.setDate(weekEnding.getDate() - dow);
  }

  const {start, end} = weekBounds(weekEnding);
  console.log(
      `→ Week: ${start.toISOString().slice(0, 10)} → ` +
      `${end.toISOString().slice(0, 10)}`,
  );

  // Fetch entries in the window, filter to what caller can see.
  const snap = await db.collection('journal_entries')
      .where('familyId', '==', familyId)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(start))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(end))
      .get();

  const entries = [];
  snap.forEach((d) => {
    const data = d.data();
    if (!data.text || data.text.trim().length < 20) return;
    const vis = Array.isArray(data.visibleToUserIds) ?
      data.visibleToUserIds :
      [];
    if (!vis.includes(userDoc.id)) return;
    entries.push({id: d.id, ...data});
  });

  console.log(`→ Candidate entries: ${entries.length}`);
  if (entries.length < 3) {
    console.log(`⚠ Only ${entries.length} entries — too thin.`);
    process.exit(0);
  }

  const userIds = Array.from(new Set(entries.map((e) => e.authorId)));
  const userDocs = await Promise.all(
      userIds.map((uid) => db.collection('users').doc(uid).get()),
  );
  const userNames = {};
  userDocs.forEach((d) => {
    if (!d.exists) return;
    const data = d.data();
    userNames[d.id] = data.displayName || data.name || 'Someone';
  });

  const peopleSnap = await db.collection('people')
      .where('familyId', '==', familyId).get();
  const peopleNames = peopleSnap.docs.map((d) => d.data().name).filter(Boolean);

  // Moments in the window with divergence — optional. Skip if the
  // index isn't ready; the brief still works off entries alone.
  let divergent = [];
  try {
    const momentsSnap = await db.collection('moments')
        .where('familyId', '==', familyId)
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(start))
        .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(end))
        .get();
    momentsSnap.forEach((d) => {
      const m = d.data();
      if (m.synthesis?.divergenceLine) divergent.push({id: d.id, ...m});
    });
  } catch (err) {
    console.log(`  (skipping moments query: ${err.code || err.message})`);
  }

  const participantUserIds = [userDoc.id]; // script: personal scope

  const digest = entries.map((e) => {
    const date = e.createdAt?.toDate?.() || new Date();
    const author = userNames[e.authorId] || 'Someone';
    const clip = e.text.trim().slice(0, 500);
    return `ID: ${e.id}
AUTHOR: ${author}
DATE: ${date.toISOString().slice(0, 10)}
TEXT: ${clip}`;
  }).join('\n\n---\n\n');

  const divergentDigest = divergent.length > 0 ?
    `\n\nMOMENTS WHERE TWO VIEWS DIVERGED:\n${
      divergent.map((m) =>
        `- ${m.title || '(untitled)'}: "${m.synthesis.divergenceLine}"`,
      ).join('\n')
    }` :
    '';

  const peopleLine = peopleNames.length > 0 ?
    `\nFAMILY MEMBERS REFERENCED: ${peopleNames.join(', ')}` :
    '';

  const prompt = `You are Relish, a family journal that writes briefs — short, forward-looking prep notes for the hardest conversation waiting this week. You read what the family wrote and produce 1 to 3 TOPICS worth bringing to a conversation.

A good topic:
- Names something specific that recurred in the writing or diverged in a moment.
- Frames it as a question to hold, not a demand.
- Gives 2-3 concrete talking points — what to say, what to ask, what to listen for.
- Grounds itself in one verbatim quote from an entry.

A bad topic: generic encouragement, "keep communicating", abstract themes.
${peopleLine}${divergentDigest}

ENTRIES (${entries.length} total):
${digest}

Output strict JSON only:
{
  "topics": [
    {
      "title": "Short title, ≤50 chars e.g. 'Bedtime with Kaleb'",
      "who": ["Name1", "Name2"],
      "framing": "One-sentence question or frame. ≤180 chars.",
      "talkingPoints": ["short line", "short line", "short line"],
      "sourceEntryId": "entryId from the digest above",
      "daysOpen": 3
    }
  ]
}

Rules:
- 1-3 topics total. Prefer fewer, better.
- \`who\` must use names that actually appear in the entries or the family list.
- \`sourceEntryId\` MUST match an ID from the digest. Omit if none grounds the topic well.
- \`daysOpen\` = days since the oldest related entry (integer).
- Return ONLY JSON.`;

  console.log('→ Calling Claude Sonnet…');
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1200,
    messages: [{role: 'user', content: prompt}],
  });

  const text = response.content?.[0]?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in Claude response');
  const parsed = JSON.parse(jsonMatch[0]);

  const entryById = new Map(entries.map((e) => [e.id, e]));
  const topics = (Array.isArray(parsed.topics) ? parsed.topics : [])
      .slice(0, 3)
      .map((t) => {
        const src = typeof t.sourceEntryId === 'string' ?
          entryById.get(t.sourceEntryId) :
          null;
        const talkingPoints = Array.isArray(t.talkingPoints) ?
          t.talkingPoints
              .filter((p) => typeof p === 'string' && p.trim().length > 0)
              .map((p) => p.trim().slice(0, 200))
              .slice(0, 4) :
          [];
        const who = Array.isArray(t.who) ?
          t.who
              .filter((n) => typeof n === 'string' && n.trim().length > 0)
              .map((n) => n.trim().slice(0, 40))
              .slice(0, 5) :
          [];
        const topic = {
          title: (t.title || '').trim().slice(0, 80),
          who,
          framing: (t.framing || '').trim().slice(0, 240),
          talkingPoints,
        };
        if (src) {
          topic.sourceEntryId = src.id;
          topic.sourceQuote = src.text.trim().slice(0, 200);
        }
        if (typeof t.daysOpen === 'number' && t.daysOpen >= 0) {
          topic.daysOpen = Math.min(365, Math.round(t.daysOpen));
        }
        return topic;
      })
      .filter((t) => t.title && t.framing && t.talkingPoints.length > 0);

  if (topics.length === 0) {
    console.log('⚠ No valid topics returned.');
    process.exit(0);
  }

  const id = briefId(familyId, end);
  const doc = {
    briefId: id,
    familyId,
    participantUserIds,
    weekStarting: admin.firestore.Timestamp.fromDate(start),
    weekEnding: admin.firestore.Timestamp.fromDate(end),
    topics,
    entryCount: entries.length,
    generatedBy: 'ai',
    model: 'claude-sonnet-4-5-20250929',
    createdAt: admin.firestore.Timestamp.now(),
  };

  await db.collection('weekly_briefs').doc(id).set(doc);

  console.log(`✓ Wrote ${id}`);
  console.log('');
  topics.forEach((t, i) => {
    console.log(`TOPIC ${i + 1}: ${t.title}`);
    console.log(`  who:      ${t.who.join(', ') || '—'}`);
    console.log(`  framing:  ${t.framing}`);
    console.log(`  days:     ${t.daysOpen ?? '—'}`);
    t.talkingPoints.forEach((p) => console.log(`  • ${p}`));
    if (t.sourceQuote) {
      console.log(`  quote:    "${t.sourceQuote.slice(0, 80)}…"`);
    }
    console.log('');
  });
  console.log('Usage:', JSON.stringify(response.usage));

  process.exit(0);
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
