const admin = require('firebase-admin');
const { getFunctions, httpsCallable } = require('firebase-functions');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createTestJournalEntry() {
  try {
    console.log('Creating test journal entry...');

    // First, get the first parent user
    const usersSnapshot = await db.collection('users')
      .where('role', '==', 'parent')
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.error('No parent users found. Please create a parent account first.');
      return null;
    }

    const parentDoc = usersSnapshot.docs[0];
    const parent = parentDoc.data();

    console.log('Found parent:', parent.name);

    // Get children for this family
    const childrenSnapshot = await db.collection('users')
      .where('familyId', '==', parent.familyId)
      .where('role', '==', 'child')
      .limit(1)
      .get();

    if (childrenSnapshot.empty) {
      console.log('No children found. Creating a test child...');
      // Create a test child
      const childRef = await db.collection('users').add({
        name: 'Test Child',
        email: 'testchild@test.com',
        role: 'child',
        familyId: parent.familyId,
        chipBalance: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      var childId = childRef.id;
    } else {
      var childId = childrenSnapshot.docs[0].id;
    }

    console.log('Using child ID:', childId);

    // Create a test journal entry
    const entryRef = await db.collection('journal_entries').add({
      familyId: parent.familyId,
      authorId: parentDoc.id,
      childId: childId,
      category: 'challenge',
      text: 'Today was really tough. My child had a meltdown at the grocery store when I said no to candy. They screamed for 10 minutes and I felt so embarrassed. I tried to stay calm but ended up raising my voice. I know I need better strategies for handling tantrums in public.',
      context: {
        timeOfDay: 'afternoon',
        stressLevel: 4
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      photoUrls: [],
      tags: ['tantrum', 'public', 'grocery store']
    });

    console.log('✅ Created journal entry:', entryRef.id);

    // Create another entry
    const entry2Ref = await db.collection('journal_entries').add({
      familyId: parent.familyId,
      authorId: parentDoc.id,
      childId: childId,
      category: 'win',
      text: 'Great progress today! My child used their words to express frustration instead of throwing toys. We practiced the calm-down techniques from that parenting book, and it really worked! They took deep breaths and told me they were angry instead of acting out.',
      context: {
        timeOfDay: 'evening',
        stressLevel: 2
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      photoUrls: [],
      tags: ['communication', 'progress', 'emotional regulation']
    });

    console.log('✅ Created second journal entry:', entry2Ref.id);

    return { parentId: parentDoc.id, familyId: parent.familyId };

  } catch (error) {
    console.error('Error creating test data:', error);
    return null;
  }
}

async function triggerActionGeneration() {
  try {
    console.log('\n🤖 Triggering AI action generation...');

    // Call the manual generation function via HTTP
    const response = await fetch('https://us-central1-parentpulse-d68ba.cloudfunctions.net/generateDailyActionsManual', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error response:', error);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Action generation complete!');
    console.log('Result:', JSON.stringify(result, null, 2));

    return result;

  } catch (error) {
    console.error('Error triggering action generation:', error);
    return null;
  }
}

async function main() {
  console.log('🧪 ParentPulse Test Script\n');
  console.log('This will:');
  console.log('1. Create test journal entries');
  console.log('2. Trigger AI action generation');
  console.log('3. Show the generated actions\n');

  // Create test data
  const testData = await createTestJournalEntry();

  if (!testData) {
    console.error('❌ Failed to create test data');
    process.exit(1);
  }

  console.log('\n⏳ Waiting 2 seconds before triggering AI...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Trigger action generation
  const result = await triggerActionGeneration();

  if (!result) {
    console.error('❌ Failed to generate actions');
    process.exit(1);
  }

  console.log('\n✅ Test complete! Check your dashboard to see the generated actions.');
  console.log('Dashboard URL: http://localhost:3000/dashboard');

  process.exit(0);
}

main();
