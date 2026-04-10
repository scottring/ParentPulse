/**
 * Verify user attribution for the Kaleb conversation.
 *
 * Questions this answers:
 *  1. Is session o9AelJSLjh4YwwP9WwAn really attributed to Iris's user account?
 *  2. Is Iris's user account correctly linked to the Iris Person?
 *  3. Do both Scott and Iris share the same familyId?
 *  4. Are Kaleb's manual insights attributed to a specific user (or just "ai-chat")?
 *  5. Are the workbook activities I generated assigned to the right users?
 */

const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const KALEB_SESSION_ID = 'o9AelJSLjh4YwwP9WwAn';

async function main() {
  console.log('\n=== USER ATTRIBUTION AUDIT ===\n');

  // 1. Get the Kaleb chat session
  const sessionDoc = await db.collection('manual_chat_sessions').doc(KALEB_SESSION_ID).get();
  if (!sessionDoc.exists) {
    console.log('Session not found!');
    process.exit(1);
  }
  const session = sessionDoc.data();
  console.log('1. KALEB CONVERSATION SESSION');
  console.log(`   sessionId:  ${KALEB_SESSION_ID}`);
  console.log(`   personId:   ${session.personId}`);
  console.log(`   personName: ${session.personName}`);
  console.log(`   userId:     ${session.userId}`);
  console.log(`   familyId:   ${session.familyId}`);

  // 2. Look up that user document to see who it really belongs to
  const userDoc = await db.collection('users').doc(session.userId).get();
  if (!userDoc.exists) {
    console.log(`\n   ⚠️  User document for ${session.userId} does NOT exist!`);
  } else {
    const user = userDoc.data();
    console.log('\n2. THE USER BEHIND THAT SESSION');
    console.log(`   userId:      ${session.userId}`);
    console.log(`   name:        ${user.name || user.displayName || '?'}`);
    console.log(`   email:       ${user.email || '?'}`);
    console.log(`   familyId:    ${user.familyId || '?'}`);
    console.log(`   role:        ${user.role || '?'}`);
    console.log(`   linkedPersonId (if any): ${user.linkedPersonId || user.personId || '(none)'}`);
  }

  // 3. Find the Person document for Iris — check if it's linked to this user
  const peopleSnap = await db.collection('people').get();
  const irisPerson = peopleSnap.docs.find(
    (d) => d.data().name?.toLowerCase().includes('iris'),
  );
  const scottPerson = peopleSnap.docs.find(
    (d) => d.data().name?.toLowerCase().includes('scott'),
  );

  if (irisPerson) {
    const iris = irisPerson.data();
    console.log('\n3. IRIS PERSON DOCUMENT');
    console.log(`   personId:     ${irisPerson.id}`);
    console.log(`   name:         ${iris.name}`);
    console.log(`   familyId:     ${iris.familyId}`);
    console.log(`   linkedUserId: ${iris.linkedUserId || '(none)'}`);
    console.log(`   canSelfContribute: ${iris.canSelfContribute}`);
    const matches = iris.linkedUserId === session.userId;
    console.log(`   ✓ Linked to session user? ${matches ? 'YES' : 'NO — MISMATCH'}`);
  }

  if (scottPerson) {
    const scott = scottPerson.data();
    console.log('\n4. SCOTT PERSON DOCUMENT');
    console.log(`   personId:     ${scottPerson.id}`);
    console.log(`   name:         ${scott.name}`);
    console.log(`   familyId:     ${scott.familyId}`);
    console.log(`   linkedUserId: ${scott.linkedUserId || '(none)'}`);
  }

  // 4. Check all users in the family
  console.log('\n5. ALL USERS IN THIS FAMILY');
  const familyUsersSnap = await db.collection('users')
    .where('familyId', '==', session.familyId)
    .get();
  familyUsersSnap.forEach((d) => {
    const u = d.data();
    console.log(`   - ${u.name || u.displayName || '?'}`);
    console.log(`     userId:   ${d.id}`);
    console.log(`     email:    ${u.email || '?'}`);
    console.log(`     role:     ${u.role || '?'}`);
    console.log(`     is session user? ${d.id === session.userId ? 'YES' : 'no'}`);
  });

  // 5. Check Kaleb's manual for items added by the chat session
  console.log('\n6. KALEB\'S MANUAL — CHAT-ATTRIBUTED ITEMS');
  const kalebPerson = peopleSnap.docs.find(
    (d) => d.data().name?.toLowerCase().includes('kaleb'),
  );
  if (kalebPerson) {
    const manualSnap = await db.collection('person_manuals')
      .where('personId', '==', kalebPerson.id)
      .limit(1)
      .get();
    if (!manualSnap.empty) {
      const manual = manualSnap.docs[0].data();

      const check = (arr, label) => {
        const chat = (arr || []).filter((item) =>
          item.identifiedBy === 'ai-chat' ||
          item.addedBy === 'ai-chat' ||
          item.identifiedBy === 'ai-chat-session' ||
          item.addedBy === 'ai-chat-session',
        );
        console.log(`   ${label}: ${chat.length} chat-attributed`);
        chat.forEach((c) => {
          console.log(`     - "${c.description?.slice(0, 70)}"`);
          console.log(`       sourceSessionId: ${c.sourceSessionId || '(NOT TRACKED)'}`);
          console.log(`       addedBy:         ${c.addedBy || c.identifiedBy}`);
        });
      };
      check(manual.triggers, 'Triggers');
      check(manual.whatWorks, 'What works');
      check(manual.whatDoesntWork, 'What doesn\'t work');
      check(manual.emergingPatterns, 'Emerging patterns');
    }
  }

  // 6. Check the workbook activities I generated from the script
  console.log('\n7. WORKBOOK ACTIVITIES FROM CHAT SESSION');
  const growthSnap = await db.collection('growth_items')
    .where('sourceChatSessionId', '==', KALEB_SESSION_ID)
    .get();
  if (growthSnap.empty) {
    console.log('   No items with that sourceChatSessionId — checking for Kaleb-related items…');
    const kalebId = peopleSnap.docs.find(
      (d) => d.data().name?.toLowerCase().includes('kaleb'),
    )?.id;
    if (kalebId) {
      const kalebItems = await db.collection('growth_items')
        .where('targetPersonIds', 'array-contains', kalebId)
        .get();
      console.log(`   Found ${kalebItems.size} items targeting Kaleb.`);
      kalebItems.forEach((d) => {
        const item = d.data();
        console.log(`   - "${item.title}"`);
        console.log(`     assignedTo: ${item.assignedToUserName} (${item.assignedToUserId})`);
        console.log(`     sourceChatSessionId: ${item.sourceChatSessionId || '(none)'}`);
      });
    }
  } else {
    console.log(`   Found ${growthSnap.size} items with sourceChatSessionId = ${KALEB_SESSION_ID}:`);
    growthSnap.forEach((d) => {
      const item = d.data();
      console.log(`   - "${item.title}"`);
      console.log(`     assignedTo: ${item.assignedToUserName} (${item.assignedToUserId})`);
    });
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
