/**
 * Create workbook activities (GrowthItem docs) tied to the Kaleb
 * sibling-fairness conversation. Grounded in Kaleb's manual:
 *   - He thrives on agency and 1:1 time
 *   - Counting-to-three works better than repeated demands
 *   - Comparison to Ella is a significant trigger
 *   - Escalation pattern: provocation → refusal → consequence → hurt feelings
 *
 * Two parents (Scott, Iris) each get a tailored set of items targeting Kaleb.
 * Speed: intentional (7-day window). Each item includes a lineage reference
 * back to the source chat session so the workbook can show where it came from.
 */

const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const SOURCE_SESSION_ID = 'o9AelJSLjh4YwwP9WwAn'; // Last night's Kaleb conversation

async function main() {
  // Look up Kaleb
  const peopleSnap = await db.collection('people').get();
  const kaleb = peopleSnap.docs.find(
    (d) => d.data().name?.toLowerCase().includes('kaleb'),
  );
  if (!kaleb) throw new Error('Kaleb not found');

  const kalebId = kaleb.id;
  const kalebName = kaleb.data().name;
  const familyId = kaleb.data().familyId;

  // Find parents (users with role=parent in this family)
  const parentsSnap = await db.collection('users')
    .where('familyId', '==', familyId)
    .where('role', '==', 'parent')
    .get();

  const parents = parentsSnap.docs.map((d) => ({
    userId: d.id,
    name: d.data().name || d.data().displayName || 'Parent',
    firstName: (d.data().name || '').split(' ')[0] || 'Parent',
  }));

  const scott = parents.find((p) => p.firstName.toLowerCase() === 'scott');
  const iris = parents.find((p) => p.firstName.toLowerCase() === 'iris');

  if (!scott || !iris) {
    console.log('Parents found:', parents.map((p) => p.firstName));
    throw new Error('Expected both Scott and Iris as parents');
  }

  console.log(`\nCreating workbook activities targeting ${kalebName}`);
  console.log(`  familyId: ${familyId}`);
  console.log(`  Scott userId: ${scott.userId}`);
  console.log(`  Iris userId: ${iris.userId}`);
  console.log(`  Source chat session: ${SOURCE_SESSION_ID}\n`);

  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  );

  const baseFields = {
    familyId,
    targetPersonIds: [kalebId],
    targetPersonNames: [kalebName],
    speed: 'intentional',
    scheduledDate: now,
    expiresAt,
    status: 'active',
    statusUpdatedAt: now,
    sourceChatSessionId: SOURCE_SESSION_ID,
    sourceInsightType: 'gap',
    createdAt: now,
    generatedBy: 'ai',
    batchId: `kaleb-sibling-${Date.now()}`,
  };

  const items = [
    // ========== FOR IRIS ==========
    {
      ...baseFields,
      type: 'reflection_prompt',
      title: 'The "taking sides" trap',
      body: `Next time ${kalebName} provokes a sibling conflict, notice whether you explain why the other kid's response was reasonable. To ${kalebName}, that can land as taking sides. Try naming his experience AND the boundary — both are true.`,
      emoji: '◎',
      assignedToUserId: iris.userId,
      assignedToUserName: iris.name,
      estimatedMinutes: 2,
      depthTier: 'light',
    },
    {
      ...baseFields,
      type: 'micro_activity',
      title: `5-minute 1:1 with ${kalebName} after a rupture`,
      body: `After a conflict with his sister, find 5 minutes alone with ${kalebName}. Don't relitigate. Just say: "I noticed you felt like I cared more about Ella. Tell me about it." Listen without defending.`,
      emoji: '✦',
      assignedToUserId: iris.userId,
      assignedToUserName: iris.name,
      estimatedMinutes: 5,
      depthTier: 'moderate',
    },
    {
      ...baseFields,
      type: 'conversation_guide',
      title: 'Counting to three, not escalating demands',
      body: `The manual shows ${kalebName} responds to "1... 2... 3..." better than repeated demands. Try it this week when he ignores a first request. Notice what happens differently.`,
      emoji: '▲',
      assignedToUserId: iris.userId,
      assignedToUserName: iris.name,
      estimatedMinutes: 3,
      depthTier: 'light',
    },

    // ========== FOR SCOTT ==========
    {
      ...baseFields,
      type: 'journaling',
      title: `Track when ${kalebName} says "you love Ella more"`,
      body: `For the next week, jot a quick note every time ${kalebName} brings up the sibling-comparison narrative. What happened right before? Who said what? Look for the trigger — it's probably more specific than "always."`,
      emoji: '◆',
      assignedToUserId: iris.userId,
      assignedToUserName: iris.name,
      estimatedMinutes: 3,
      depthTier: 'light',
    },
    {
      ...baseFields,
      type: 'partner_exercise',
      title: 'Shared language for sibling fairness',
      body: `Sit with Iris for 15 minutes. Agree on one sentence you'll both use when ${kalebName} says "you love Ella more" — something that names his feeling without conceding it. Write it down so you're both armed next time.`,
      emoji: '◆',
      assignedToUserId: scott.userId,
      assignedToUserName: scott.name,
      estimatedMinutes: 15,
      depthTier: 'moderate',
      relationalLevel: 'couple',
    },
    {
      ...baseFields,
      type: 'solo_deep_dive',
      title: `What does ${kalebName} need to hear about being valued?`,
      body: `His manual shows he thrives on competence, achievement, and agency — but struggles with self-worth. Write down 3 specific things you value about him that have nothing to do with Ella. Tell him one this week.`,
      emoji: '✦',
      assignedToUserId: scott.userId,
      assignedToUserName: scott.name,
      estimatedMinutes: 10,
      depthTier: 'deep',
    },
  ];

  // Write all items
  const batch = db.batch();
  const createdIds = [];
  for (const item of items) {
    const ref = db.collection('growth_items').doc();
    batch.set(ref, { ...item, growthItemId: ref.id });
    createdIds.push({ id: ref.id, title: item.title, for: item.assignedToUserName });
  }
  await batch.commit();

  console.log(`✓ Created ${items.length} workbook activities\n`);
  createdIds.forEach((i) => {
    console.log(`  [${i.for.padEnd(15)}] ${i.title}`);
  });
  console.log();

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
