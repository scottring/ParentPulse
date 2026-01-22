/**
 * Fix Demo Workbook Illustrations
 *
 * Updates demo workbooks to use placeholder images instead of "generating" status
 * Run with: node scripts/fix-demo-workbook-illustrations.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (uses default credentials from Firebase CLI)
if (!admin.apps.length) {
  admin.initializeApp();
}

const DEMO_FAMILY_ID = 'demo-family-2026';

// No placeholder images - just set to null with "pending" status
// This shows a clean "Picture coming soon!" message instead of text placeholders

async function fixDemoWorkbookIllustrations() {
  const db = admin.firestore();

  console.log('🔍 Looking for demo family child workbooks...');

  try {
    // Find all child workbooks for demo family
    const workbooksSnapshot = await db.collection('child_workbooks')
      .where('familyId', '==', DEMO_FAMILY_ID)
      .get();

    if (workbooksSnapshot.empty) {
      console.log('⚠️  No demo workbooks found');
      return;
    }

    console.log(`📚 Found ${workbooksSnapshot.size} demo workbook(s)`);

    let updatedCount = 0;

    // Update each workbook
    for (const doc of workbooksSnapshot.docs) {
      const workbook = doc.data();

      console.log(`\n📖 Processing workbook: ${doc.id}`);
      console.log(`   Story: "${workbook.weeklyStory?.title || 'Unknown'}"`);

      // Check if story has fragments with generating status
      if (!workbook.weeklyStory?.dailyFragments) {
        console.log('   ⚠️  No daily fragments found, skipping');
        continue;
      }

      const needsUpdate = workbook.weeklyStory.dailyFragments.some(
        f => f.illustrationStatus === 'generating' || !f.illustrationUrl
      );

      if (!needsUpdate) {
        console.log('   ✓ Already has complete illustrations');
        continue;
      }

      // Update the fragments - set to null with "pending" status
      const updatedFragments = workbook.weeklyStory.dailyFragments.map((fragment) => ({
        ...fragment,
        illustrationUrl: null,
        illustrationStatus: 'pending',
        illustrationThumbnail: null,
      }));

      // Update the workbook
      await doc.ref.update({
        'weeklyStory.dailyFragments': updatedFragments,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('   ✅ Updated illustrations to use placeholders');
      updatedCount++;
    }

    console.log(`\n✅ Done! Updated ${updatedCount} workbook(s)`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fixing demo workbook illustrations:', error);
    process.exit(1);
  }
}

fixDemoWorkbookIllustrations();
