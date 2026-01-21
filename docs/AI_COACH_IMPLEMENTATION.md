# AI Coach Implementation

## Summary

I've implemented a full AI coaching system that provides personalized relationship advice with access to journals, manuals, workbooks, and saved resources. The coach uses RAG (Retrieval-Augmented Generation) to reference your specific context when answering questions.

## What Was Built

### 1. **useCoach Hook**
**File**: [src/hooks/useCoach.ts](src/hooks/useCoach.ts)

**Features**:
- Manages chat state (messages, loading, errors)
- Calls Cloud Function `chatWithCoach` with Claude 3 Haiku
- Supports person-specific coaching via `personId` parameter
- Tracks conversation history with `conversationId`
- Provides context info (journals found, manuals found, etc.)
- Future: Extract actionable suggestions from responses

**API**:
```typescript
const {
  messages,           // ChatMessage[] - full conversation
  loading,            // boolean
  error,              // string | null
  context,            // ChatContext - shows what data coach has
  sendMessage,        // (message: string, personId?: string) => Promise<void>
  clearConversation,  // () => void
  extractSuggestions  // (text: string) => CoachSuggestion[] - parse suggestions
} = useCoach();
```

### 2. **CoachChat Component**
**File**: [src/components/coach/CoachChat.tsx](src/components/coach/CoachChat.tsx)

**Features**:
- Beautiful owner's manual aesthetic matching app design
- Shows context badges (📓 journals, 📚 resources, ✓ actions, 📖 manual)
- Auto-scrolls to latest message
- Enter to send, Shift+Enter for newline
- Loading animation with "Thinking..." indicator
- Message bubbles with proper role styling
- Suggested starter questions when empty
- "New Conversation" button to clear chat

**Props**:
```typescript
interface CoachChatProps {
  personId?: string;      // Optional - for person-specific coaching
  personName?: string;    // Optional - displayed in header
  onClose?: () => void;   // Optional - close button
}
```

### 3. **Person Coach Page**
**File**: [src/app/people/[personId]/coach/page.tsx](src/app/people/[personId]/coach/page.tsx)

Full-page coaching interface for a specific person:
- Route: `/people/{personId}/coach`
- Displays CoachChat component with person context
- Back link to person's manual
- Blueprint grid background

### 4. **Enhanced Cloud Function**
**File**: [functions/index.js](functions/index.js:107-500)

**New Features**:
- Accepts `personId` parameter to pull person-specific context
- Retrieves person's manual (triggers, strategies, boundaries, core info)
- Retrieves person's workbooks (recent parent goals and activities)
- Includes manual data in system message for context

**Context Retrieved**:
```javascript
{
  journalEntries: [],      // Last 30 days, max 20
  knowledgeItems: [],      // Saved articles/resources, max 15
  actions: [],             // Recent daily actions, max 10
  personManual: {          // NEW - if personId provided
    personName,
    triggers,
    whatWorks,
    whatDoesntWork,
    boundaries,
    patterns,
    coreInfo
  },
  workbooks: []            // NEW - recent weekly workbooks
}
```

**System Message Structure**:
The AI coach receives:
1. **Role description** - empathetic coach for all relationships
2. **Recent journal entries** (excerpts from last 30 days)
3. **Saved knowledge** (articles, resources)
4. **Action items** (pending and completed)
5. **Person's manual** (if personId provided):
   - Triggers with severity, context, typical responses, deescalation
   - What Works strategies with effectiveness ratings
   - What Doesn't Work approaches to avoid
   - Boundaries with categories (immovable/negotiable/preference)
   - Core Info (interests, strengths, sensory needs)
6. **Weekly workbooks** (recent parent goals)

### 5. **Manual Page Integration**
**File**: [src/app/people/[personId]/manual/page.tsx](src/app/people/[personId]/manual/page.tsx:120-126)

Added "🤖 ASK COACH" button to manual header:
- Prominent amber styling
- Links to `/people/{personId}/coach`
- Positioned between VERSION badge and EDIT MANUAL button

## How It Works

### RAG (Retrieval-Augmented Generation)

The coach uses RAG to provide context-aware responses:

1. **User asks question** → `"How do I handle when Kaleb gets overwhelmed?"`

2. **System retrieves context**:
   - Kaleb's triggers from manual
   - "What works" strategies from manual
   - Recent journal entries mentioning "overwhelmed"
   - Recent actions related to emotional regulation
   - Kaleb's workbook goals

3. **Claude receives system message** with all context:
   ```
   ## Kaleb's Operating Manual:

   ### Triggers (3):
   1. Loud noises (significant)
      Context: Especially at school, crowded places
      Response: Covers ears, withdraws, may meltdown
      What helps: Move to quiet space, offer noise-canceling headphones

   ### What Works (2):
   1. Deep pressure (effectiveness: 5/5)
      Context: During meltdowns, weighted blanket or tight hug
   2. Visual timer (effectiveness: 4/5)
      Context: Transitions, helps him prepare mentally
   ```

