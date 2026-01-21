# Dual Workbook System - Testing & Deployment Guide

## Overview

This guide covers testing and deployment for the dual workbook system that generates both:
- **Parent Workbook**: Behavior goals + daily parenting strategies
- **Child Workbook**: 7-day serialized story with AI-generated illustrations + activities

## Quick Start Testing

### 1. Prerequisites

- Firebase project configured (`parentpulse-d68ba`)
- API keys configured:
  - `ANTHROPIC_API_KEY` (Claude 3.5 Sonnet)
  - `GOOGLE_AI_API_KEY` (Nano Banana Pro for illustrations)
- Security rules deployed (Firestore + Storage)
- Cloud Functions deployed

### 2. Deploy Updated System

```bash
# Deploy security rules
firebase deploy --only firestore:rules,storage

# Deploy Cloud Functions
firebase deploy --only functions

# Or deploy everything
firebase deploy
```

### 3. End-to-End Testing Flow

#### Step 1: Create Person Manual

1. Navigate to `/people` page
2. Click "Add Person"
3. Fill in person details (name, age, relationship type)
4. Create person manual via onboarding wizard
5. Complete onboarding with conversational answers
6. Review and save generated manual content

**Verify**:
- Manual created with triggers, strategies, boundaries
- Person has age and relationship type set
- Manual ID linked to person document

#### Step 2: Generate Dual Workbooks

1. From manual page, click "Generate Weekly Workbook"
2. Cloud Function `generateWeeklyWorkbooks` should execute
3. Wait for generation (may take 30-60 seconds)

