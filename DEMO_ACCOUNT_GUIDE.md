# Demo Account System Guide

This guide explains how to set up and use the demo account for demonstrations and testing of the Relish application.

## Overview

The demo account system provides:
- **Shortened onboarding questionnaire** (8 questions vs 30+) for quick demonstrations
- **Auto-fill buttons** on every question to instantly populate answers
- **Pre-filled demo data** for an 8-year-old boy named "Alex" with realistic parenting challenges
- **One-click reset** to clear all demo data and start fresh
- **Demo mode banner** to clearly indicate when using demo account

## Setup Instructions

### 1. Create Demo User Account

You need to manually create the demo user account in Firebase:

**Option A: Via Firebase Console**

1. Go to Firebase Console → Authentication
2. Add a new user:
   - Email: `demo@relish.app`
   - Password: `demo123456`
3. Copy the generated UID
4. Go to Firestore → `users` collection
5. Create a document with the UID as the document ID:
   ```json
   {
     "userId": "<the-uid-from-auth>",
     "email": "demo@relish.app",
     "name": "Demo Parent",
     "role": "parent",
     "familyId": "<generate-a-random-family-id>",
     "isDemo": true,
     "isAdmin": false,
     "createdAt": "<current-timestamp>",
     "settings": {
       "notifications": true,
       "theme": "light"
     }
   }
   ```
6. Create a corresponding family document in `families` collection with the same familyId

**Option B: Via Firebase CLI**

Use the Firebase Authentication and Firestore APIs to create the user programmatically.

### 2. Deploy Cloud Functions

The demo system requires the `resetDemoAccount` Cloud Function:

```bash
firebase deploy --only functions:resetDemoAccount
```

### 3. Test the Setup

1. Log in with demo credentials:
   - Email: `demo@relish.app`
   - Password: `demo123456`

2. You should see:
   - Orange/amber demo banner at the top of every page
   - "DEMO MODE" indicator
   - "RESET DEMO" button in the banner

## Demo Flow

### Quick Demo (5 minutes)

Follow this flow for the fastest demonstration:

1. **Log in** to demo account
2. **Navigate to People page** (`/people`)
3. **Click "Add New Person"**
4. Fill in:
   - Name: Alex
   - Relationship: Child
   - Date of Birth: (8 years old)
5. **Click "Create Manual"**
6. **Select "Child" relationship type**
7. **Start onboarding questionnaire**
8. **Use the "✨ DEMO FILL" buttons** to auto-fill each answer
   - Overview: What Alex likes (pre-filled with Minecraft, LEGO, science)
   - Triggers: Recent frustration story (homework meltdown)
   - What Works: Strategies (visual timers, choices, praise)
   - Self-Worth: Likert scale questions
   - Strengths: Character strengths (creativity, perseverance)
9. **Generate Manual** - AI generates structured content
10. **Review and Save** generated triggers, strategies, boundaries
11. **Generate Weekly Workbook** - AI creates parent behavior goals
12. **Explore workbook activities** - Interactive tablet-friendly activities
13. **Demo AI Coach Chat** (optional) - Ask questions about the manual
14. **Reset when done** - Click "RESET DEMO" button to start over

### Full Demo (15-20 minutes)

For a more comprehensive demonstration:

1. Follow Quick Demo flow above
2. **Edit manual content manually** - Show how users can customize
3. **Complete a daily activity** - Demonstrate activity types
4. **Log parent goal completion** - Show checkbox tracking
5. **Add progress notes** to the manual
6. **Chat with AI coach** - Show conversational assistance
7. **Generate new weekly workbook** - Demonstrate iteration
8. **Reset for next demo**

## Demo Data

### Pre-Filled Answers

The demo system includes realistic pre-filled answers for an 8-year-old boy named Alex:

**Overview:**
- Loves Minecraft, LEGO, science experiments, riding bike
- Gets excited about building and creative projects

**Triggers:**
- Homework frustration (long division meltdown)
- Throws pencil, says "I'm stupid"
- Takes 20 minutes to calm down

**What Works:**
- Visual timers for homework
- Offering choices (math or reading first?)
- Specific praise ("I noticed you checked your work!")
- Fidget tools during homework

**Self-Worth:**
- Score: Low-Moderate (struggles with self-esteem)
- Compares negatively to older sister
- Says "I'm not good at anything" after struggles

**Character Strengths:**
- High creativity (built working Minecraft elevator)
- Low perseverance (gives up quickly on hard tasks)
- Persists on building projects but not homework

### Generated Content

When you generate the manual, AI (Claude 3.5 Sonnet) creates:

**Triggers:**
- Academic frustration with negative self-talk (severity: moderate)
- Homework transitions (severity: moderate)
- Comparison to siblings (severity: mild)

**What Works:**
- Movement breaks (trampoline, jumping jacks) - Effectiveness: 5/5
- Task chunking - Effectiveness: 4/5
- Visual timers - Effectiveness: 4/5
- Specific praise - Effectiveness: 4/5

**Boundaries:**
- Needs 10-15 minutes alone to decompress (immovable)
- No comparisons to sister during frustration (immovable)

**Weekly Workbook Goals:**
- Give 5-minute warning before homework (Daily)
- Praise one effort Alex makes each day (Daily)
- Take 3 deep breaths before responding to frustration (As needed)
- Break homework into 15-minute chunks (Daily)

