const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function checkOrphanedUsers() {
  console.log('\n=== CHECKING FOR ORPHANED AUTH USERS ===\n');

  try {
    // Get all auth users
    const listUsersResult = await auth.listUsers();
    const authUsers = listUsersResult.users;

    console.log(`Total Auth Users: ${authUsers.length}\n`);

    const orphanedUsers = [];
    const validUsers = [];

    // Check each auth user for corresponding Firestore document
    for (const authUser of authUsers) {
      const userDoc = await db.collection('users').doc(authUser.uid).get();

      if (!userDoc.exists) {
        orphanedUsers.push(authUser);
        console.log('❌ ORPHANED AUTH USER:');
        console.log('   UID:', authUser.uid);
        console.log('   Email:', authUser.email || 'N/A');
        console.log('   Display Name:', authUser.displayName || 'N/A');
        console.log('   Created:', new Date(authUser.metadata.creationTime).toLocaleString());
        console.log('   Last Sign In:', authUser.metadata.lastSignInTime
          ? new Date(authUser.metadata.lastSignInTime).toLocaleString()
          : 'Never');
        console.log('');
      } else {
        validUsers.push(authUser);
        const userData = userDoc.data();
        console.log('✅ Valid User:');
        console.log('   UID:', authUser.uid);
        console.log('   Email:', authUser.email || 'N/A');
        console.log('   Name:', userData.name);
        console.log('   Role:', userData.role);
        console.log('   Family ID:', userData.familyId);
        console.log('');
      }
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Valid Users: ${validUsers.length}`);
    console.log(`Orphaned Auth Users: ${orphanedUsers.length}`);

    if (orphanedUsers.length > 0) {
      console.log('\n⚠️  WARNING: Found orphaned auth users!');
      console.log('These users have Firebase Auth accounts but no Firestore user documents.');
      console.log('They will be automatically signed out by the application.');
      console.log('\nTo clean up orphaned users, run:');
      console.log('  node scripts/cleanup-orphaned-users.js');
    } else {
      console.log('\n✅ No orphaned users found. All auth accounts have valid Firestore documents.');
    }

  } catch (error) {
    console.error('Error checking users:', error);
  }

  process.exit(0);
}

checkOrphanedUsers().catch(console.error);
