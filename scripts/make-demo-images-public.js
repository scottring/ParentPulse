#!/usr/bin/env node

/**
 * Make Demo Story Images Public
 *
 * Sets the images to be publicly accessible
 */

require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'parentpulse-d68ba.firebasestorage.app'
  });
}

async function makeImagesPublic() {
  console.log('🔓 Making demo story images public...\n');

  const bucket = admin.storage().bucket();

  for (let i = 1; i <= 7; i++) {
    const fileName = `demo-story-images/alex-story-day-${i}.png`;
    const file = bucket.file(fileName);

    try {
      console.log(`   Processing day ${i}...`);

      // Make the file publicly readable
      await file.makePublic();

      // Get the public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      console.log(`   ✓ Day ${i} is now public: ${publicUrl}\n`);
    } catch (error) {
      console.error(`   ✗ Error making day ${i} public:`, error.message);
    }
  }

  console.log('\n✅ Done!\n');
  console.log('Your demo storybook images are now publicly accessible.');
  console.log('They will be used for all demo/test mode workbook generations.\n');
}

makeImagesPublic().then(() => process.exit(0)).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
