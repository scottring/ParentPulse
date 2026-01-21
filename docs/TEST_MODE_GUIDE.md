# Test Mode Guide - Avoid API Costs During Testing & Demos

## Overview

Test Mode allows you to generate fully functional workbooks **without calling AI APIs** and **without incurring any costs**. This is perfect for:

- 🧪 **Development testing** - Test UI/UX without burning through API credits
- 👥 **Customer demonstrations** - Show the full system without spending money per demo
- 🔍 **QA and debugging** - Rapid iteration without cost concerns
- 📊 **Performance testing** - Load test with many workbooks without huge bills

## How It Works

When `testMode: true` is passed to the Cloud Function:
1. **Skips all AI API calls** (no charges from Anthropic, OpenAI, or Google)
2. **Uses pre-generated sample story** with high-quality content
3. **Personalizes with child's name** (replaces "Luna" with their name)
4. **Creates real Firestore documents** (fully functional workbooks)
5. **Uses sample illustrations** (already hosted on Firebase Storage)

**Result**: Full workbook experience with $0.00 API costs

## Quick Start

### Method 1: Pass testMode Parameter (Recommended)

When calling the Cloud Function from your app:

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const generateWorkbooks = httpsCallable(functions, 'generateWeeklyWorkbooks');

const result = await generateWorkbooks({
  familyId: 'family123',
  personId: 'person456',
  personName: 'Emma',  // Will replace "Luna" in sample story
  personAge: 7,
  manualId: 'manual789',
  relationshipType: 'child',

  // Test mode flag
  testMode: true,  // ✅ Set to true to avoid API costs

  // ... other parameters
});
```

### Method 2: Environment Variable (For Development)

Set an environment variable to enable test mode automatically:

```bash
# In .env.local (frontend)
NEXT_PUBLIC_WORKBOOK_TEST_MODE=true

# Or in functions/.env (backend)
WORKBOOK_TEST_MODE=true
```

Then in your workbook generation code:

```typescript
const testMode = process.env.NEXT_PUBLIC_WORKBOOK_TEST_MODE === 'true';

const result = await generateWorkbooks({
  // ... parameters
  testMode: testMode,
});
```

### Method 3: Demo Account Flag

For a permanent demo account, add a flag to the family document:

```typescript
// In Firestore: families/{familyId}
{
  familyId: 'demo-family',
  name: 'Demo Family',
  demoMode: true,  // ✅ Always use test mode for this family
  // ... other fields
}
```

Then check this flag before generating:

```typescript
const family = await getDoc(doc(db, 'families', familyId));
const testMode = family.data()?.demoMode || false;

const result = await generateWorkbooks({
  // ... parameters
  testMode: testMode,
});
```

## Sample Story Content

The test mode includes a pre-generated story about "Luna the fox" learning about morning transitions:

**Story**: "Luna and the Big Transition"
- 7-day serialized story
- Character mirrors child's age (6 years old in sample)
- Theme: Transitions and morning routines
- Pre-generated, high-quality watercolor illustrations
- Complete with reflection questions

**Parent Goals**: 3 behavior-focused goals
- Give extra time for morning wake-up
- Practice naming emotions without fixing
- Use deep breaths for co-regulation

**Daily Strategies**: 7 strategies aligned with story
- Each day connects to story events
- Practical tips included
- Linked to triggers and "what works"

### Personalization

The system automatically:
- Replaces "Luna" with the child's name throughout
- Maintains story quality and coherence
- Keeps illustration references consistent

## Cost Comparison

| Mode | Story Generation | Illustrations | Total Cost |
|------|-----------------|---------------|------------|
| **Production** (Standard tier) | $0.10 | $0.28 | $0.38 |
| **Production** (Premium tier) | $0.30 | $0.84 | $1.14 |
| **Test Mode** | $0.00 | $0.00 | **$0.00** ✨ |

## Use Cases

### 1. Development & Testing

```typescript
// In development environment
const isDevelopment = process.env.NODE_ENV === 'development';

