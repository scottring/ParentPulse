/**
 * Script to create demo user in Firestore
 * Run with: node scripts/setup-demo-user.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (uses default credentials from Firebase CLI)
admin.initializeApp();

const AUTH_UID = '1j5c2eemsTZtd3Af0JGFyIdL8hx2';
const FAMILY_ID = 'demo-family-2026';

async function setupDemoUser() {
  const db = admin.firestore();

  console.log('Setting up demo user...');

  try {
    // Create user document
    const userRef = db.collection('users').doc(AUTH_UID);
    await userRef.set({
      userId: AUTH_UID,
      email: 'demo@relish.app',
      familyId: FAMILY_ID,
      name: 'Demo Parent',
      role: 'parent',
      isDemo: true,
      isAdmin: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      settings: {
        notifications: true,
        theme: 'light'
      }
    });

    console.log('✓ Created user document:', AUTH_UID);

    // Create family document
    const familyRef = db.collection('families').doc(FAMILY_ID);
    await familyRef.set({
      familyId: FAMILY_ID,
      name: 'Demo Family',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      parentIds: [AUTH_UID],
      childIds: [],
      settings: {
        chipSystemEnabled: false,
        dailyCheckInReminder: false,
        weeklyInsightsEnabled: false
      }
    });

    console.log('✓ Created family document:', FAMILY_ID);

    console.log('\n✅ Demo user setup complete!');
    console.log('\nYou can now log in with:');
    console.log('  Email: demo@relish.app');
    console.log('  Password: demo123456');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up demo user:', error);
    process.exit(1);
  }
}

setupDemoUser();