**Verify**:
- Two workbook documents created: `parent_workbooks/{id}` and `child_workbooks/{id}`
- Both share same `weekId`
- Parent workbook includes:
  - 3-5 parent behavior goals
  - 7 daily parenting strategies (aligned with child's story)
  - `childProgressSummary` initialized
- Child workbook includes:
  - `weeklyStory` with 7 daily fragments
  - Story title, character name, theme
  - Illustration prompts for each day
  - `storyProgress` initialized

#### Step 3: Test Workbook Hub

1. Navigate to `/people/{personId}/workbook`
2. Should see hub selector with 2 cards:
   - Parent Workbook (technical manual style)
   - Child Storybook (children's book style)

**Verify**:
- Both workbooks displayed
- Progress indicators shown
- Links navigate correctly

#### Step 4: Test Parent Workbook

1. Click "Parent Workbook" card
2. Navigate to `/people/{personId}/workbook/parent`

**Verify**:
- Parent behavior goals displayed (3-5 goals)
- Daily parenting strategies shown (7 strategies)
- Strategy details include:
  - Strategy title and description
  - Connection to child's story
  - 3 practical tips
- Child progress summary displayed
- Goal completion checkbox works (stamp animation)
- Daily strategy completion tracking works

#### Step 5: Test Child Workbook

1. Navigate to `/people/{personId}/workbook/child`

**Verify**:
- Story title and character displayed
- Day 1 story fragment shown with text
- Illustration generation status:
  - Shows "generating" spinner initially
  - Eventually shows generated illustration (or failed state)
- Progress dots (7 days) displayed
- "I Read This!" button works:
  - Marks day as read
  - Updates progress dots
  - Syncs to parent workbook progress
- Bedtime mode toggle works
- Navigation between days functions

#### Step 6: Test Story Reflection Activity

1. From child workbook, click on a paired activity
2. Navigate to activity page
3. If activity type is `story-reflection`:

**Verify**:
- Story recap displayed with character info
- 5-7 reflection questions shown
- Question categories:
  - Challenge identification
  - Courage recognition
  - Strategy naming
  - Personal connection
  - Self-compassion
- Text areas for child responses
- Parent observation notes section
- Submit saves responses to Firestore

## Backend Testing

### Run Cloud Functions Tests

```bash
cd functions
npm test
```

**Expected**:
- 31/32 tests passing for `generateWeeklyWorkbooks`
- All tests pass for other functions

### Test Individual Components

#### Test Story Generation

```javascript
// Call the function directly
const result = await generateWeeklyStory(
  'Luna',        // childName
  6,             // age
  ['creative', 'curious'],  // strengths
  [{ description: 'morning transitions', severity: 3 }],  // triggers
  [{ description: 'use visual schedule' }],  // whatWorks
  'child'        // relationshipType
);

// Verify structure
console.log(result.title);
console.log(result.characterName);
console.log(result.dailyFragments.length); // Should be 7
console.log(result.reflectionQuestions.length); // Should be 5-7
```

#### Test Daily Strategies Generation

```javascript
// Verify strategies align with story
const strategies = parentWorkbook.dailyStrategies;

strategies.forEach((strategy, index) => {
  console.log(`Day ${strategy.dayNumber}:`);
  console.log(`- Strategy: ${strategy.strategyTitle}`);
  console.log(`- Connection: ${strategy.connectionToStory}`);
  console.log(`- Tips: ${strategy.practicalTips.join(', ')}`);
});
```

### Test Illustration Generation (Manual)

```bash
# Set environment variable
export GOOGLE_AI_API_KEY="your-key-here"

# Run test script (you'll need to create this)
node test-illustration-generation.js
```

## Security Rules Testing

### Firestore Rules

Test that security rules work correctly:

```javascript
// Parents can read their family's workbooks
const parentWorkbookRef = db.collection('parent_workbooks').doc(workbookId);
await parentWorkbookRef.get(); // Should succeed for family member

// Non-family members cannot access
// (test with different user context)
```

### Storage Rules

Test illustration access:

```javascript
// Public read should work for anyone
const illustrationUrl = 'https://storage.googleapis.com/.../story-illustrations/12345-Luna.png';
const response = await fetch(illustrationUrl);
// Should return 200 OK
```

## Integration Points to Verify

### 1. Parent ↔ Child Workbook Sync

When child marks day as read:
```javascript
// Before
childWorkbook.storyProgress.daysRead[0] === false
parentWorkbook.childProgressSummary.storiesRead === 0

// Action: Child marks Day 1 as read

// After
childWorkbook.storyProgress.daysRead[0] === true
parentWorkbook.childProgressSummary.storiesRead === 1
parentWorkbook.childProgressSummary.storyCompletionPercent === 14 // (1/7 * 100)
```

### 2. Daily Strategies ↔ Story Alignment

Verify each daily strategy connects to the story:

```javascript
const day1Strategy = parentWorkbook.dailyStrategies[0];
const day1Story = childWorkbook.weeklyStory.dailyFragments[0];

// Strategy should reference what's happening in the story
console.log(day1Strategy.connectionToStory);
// e.g., "Luna is waking up feeling grumpy in today's story. This is a great moment to practice patience with your child's morning moods."
```

### 3. Manual → Workbook Content Mapping

Verify AI uses manual content:

```javascript
// Check that parent goals relate to manual triggers
parentWorkbook.parentGoals.forEach(goal => {
  if (goal.relatedTriggerId) {
    const trigger = manual.triggers.find(t => t.id === goal.relatedTriggerId);
    console.log(`Goal: ${goal.description}`);
    console.log(`Relates to trigger: ${trigger.description}`);
  }
});

// Check that story theme matches primary trigger
const primaryTrigger = manual.triggers.sort((a, b) => b.severity - a.severity)[0];
const storyTheme = childWorkbook.weeklyStory.storyTheme;
console.log(`Primary trigger: ${primaryTrigger.description}`);
console.log(`Story theme: ${storyTheme}`);
// Should be related (e.g., "transitions" trigger → "transitions" story theme)
```

## Performance Testing

### Workbook Generation Time

```javascript
const start = Date.now();
await generateWeeklyWorkbooks({ personId, manualId, ... });
const duration = Date.now() - start;

console.log(`Generation time: ${duration}ms`);
// Expected: 30-90 seconds (includes story generation + illustration prompts)
```

### Illustration Generation Time

```javascript
// Illustrations generate asynchronously
// Check status over time:
const checkIllustrationStatus = async () => {
  const workbook = await db.collection('child_workbooks').doc(workbookId).get();
  const fragments = workbook.data().weeklyStory.dailyFragments;

  fragments.forEach((f, i) => {
    console.log(`Day ${i+1}: ${f.illustrationStatus}`);
    // 'pending' → 'generating' → 'complete' or 'failed'
  });
};

// Check every 10 seconds
setInterval(checkIllustrationStatus, 10000);
```

## Error Scenarios to Test

### 1. Missing Manual Content

```javascript
// What happens if manual has no triggers?
const result = await generateWeeklyWorkbooks({
  personId,
  manualId,
  triggers: [],
  whatWorks: [],
  boundaries: []
});

// Should still generate workbooks with generic content
```

### 2. Invalid Age

```javascript
// What happens if person age is missing?
const result = await generateWeeklyWorkbooks({
  personId,
  personAge: undefined
});

// Should use default age-appropriate level
```

### 3. Illustration Generation Failure

```javascript
// Simulate API failure
// Workbook should still be created with illustrationStatus: 'failed'
const workbook = await db.collection('child_workbooks').doc(workbookId).get();
const fragment = workbook.data().weeklyStory.dailyFragments[0];

if (fragment.illustrationStatus === 'failed') {
  // UI should show fallback (no image, or placeholder)
}
```

### 4. Concurrent Workbook Access

```javascript
// Multiple family members accessing workbooks simultaneously
// Should not cause race conditions or overwrites
```

## Responsive Design Testing

### Breakpoints to Test

- **Mobile**: 375px (iPhone SE)
- **Tablet**: 768px (iPad)
- **Desktop**: 1440px

### Parent Workbook

- [ ] Goal cards stack correctly on mobile
- [ ] Daily strategies expand/collapse smoothly
- [ ] Progress summary readable on small screens
- [ ] Checkbox buttons accessible (44x44px minimum touch target)

### Child Workbook

- [ ] Story illustrations resize correctly
- [ ] Large text readable on tablet
- [ ] Navigation buttons accessible
- [ ] Bedtime mode works across devices

## Accessibility Testing

### Screen Reader

- [ ] Story fragments read in correct order
- [ ] Reflection questions labeled properly
- [ ] Goal completion announced
- [ ] Activity cards have descriptive labels

### Keyboard Navigation

- [ ] Tab through all interactive elements
- [ ] Enter/Space triggers buttons
- [ ] Focus visible on all elements

## Cost Monitoring

### Per Workbook Generation

- **Story text** (Claude 3.5 Sonnet): ~$0.30
- **Illustrations** (Nano Banana Pro): 7 × $0.12 = $0.84
- **Total**: ~$1.14 per weekly workbook

### Monthly Estimate

For family with 2 children:
- 2 children × 52 weeks = 104 workbooks/year
- 104 × $1.14 = $118.56/year
- ~$10/month

Monitor actual costs in Firebase console.

## Deployment Checklist

- [ ] All tests passing
- [ ] Security rules deployed
- [ ] Cloud Functions deployed with secrets configured
- [ ] Environment variables set
  - [ ] `ANTHROPIC_API_KEY`
  - [ ] `GOOGLE_AI_API_KEY`
- [ ] Firebase Storage bucket configured
- [ ] Illustration storage path created: `story-illustrations/`
- [ ] Frontend build successful
- [ ] Manual end-to-end test completed
- [ ] Error tracking configured

## Known Issues & Limitations

### Current Limitations

1. **Illustration Generation**:
   - Asynchronous, may take several minutes
   - No retry logic if generation fails
   - No character consistency enforcement (yet)

2. **Story Content**:
   - Generated once, cannot be edited
   - No regeneration option (future feature)
   - Limited to 7-day structure

3. **Daily Strategies**:
   - Cannot be reordered or customized
   - Fixed to 7 days (one per story day)

### Future Enhancements

- [ ] Retry logic for failed illustration generation
- [ ] Story regeneration with different themes
- [ ] Multi-character stories (siblings)
- [ ] Audio narration (text-to-speech)
- [ ] Print export for complete storybook
- [ ] Story archive page

## Support & Debugging

### Common Issues

**Workbook not generating**:
- Check Cloud Function logs: `firebase functions:log`
- Verify API keys are configured
- Check manual has required content

**Illustrations not appearing**:
- Check Firestore document `illustrationStatus` field
- Verify Storage rules allow read access
- Check Cloud Function logs for generation errors

**Sync issues between parent/child workbooks**:
- Verify both workbooks have same `weekId`
- Check `childProgressSummary` updates in parent workbook
- Review security rules allow updates

### Debug Commands

```bash
# View Cloud Function logs
firebase functions:log --only generateWeeklyWorkbooks

# Check Firestore data
firebase firestore:get /parent_workbooks/{workbookId}
firebase firestore:get /child_workbooks/{workbookId}

# Test security rules locally
firebase emulators:start --only firestore

# View Storage files
gsutil ls gs://parentpulse-d68ba.appspot.com/story-illustrations/
```

## Contact

For issues or questions:
- GitHub: [Repository Issues](https://github.com/your-repo/issues)
- Firebase Console: [Project Console](https://console.firebase.google.com/project/parentpulse-d68ba)

---

**Last Updated**: January 20, 2026
**Version**: 1.0.0