4. **Claude generates response** referencing specific manual items:
   ```
   When Kaleb gets overwhelmed, I can see from his manual that loud noises are
   a significant trigger, especially in crowded places. Here's what works best:

   1. **Move to quiet space** - His manual notes this is the #1 deescalation
      strategy. Get him away from the stimulus immediately.

   2. **Deep pressure** - You've rated this 5/5 effectiveness. Try a tight hug
      or his weighted blanket if available.

   3. **Visual timer** - Once he's calmer, use the visual timer to help him
      prepare for transitioning back.

   From your journal entry last week, you mentioned this worked well at the
   grocery store. The key is catching it early before full meltdown.
   ```

5. **User can continue conversation** - maintains context across messages

### Person-Specific vs. General Coaching

**Person-Specific** (`/people/{personId}/coach`):
- Coach knows person's name
- Has access to their full manual
- Can reference specific triggers, strategies, boundaries
- Knows their weekly workbook goals
- Tailored advice for that individual

**General Coaching** (not yet implemented):
- Broader relationship advice
- Access to all journals and resources
- No specific person context
- Good for general parenting questions or your own growth

## Testing Instructions

### Prerequisites

1. **Complete onboarding for Kaleb** (so manual has content):
   ```bash
   # If manual is empty, reset and re-run onboarding
   node scripts/reset-manual-for-person.js Kaleb
   # Then complete: http://localhost:3000/people/aEKd16SvXs4WbqZbzvRU/manual/onboard
   ```

2. **Deploy Cloud Function updates**:
   ```bash
   firebase deploy --only functions:chatWithCoach
   ```

3. **Start dev server**:
   ```bash
   npm run dev
   ```

### Test Flow

#### Test 1: Access Coach from Manual

1. Go to Kaleb's manual: http://localhost:3000/people/aEKd16SvXs4WbqZbzvRU/manual

2. Click "🤖 ASK COACH" button in header

3. Should navigate to: http://localhost:3000/people/aEKd16SvXs4WbqZbzvRU/coach

4. Should see:
   - Header: "Coaching: Kaleb"
   - Context badges showing available data
   - Empty chat with suggested questions
   - Input box at bottom

#### Test 2: Ask About Triggers

1. Type: "What are Kaleb's main triggers?"

2. Click "SEND →" or press Enter

3. Coach should:
   - Show "Thinking..." animation
   - Return response listing Kaleb's triggers from manual
   - Reference severity levels and typical responses
   - Mention deescalation strategies

4. Context badges should update showing manual was used

#### Test 3: Ask About Strategies

1. Type: "What strategies work best for Kaleb?"

2. Coach should:
   - List strategies from "What Works" section of manual
   - Include effectiveness ratings (e.g., "5/5 effectiveness")
   - Provide context for when to use each strategy

#### Test 4: Ask Situational Question

1. Type: "Kaleb is refusing to do homework. What should I do?"

2. Coach should:
   - Reference relevant triggers (transitions, demands)
   - Suggest strategies from manual that apply
   - Acknowledge boundaries if relevant
   - Provide warm, actionable advice

#### Test 5: Multi-Turn Conversation

1. Ask follow-up: "What if that doesn't work?"

2. Coach should:
   - Maintain conversation context
   - Reference previous messages
   - Suggest alternative strategies from manual
   - Show conversation continues (multiple messages visible)

#### Test 6: Clear Conversation

1. Click "↻ New Conversation" at bottom

2. Chat should reset to empty state with suggested questions

## Expected Behavior

### Context Badges

After first message, you should see:
- **📓 X journals** - recent journal entries found
- **📚 X resources** - saved articles/knowledge
- **✓ X actions** - daily action items
- **📖 Kaleb's manual** - manual data loaded
- **📊 X workbooks** - (if workbooks exist)

### Response Quality

Coach responses should:
- ✅ Reference specific manual items by description
- ✅ Cite effectiveness ratings from strategies
- ✅ Acknowledge severity levels of triggers
- ✅ Mention specific boundaries when relevant
- ✅ Connect to journal entries if applicable
- ✅ Use warm, supportive tone
- ✅ Provide actionable, specific advice
- ❌ NOT make up information not in context
- ❌ NOT contradict manual content

### Performance

- Initial message: ~2-5 seconds (Claude 3 Haiku)
- Follow-up messages: ~2-3 seconds (context cached)
- Context retrieval: ~500ms (Firestore queries)
- Total latency: Acceptable for conversational AI

## Future Enhancements

### 1. **Suggestion Acceptance Flow**

Allow user to accept coach suggestions and add them to manual/workbook:

```typescript
// Already implemented in hook:
const suggestions = extractSuggestions(assistantMessage);

// Add UI to display suggestions:
<div className="suggestion-card">
  <div className="font-bold">💡 Coach Suggestion</div>
  <div>{suggestion.content}</div>
  <button onClick={() => addToManual(suggestion)}>
    ➕ Add to Manual
  </button>
</div>
```

