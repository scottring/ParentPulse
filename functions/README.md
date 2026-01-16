# ParentPulse Cloud Functions

This directory contains Firebase Cloud Functions for ParentPulse, including the AI-powered daily action generation.

## Features

- **Daily Action Generation**: Scheduled function that runs at 9 PM daily to analyze journal entries and generate actionable items for the next day
- **Manual Trigger**: Callable function to test action generation on demand
- **Cost-Effective AI**: Uses GPT-4o-mini by default (~20x cheaper than Claude)
- **Fallback System**: Provides basic actions if AI API fails

## Setup

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Set Up API Key

#### Option A: OpenAI (GPT-4o-mini) - **Recommended**

1. Get an API key from https://platform.openai.com/api-keys
2. Set it in Firebase:

```bash
firebase functions:secrets:set OPENAI_API_KEY
# Enter your API key when prompted
```

#### Option B: Claude (Anthropic) - More expensive, exceptional quality

1. Rename `index-claude.js` to `index.js` (backup the OpenAI version first)
2. Update `package.json` dependencies:
   ```json
   "dependencies": {
     "firebase-admin": "^12.0.0",
     "firebase-functions": "^5.0.0",
     "@anthropic-ai/sdk": "^0.20.0"
   }
   ```
3. Get an API key from https://console.anthropic.com/
4. Set it in Firebase:
   ```bash
   firebase functions:secrets:set ANTHROPIC_API_KEY
   ```

### 3. Update Timezone (Optional)

Edit `index.js` and change the timezone in the schedule config:

```javascript
{
  schedule: "0 21 * * *", // 9 PM daily
  timeZone: "America/Los_Angeles", // Change this to your timezone
  memory: "512MiB",
  secrets: ["OPENAI_API_KEY"],
}
```

Common timezones:
- `America/New_York` (EST/EDT)
- `America/Chicago` (CST/CDT)
- `America/Denver` (MST/MDT)
- `America/Los_Angeles` (PST/PDT)
- `America/Phoenix` (MST, no DST)
- `Europe/London`
- `Europe/Paris`

### 4. Deploy

```bash
cd functions
npm run deploy
```

Or from the root directory:

```bash
firebase deploy --only functions
```

## Testing

### Manual Testing via CLI

Test the function manually without waiting for 9 PM:

```bash
# First, deploy the function
firebase deploy --only functions

# Then call it manually (from the root directory, not functions/)
firebase functions:call generateDailyActionsManual --data '{}'
```

### Testing in the App

You can add a test button to your dashboard temporarily:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const generateActions = httpsCallable(functions, 'generateDailyActionsManual');

// In your component:
const handleTestGeneration = async () => {
  try {
    const result = await generateActions();
    console.log('Actions generated:', result.data);
    alert('Actions generated successfully!');
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to generate actions');
  }
};

// Button:
<button onClick={handleTestGeneration}>
  Test Action Generation
</button>
```

### Creating Test Actions Manually

For immediate testing without waiting for AI, you can manually create actions in Firestore Console:

1. Go to Firebase Console → Firestore Database
2. Add a document to `daily_actions` collection:

```json
{
  "familyId": "your-family-id",
  "generatedAt": "2025-01-16T21:00:00Z",
  "targetDate": "2025-01-17T00:00:00Z",
  "title": "Spend 15 minutes one-on-one with each child",
  "description": "Put away devices and give each child 15 minutes of undivided attention. Let them choose the activity.",
  "estimatedMinutes": 30,
  "priority": "high",
  "reasoning": "Recent journal entries show you've been distracted. Brief focused time significantly improves connection.",
  "relatedJournalEntries": [],
  "relatedKnowledgeIds": [],
  "status": "pending"
}
```

## Cost Estimates

### GPT-4o-mini (Recommended)
- **Input**: $0.15 per 1M tokens
- **Output**: $0.60 per 1M tokens
- **Daily cost per family**: ~$0.001-0.005
- **Monthly cost for 100 families**: ~$5-15

### Claude Sonnet 3.5 (Premium)
- **Input**: $3 per 1M tokens
- **Output**: $15 per 1M tokens
- **Daily cost per family**: ~$0.02-0.10
- **Monthly cost for 100 families**: ~$60-300

### GPT-4o (Middle Ground)
- **Input**: $2.50 per 1M tokens
- **Output**: $10 per 1M tokens
- **Daily cost per family**: ~$0.015-0.08
- **Monthly cost for 100 families**: ~$45-240

## Monitoring

### View Logs

```bash
firebase functions:log
```

### View Specific Function Logs

```bash
firebase functions:log --only generateDailyActions
```

### Check Function Status

Go to Firebase Console → Functions to see:
- Execution count
- Error rate
- Execution time
- Memory usage

## Customization

### Adjust Number of Actions

In `buildAnalysisPrompt()`, change the range:

```javascript
// Current: 2-5 actions
"Generate 2-5 specific actions for tomorrow."

// More focused: 1-3 actions
"Generate 1-3 specific actions for tomorrow."

// More comprehensive: 3-7 actions
"Generate 3-7 specific actions for tomorrow."
```

### Adjust Time Limits

In `generateActionsWithAI()`, modify the validation:

```javascript
// Current: 5-30 minutes
estimatedMinutes: Math.min(30, Math.max(5, action.estimatedMinutes || 15))

// Shorter: 5-15 minutes
estimatedMinutes: Math.min(15, Math.max(5, action.estimatedMinutes || 10))

// Longer: 10-60 minutes
estimatedMinutes: Math.min(60, Math.max(10, action.estimatedMinutes || 20))
```

### Change Schedule Time

In the `onSchedule` config:

```javascript
schedule: "0 21 * * *", // 9 PM daily

// Other examples:
"0 20 * * *"  // 8 PM daily
"0 22 * * *"  // 10 PM daily
"0 6 * * *"   // 6 AM daily (morning actions)
"0 21 * * 0"  // 9 PM Sundays only
```

## Troubleshooting

### "Missing or insufficient permissions"

Make sure you've deployed the Firestore security rules:

```bash
firebase deploy --only firestore:rules
```

### "OPENAI_API_KEY is not defined"

Set the secret:

```bash
firebase functions:secrets:set OPENAI_API_KEY
```

### Function times out

Increase memory or timeout in the schedule config:

```javascript
{
  schedule: "0 21 * * *",
  timeZone: "America/Los_Angeles",
  memory: "1GiB",  // Increased from 512MiB
  timeoutSeconds: 300,  // 5 minutes
  secrets: ["OPENAI_API_KEY"],
}
```

### No actions appearing on dashboard

1. Check if function ran: `firebase functions:log`
2. Verify journal entries exist for today
3. Check `daily_actions` collection in Firestore
4. Ensure `targetDate` is set to tomorrow's date

### AI returns invalid JSON

The fallback system will provide basic actions. Check logs:

```bash
firebase functions:log --only generateDailyActions
```

## Next Steps

1. ✅ Deploy the functions
2. Create some journal entries
3. Wait for 9 PM or manually trigger the function
4. Check your dashboard the next morning for actions
5. Monitor costs in Firebase Console → Usage & Billing
6. Iterate on prompts based on the quality of generated actions

## Future Enhancements

- Knowledge base integration (link actions to saved articles/books)
- Pattern detection across weeks/months
- Weekly summaries
- Personalization based on completion rates
- Push notifications for daily actions
- Integration with calendar/reminder apps
