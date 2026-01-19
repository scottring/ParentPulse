# AI-Powered Onboarding Implementation

## Summary

I've implemented the full AI-powered onboarding system that uses Claude AI to generate structured manual content (triggers, strategies, boundaries) from conversational questions.

## What Was Built

### 1. **New AI-Powered Onboarding Page**
**File**: [src/app/people/[personId]/manual/onboard/page.tsx](src/app/people/[personId]/manual/onboard/page.tsx)

**Features**:
- 5-step wizard flow: Welcome → Questions → Processing → Review → Complete
- Uses conversational text questions from `onboarding-questions.ts`
- Integrates with `useManualOnboarding` hook for state management
- Calls Cloud Function `generateInitialManualContent` with Claude 3.5 Sonnet
- Review screen with AI-generated content displayed in beautiful cards
- Uses `useSaveManualContent` hook to save approved content

**Backed up**: The previous version was saved to `page.tsx.backup`

### 2. **Wizard State Flow**

```
WELCOME
  ↓ (Start Questionnaire)
QUESTIONS (Conversational text questions)
  ↓ (Generate Manual)
PROCESSING (AI analyzing responses)
  ↓ (Claude generates content)
REVIEW (Show AI-generated triggers, strategies, boundaries)
  ↓ (Save Manual)
COMPLETE (Success screen)
  ↓ (View Manual)
MANUAL PAGE (with populated content!)
```

### 3. **Key Components**

**Hooks Used**:
- `useManualOnboarding` - Manages wizard state and AI generation
- `useSaveManualContent` - Saves generated content to Firestore
- `usePersonManual` - Fetches/manages person's manual
- `useAuth` - Authentication context

**Cloud Function**:
- `generateInitialManualContent` (already exists in `functions/index.js:957`)
- Uses Claude 3.5 Sonnet with 6000 token limit
- Parses JSON response into structured content
- Returns triggers, strategies, boundaries, strengths, etc.

**Questions Config**:
- Uses `onboarding-questions.ts` (conversational questions)
- Filters to text-only questions (skips VIA strengths assessment for now)
- Personalizes questions with {{personName}} placeholder

## Testing Instructions

### Prerequisites

1. **Cloud Function Must Be Deployed**:
   ```bash
   # Deploy the Cloud Function if not already deployed
   firebase deploy --only functions:generateInitialManualContent
   ```

2. **Verify Anthropic API Key**:
   ```bash
   # Make sure ANTHROPIC_API_KEY secret is configured
   firebase functions:secrets:access ANTHROPIC_API_KEY
   ```

### Step 1: Reset Kaleb's Manual

```bash
# Reset Kaleb's manual to empty state
node scripts/reset-manual-for-person.js Kaleb

# Output will show:
# ✅ Found person: Kaleb
# ✅ Found manual: [manual-id]
# Confirm reset? (yes/no): yes
# ✅ Manual reset successfully!
```

### Step 2: Start Dev Server

```bash
npm run dev
# Server starts on http://localhost:3000
```

### Step 3: Navigate to Onboarding

Go to: http://localhost:3000/people/aEKd16SvXs4WbqZbzvRU/manual/onboard