**Implementation**:
1. Parse assistant message for structured suggestions
2. Display as actionable cards below message
3. "Add to Manual" button → opens modal with pre-filled content
4. User can edit before saving
5. Use existing `addTrigger`, `addStrategy`, `addBoundary` hooks

### 2. **Conversation History**

Save conversations to Firestore for later review:

```typescript
// Already collected in Cloud Function
{
  conversationId: "abc123",
  familyId: "family123",
  personId: "person123",  // if person-specific
  createdAt: timestamp,
  updatedAt: timestamp,
  messages: [...]
}
```

**Add UI**:
- "Past Conversations" dropdown in coach page
- Load previous conversation to continue
- Search conversations by topic/date

### 3. **Proactive Coaching**

Coach initiates conversations based on patterns:

```typescript
// Cloud Function detects pattern in journals
"I notice you've mentioned homework struggles 3 times this week.
 Would you like coaching on this?"

// Button to open coach with pre-loaded context
```

### 4. **Multi-Person Coaching**

Ask about multiple people or relationships:

```
"How should I handle conflict between Kaleb and his sister?"
```

Coach pulls manuals for both, provides relationship-aware advice.

### 5. **Voice Input/Output**

- Speech-to-text for input (Web Speech API)
- Text-to-speech for responses (helpful while driving, cooking, etc.)

### 6. **Quick Actions from Coach**

Coach can suggest actions beyond manual updates:

```
"Would you like me to:
 ☐ Add 'Use visual timer for homework' to this week's workbook
 ☐ Create a journal reminder to track this
 ☐ Add to your daily actions checklist"
```

### 7. **Coach Analytics**

Track usage and effectiveness:
- Most asked questions
- Topics by person
- Suggestions accepted vs. declined
- Manual sections most referenced
- User satisfaction ratings

## Files Created/Modified

### Created:
- [src/hooks/useCoach.ts](src/hooks/useCoach.ts) - Hook for chat functionality
- [src/components/coach/CoachChat.tsx](src/components/coach/CoachChat.tsx) - Chat UI component
- [src/app/people/[personId]/coach/page.tsx](src/app/people/[personId]/coach/page.tsx) - Person coach page
- [AI_COACH_IMPLEMENTATION.md](AI_COACH_IMPLEMENTATION.md) - This documentation

### Modified:
- [functions/index.js](functions/index.js:107-500) - Enhanced Cloud Function with manual context
  - Line 119: Added `personId` parameter
  - Line 140: Pass personId to context retrieval
  - Line 217-346: Enhanced retrieveChatContext with manual and workbook data
  - Line 422-497: Added manual context to system message
- [src/app/people/[personId]/manual/page.tsx](src/app/people/[personId]/manual/page.tsx:120-126) - Added "ASK COACH" button

### Already Existed:
- [functions/index.js](functions/index.js:107-210) - `chatWithCoach` Cloud Function (base implementation)
- [functions/index.js](functions/index.js:215-284) - `retrieveChatContext` (base implementation)
- [functions/index.js](functions/index.js:289-374) - `generateChatResponse`
- [functions/index.js](functions/index.js:379-430) - `buildChatSystemMessage` (base implementation)

## Troubleshooting

### Problem: "Only parents can use the AI coach"

**Cause**: User role check in Cloud Function

**Fix**: Make sure you're logged in as a parent (not child account)

### Problem: No context badges showing

**Cause**: No data in journals, manuals, etc.

**Fix**:
1. Complete onboarding for Kaleb (adds manual content)
2. Add some journal entries (if you have journal feature)
3. Context will show as data becomes available

### Problem: Coach doesn't reference manual

**Check**:
1. Manual has content: `node scripts/check-person.js`
2. PersonId is being passed: Check browser console for Cloud Function call
3. Cloud Function deployed: `firebase deploy --only functions:chatWithCoach`
4. Check function logs: `firebase functions:log --only chatWithCoach`

### Problem: "Failed to send message"

**Check**:
1. Browser console for error details
2. Firebase function logs
3. Network tab - is Cloud Function being called?
4. Authentication - are you logged in?

### Problem: Slow responses

**Expected**: 2-5 seconds per message (Claude 3 Haiku)

**If slower**:
- Check internet connection
- Check Firebase/Anthropic API status
- Review function logs for timeouts
- Context may be very large (many journals)

## Summary

✅ **AI Coach is ready to use!**

Features:
- 🤖 Person-specific coaching with manual context
- 📖 References triggers, strategies, boundaries directly
- 💬 Conversational interface with chat history
- 🎯 RAG-powered responses using your actual data
- 🔄 Multi-turn conversations with context
- 🎨 Beautiful owner's manual aesthetic

Access via:
- Manual page → "🤖 ASK COACH" button
- Direct URL: `/people/{personId}/coach`

Deploy with:
```bash
firebase deploy --only functions:chatWithCoach
```

Then test the coaching flow!
