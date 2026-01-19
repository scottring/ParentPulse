const admin = require('firebase-admin');
const readline = require('readline');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function cleanupOrphanedUsers() {
  console.log('\n=== CLEANUP ORPHANED AUTH USERS ===\n');
  console.log('⚠️  WARNING: This will permanently delete Firebase Auth accounts that have no Firestore user document.\n');

  try {
    // Get all auth users
    const listUsersResult = await auth.listUsers();
    const authUsers = listUsersResult.users;

    const orphanedUsers = [];

    // Find orphaned users
    for (const authUser of authUsers) {
      const userDoc = await db.collection('users').doc(authUser.uid).get();

      if (!userDoc.exists) {
        orphanedUsers.push(authUser);
      }
    }

    if (orphanedUsers.length === 0) {
      console.log('✅ No orphaned users found. Nothing to clean up.');
      rl.close();
      process.exit(0);
      return;
    }

    console.log(`Found ${orphanedUsers.length} orphaned user(s):\n`);

    orphanedUsers.forEach((user, index) => {
      console.log(`${index + 1}. UID: ${user.uid}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Display Name: ${user.displayName || 'N/A'}`);
      console.log(`   Created: ${new Date(user.metadata.creationTime).toLocaleString()}`);
      console.log('');
    });

    const answer = await question('Do you want to delete these orphaned auth accounts? (yes/no): ');

    if (answer.toLowerCase() !== 'yes') {
      console.log('\nOperation cancelled. No users were deleted.');
      rl.close();
      process.exit(0);
      return;
    }

    console.log('\nDeleting orphaned auth accounts...\n');

    let successCount = 0;
    let failCount = 0;

    for (const user of orphanedUsers) {
      try {
        await auth.deleteUser(user.uid);
        console.log(`✅ Deleted: ${user.email || user.uid}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to delete ${user.email || user.uid}:`, error.message);
        failCount++;
      }
    }

    console.log('\n=== CLEANUP COMPLETE ===');
    console.log(`Successfully deleted: ${successCount}`);
    console.log(`Failed: ${failCount}`);

  } catch (error) {
    console.error('Error during cleanup:', error);
  }

  rl.close();
  process.exit(0);
}

cleanupOrphanedUsers().catch(console.error);