(Or click "EDIT MANUAL" button on Kaleb's manual page)

### Step 4: Complete Questionnaire

**Welcome Screen**:
- Shows AI-powered generation info
- Click "START QUESTIONNAIRE →"

**Questions Screen**:
- Answer conversational questions about Kaleb
- Questions are organized into sections:
  - Overview (likes, dislikes, motivations, comfort factors)
  - Triggers & Patterns (stressful situations, typical responses)
  - What Works (effective strategies)
  - Boundaries & Important Context
- Click "NEXT →" between questions
- Click "GENERATE MANUAL →" on last question

**Processing Screen**:
- Shows loading spinner
- "Claude AI is analyzing your answers and generating structured content..."
- Takes 30-60 seconds
- **IMPORTANT**: Watch browser console and terminal for errors

**Review Screen**:
- Shows AI-generated content in cards:
  - ⚡ TRIGGERS (with severity, context, typical response, deescalation)
  - ✨ WHAT WORKS (with effectiveness ratings 1-5)
  - 🚫 WHAT DOESN'T WORK
  - 🛡️ BOUNDARIES (categorized as immovable/negotiable/preference)
- Click "SAVE MANUAL →"

**Complete Screen**:
- Success message
- Click "VIEW MANUAL →"

**Manual Page**:
- Should now show content in all sections!
- Triggers: > 0
- Strategies: > 0
- Boundaries: > 0

## Expected Results

After completing onboarding, Kaleb's manual should have:

✅ **Triggers**: AI-generated from "recent time stressed/upset" answers
✅ **What Works**: AI-generated from "effective strategies" answers
✅ **What Doesn't Work**: AI-inferred from context
✅ **Boundaries**: AI-generated from "boundaries to respect" answers
✅ **Core Info**: Populated with interests, strengths, notes

## Troubleshooting

### Problem: "Generation Failed"

**Check**:
1. Browser console for error messages
2. Terminal running `npm run dev` for Next.js errors
3. Firebase Functions logs: `firebase functions:log --only generateInitialManualContent`

**Common Issues**:
- Cloud Function not deployed: Run `firebase deploy --only functions`
- API key missing: Check `firebase functions:secrets:access ANTHROPIC_API_KEY`
- Network error: Check internet connection
- JSON parsing error: Claude response wasn't valid JSON (check function logs)

### Problem: "No content showing on manual page"

**Check**:
1. Did you click "SAVE MANUAL →" on review screen?
2. Check browser console for Firestore errors
3. Run diagnostic: `node scripts/check-person.js` (should show totalTriggers > 0)
4. Check Firestore security rules (should allow family members to write)

### Problem: "Questions screen not loading"

**Check**:
1. Person has a `relationshipType` set (should be "child")
2. Browser console for errors about `getOnboardingSections`
3. Check that `onboarding-questions.ts` is imported correctly

## Architecture Notes

### Why Two Onboarding Systems?

1. **AI-Powered** (NEW - what we just built):
   - Conversational text questions
   - AI generates structured content
   - Better for initial setup
   - Located at `/people/[personId]/manual/onboard`

2. **Structured Questions** (old - backed up to `.backup`):
   - Likert scales, checkboxes, multiple choice
   - Direct save without AI
   - Better for assessments (VIA strengths, ADHD screening)
   - Could be used for supplementary questionnaires

### Data Flow

```
User Answers (text)
  ↓
Cloud Function: generateInitialManualContent
  ↓
Claude 3.5 Sonnet API
  ↓
Generated JSON Content
  ↓
Review Screen (editable)
  ↓
useSaveManualContent hook
  ↓
Firestore: person_manuals/{manualId}
  ↓
Manual Page (displays content)
```

### Generated Content Structure

```typescript
{
  triggers: [
    {
      description: "string",
      context: "string",
      typicalResponse: "string",
      deescalationStrategy: "string",
      severity: "mild" | "moderate" | "significant"
    }
  ],
  whatWorks: [
    {
      description: "string",
      context: "string",
      effectiveness: 1-5,
      notes: "string"
    }
  ],
  boundaries: [
    {
      description: "string",
      category: "immovable" | "negotiable" | "preference",
      context: "string",
      consequences: "string"
    }
  ],
  // ... more fields
}
```

## Next Steps

### Enhancements You Could Add:

1. **Edit Functionality in Review Screen**
   - Currently review is view-only
   - Add inline editing for each card
   - Add delete buttons for unwanted items
   - Use `updateGeneratedContent()` hook function

2. **Re-run Onboarding**
   - "Regenerate from new answers" button
   - Keeps existing content, adds new items
   - Useful for periodic updates

3. **Add VIA Strengths Assessment**
   - Create separate assessment flow
   - Likert scale questions for 24 character strengths
   - Store scores in `assessmentScores.via`
   - Display top 5 strengths in manual

4. **Manual Comparison View**
   - Show "before/after" when regenerating
   - Highlight new vs. existing content
   - Merge/replace options

5. **Progressive Disclosure**
   - Start with fewer questions
   - "Add more detail" button expands to full questionnaire
   - Useful for quick starts

## Files Modified/Created

### Created:
- [src/app/people/[personId]/manual/onboard/page.tsx](src/app/people/[personId]/manual/onboard/page.tsx) - AI-powered onboarding
- [src/app/people/[personId]/manual/onboard/page.tsx.backup](src/app/people/[personId]/manual/onboard/page.tsx.backup) - Old structured questions version
- [scripts/reset-manual-for-person.js](scripts/reset-manual-for-person.js) - Helper to reset manuals
- [scripts/check-orphaned-users.js](scripts/check-orphaned-users.js) - User diagnostic tool
- [scripts/cleanup-orphaned-users.js](scripts/cleanup-orphaned-users.js) - User cleanup tool
- [scripts/check-manual-content.js](scripts/check-manual-content.js) - Manual diagnostic tool
- [scripts/check-person.js](scripts/check-person.js) - Person/manual listing tool
- [scripts/README.md](scripts/README.md) - Admin scripts documentation
- This file: [AI_ONBOARDING_IMPLEMENTATION.md](AI_ONBOARDING_IMPLEMENTATION.md)

### Previously Existing (unchanged):
- [src/hooks/useManualOnboarding.ts](src/hooks/useManualOnboarding.ts) - Wizard state management
- [src/hooks/useSaveManualContent.ts](src/hooks/useSaveManualContent.ts) - Content saving
- [src/config/onboarding-questions.ts](src/config/onboarding-questions.ts) - Question definitions
- [src/types/onboarding.ts](src/types/onboarding.ts) - Type definitions
- [functions/index.js](functions/index.js) - Cloud Functions (line 957: generateInitialManualContent)

## Summary

✅ **AI-powered onboarding is ready to test!**

The system uses conversational questions → Claude AI → structured content → review → save → populated manual.

Run the test flow above to see it in action with Kaleb's manual!