## Features

### Shortened Questionnaire

The demo onboarding has only 8 questions vs. 30+ in production:
- 1 overview question (instead of 4)
- 2 triggers questions (instead of 3)
- 1 what works question (instead of 3)
- 1 self-worth question (instead of 6)
- 2 character strengths questions (instead of 10)
- No neurodivergence screening sections

This allows for <5 minute demonstrations while still showcasing AI generation.

### Auto-Fill Buttons

Every question has a "✨ DEMO FILL" button:
- **Text questions**: Button appears bottom-right of textarea
- **Likert/Multiple choice**: Button appears above the question
- One click fills in realistic, contextual answers
- Users can still edit after auto-filling

### Reset Functionality

The "RESET DEMO" button in the demo banner:
- Deletes all `people` documents for the demo family
- Deletes all `person_manuals` documents
- Deletes all `weekly_workbooks` documents
- Preserves the demo user account and family
- Shows success message with count of deleted items
- Redirects to `/people` page after 2 seconds

Security: Only callable when logged in as demo account (email = `demo@relish.app` or `isDemo = true`)

### Demo Mode Banner

Always visible when logged in as demo user:
- Orange/amber gradient background
- "DEMO MODE" label with sparkles ✨
- Description: "All features enabled · Quick onboarding · Auto-fill buttons available"
- Reset button on the right side
- Fixed at top of page (z-index: 50)

## Tips for Demos

### For Sales/Marketing Demos

1. **Pre-fill everything** using auto-fill buttons for speed
2. **Focus on AI generation** - this is the "wow" moment
3. **Show the manual view** - professional, structured output
4. **Demonstrate one activity** - visual, interactive
5. **Highlight weekly goals** - parent behavior focus (not child compliance)

### For User Testing

1. **Let testers fill answers manually** to test UX
2. **Provide auto-fill as backup** if they get stuck
3. **Use shortened questionnaire** to respect their time
4. **Reset between testers** for consistent experience

### For Development Testing

1. **Use auto-fill for speed** when testing AI generation
2. **Test reset function** regularly to ensure it works
3. **Verify demo banner appears** on all pages
4. **Check Cloud Function logs** for generation output

## Troubleshooting

### Demo banner not showing

- Check user email is `demo@relish.app` OR `isDemo: true` in Firestore
- Verify `DemoBanner` component is imported in `layout.tsx`
- Check browser console for errors

### Auto-fill buttons not appearing

- Verify you're logged in as demo user
- Check `isDemoMode()` or `isDemoUser()` returns true
- Ensure demo mode prop is passed to `QuestionRenderer`

### Reset button not working

- Check Cloud Function `resetDemoAccount` is deployed
- Verify user has demo account credentials
- Check Firebase Console Logs for errors
- Ensure Firestore security rules allow deletion

### Questions not pre-filled

- Verify `DEMO_PREFILLED_ANSWERS` in `/src/config/demo-onboarding-questions.ts`
- Check section IDs match between questions and answers
- Ensure question IDs are consistent

## Architecture

### Files Created/Modified

**New Files:**
- `/src/config/demo-onboarding-questions.ts` - Shortened questionnaire + pre-filled answers
- `/src/utils/demo.ts` - Demo mode detection utilities
- `/src/components/demo/DemoBanner.tsx` - Demo mode banner UI
- `/DEMO_ACCOUNT_GUIDE.md` - This guide

**Modified Files:**
- `/src/types/index.ts` - Added `isDemo` field to User interface
- `/src/app/layout.tsx` - Added DemoBanner component
- `/src/components/onboarding/QuestionRenderer.tsx` - Added auto-fill functionality
- `/src/app/people/[personId]/manual/onboard/page.tsx` - Integrated demo mode
- `/functions/index.js` - Added `resetDemoAccount` Cloud Function

### Data Flow

```
User logs in as demo@relish.app
  ↓
isDemoUser(user) returns true
  ↓
DemoBanner appears on all pages
  ↓
Onboarding loads DEMO_ONBOARDING_SECTIONS (8 questions)
  ↓
Each question shows "✨ DEMO FILL" button
  ↓
Click auto-fills from DEMO_PREFILLED_ANSWERS
  ↓
Generate calls AI with answers
  ↓
AI returns structured content
  ↓
User can reset via "RESET DEMO" button
  ↓
resetDemoAccount Cloud Function clears all family data
```

## Future Enhancements

Potential improvements for the demo system:

1. **Multiple demo personas** - Toggle between different child ages/challenges
2. **Demo mode URL parameter** - `?demo=true` to enable on any account
3. **Guided tour** - Step-by-step walkthrough with tooltips
4. **Analytics tracking** - Track demo usage and drop-off points
5. **Pre-generated workbooks** - Skip generation for instant results
6. **Video tutorial** - Embedded demo video for self-service
7. **Sharing demos** - Generate shareable demo links
8. **Demo metrics** - Track which features are viewed in demos

## Support

For issues with the demo system:
1. Check Firebase Console logs
2. Verify Cloud Functions deployment
3. Test with fresh browser session (incognito)
4. Check Firestore security rules
5. Review browser console for JavaScript errors

---

**Last Updated:** 2026-01-20
**Version:** 1.0.0
