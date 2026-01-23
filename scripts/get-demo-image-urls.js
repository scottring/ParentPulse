#!/usr/bin/env node

/**
 * Get Download URLs for Demo Story Images
 *
 * Gets the proper Firebase Storage download URLs (with tokens) for demo images
 */

require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'parentpulse-d68ba.firebasestorage.app'
  });
}

async function getDownloadUrls() {
  console.log('📥 Getting download URLs for demo story images...\n');

  const bucket = admin.storage().bucket();
  const urls = {};

  for (let i = 1; i <= 7; i++) {
    const fileName = `demo-story-images/alex-story-day-${i}.png`;
    const file = bucket.file(fileName);

    try {
      // Get file metadata which includes download tokens
      const [metadata] = await file.getMetadata();

      // Get the download token
      const token = metadata.metadata?.firebaseStorageDownloadTokens;

      if (token) {
        // Construct the Firebase Storage download URL with token
        const bucketName = bucket.name;
        const encodedPath = encodeURIComponent(fileName);
        const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;

        urls[i] = url;
        console.log(`Day ${i}: ✓`);
        console.log(`   ${url}\n`);
      } else {
        console.log(`Day ${i}: No download token found`);
      }
    } catch (error) {
      console.error(`Error getting URL for day ${i}:`, error.message);
    }
  }

  console.log('\n✅ All URLs retrieved!');
  console.log('\n📝 Update functions/sample-story-data.js with these URLs:\n');

  for (let i = 1; i <= 7; i++) {
    if (urls[i]) {
      console.log(`  illustrationUrl: "${urls[i]}",`);
    }
  }
}

getDownloadUrls().then(() => process.exit(0)).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