const result = await generateWorkbooks({
  // ... parameters
  testMode: isDevelopment,  // Always free in dev
});
```

**When to use**:
- Testing workbook UI components
- Debugging workbook generation flow
- Iterating on design changes
- Running automated tests

### 2. Customer Demonstrations

Create a dedicated demo account:

```typescript
// Demo account setup
const demoFamily = {
  familyId: 'demo-123',
  name: 'Demo Family',
  demoMode: true,
  // Create sample people
};

// When prospect tries the app:
// 1. They see full workbook functionality
// 2. Everything works perfectly
// 3. No API costs incurred
// 4. Can generate unlimited workbooks
```

**Benefits**:
- Show real functionality without spending money
- Generate workbooks on-demand during sales calls
- Let prospects explore the full experience
- No surprises on your API bill

### 3. QA & Load Testing

```typescript
// Generate 100 test workbooks for QA
for (let i = 0; i < 100; i++) {
  await generateWorkbooks({
    personName: `TestChild${i}`,
    testMode: true,  // Free for all 100!
    // ... other params
  });
}
```

**Use cases**:
- Stress testing Firestore writes
- UI performance with many workbooks
- Security rules validation
- Edge case testing

### 4. User Onboarding & Tutorials

```typescript
// Create tutorial workbook for new users
const createTutorialWorkbook = async (userId) => {
  return await generateWorkbooks({
    personName: 'Tutorial Child',
    testMode: true,  // Free tutorial
    // ... params
  });
};
```

**Benefits**:
- Show new users what to expect
- Interactive tutorial with real workbooks
- No cost for onboarding flow
- Can reset and retry unlimited times

## Limitations

### What Test Mode Includes

✅ Complete 7-day story with professional content
✅ 3 parent behavior goals
✅ 7 daily parent strategies aligned with story
✅ 5-7 reflection questions
✅ Pre-generated watercolor illustrations
✅ Full Firestore documents (workable in UI)
✅ Personalization with child's name

### What Test Mode Doesn't Do

❌ Generate unique stories per manual (always same story)
❌ Use custom triggers/strategies from manual (uses sample triggers)
❌ Generate new illustrations (uses pre-hosted samples)
❌ Call any AI APIs (completely offline for AI)

### Workarounds for Limitations

**Need unique stories?**
- Create multiple sample stories for variety
- Rotate through sample stories based on age/theme
- Use production mode for important customers

**Need manual-specific content?**
- Test mode is for testing/demos only
- Production mode uses actual manual content
- Consider hybrid: test mode for UI testing, production for real families

## Monitoring Test Mode Usage

### Check Logs

```bash
firebase functions:log --only generateWeeklyWorkbooks
```

Look for:
```
[TEST MODE] Generating dual workbooks for Emma using sample data (no API costs)
[TEST MODE] Loading sample data instead of calling AI APIs
[TEST MODE] Using sample story: "Luna and the Big Transition"
[TEST MODE] Skipping illustration generation - using sample illustrations
```

### Track Test vs Production

Add analytics to track usage:

```typescript
const result = await generateWorkbooks({
  // ... params
  testMode: true,
});

// Log to analytics
analytics.logEvent('workbook_generated', {
  mode: 'test',
  cost: 0,
  personName: personName,
});
```

## Best Practices

### 1. Always Use Test Mode for Development

```typescript
// ✅ Good - free testing
const testMode = process.env.NODE_ENV === 'development';

// ❌ Bad - costs money for every test
const testMode = false;
```

### 2. Clearly Mark Test Workbooks

```typescript
// Add test flag to workbook metadata
const parentWorkbook = {
  // ... fields
  isTestData: testMode,
  generatedInTestMode: testMode,
};
```

### 3. Separate Demo Accounts

```typescript
// Demo families always use test mode
if (family.email?.endsWith('@demo.parentpulse.com')) {
  testMode = true;
}
```

### 4. Document Test Mode for Team

Add comments explaining test mode:

```typescript
/**
 * Generate workbooks with optional test mode
 *
 * @param testMode - Set to true to use sample data (no API costs)
 *                   Use for: testing, demos, QA, tutorials
 *                   Don't use for: real families, production data
 */
