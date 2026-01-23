#!/usr/bin/env node

/**
 * Generate Demo Story Images
 *
 * This script generates AI images for the demo storybook and uploads them to Firebase Storage.
 * These images will be reused for all demo/test mode workbook generations to avoid API costs.
 *
 * Run: node scripts/generate-demo-story-images.js
 */

// Load environment variables from .env file
require('dotenv').config();

const admin = require('firebase-admin');
const { OpenAI } = require('openai');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'parentpulse-d68ba.firebasestorage.app'
  });
}

// Initialize OpenAI (use EXPO_PUBLIC_OPENAI_API_KEY or OPENAI_API_KEY)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

// Character info - must match sample-story-data.js
const characterName = "Alex";
const characterDescription = "a creative young builder";
const personAge = 8;

// Image prompts from sample-story-data.js - using exact illustrationPrompt values
const imagePrompts = [
  {
    day: 'monday',
    dayNumber: 1,
    illustrationPrompt: "A frustrated boy at a kitchen table with math homework, pencil thrown on floor, mom sitting beside him",
  },
  {
    day: 'tuesday',
    dayNumber: 2,
    illustrationPrompt: "Mom and son having a gentle conversation at the kitchen table, math homework visible, warm lighting",
  },
  {
    day: 'wednesday',
    dayNumber: 3,
    illustrationPrompt: "Boy bouncing happily on backyard trampoline, blue sky, house with homework table visible through window",
  },
  {
    day: 'thursday',
    dayNumber: 4,
    illustrationPrompt: "Boy at desk doing homework while using a small fidget cube, focused expression, completed math problems visible",
  },
  {
    day: 'friday',
    dayNumber: 5,
    illustrationPrompt: "Boy at computer playing Minecraft, building complex redstone elevator, determined and proud expression",
  },
  {
    day: 'saturday',
    dayNumber: 6,
    illustrationPrompt: "Boy at desk with completed homework, visual timer and fidget cube nearby, proud smile, sister impressed in background",
  },
  {
    day: 'sunday',
    dayNumber: 7,
    illustrationPrompt: "Boy sitting thoughtfully at bedroom window at night, peaceful expression, Minecraft LEGO creations on desk nearby, stars visible through window",
  },
];

async function generateAndUploadImage(dayData) {
  const { day, dayNumber, illustrationPrompt } = dayData;

  // Use EXACT same prompt structure as production (functions/index.js:2852-2880)
  const characterRef = dayNumber === 1 ?
    `Introduce ${characterName}, ${characterDescription}. This is the first illustration, establish character design.` :
    `Continue with ${characterName} (${characterDescription}) from previous illustrations. Maintain exact same character appearance, colors, and style.`;

  const fullPrompt = `
Children's book illustration in watercolor style:

${characterRef}

Scene: ${illustrationPrompt}

Style requirements:
- Watercolor or soft digital painting aesthetic
- Warm, friendly, inviting colors
- Age-appropriate for ${personAge} years old
- No scary or threatening elements
- Whimsical and playful tone
- High detail in character, moderate detail in background
- Picture book quality (professional children's book standard)

Composition:
- Main character clearly visible and expressive
- Clear emotion/action readable by young children
- Background supports but doesn't overwhelm story
`;

  console.log(`\n📸 Generating image for Day ${dayNumber} (${day})...`);
  console.log(`   Scene: ${illustrationPrompt}`);

  try {
    // Generate image with DALL-E 3
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: fullPrompt,
      n: 1,
      size: '1792x1024', // Landscape format, good for storybooks
      quality: 'standard', // Can use 'hd' for higher quality
      style: 'natural', // More realistic than 'vivid'
    });

    const imageUrl = response.data[0].url;
    console.log(`   ✓ Image generated: ${imageUrl}`);

    // Download the image
    console.log(`   ⬇️  Downloading image...`);
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.buffer();

    // Save locally
    const localDir = path.join(__dirname, '..', 'demo-story-images');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }

    const localFileName = `alex-story-day-${dayNumber}.png`;
    const localPath = path.join(localDir, localFileName);

    console.log(`   💾 Saving locally: ${localPath}`);
    fs.writeFileSync(localPath, imageBuffer);
    console.log(`   ✓ Saved successfully!`);

    return {
      day,
      dayNumber,
      localPath: localPath,
      firebaseFileName: `demo-story-images/${localFileName}`,
    };
  } catch (error) {
    console.error(`   ✗ Error generating/uploading image for day ${dayNumber}:`, error.message);
    throw error;
  }
}

async function generateAllImages() {
  console.log('🎨 Starting Demo Story Image Generation');
  console.log('========================================\n');
  console.log('This will generate 7 AI images for the Alex story and upload them to Firebase Storage.');
  console.log('These images will be permanently stored and reused for all demo workbooks.\n');

  const apiKey = process.env.OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: OPENAI_API_KEY or EXPO_PUBLIC_OPENAI_API_KEY environment variable not set');
    console.error('   Set it in your .env file or with: export OPENAI_API_KEY="your-key-here"');
    process.exit(1);
  }

  const results = [];

  // Generate images sequentially to avoid rate limits
  for (const dayData of imagePrompts) {
    try {
      const result = await generateAndUploadImage(dayData);
      results.push(result);

      // Wait a bit between generations to avoid rate limits
      if (dayData.dayNumber < 7) {
        console.log('   ⏳ Waiting 3 seconds before next generation...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.error(`\n❌ Failed to generate image for day ${dayData.dayNumber}`);
      console.error('Stopping script. Fix the error and run again.');
      process.exit(1);
    }
  }

  // Generate updated sample-story-data.js content
  console.log('\n\n✅ All images generated and saved locally!');
  console.log('\n📂 Images saved to: demo-story-images/\n');
  console.log('========================================\n');

  results.forEach(({ day, dayNumber, localPath, firebaseFileName }) => {
    console.log(`Day ${dayNumber} (${day}):`);
    console.log(`  Local: ${localPath}`);
    console.log(`  Firebase path: ${firebaseFileName}\n`);
  });

  console.log('========================================\n');
  console.log('\n📤 Next Steps:\n');
  console.log('1. Upload images to Firebase Storage:');
  console.log('   Go to Firebase Console > Storage > Upload Folder');
  console.log('   Upload the entire "demo-story-images" folder\n');
  console.log('2. Get the public URLs from Firebase Storage\n');
  console.log('3. Update functions/sample-story-data.js:');
  console.log('   - Change illustrationStatus from "pending" to "complete"');
  console.log('   - Add the illustrationUrl for each day\n');
  console.log('\n🎉 Done! Your demo storybook images are ready for upload.');
}

// Run the script
generateAllImages().catch((error) => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
});
