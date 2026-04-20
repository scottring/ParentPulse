#!/usr/bin/env node
/* eslint-disable no-console */
// Backfill/manual-run invocation of generateWeeklyLead.
//
// Usage:
//   ANTHROPIC_API_KEY=... node scripts/run-weekly-lead.js \
//     --email scott.kaufman@stacksdata.com \
//     --week 2026-04-19
//
// Defaults: --week = most recent Sunday.
//
// Duplicates the runWeeklyLead logic from functions/index.js so we
// don't have to spin up a callable HTTPS invocation. Uses application
// default credentials (firebase login / gcloud auth application-default
// login) + ANTHROPIC_API_KEY from env.

const admin = require('firebase-admin');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const {ENRICHMENT_DIMENSIONS} = (() => {
  // Not needed for lead — declared here only so the script is
  // self-contained even if we extend the prompt later. Keep empty.
  return {ENRICHMENT_DIMENSIONS: []};
})();

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 2) {
    const k = argv[i].replace(/^--/, '');
    out[k] = argv[i + 1];
  }
  return out;
}

function weeklyLeadBounds(weekEnding) {
  const end = new Date(weekEnding);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  const dow = end.getDay();
  const daysBack = dow === 0 ? 6 : dow - 1;
  start.setDate(start.getDate() - daysBack);
  start.setHours(0, 0, 0, 0);
  return {start, end};
}

function weeklyDispatchId(familyId, weekEnding) {
  const y = weekEnding.getFullYear();
  const m = String(weekEnding.getMonth() + 1).padStart(2, '0');
  const d = String(weekEnding.getDate()).padStart(2, '0');
  return `${familyId}_${y}-${m}-${d}`;
}

async function main() {
  const args = parseArgs(process.argv);
  const email = args.email || process.env.RELISH_ADMIN_EMAIL;
  const weekArg = args.week;

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY required in env');
  }
  if (!email) {
    throw new Error('--email <user@example.com> required');
  }

  admin.initializeApp({projectId: 'parentpulse-d68ba'});
  const db = admin.firestore();
  const anthropic = new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY});

  // Resolve user → familyId.
  const userSnap = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
  if (userSnap.empty) {
    throw new Error(`No user with email ${email}`);
  }
  const userDoc = userSnap.docs[0];
  const familyId = userDoc.data().familyId;
  if (!familyId) throw new Error(`User ${email} has no familyId`);
  console.log(`→ Family: ${familyId}`);

  // Resolve weekEnding.
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

  const {start, end} = weeklyLeadBounds(weekEnding);
  console.log(
      `→ Week: ${start.toISOString().slice(0, 10)} → ` +
      `${end.toISOString().slice(0, 10)}`,
  );

  // Pull entries. Script mode: fetch all family entries in the
  // window and filter client-side to what the caller can see. This
  // avoids needing a new composite index for the one-off script.
  const snap = await db.collection('journal_entries')
      .where('familyId', '==', familyId)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(start))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(end))
      .get();

  const entries = [];
  snap.forEach((d) => {
    const data = d.data();
    if (!data.text || data.text.trim().length < 20) return;
    // Must be visible to the caller.
    const vis = Array.isArray(data.visibleToUserIds) ?
      data.visibleToUserIds :
      [];
    if (!vis.includes(userDoc.id)) return;
    entries.push({id: d.id, ...data});
  });

  console.log(`→ Candidate entries: ${entries.length} (visible to ${email}, ≥20 chars)`);
  if (entries.length < 3) {
    console.log(
        `⚠ Only ${entries.length} entries — too thin for a dispatch.`,
    );
    process.exit(0);
  }

  // Author names.
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

  // Scope readership to just the caller — the dispatch includes
  // private entries of theirs, so it's personal, not family-wide.
  const participantUserIds = [userDoc.id];

  const digest = entries.map((e) => {
    const date = e.createdAt?.toDate?.() || new Date();
    const author = userNames[e.authorId] || 'Someone';
    const clip = e.text.trim().slice(0, 500);
    return `ID: ${e.id}
AUTHOR: ${author}
DATE: ${date.toISOString().slice(0, 10)}
TEXT: ${clip}`;
  }).join('\n\n---\n\n');

  const prompt = `You are the voice of Relish — a quiet, observant family journal that writes back to the people who keep it. You read what the family wrote this past week and surface ONE pattern worth naming.

Rules of voice:
- Write in warm, specific, literary prose — think *The New Yorker* weekly newsletter, not marketing copy.
- No platitudes. No "keep up the great work". No generic encouragement.
- Name the concrete thing. Use the actual names that appear.
- Quote verbatim — never paraphrase someone's words. If you can't find a good quote, say so honestly.
- ≤ 1 sentence for the headline. ≤ 3 sentences for the dek.

Output strict JSON only:
{
  "headline": "One-sentence observation about a pattern. Speak in the book's voice.",
  "dek": "2-3 sentences unpacking the headline. Specific, never generic.",
  "themeTag": "Short free-text tag (≤ 30 chars) e.g. 'bedtime friction' or 'Scott's Sunday quiet'",
  "evidenceEntryIds": ["entryId1", "entryId2", "entryId3"],
  "emergentLine": "Optional one-sentence 'what emerged' — something neither entry alone could say. Can be empty string."
}

WEEK'S ENTRIES (${entries.length} total):
${digest}

Return ONLY JSON.`;

  console.log('→ Calling Claude Sonnet…');
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 800,
    messages: [{role: 'user', content: prompt}],
  });

  const text = response.content?.[0]?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in Claude response');
  const parsed = JSON.parse(jsonMatch[0]);

  const entryById = new Map(entries.map((e) => [e.id, e]));
  const evidence = (Array.isArray(parsed.evidenceEntryIds) ?
    parsed.evidenceEntryIds :
    [])
      .map((id) => entryById.get(id))
      .filter(Boolean)
      .slice(0, 3)
      .map((e) => ({
        entryId: e.id,
        excerpt: e.text.trim().slice(0, 200),
        authorId: e.authorId,
        authorName: userNames[e.authorId] || 'Someone',
        createdAt: e.createdAt,
      }));

  const dispatchId = weeklyDispatchId(familyId, end);
  const doc = {
    dispatchId,
    familyId,
    participantUserIds,
    weekStarting: admin.firestore.Timestamp.fromDate(start),
    weekEnding: admin.firestore.Timestamp.fromDate(end),
    headline: (parsed.headline || '').trim().slice(0, 300),
    dek: (parsed.dek || '').trim().slice(0, 600),
    themeTag: (parsed.themeTag || '').trim().slice(0, 40),
    evidence,
    entryCount: entries.length,
    generatedBy: 'ai',
    model: 'claude-sonnet-4-5-20250929',
    createdAt: admin.firestore.Timestamp.now(),
  };
  const emergent = (parsed.emergentLine || '').trim().slice(0, 280);
  if (emergent) doc.emergentLine = emergent;

  await db.collection('weekly_dispatches').doc(dispatchId).set(doc);

  console.log(`✓ Wrote ${dispatchId}`);
  console.log('');
  console.log('HEADLINE:', doc.headline);
  console.log('DEK:     ', doc.dek);
  console.log('TAG:     ', doc.themeTag);
  console.log('EMERGENT:', doc.emergentLine || '(none)');
  console.log(`EVIDENCE: ${evidence.length} entries`);
  evidence.forEach((ev, i) => {
    console.log(`  [${i + 1}] ${ev.authorName}: "${ev.excerpt.slice(0, 80)}…"`);
  });
  console.log('');
  console.log('Usage:', JSON.stringify(response.usage));

  process.exit(0);
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
