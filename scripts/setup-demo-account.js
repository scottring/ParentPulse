/**
 * Setup Demo Account Script
 *
 * Creates or resets the demo account with a known password.
 * Run with: node scripts/setup-demo-account.js
 *
 * Requires Firebase Admin SDK credentials.
 */

const admin = require('firebase-admin');
const path = require('path');

// Demo account configuration
const DEMO_EMAIL = 'demo@relish.app';
const DEMO_PASSWORD = 'demo123456';
const DEMO_NAME = 'Demo Parent';

async function setupDemoAccount() {
  // Initialize Firebase Admin
  // Try to use service account if available, otherwise use default credentials
  try {
    const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
    const serviceAccount = require(serviceAccountPath);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✓ Initialized with service account');
  } catch (err) {
    // Try default credentials (for Cloud Shell or environments with ADC)
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'parentpulse-d68ba',
      });
      console.log('✓ Initialized with application default credentials');
    } catch (err2) {
      console.error('❌ Failed to initialize Firebase Admin SDK');
      console.error('   Please ensure you have either:');
      console.error('   1. A service-account.json file in the project root');
      console.error('   2. GOOGLE_APPLICATION_CREDENTIALS env var set');
      console.error('   3. Running in a GCP environment with default credentials');
      process.exit(1);
    }
  }

  const auth = admin.auth();
  const firestore = admin.firestore();

  try {
    // Check if demo user exists
    let demoUser;
    try {
      demoUser = await auth.getUserByEmail(DEMO_EMAIL);
      console.log('✓ Found existing demo user:', demoUser.uid);

      // Update the password
      await auth.updateUser(demoUser.uid, {
        password: DEMO_PASSWORD,
        displayName: DEMO_NAME,
      });
      console.log('✓ Updated demo user password');

    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        // Create new demo user
        console.log('→ Demo user not found, creating new one...');

        demoUser = await auth.createUser({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          displayName: DEMO_NAME,
          emailVerified: true,
        });
        console.log('✓ Created new demo user:', demoUser.uid);
      } else {
        throw err;
      }
    }

    // Check/create family document
    const familyId = 'demo-family';
    const familyRef = firestore.collection('families').doc(familyId);
    const familyDoc = await familyRef.get();

    if (!familyDoc.exists) {
      await familyRef.set({
        familyId,
        name: 'Demo Family',
        createdBy: demoUser.uid,
        members: [demoUser.uid],
        pendingInvites: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        parentIds: [demoUser.uid],
        childIds: [],
        settings: {
          chipSystemEnabled: true,
          weeklyResetDay: 0,
          startingChipBalance: 10,
        },
      });
      console.log('✓ Created demo family');
    } else {
      console.log('✓ Demo family already exists');
    }

    // Check/create user document
    const userRef = firestore.collection('users').doc(demoUser.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        userId: demoUser.uid,
        familyId,
        role: 'parent',
        name: DEMO_NAME,
        email: DEMO_EMAIL,
        isDemo: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        settings: {
          notifications: true,
          theme: 'light',
        },
      });
      console.log('✓ Created demo user document');
    } else {
      // Update to ensure correct fields
      await userRef.update({
        role: 'parent',
        familyId,
        isDemo: true,
      });
      console.log('✓ Updated demo user document');
    }

    console.log('\n========================================');
    console.log('Demo account ready!');
    console.log('========================================');
    console.log(`Email:    ${DEMO_EMAIL}`);
    console.log(`Password: ${DEMO_PASSWORD}`);
    console.log(`User ID:  ${demoUser.uid}`);
    console.log(`Family:   ${familyId}`);
    console.log('========================================\n');

  } catch (err) {
    console.error('❌ Error setting up demo account:', err.message);
    process.exit(1);
  }

  process.exit(0);
}

setupDemoAccount();