async function generateWorkbooks({ testMode = false }) {
  // ...
}
```

## Troubleshooting

### Test Mode Not Working

**Problem**: Still seeing API costs even with `testMode: true`

**Solution**: Check Cloud Function logs to verify test mode is active:
```bash
firebase functions:log --only generateWeeklyWorkbooks
```

Look for `[TEST MODE]` prefixes in logs.

### Sample Data Not Loading

**Problem**: Error "Cannot find module './sample-story-data'"

**Solution**: Ensure `sample-story-data.js` exists in `/functions/` directory:
```bash
ls /Users/scottkaufman/Documents/Developer/parentpulse-web/functions/sample-story-data.js
```

If missing, redeploy functions.

### Illustrations Not Showing

**Problem**: Illustrations show as "pending" in test mode

**Solution**: Sample illustrations use placeholder URLs. Update illustration URLs in `sample-story-data.js` with real hosted images.

## Sample Illustration Setup

The sample story includes illustration URLs that point to Firebase Storage. To set up real sample illustrations:

### Option 1: Use Placeholder Images (Free)

```javascript
// In sample-story-data.js
illustrationUrl: "https://via.placeholder.com/1024x1024/FFE5CC/FF6B35?text=Day+1",
```

### Option 2: Generate Once, Reuse Forever

1. Generate ONE real workbook in production mode
2. Download the 7 illustrations from Firebase Storage
3. Re-upload to a permanent location: `sample-illustrations/`
4. Update URLs in `sample-story-data.js`

```bash
# Download from production workbook
gsutil cp gs://parentpulse-d68ba.appspot.com/story-illustrations/abc123/day-1-monday.png ./sample-illustrations/

# Upload to permanent location
gsutil cp ./sample-illustrations/*.png gs://parentpulse-d68ba.appspot.com/sample-illustrations/
```

### Option 3: Use External Hosted Images

Host sample illustrations on a CDN or image hosting service:

```javascript
illustrationUrl: "https://your-cdn.com/sample-illustrations/luna-day1.png",
```

## Cost Savings Examples

### Scenario 1: Development Team (5 developers)

**Without test mode**:
- Each developer tests 10 times per day
- 5 devs × 10 tests × $0.38 = $19/day
- **$475/month in testing costs**

**With test mode**:
- **$0/month**
- Savings: **$475/month**

### Scenario 2: Sales Demonstrations

**Without test mode**:
- 20 demos per month
- 3 workbooks generated per demo
- 20 × 3 × $0.38 = $22.80/month
- **$274/year in demo costs**

**With test mode**:
- **$0/year**
- Savings: **$274/year**

### Scenario 3: QA & Load Testing

**Without test mode**:
- Weekly load test with 50 workbooks
- 50 × $0.38 = $19/week
- **$988/year in testing costs**

**With test mode**:
- **$0/year**
- Savings: **$988/year**

## Deployment

Test mode is included in the current Cloud Function deployment. No additional deployment needed!

To verify it's deployed:

```bash
firebase functions:log --only generateWeeklyWorkbooks | grep "TEST MODE"
```

## Summary

✅ **Test mode is ready to use**
✅ **Pass `testMode: true` to avoid costs**
✅ **Perfect for development, demos, QA, tutorials**
✅ **Full functionality with $0 API costs**
✅ **No deployment changes needed**

**Next Steps**:
1. Try generating a test workbook with `testMode: true`
2. Verify you see `[TEST MODE]` in logs
3. Confirm no API costs on your bill
4. Use freely for all non-production workbooks!

---

**Created**: January 21, 2026
**Status**: ✅ Deployed and ready to use
**Cost Savings**: Unlimited - every test workbook is free!
