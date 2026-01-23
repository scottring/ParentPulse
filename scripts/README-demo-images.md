# Generate Demo Story Images

This guide explains how to generate and store permanent AI-generated images for the demo storybook.

## What This Does

The script generates 7 AI illustrations for Alex's story using DALL-E 3, uploads them to Firebase Storage, and provides URLs to update in your sample data. These images will be reused for all demo/test mode workbooks, avoiding repeated API costs.

## Prerequisites

1. **OpenAI API Key**: You need an OpenAI API key with access to DALL-E 3
2. **Firebase Admin Access**: The script uses your Firebase Admin credentials
3. **Node Dependencies**: The script needs `openai` and `node-fetch` packages

## Setup

### 1. Install Dependencies

```bash
cd /Users/scottkaufman/Documents/Developer/parentpulse-web
npm install openai node-fetch
```

### 2. Set Your OpenAI API Key

```bash
export OPENAI_API_KEY="sk-your-openai-api-key-here"
```

Or add it to your `.env` file if you have one.

### 3. Authenticate with Firebase

Make sure you're logged in to Firebase:

```bash
firebase login
```

## Running the Script

```bash
node scripts/generate-demo-story-images.js
```

## What Happens

The script will:

1. Generate 7 images using DALL-E 3 (takes ~5-10 minutes)
2. Upload each image to Firebase Storage at `demo-story-images/`
3. Make the images publicly accessible
4. Print the URLs you need to copy into `sample-story-data.js`

## Cost Estimate

- DALL-E 3 (1792x1024, standard quality): ~$0.08 per image
- **Total one-time cost: ~$0.56 for all 7 images**

These images will be reused indefinitely for all demo accounts, so this is a one-time expense.

## After Generation

1. Copy the printed URLs from the script output
2. Update `functions/sample-story-data.js`:
   - Change each fragment's `illustrationStatus` from `"pending"` to `"complete"`
   - Add the `illustrationUrl` for each day

Example:
```javascript
{
  day: "monday",
  dayNumber: 1,
  fragmentText: "...",
  illustrationPrompt: "...",
  illustrationUrl: "https://storage.googleapis.com/your-bucket/demo-story-images/alex-story-day-1.png",
  illustrationStatus: "complete",  // Changed from "pending"
  wordCount: 85,
  estimatedReadTime: 3,
}
```

## Troubleshooting

### "OPENAI_API_KEY environment variable not set"
Set your OpenAI API key:
```bash
export OPENAI_API_KEY="sk-your-key"
```

### "Firebase authentication error"
Run `firebase login` to authenticate.

### Rate Limit Errors
The script waits 3 seconds between generations. If you still hit rate limits, you can increase this delay in the script.

## Regenerating Specific Images

If you want to regenerate just one image, you can modify the script to only process specific days, or manually delete the image from Firebase Storage and re-run the script.
