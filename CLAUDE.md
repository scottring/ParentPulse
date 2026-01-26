# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server on http://localhost:3000
npm run build        # Build production bundle
npm run lint         # Run ESLint

# Testing
npm test             # Run unit tests with vitest (watch mode)
npm run test:run     # Run unit tests once
npm run test:e2e     # Run Playwright E2E tests
npm run test:functions # Run Cloud Functions tests (cd functions && npm test)
npm run test:rules   # Test Firestore security rules with emulator
npm run test:all     # Run all tests

# Firebase
firebase deploy --only firestore:rules    # Deploy security rules
firebase deploy --only functions          # Deploy Cloud Functions
firebase functions:log                    # View function logs

# Vercel
vercel --prod        # Deploy to production
```

## Architecture Overview

**Relish** is a Next.js 16 app for creating "operating manuals" for important relationships (children, spouses, friends, elderly parents). It uses a 6-layer scaffolding framework to organize triggers, strategies, boundaries, and goals.

### Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: Firebase (Firestore, Auth, Cloud Functions)
- **AI**: Claude (Anthropic) for content generation, OpenAI for workbook generation

### Core Data Model

**Two-Tier System (V2)**:
```
Person → Manual (child_manuals, marriage_manuals, family_manuals)
       → GoalVolume (hierarchical: Year → Quarter → Month → Week)
       → ParentWorkbook (weekly tracking with AI-generated goals)
```

**6-Layer Framework** (src/types/assessment.ts):
1. Inputs/Triggers - What causes stress
2. Processing - Understanding/co-regulation
3. Memory/Structure - Routines/boundaries
4. Execution - Daily strategies
5. Outputs - Growth/connection behaviors
6. Supervisory - Values/principles

### Key Directories

```
src/
├── app/               # Next.js App Router pages
│   ├── dashboard/     # Main dashboard
│   ├── people/[personId]/  # Person detail routes
│   │   ├── manual/    # Manual viewing/editing
│   │   └── workbook/  # Weekly workbook tracking
├── components/
│   ├── manual/        # CRUD modals for triggers, strategies, boundaries
│   ├── onboarding/    # Typeform-style wizard components
│   └── workbook/      # Workbook display components
├── hooks/             # React hooks for data management
│   ├── useManualV2.ts     # Manual CRUD (new V2 data layer)
│   ├── useWorkbookV2.ts   # Workbook generation/tracking
│   ├── useAssessmentV2.ts # Spider diagram assessments
│   ├── useGoalV2.ts       # Hierarchical goal management
│   └── usePersonManual.ts # Legacy manual hook
├── types/
│   ├── index.ts       # Re-exports all types + COLLECTIONS constant
│   ├── assessment.ts  # 6-layer types, SpiderAssessment, GoalVolume
│   ├── manual.ts      # ChildManual, MarriageManual, FamilyManual
│   └── workbook.ts    # ParentWorkbook, activities, V2 types
├── context/
│   └── AuthContext.tsx  # Firebase auth with user/family context
├── config/
│   └── onboarding-questions.ts  # Wizard questions by relationship type
└── lib/
    ├── firebase.ts        # Firebase initialization
    ├── workbookGenerator.ts  # AI workbook content generation
    └── spiderDiagramUtils.ts # Hexagon visualization math

functions/           # Firebase Cloud Functions
├── index.js         # Main functions file
└── sample-story-data.js  # Test mode sample content
```

### Firebase Collections

Core collections defined in `COLLECTIONS` constant (src/types/index.ts):
- `families`, `users`, `people`
- `child_manuals`, `marriage_manuals`, `family_manuals`
- `goal_volumes`, `assessments`, `repair_logs`
- `parent_workbooks`, `workbook_tools`
- `journal_entries`, `activity_reflections`, `milestone_reflections`

### Cloud Functions

Key AI functions in `/functions/index.js`:
- `generateInitialManualContent` - Claude generates manual from onboarding answers
- `generateWeeklyWorkbooks` - Creates parent workbook with goals + child story
- `chatWithCoach` - RAG-powered conversational AI coach
- `generateStrategicPlan` - 30-90 day plans for challenges

### Authentication Pattern

All hooks use `useAuth()` from AuthContext:
```typescript
const { user } = useAuth();  // Returns User with userId, familyId, role
```

Security rules enforce family-based access: `belongsToFamily(familyId)` check.

## Key Patterns

### Hook Naming
- V2 hooks (useManualV2, useWorkbookV2, etc.) use the new 6-layer data model
- Legacy hooks (usePersonManual, useWeeklyWorkbook) use older flat structure
- Both can coexist during migration

### Manual Content Types
Each manual contains arrays of:
- `ManualTrigger` - With severity, confidence, layerId
- `ManualStrategy` - With effectiveness rating, source type
- `ManualBoundary` - Categorized as immovable/negotiable/preference
- `RepairStrategy` - How to repair after ruptures

### Workbook Generation
Uses `src/lib/workbookGenerator.ts`:
```typescript
const content = await generateWorkbookContent(context);
// Falls back to generateFallbackContent() if AI fails
```

### Test/Demo Mode
- Demo account: `demo@relish.app`
- Test mode uses sample data, $0 API costs
- Auto-enabled in development or for demo users

## CSS Theming

Tailwind CSS 4 with CSS variables:
```css
--parent-bg, --parent-text, --parent-accent, --parent-border
```

Design aesthetic: "Technical documentation manual" - warm, approachable, professional.

## Firestore Security Rules

Key helper functions in `/firestore.rules`:
```javascript
function isSignedIn() { return request.auth != null; }
function isParent() { return isSignedIn() && getUserData().role == 'parent'; }
function belongsToFamily(familyId) { return isSignedIn() && getUserData().familyId == familyId; }
```

## Extended Documentation

See `/docs/` for detailed guides:
- `RELISH_6LAYER_ARCHITECTURE.md` - Full architecture spec
- `WEEKLY_WORKBOOK_IMPLEMENTATION.md` - Workbook system details
- `DEMO_ACCOUNT_GUIDE.md` - Demo mode setup
- `FIREBASE_SETUP.md` - Firebase configuration
- `VERCEL_DEPLOYMENT.md` - Deployment guide
