/**
 * Seed a demo account with sample data for testing all app flows.
 *
 * Usage:  node scripts/seed-demo-account.mjs
 *
 * Creates:
 *   - Demo user (demo@relish.app / demo123456)
 *   - Family "The Martins"
 *   - 3 people: self (Alex), spouse (Jordan), child (Mia age 10)
 *   - Completed self + observer contributions with answers
 *   - Synthesized manual content
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, Timestamp, deleteDoc, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAud7jpracUl7GVSXcNps3p3MYbfl220JE',
  authDomain: 'parentpulse-d68ba.firebaseapp.com',
  projectId: 'parentpulse-d68ba',
  storageBucket: 'parentpulse-d68ba.firebasestorage.app',
  messagingSenderId: '326182714492',
  appId: '1:326182714492:web:c21a1a6d9598c9ccc99df9',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const DEMO_EMAIL = 'demo@relish.app';
const DEMO_PASSWORD = 'demo123456';
const FAMILY_ID = 'demo-family-martins';

// IDs
const SELF_PERSON_ID = 'demo-person-alex';
const SPOUSE_PERSON_ID = 'demo-person-jordan';
const CHILD_PERSON_ID = 'demo-person-mia';
const SELF_MANUAL_ID = 'demo-manual-alex';
const SPOUSE_MANUAL_ID = 'demo-manual-jordan';
const CHILD_MANUAL_ID = 'demo-manual-mia';

const now = Timestamp.now();

async function cleanExisting(uid) {
  console.log('  Cleaning old demo data...');
  // We may not have permission to query/delete all collections before user doc exists.
  // So we just delete known demo doc IDs directly.
  const knownDocs = [
    ['contributions', 'demo-contrib-alex-self'],
    ['contributions', 'demo-contrib-alex-observer'],
    ['contributions', 'demo-contrib-jordan-observer'],
    ['contributions', 'demo-contrib-mia-observer'],
    ['person_manuals', SELF_MANUAL_ID],
    ['person_manuals', SPOUSE_MANUAL_ID],
    ['person_manuals', CHILD_MANUAL_ID],
    ['people', SELF_PERSON_ID],
    ['people', SPOUSE_PERSON_ID],
    ['people', CHILD_PERSON_ID],
    ['families', FAMILY_ID],
  ];
  for (const [col, id] of knownDocs) {
    await deleteDoc(doc(db, col, id)).catch(() => {});
  }
}

async function main() {
  console.log('\n🌱 Seeding demo account...\n');

  // 1. Create or sign in to auth user
  let uid;
  try {
    const cred = await createUserWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
    uid = cred.user.uid;
    console.log('✓ Created auth user:', uid);
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      const cred = await signInWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
      uid = cred.user.uid;
      console.log('✓ Signed into existing auth user:', uid);
    } else throw e;
  }

  // Ensure we're signed in (for existing users, re-sign-in)
  if (!auth.currentUser) {
    await signInWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
  }
  console.log('✓ Authenticated as:', auth.currentUser.uid);

  // 2. User doc first (needed for security rules)
  await setDoc(doc(db, 'users', uid), {
    userId: uid,
    email: DEMO_EMAIL,
    familyId: FAMILY_ID,
    name: 'Alex Martin',
    role: 'parent',
    isDemo: true,
    isAdmin: false,
    createdAt: now,
    settings: { notifications: true, theme: 'light' },
  });
  console.log('✓ User doc (created first for security rules)');

  // 3. Family doc (needed before belongsToFamily checks work)
  await setDoc(doc(db, 'families', FAMILY_ID), {
    familyId: FAMILY_ID,
    name: 'The Martins',
    createdBy: uid,
    members: [uid],
    pendingInvites: [],
    createdAt: now,
    settings: {},
  });
  console.log('✓ Family doc');

  // Now clean any old demo data (we have permissions now)
  await cleanExisting(uid);

  // Re-create user + family since clean may have deleted them
  await setDoc(doc(db, 'users', uid), {
    userId: uid,
    email: DEMO_EMAIL,
    familyId: FAMILY_ID,
    name: 'Alex Martin',
    role: 'parent',
    isDemo: true,
    isAdmin: false,
    createdAt: now,
    settings: { notifications: true, theme: 'light' },
  });
  await setDoc(doc(db, 'families', FAMILY_ID), {
    familyId: FAMILY_ID,
    name: 'The Martins',
    createdBy: uid,
    members: [uid],
    pendingInvites: [],
    createdAt: now,
    settings: {},
  });

  // 4. People
  const people = [
    {
      personId: SELF_PERSON_ID, name: 'Alex Martin', relationshipType: 'self',
      manualId: SELF_MANUAL_ID, linkedUserId: uid, canSelfContribute: true,
    },
    {
      personId: SPOUSE_PERSON_ID, name: 'Jordan Martin', relationshipType: 'spouse',
      manualId: SPOUSE_MANUAL_ID, linkedUserId: null, canSelfContribute: true,
    },
    {
      personId: CHILD_PERSON_ID, name: 'Mia Martin', relationshipType: 'child',
      manualId: CHILD_MANUAL_ID, linkedUserId: null, canSelfContribute: false,
    },
  ];

  for (const p of people) {
    await setDoc(doc(db, 'people', p.personId), {
      ...p,
      familyId: FAMILY_ID,
      hasManual: true,
      addedAt: now,
      addedByUserId: uid,
    });
  }
  console.log('✓ 3 people (Alex, Jordan, Mia)');

  // 5. Contributions + Manuals

  // ── ALEX (self-perspective) ──
  const alexSelfAnswers = {
    overview: {
      overview_q1: 'I love running in the morning, cooking elaborate meals on weekends, and getting lost in a good podcast. Quality time with my family recharges me more than anything.',
      overview_q2: 'Small talk at parties drains me. I also find it hard when plans change at the last minute — I like knowing what to expect.',
      overview_q3: 'I want to be a great parent and partner. I\'m driven by the idea that relationships take real work and that understanding each other deeply is the foundation of everything.',
      overview_q4: 'I\'m comfortable when there\'s a plan and everyone\'s on the same page. I get uncomfortable when I sense tension but nobody\'s talking about it.',
    },
    triggers: {
      triggers_q1: 'Last week Jordan and I had a disagreement about screen time limits for Mia. I got frustrated because I felt like my concerns were being dismissed. I shut down instead of explaining why it mattered to me.',
      triggers_q2: 'The transition from work mode to family mode is hard. Bedtime routines when everyone\'s tired. Mornings when we\'re running late.',
      triggers_q3: 'When someone acknowledges what I\'m feeling before trying to fix it. A few minutes of quiet before diving into household logistics.',
    },
    what_works: {
      works_q1: 'I need direct communication — don\'t hint, just tell me. I respond well to being asked rather than told. I also need some solo time to recharge, even just 20 minutes.',
      works_q2: 'A Saturday morning where Jordan and I had coffee together before the kids woke up. No agenda, just talking. That set the tone for the whole weekend.',
      works_q3: 'Learning new things, having meaningful conversations, and feeling like I\'m making progress on something — whether it\'s a project at work or teaching Mia to ride her bike.',
    },
    boundaries: {
      boundaries_q1: 'Don\'t bring up heavy topics right when I walk in the door from work. Give me 15 minutes to transition. Also, I need my morning run — it\'s not optional, it\'s how I stay balanced.',
      boundaries_q2: 'I wish I\'d understood earlier that I\'m not actually an introvert — I\'m an ambivert who needs recovery time after social events. I used to feel guilty about needing space.',
      boundaries_q3: 'Sarcasm when I\'m already stressed. Saying "you always" or "you never." Trying to solve my problems when I just need to vent.',
    },
    self_worth: {
      sw_global: 3,
      sw_qualities: 3,
      sw_efficacy: 3,
      sw_acceptance: 2,
      sw_social: 3,
    },
  };

  await setDoc(doc(db, 'contributions', 'demo-contrib-alex-self'), {
    contributionId: 'demo-contrib-alex-self',
    manualId: SELF_MANUAL_ID,
    personId: SELF_PERSON_ID,
    familyId: FAMILY_ID,
    contributorId: uid,
    contributorName: 'Alex Martin',
    perspectiveType: 'self',
    relationshipToSubject: 'self',
    answers: alexSelfAnswers,
    status: 'complete',
    createdAt: now,
    updatedAt: now,
  });

  // ── ALEX (observer: Jordan's perspective on Alex) ──
  const alexObserverAnswers = {
    overview: {
      overview_q1: 'Alex lights up when cooking — it\'s almost meditative for them. They also love their morning runs and get genuinely excited about new ideas and projects.',
      overview_q2: 'They really struggle with ambiguity and last-minute changes. Social events with people they don\'t know well can be draining.',
      overview_q3: 'Alex wants to be the best version of themselves in every role — parent, partner, professional. Sometimes this drive creates pressure, but it comes from a genuine place.',
      overview_q4: 'Comfortable with structure and clear expectations. Uncomfortable when emotions are running high and no one\'s naming what\'s happening.',
    },
    triggers: {
      triggers_q1: 'When we disagreed about Mia\'s screen time, Alex shut down. I could see they were hurt but they went quiet instead of telling me why. It took a day for them to come back to the conversation.',
      triggers_q2: 'The work-to-home transition is the biggest one. Also when Mia pushes back on something and Alex feels like they\'re the "bad cop" parent.',
      triggers_q3: 'Giving them space first, then gently checking in. Acknowledging their feelings before jumping to solutions. Physical touch (a hand on the shoulder) can help too.',
    },
    what_works: {
      works_q1: 'Alex needs to feel heard before they can hear you. They respond much better to "I" statements than to criticism. They also genuinely need alone time and shouldn\'t feel guilty about it.',
      works_q2: 'Our best moments are unhurried mornings and evening walks after Mia\'s in bed. When there\'s no agenda and we\'re just being together.',
      works_q3: 'New challenges, especially ones they can research and master. Cooking something complex. Deep conversations about parenting philosophy.',
    },
    boundaries: {
      boundaries_q1: 'Don\'t ambush Alex with heavy conversations right after work. They need transition time. And their morning run is sacred — never suggest skipping it.',
      boundaries_q2: 'Alex isn\'t being cold when they go quiet — they\'re processing. I used to take it personally but now I know to give them space and they always come back.',
      boundaries_q3: 'Sarcasm or dismissiveness absolutely shuts them down. Also "why are you making this a big deal" is the worst thing you can say.',
    },
    self_worth: {
      sw_global: 3,
      sw_qualities: 4,
      sw_efficacy: 3,
      sw_acceptance: 2,
      sw_social: 3,
    },
  };

  await setDoc(doc(db, 'contributions', 'demo-contrib-alex-observer'), {
    contributionId: 'demo-contrib-alex-observer',
    manualId: SELF_MANUAL_ID,
    personId: SELF_PERSON_ID,
    familyId: FAMILY_ID,
    contributorId: uid,
    contributorName: 'Jordan Martin',
    perspectiveType: 'observer',
    relationshipToSubject: 'spouse',
    answers: alexObserverAnswers,
    status: 'complete',
    createdAt: now,
    updatedAt: now,
  });

  // ── ALEX manual ──
  await setDoc(doc(db, 'person_manuals', SELF_MANUAL_ID), {
    manualId: SELF_MANUAL_ID,
    familyId: FAMILY_ID,
    personId: SELF_PERSON_ID,
    personName: 'Alex Martin',
    relationshipType: 'self',
    coreInfo: { sensoryNeeds: [], interests: ['cooking', 'running', 'podcasts'], strengths: ['dedication', 'thoughtfulness'], notes: '' },
    triggers: [], whatWorks: [], whatDoesntWork: [], boundaries: [], emergingPatterns: [], progressNotes: [],
    totalTriggers: 0, totalStrategies: 0, totalBoundaries: 0,
    contributionIds: ['demo-contrib-alex-self', 'demo-contrib-alex-observer'],
    perspectives: { self: 'demo-contrib-alex-self', observers: ['demo-contrib-alex-observer'] },
    synthesizedContent: {
      overview: 'Alex is a thoughtful, driven person who thrives on structure, meaningful connection, and personal growth. Both perspectives agree that Alex finds deep satisfaction in cooking, morning runs, and quality family time. Alex is energized by learning and mastery, and drained by ambiguity, last-minute changes, and unspoken tension.\n\nA core theme across perspectives is Alex\'s need for transition time — particularly the shift from work to home. Both Alex and Jordan recognize this as a critical rhythm that, when respected, sets the tone for the whole evening.',
      alignments: [
        { id: 'a1', topic: 'Need for direct communication', selfPerspective: 'Alex prefers being asked rather than told and responds well to "I" statements.', observerPerspective: 'Jordan confirms Alex needs to feel heard first and responds poorly to criticism but well to direct, gentle communication.', synthesis: 'Both agree: lead with acknowledgment, use direct language, and avoid accusatory framing.', gapSeverity: 'aligned' },
        { id: 'a2', topic: 'Morning routine as anchor', selfPerspective: 'Alex considers the morning run non-negotiable for staying balanced.', observerPerspective: 'Jordan calls it "sacred" and has learned never to suggest skipping it.', synthesis: 'This is a shared understanding — the run is a keystone habit, not a luxury.', gapSeverity: 'aligned' },
        { id: 'a3', topic: 'Transition time after work', selfPerspective: 'Alex asks for 15 minutes before heavy conversations.', observerPerspective: 'Jordan has learned not to "ambush" Alex right after work.', synthesis: 'Both have identified this pattern. The 15-minute buffer is an established, working boundary.', gapSeverity: 'aligned' },
      ],
      gaps: [
        { id: 'g1', topic: 'Shutting down under stress', selfPerspective: 'Alex describes shutting down during the screen time disagreement but frames it as frustration at being dismissed.', observerPerspective: 'Jordan sees the shutdown as Alex going quiet and needing a full day to re-engage, which used to feel like coldness.', synthesis: 'Alex experiences the shutdown as a protective response; Jordan experiences it as withdrawal. Both understand it now, but it remains a growth edge — Alex could practice naming the need for space in the moment rather than simply going silent.', gapSeverity: 'moderate' },
        { id: 'g2', topic: 'Self-acceptance', selfPerspective: 'Alex rates self-acceptance at 2/4 — the lowest self-worth score.', observerPerspective: 'Jordan rates Alex\'s qualities at 4/4, higher than Alex rates themselves.', synthesis: 'There\'s a meaningful gap between how Alex sees themselves and how Jordan sees them. Alex may carry more self-criticism than is warranted — Jordan sees strengths Alex doesn\'t fully own.', gapSeverity: 'moderate' },
      ],
      blindSpots: [
        { id: 'b1', topic: 'The "bad cop" dynamic', description: 'Alex feels like the stricter parent but may not realize Jordan shares the same concerns about boundaries — they just express them differently. This could be an area for aligning parenting approaches rather than assuming roles.' },
      ],
    },
    createdAt: now,
    updatedAt: now,
    version: 1,
    lastEditedAt: now,
    lastEditedBy: uid,
  });
  console.log('✓ Alex manual + 2 contributions + synthesis');

  // ── JORDAN (observer contribution from Alex) ──
  const jordanObserverAnswers = {
    overview: {
      overview_q1: 'Jordan is incredibly social — they draw energy from being around people. They love hosting dinners, spontaneous plans, and are always up for an adventure.',
      overview_q2: 'Jordan struggles with rigid schedules and over-planning. They find it draining when everything has to be "just so."',
      overview_q3: 'Jordan is motivated by connection and experiences. They care deeply about their relationships being authentic and fun, not just functional.',
      overview_q4: 'Comfortable in social settings and with spontaneity. Uncomfortable with prolonged silence or when they feel someone is holding back.',
    },
    triggers: {
      triggers_q1: 'Jordan got upset when I made a parenting decision without consulting them first. They felt left out and like I didn\'t trust their judgment.',
      triggers_q2: 'Feeling excluded from decisions. When I withdraw and they don\'t know why. Long stretches without social plans.',
      triggers_q3: 'Talking it through immediately. Jordan processes out loud — they need to externalize to make sense of things. A hug helps too.',
    },
    what_works: {
      works_q1: 'Jordan needs to feel like an equal partner in all decisions, especially about Mia. They need social connection regularly and spontaneous fun mixed into routine.',
      works_q2: 'A weekend trip we took on a whim. No plan, just drove somewhere new. Jordan was the happiest I\'ve seen them in months.',
      works_q3: 'New experiences, meeting new people, hosting friends. Feeling like our relationship is alive and growing, not just running on autopilot.',
    },
    boundaries: {
      boundaries_q1: 'Don\'t make decisions about Mia without looping Jordan in. Don\'t mistake their sociability for superficiality — their friendships are deep.',
      boundaries_q2: 'Jordan\'s spontaneity isn\'t irresponsibility — it\'s how they feel alive. I used to see it as disorganized but it\'s actually a strength.',
      boundaries_q3: 'Dismissing their need for social time as "not important." Over-scheduling their weekends with chores. Going quiet on them when I\'m upset.',
    },
  };

  await setDoc(doc(db, 'contributions', 'demo-contrib-jordan-observer'), {
    contributionId: 'demo-contrib-jordan-observer',
    manualId: SPOUSE_MANUAL_ID,
    personId: SPOUSE_PERSON_ID,
    familyId: FAMILY_ID,
    contributorId: uid,
    contributorName: 'Alex Martin',
    perspectiveType: 'observer',
    relationshipToSubject: 'spouse',
    answers: jordanObserverAnswers,
    status: 'complete',
    createdAt: now,
    updatedAt: now,
  });

  await setDoc(doc(db, 'person_manuals', SPOUSE_MANUAL_ID), {
    manualId: SPOUSE_MANUAL_ID,
    familyId: FAMILY_ID,
    personId: SPOUSE_PERSON_ID,
    personName: 'Jordan Martin',
    relationshipType: 'spouse',
    coreInfo: { sensoryNeeds: [], interests: ['hosting', 'travel', 'social connection'], strengths: ['warmth', 'spontaneity', 'emotional openness'], notes: '' },
    triggers: [], whatWorks: [], whatDoesntWork: [], boundaries: [], emergingPatterns: [], progressNotes: [],
    totalTriggers: 0, totalStrategies: 0, totalBoundaries: 0,
    contributionIds: ['demo-contrib-jordan-observer'],
    perspectives: { observers: ['demo-contrib-jordan-observer'] },
    createdAt: now, updatedAt: now, version: 1, lastEditedAt: now, lastEditedBy: uid,
  });
  console.log('✓ Jordan manual + 1 contribution (no self-perspective yet — testable invite flow)');

  // ── MIA (observer contribution from Alex) ──
  const miaObserverAnswers = {
    overview: {
      overview_q1: 'Mia loves drawing, making up stories, and playing outside with the neighbor kids. She gets really excited about science experiments and anything hands-on.',
      overview_q2: 'She dislikes being rushed and really struggles with homework that feels pointless. Loud arguments between adults upset her a lot.',
      overview_q3: 'Mia is motivated by curiosity and creativity. She wants to understand how things work and loves showing us what she\'s made or learned.',
      overview_q4: 'Comfortable with routine, especially bedtime routine. Uncomfortable with surprises that involve new people or unexpected changes to plans.',
    },
    triggers: {
      triggers_q1: 'Mia had a meltdown last week when we told her we couldn\'t go to the park because of rain. She\'d been looking forward to it all day and the sudden change was too much.',
      triggers_q2: 'Transitions from fun activities to responsibilities (play → homework). Being told "no" without an explanation. Feeling like she\'s not being listened to.',
      triggers_q3: 'Giving her a five-minute warning before transitions. Explaining the "why" behind rules. Letting her draw or fidget while talking through feelings.',
    },
    what_works: {
      works_q1: 'Mia needs advance notice for any change in plans. She responds really well to choices ("Do you want to do homework before or after snack?"). She needs to feel her creativity is valued.',
      works_q2: 'A rainy Saturday where we did science experiments in the kitchen all morning. She was focused, happy, and cooperative the rest of the day.',
      works_q3: 'Creative projects, exploring nature, building things. Being given responsibility ("You\'re in charge of this part").',
    },
    boundaries: {
      boundaries_q1: 'Don\'t interrupt her when she\'s deep in a drawing — it\'s her flow state. Don\'t compare her to other kids. She picks up on adult tension even when we think we\'re hiding it.',
      boundaries_q2: 'Mia isn\'t being defiant when she asks "why" — she genuinely needs the reason to cooperate. Once I started explaining, the power struggles dropped by half.',
      boundaries_q3: 'Rushing her. Raising voices. Taking away drawing supplies as punishment — it\'s her emotional outlet.',
    },
  };

  await setDoc(doc(db, 'contributions', 'demo-contrib-mia-observer'), {
    contributionId: 'demo-contrib-mia-observer',
    manualId: CHILD_MANUAL_ID,
    personId: CHILD_PERSON_ID,
    familyId: FAMILY_ID,
    contributorId: uid,
    contributorName: 'Alex Martin',
    perspectiveType: 'observer',
    relationshipToSubject: 'parent',
    answers: miaObserverAnswers,
    status: 'complete',
    createdAt: now,
    updatedAt: now,
  });

  await setDoc(doc(db, 'person_manuals', CHILD_MANUAL_ID), {
    manualId: CHILD_MANUAL_ID,
    familyId: FAMILY_ID,
    personId: CHILD_PERSON_ID,
    personName: 'Mia Martin',
    relationshipType: 'child',
    coreInfo: { sensoryNeeds: [], interests: ['drawing', 'science', 'nature', 'storytelling'], strengths: ['creativity', 'curiosity', 'empathy'], notes: '' },
    triggers: [], whatWorks: [], whatDoesntWork: [], boundaries: [], emergingPatterns: [], progressNotes: [],
    totalTriggers: 0, totalStrategies: 0, totalBoundaries: 0,
    contributionIds: ['demo-contrib-mia-observer'],
    perspectives: { observers: ['demo-contrib-mia-observer'] },
    createdAt: now, updatedAt: now, version: 1, lastEditedAt: now, lastEditedBy: uid,
  });
  console.log('✓ Mia manual + 1 contribution (kid session available to test)');

  console.log('\n✅ Demo account ready!\n');
  console.log('  Email:    demo@relish.app');
  console.log('  Password: demo123456');
  console.log('');
  console.log('  What you can test:');
  console.log('  • Alex has full synthesis (self + observer) — view the 3-mode manual');
  console.log('  • Jordan has observer-only — test the spouse invite/self-onboard flow');
  console.log('  • Mia has observer-only — test the kid emoji session flow');
  console.log('  • Create new people, add more contributions, re-synthesize');
  console.log('');

  process.exit(0);
}

main().catch(e => { console.error('❌ Error:', e); process.exit(1); });
