#!/usr/bin/env node

/**
 * Upload Demo Story Images to Firebase Storage
 *
 * Uploads the locally generated demo images to Firebase Storage
 */

require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'parentpulse-d68ba.firebasestorage.app'
  });
}

async function uploadImages() {
  console.log('📤 Uploading demo story images to Firebase Storage...\n');

  const bucket = admin.storage().bucket();
  const localDir = path.join(__dirname, '..', 'demo-story-images');

  for (let i = 1; i <= 7; i++) {
    const fileName = `alex-story-day-${i}.png`;
    const localPath = path.join(localDir, fileName);
    const storagePath = `demo-story-images/${fileName}`;

    try {
      console.log(`   Uploading day ${i}...`);

      // Upload the file
      await bucket.upload(localPath, {
        destination: storagePath,
        metadata: {
          contentType: 'image/png',
          cacheControl: 'public, max-age=31536000',
        },
      });

      console.log(`   ✓ Day ${i} uploaded to ${storagePath}`);

      // Get the public URL (will work once storage rules are applied)
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
      console.log(`   📍 URL: ${publicUrl}\n`);
    } catch (error) {
      console.error(`   ✗ Error uploading day ${i}:`, error.message);
    }
  }

  console.log('\n✅ Done!\n');
  console.log('All images uploaded. They should be publicly accessible via storage rules.');
  console.log('If images still show 403 errors, check Firebase Console > Storage for permissions.\n');
}

uploadImages().then(() => process.exit(0)).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
