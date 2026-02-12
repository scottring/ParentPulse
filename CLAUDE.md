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

# Vercel
vercel --prod        # Deploy to production
```

## Architecture Overview

**Relish** is a Next.js 16 app for building and maintaining a family "Coherence Stack" — a 4-layer operating system grounded in family systems research (Bowen, Antonovsky, Walsh, Gottman, Fivush).

### Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: Firebase (Firestore, Auth, Cloud Functions)
- **AI**: Claude (Anthropic) for conversational onboarding and content generation

### The Coherence Framework (4 Layers)

1. **Mind** — What we believe: values, identity, non-negotiables
2. **Context** — How we decide: decision frameworks, boundaries, resource principles
3. **Execution** — What we do: rhythms, rituals, commitments
4. **Output** — Is this us?: coherence checks, drift signals, family story

### Core Data Model

```
Family → Manual (household, marriage, parenting, individual)
       → Yearbook (per person, per year)
       → Entry (content atom: story, checklist, goal, reflection, etc.)
       → Conversation (AI-facilitated onboarding, coaching)
       → Checkin (weekly coherence check-in)
```

### Key Concepts

- **Manual**: A living document for a domain of family life, organized by the 4 coherence layers
- **Yearbook**: A person's interactive activity book for the year (especially for children)
- **Entry**: The content atom — every piece of content has a type, source, coherence layer, lifecycle, and visibility
- **Bookshelf**: Main UI metaphor — manuals appear as book spines on a shelf

### Key Directories

```
src/
├── app/                    # Next.js App Router pages
│   ├── bookshelf/          # Main bookshelf view (home)
│   ├── intro/              # New user intro
│   ├── onboarding/         # Guided conversational onboarding
│   ├── manual/[manualId]/  # Manual viewing/editing
│   ├── yearbook/[personId]/ # Person's yearbook
│   └── checkin/            # Weekly coherence check-in
├── components/
│   ├── bookshelf/          # Bookshelf + spine components
│   ├── manual/             # Manual display + editing
│   ├── onboarding/         # Conversational onboarding UI
│   ├── yearbook/           # Yearbook + entry components
│   ├── entry/              # Entry type renderers
│   ├── checkin/            # Coherence check-in
│   ├── layout/             # Shell, nav
│   └── ui/                 # Shared primitives
├── hooks/                  # React hooks
├── types/                  # TypeScript types
│   ├── user.ts             # User, Family, auth types
│   ├── manual.ts           # Manual, CoherenceLayers
│   ├── entry.ts            # Entry (content atom)
│   ├── yearbook.ts         # Yearbook, chapters
│   ├── onboarding.ts       # Conversation, onboarding state
│   └── checkin.ts          # Check-in, drift signals
├── context/
│   └── AuthContext.tsx      # Firebase auth with user/family context
├── lib/
│   └── firebase.ts         # Firebase initialization
└── config/                 # Onboarding prompts, entry templates

functions/                  # Firebase Cloud Functions
├── index.js                # Cloud Functions
└── package.json            # Dependencies
```

### Firebase Collections

Defined in `COLLECTIONS` constant (src/types/index.ts):
- `families`, `users`
- `manuals` — with nested `layers` (mind, context, execution, output)
- `entries` — content atoms with type, source, layer, lifecycle
- `yearbooks` — per person, per year
- `conversations` — AI conversation history
- `checkins` — weekly coherence check-ins

### Authentication Pattern

All hooks use `useAuth()` from AuthContext:
```typescript
const { user } = useAuth();  // Returns User with userId, familyId, role, onboardingStatus
```

Security rules enforce family-based access: `belongsToFamily(familyId)` check.
Parent-only accounts for MVP (no child login).

### User Flow

1. Register → `/intro` (visual intro explaining the metaphor)
2. `/onboarding` → Guided AI conversation through Layer 1 (Mind), then Layer 2 (Context)
3. `/bookshelf` → Main home with manual spines
4. `/manual/[id]` → Read/edit manuals by layer
5. `/yearbook/[personId]` → Interactive yearbook for each family member
6. `/checkin` → Weekly coherence reflection

### Design Aesthetic

Warm and personal — like opening a journal, not logging into software. Book textures, warm stone/sage/amber colors. Crimson Pro for headings, Inter for body. No corporate feel.

## Key Patterns

### Manual Types
- `household` — the shared family operating system
- `marriage` — partnership manual
- `parenting` — shared approach to raising kids
- `individual` — one per family member

### Entry Types
insight, activity, goal, task, reflection, story, checklist, discussion, milestone

### Coherence Layers
`mind | context | execution | output` — defined as `CoherenceLayerId` type

## Previous Version

The v1 codebase (6-layer scaffolding, child manuals, workbooks, chip economy) is archived at `archive/relish-v1` branch.
