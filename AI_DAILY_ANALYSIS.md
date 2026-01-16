# AI Daily Analysis System

## Overview

The AI Daily Analysis system analyzes your journal entries and knowledge base at the end of each day to generate specific, actionable items for the next day. These actions are:

- **Feasible**: Short time commitments (typically 5-30 minutes)
- **Contextual**: Based on your actual parenting experiences and knowledge
- **Prioritized**: Marked as low, medium, or high priority
- **Reasoned**: Each action includes an explanation of why it matters

## How It Works

### 1. Data Collection
At the end of each day, the system:
- Gathers all journal entries from that day
- Reviews relevant knowledge base items
- Analyzes patterns in your parenting challenges and wins

### 2. AI Analysis
The AI looks for:
- Recurring themes or challenges
- Opportunities to apply learned strategies
- Gaps between knowledge and practice
- Emotional patterns and stress levels

### 3. Action Generation
Based on the analysis, the AI generates 2-5 specific actions for the next day, each with:
- **Title**: Clear, actionable statement
- **Description**: What exactly to do
- **Estimated Time**: Realistic time commitment
- **Priority**: How important this is right now
- **Reasoning**: Why this action matters based on your journal entries

### 4. Dashboard Display
Actions appear on your dashboard the next morning, prominently displayed so you can:
- Review all pending actions
- Mark actions as complete
- Skip actions that don't fit your day
- See how many actions you've completed

## Database Structure

### Collections

**`daily_actions`**
```typescript
{
  actionId: string;
  familyId: string;
  generatedAt: Timestamp;
  targetDate: Timestamp; // The day this action is for
  title: string;
  description: string;
  estimatedMinutes: number;
  priority: 'low' | 'medium' | 'high';
  reasoning: string;
  relatedJournalEntries: string[];
  relatedKnowledgeIds: string[];
  status: 'pending' | 'completed' | 'skipped';
  completedAt?: Timestamp;
  parentNotes?: string;
}
```

**`daily_analyses`**
```typescript
{
  analysisId: string;
  familyId: string;
  generatedAt: Timestamp;
  analysisDate: Timestamp;
  summary: string;
  themes: string[];
  emotionalTrend: 'positive' | 'neutral' | 'challenging';
  actionIds: string[];
  journalEntriesAnalyzed: string[];
  knowledgeItemsReferenced: string[];
}
```

## Implementation Status

### ✅ Completed
- TypeScript types for actions and analyses
- Firestore collections and security rules
- `useDailyActions` hook for fetching and managing actions
- Dashboard UI component to display and interact with actions
- Action completion and skipping functionality

### 🚧 To Be Implemented

#### Cloud Function for AI Analysis
You'll need to create a Firebase Cloud Function that:
1. Runs on a schedule (e.g., daily at 9 PM)
2. Fetches all journal entries for the day
3. Calls an AI API (Claude, OpenAI, etc.) to analyze the entries
4. Generates 2-5 actionable items
5. Saves them to the `daily_actions` collection

**Example Cloud Function structure:**

```typescript
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Anthropic } from '@anthropic-ai/sdk';

export const generateDailyActions = onSchedule('0 21 * * *', async (event) => {
  // 1. Get all families
  const familiesSnapshot = await admin.firestore()
    .collection('families')
    .get();

  // 2. For each family
  for (const familyDoc of familiesSnapshot.docs) {
    const familyId = familyDoc.id;

    // 3. Get today's journal entries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const entriesSnapshot = await admin.firestore()
      .collection('journal_entries')
      .where('familyId', '==', familyId)
      .where('createdAt', '>=', today)
      .where('createdAt', '<', tomorrow)
      .get();

    if (entriesSnapshot.empty) continue;

    // 4. Prepare context for AI
    const entries = entriesSnapshot.docs.map(doc => ({
      text: doc.data().text,
      category: doc.data().category,
      stressLevel: doc.data().context.stressLevel,
      timeOfDay: doc.data().context.timeOfDay,
    }));

    // 5. Call AI to generate actions
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = buildAnalysisPrompt(entries);

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const actions = parseAIResponse(message.content);

    // 6. Save actions to Firestore
    const batch = admin.firestore().batch();
    const actionsToCreate = actions.map(action => ({
      familyId,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      targetDate: tomorrow,
      ...action,
      status: 'pending',
    }));

    for (const action of actionsToCreate) {
      const docRef = admin.firestore()
        .collection('daily_actions')
        .doc();
      batch.set(docRef, action);
    }

    await batch.commit();
  }
});

function buildAnalysisPrompt(entries: any[]): string {
  return `
You are an AI parenting coach analyzing a parent's daily journal entries. Generate 2-5 specific, actionable items for tomorrow that are:

1. **Feasible**: 5-30 minutes each
2. **Contextual**: Based on the entries below
3. **Balanced**: Mix of immediate actions and long-term growth
4. **Life-aware**: Don't assume unlimited time or energy

Today's journal entries:
${entries.map(e => `[${e.category}, stress: ${e.stressLevel}/5]\n${e.text}`).join('\n\n')}

For each action, provide:
- title: Clear, actionable (e.g., "Spend 10 minutes one-on-one with Emma")
- description: Specific what/how
- estimatedMinutes: Realistic time (5-30 minutes)
- priority: low/medium/high
- reasoning: Why this matters based on the journal entries

Format as JSON array:
[{
  "title": "...",
  "description": "...",
  "estimatedMinutes": 15,
  "priority": "medium",
  "reasoning": "..."
}]
`;
}
```

## Testing the System

### Manual Testing
Since the Cloud Function isn't set up yet, you can manually create test actions:

```typescript
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

// Create a test action for tomorrow
async function createTestAction(familyId: string) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  await addDoc(collection(firestore, 'daily_actions'), {
    familyId,
    generatedAt: Timestamp.now(),
    targetDate: Timestamp.fromDate(tomorrow),
    title: "Spend 10 focused minutes with each child",
    description: "Put phones away and give each child 10 minutes of your complete attention. Let them choose the activity.",
    estimatedMinutes: 20,
    priority: "high",
    reasoning: "Your recent journal entries show you've been distracted during interactions. Research shows even brief periods of focused attention significantly improve parent-child connection.",
    relatedJournalEntries: [],
    relatedKnowledgeIds: [],
    status: "pending",
  });
}
```

You can add this function to a test page or run it from the browser console.

## Future Enhancements

1. **Weekly summaries**: AI-generated weekly reviews
2. **Pattern detection**: Identify recurring challenges over weeks/months
3. **Knowledge integration**: Automatically link actions to relevant knowledge base items
4. **Progress tracking**: Track completion rates and suggest adjustments
5. **Personalization**: Learn which types of actions work best for each family
6. **Notifications**: Push notifications for daily actions

## Required Environment Variables

Add to `.env.local`:
```
ANTHROPIC_API_KEY=your_api_key_here
# or
OPENAI_API_KEY=your_api_key_here
```

## Next Steps

1. ✅ Test the UI by manually creating actions in Firestore
2. Set up Firebase Cloud Functions in your project
3. Install Anthropic or OpenAI SDK
4. Deploy the scheduled function
5. Test with real journal entries
6. Iterate based on feedback
