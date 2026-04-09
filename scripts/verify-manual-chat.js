/**
 * Verify manual chat capture: inspect manual_chat_sessions and the
 * associated manuals to see what was actually persisted and which
 * insights (if any) got extracted from recent conversations.
 */

const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function main() {
  console.log('\n=== MANUAL CHAT SESSIONS (most recent 10) ===\n');

  const sessionsSnap = await db.collection('manual_chat_sessions')
    .orderBy('updatedAt', 'desc')
    .limit(10)
    .get();

  if (sessionsSnap.empty) {
    console.log('No manual chat sessions found in Firestore.');
    process.exit(0);
  }

  for (const doc of sessionsSnap.docs) {
    const data = doc.data();
    const updatedAt = data.updatedAt?.toDate?.()?.toISOString() || 'unknown';
    const createdAt = data.createdAt?.toDate?.()?.toISOString() || 'unknown';
    const messages = data.messages || [];

    console.log(`--- Session ${doc.id} ---`);
    console.log(`  person:       ${data.personName || '?'} (${data.personId || '?'})`);
    console.log(`  manualId:     ${data.manualId || '?'}`);
    console.log(`  userId:       ${data.userId || '?'}`);
    console.log(`  active:       ${data.active}`);
    console.log(`  created:      ${createdAt}`);
    console.log(`  updated:      ${updatedAt}`);
    console.log(`  messageCount: ${data.messageCount ?? messages.length}`);
    console.log(`  actual msgs:  ${messages.length}`);

    const userMsgs = messages.filter((m) => m.role === 'user');
    console.log(`  user turns:   ${userMsgs.length}`);

    if (data.synthesis) {
      console.log(`  SYNTHESIS PRESENT:`);
      console.log(`    narrative:  ${data.synthesis.narrativeSummary || '(none)'}`);
      console.log(`    themes:     ${(data.synthesis.themes || []).join(', ') || '(none)'}`);
      console.log(`    realizations: ${(data.synthesis.userRealizations || []).join(' | ') || '(none)'}`);
    }

    // Show first user message to make sessions easy to identify
    if (userMsgs.length > 0) {
      const preview = userMsgs[0].content.slice(0, 120).replace(/\n/g, ' ');
      console.log(`  first user msg: "${preview}${userMsgs[0].content.length > 120 ? '...' : ''}"`);
    }

    console.log();
  }

  // Dig into any session mentioning Kaleb specifically
  console.log('\n=== SESSIONS MENTIONING KALEB ===\n');
  let kalebFound = false;
  for (const doc of sessionsSnap.docs) {
    const data = doc.data();
    const messages = data.messages || [];
    const asText = JSON.stringify(messages).toLowerCase();
    if (asText.includes('kaleb') || data.personName?.toLowerCase() === 'kaleb') {
      kalebFound = true;
      console.log(`\n--- Session ${doc.id} (${data.personName}) ---`);
      messages.forEach((m, i) => {
        const preview = m.content.slice(0, 300).replace(/\n/g, ' ');
        console.log(`  ${i + 1}. [${m.role}] ${preview}${m.content.length > 300 ? '...' : ''}`);
      });
    }
  }
  if (!kalebFound) {
    console.log('  (none of the recent 10 sessions mention Kaleb)');
  }

  // Look at Kaleb's manual to see which chat-derived items are in it
  console.log('\n=== CHAT-DERIVED ITEMS IN MANUALS ===\n');
  const peopleSnap = await db.collection('people').get();
  const kalebPerson = peopleSnap.docs.find(
    (d) => d.data().name?.toLowerCase().includes('kaleb'),
  );
  const irisPerson = peopleSnap.docs.find(
    (d) => d.data().name?.toLowerCase().includes('iris'),
  );

  for (const person of [kalebPerson, irisPerson].filter(Boolean)) {
    const data = person.data();
    console.log(`\n--- ${data.name} (personId: ${person.id}) ---`);
    const manualSnap = await db.collection('person_manuals')
      .where('personId', '==', person.id)
      .limit(1)
      .get();

    if (manualSnap.empty) {
      console.log(`  no manual found for ${data.name}`);
      continue;
    }

    const manual = manualSnap.docs[0].data();
    const manualId = manualSnap.docs[0].id;
    console.log(`  manualId: ${manualId}`);

    const chatTriggers = (manual.triggers || []).filter(
      (t) => t.identifiedBy === 'ai-chat' || t.identifiedBy === 'ai-chat-session',
    );
    const chatWorks = (manual.whatWorks || []).filter(
      (s) => s.addedBy === 'ai-chat' || s.addedBy === 'ai-chat-session',
    );
    const chatDoesnt = (manual.whatDoesntWork || []).filter(
      (s) => s.addedBy === 'ai-chat' || s.addedBy === 'ai-chat-session',
    );
    const chatPatterns = (manual.emergingPatterns || []).filter(
      (p) => p.identifiedBy === 'ai-chat' || p.identifiedBy === 'ai-chat-session',
    );

    console.log(`  triggers total:         ${(manual.triggers || []).length}`);
    console.log(`  triggers from chat:     ${chatTriggers.length}`);
    if (chatTriggers.length > 0) {
      chatTriggers.forEach((t) => console.log(`    - ${t.description}`));
    }
    console.log(`  whatWorks total:        ${(manual.whatWorks || []).length}`);
    console.log(`  whatWorks from chat:    ${chatWorks.length}`);
    if (chatWorks.length > 0) {
      chatWorks.forEach((s) => console.log(`    - ${s.description}`));
    }
    console.log(`  whatDoesntWork total:   ${(manual.whatDoesntWork || []).length}`);
    console.log(`  whatDoesntWork fromChat:${chatDoesnt.length}`);
    if (chatDoesnt.length > 0) {
      chatDoesnt.forEach((s) => console.log(`    - ${s.description}`));
    }
    console.log(`  emergingPatterns total: ${(manual.emergingPatterns || []).length}`);
    console.log(`  patterns from chat:     ${chatPatterns.length}`);
    if (chatPatterns.length > 0) {
      chatPatterns.forEach((p) => console.log(`    - ${p.description}`));
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
