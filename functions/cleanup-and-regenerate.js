const admin = require('firebase-admin');
const https = require('https');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanupOldActions() {
  console.log('🧹 Cleaning up old generic actions...\n');

  try {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find all actions created today
    const actionsSnapshot = await db.collection('daily_actions')
      .where('targetDate', '>=', admin.firestore.Timestamp.fromDate(today))
      .where('targetDate', '<', admin.firestore.Timestamp.fromDate(tomorrow))
      .get();

    if (actionsSnapshot.empty) {
      console.log('No actions found to clean up.');
      return 0;
    }

    console.log(`Found ${actionsSnapshot.size} action(s) to delete.\n`);

    // Delete each action
    const batch = db.batch();
    actionsSnapshot.forEach((doc) => {
      const action = doc.data();
      console.log(`  Deleting: "${action.title}" (ID: ${doc.id})`);
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`\n✅ Deleted ${actionsSnapshot.size} old action(s)\n`);

    return actionsSnapshot.size;
  } catch (error) {
    console.error('❌ Error cleaning up actions:', error);
    throw error;
  }
}

async function generateNewActions() {
  console.log('🤖 Generating fresh AI-powered actions...\n');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'us-central1-parentpulse-d68ba.cloudfunctions.net',
      path: '/generateDailyActionsManual',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            console.log('✅ Success!');
            console.log(`   Generated ${result.actionsCreated} personalized action(s)\n`);
            resolve(result);
          } catch (e) {
            console.log('✅ Function called successfully');
            console.log('   Response:', data, '\n');
            resolve({ success: true });
          }
        } else {
          console.error('❌ Error:', data);
          reject(new Error(data));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error calling function:', error.message);
      reject(error);
    });

    req.write(JSON.stringify({}));
    req.end();
  });
}

async function main() {
  console.log('🔄 ParentPulse: Cleanup & Regenerate Actions\n');
  console.log('This will:');
  console.log('  1. Delete old generic actions');
  console.log('  2. Generate fresh AI-personalized actions');
  console.log('  3. Show the results\n');
  console.log('━'.repeat(50) + '\n');

  try {
    // Step 1: Cleanup
    await cleanupOldActions();

    // Wait a moment
    console.log('⏳ Waiting 2 seconds before regenerating...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Generate new actions
    await generateNewActions();

    console.log('━'.repeat(50));
    console.log('\n✨ All done! Refresh your dashboard to see personalized actions.');
    console.log('📱 Dashboard: http://localhost:3000/dashboard\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  }
}

main();
