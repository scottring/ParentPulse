# Quick Start: Deploy AI Daily Analysis

## What You're Deploying

A Cloud Function that:
- Runs every day at 9 PM
- Analyzes your journal entries
- Generates 2-5 specific, actionable items for the next day
- Uses GPT-4o-mini (cost: ~$0.001-0.005 per day per family)

## One-Time Setup (5 minutes)

### 1. Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name it "ParentPulse"
4. Copy the key (starts with `sk-`)

### 2. Set API Key in Firebase

```bash
firebase functions:secrets:set OPENAI_API_KEY
# Paste your API key when prompted
```

### 3. Update Timezone (Optional)

Edit `functions/index.js` line 22:

```javascript
timeZone: "America/Los_Angeles", // Change to your timezone
```

Common options:
- `America/New_York` (EST/EDT)
- `America/Chicago` (CST/CDT)
- `America/Denver` (MST/MDT)
- `America/Los_Angeles` (PST/PDT)
- `America/Phoenix` (MST)

### 4. Deploy

```bash
firebase deploy --only functions
```

This takes 2-3 minutes. You'll see:
```
✔  functions: Finished running predeploy script.
✔  functions[generateDailyActions]: Successful create operation.
✔  functions[generateDailyActionsManual]: Successful create operation.
✔  Deploy complete!
```

## Testing

### Option 1: Test Immediately (Recommended)

Add a temporary test button to your dashboard:

```typescript
// In src/app/dashboard/page.tsx, add this to your imports:
import { getFunctions, httpsCallable } from 'firebase/functions';

// Inside the component:
const functions = getFunctions();
const generateActions = httpsCallable(functions, 'generateDailyActionsManual');

const handleTestGeneration = async () => {
  try {
    setLoading(true);
    const result = await generateActions();
    alert(`Success! Generated ${result.data.actionsCreated} actions`);
    window.location.reload(); // Refresh to see new actions
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to generate actions. Check console.');
  } finally {
    setLoading(false);
  }
};

// Add a button somewhere in the dashboard:
<button
  onClick={handleTestGeneration}
  className="px-4 py-2 rounded-lg bg-purple-600 text-white"
>
  🧪 Test AI Action Generation
</button>
```

### Option 2: Wait for 9 PM

The function will automatically run at 9 PM and generate actions for the next day.

### Option 3: Create Test Actions Manually

Go to Firebase Console → Firestore → `daily_actions` → Add Document:

```json
{
  "familyId": "your-family-id",
  "targetDate": "tomorrow's date at midnight",
  "title": "Test Action",
  "description": "This is a test action to verify the UI works",
  "estimatedMinutes": 10,
  "priority": "medium",
  "reasoning": "Testing the action system",
  "relatedJournalEntries": [],
  "relatedKnowledgeIds": [],
  "status": "pending",
  "generatedAt": "current timestamp"
}
```

## How to Use

1. **Create journal entries** during the day
2. **At 9 PM**, the AI analyzes your entries
3. **Next morning**, see actions on your dashboard
4. **Complete actions** as you go
5. **Next evening**, AI sees what you completed and adjusts

## Monitoring

### View Logs

```bash
firebase functions:log --only generateDailyActions
```

### Check Costs

Firebase Console → Usage & Billing → Functions

Expected cost: $5-15/month for 100 families

### View Function Status

Firebase Console → Functions → generateDailyActions

You'll see:
- Invocations (should be once per day per family)
- Execution time (typically 2-5 seconds)
- Error rate (should be 0%)

## Cost Breakdown

**GPT-4o-mini (Current Setup)**
- Per family per day: $0.001-0.005
- 10 families for a month: $0.30-$1.50
- 100 families for a month: $3-$15
- 1000 families for a month: $30-$150

**If you want to upgrade to Claude Sonnet 3.5:**
- Follow instructions in `functions/index-claude.js`
- 20x more expensive but more nuanced
- Per family per day: $0.02-0.10
- 100 families for a month: $60-$300

## Troubleshooting

### "Missing or insufficient permissions"
```bash
firebase deploy --only firestore:rules
```

### "OPENAI_API_KEY is not defined"
```bash
firebase functions:secrets:set OPENAI_API_KEY
```

### No actions appearing
1. Check logs: `firebase functions:log`
2. Verify journal entries exist for today
3. Try manual trigger: Call `generateDailyActionsManual`

### Function timeout
Increase memory in `functions/index.js`:
```javascript
memory: "1GiB", // was 512MiB
```

## Next Steps

1. ✅ Deploy functions
2. Create a few journal entries
3. Test the manual trigger OR wait for 9 PM
4. Check dashboard tomorrow morning
5. Complete some actions
6. Watch how AI adapts to your patterns

## Support

- Full documentation: `functions/README.md`
- AI analysis details: `AI_DAILY_ANALYSIS.md`
- Issues: Check Firebase Console → Functions → Logs

## Future Enhancements

Want to improve the system? Consider:
- Integrating knowledge base (saved articles/books)
- Weekly summaries in addition to daily
- Pattern detection across weeks/months
- Push notifications for morning actions
- Custom prompts per family
