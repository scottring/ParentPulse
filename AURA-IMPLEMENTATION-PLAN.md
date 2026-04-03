# ParentPulse AURA Implementation Plan

> This file is a reference for Claude Code. Place it at the project root.
> Each task below is designed to be one Claude Code session.
> Feed tasks in order. Each task includes: what to read first, what to build, and how to verify.

---

## Context for Claude Code

This is a Next.js 14 app (app router) with Firebase/Firestore, TypeScript, and Tailwind CSS.

### Architecture overview
- `src/app/` — Next.js pages and routes
- `src/components/` — React components organized by feature
- `src/config/` — Question definitions, dimension configs, exercise types
- `src/hooks/` — Custom React hooks for data access (Firebase)
- `src/lib/` — Pure logic engines (scoring, climate, progression)
- `src/types/` — TypeScript interfaces
- `src/utils/` — Helper utilities
- `src/styles/` — CSS themes
- `src/context/` — React context providers (auth)

### Design system
- Display font: CSS variable `--font-parent-display` (serif, italic headings)
- Body font: CSS variable `--font-parent-body` (sans-serif)
- Primary color: CSS variable `--parent-primary`
- Text: `--parent-text` and `--parent-text-light`
- Cards use `glass-card` and `glass-card-strong` CSS classes
- Weather-themed backgrounds via `WeatherBackground` component
- Rounded corners (rounded-2xl for inputs, rounded-full for buttons)

### Key conventions
- Pages use `'use client'` directive
- Data hooks return loading/error states
- Config files export typed arrays of questions/dimensions
- Firestore collections defined in type files as const objects
- Components accept a `demoQ` prop for demo mode URL params

### Core design principle: Progressive rigor
The onboarding collects just enough data to get the system started. Rigor builds over time as new questions surface naturally through check-ins, workbook reflections, and acute events. The picture gets sharper with every interaction — the user should never have to sit through another 45-minute questionnaire. Every dimension has two tiers of questions: broad onboarding questions (`existingQuestionMappings`) collected once, and targeted assessment prompts (`assessmentPrompts`) designed for progressive deepening. Task 11 implements the engine that connects these two tiers.

---

## Task 1: AURA Phase Indicator Component

### Read first
- `src/components/layout/Navigation.tsx` (understand current nav pattern)
- `src/app/globals.css` (understand CSS variables and existing utility classes)
- `src/app/dashboard/page.tsx` (understand how pages are structured)

### Build
Create `src/components/layout/AuraPhaseIndicator.tsx`

A small, persistent component that shows the current AURA phase. It receives a `phase` prop and renders four dots/segments with the active phase highlighted.

```typescript
type AuraPhase = 'assess' | 'understand' | 'respond' | 'assimilate';

interface AuraPhaseIndicatorProps {
  phase: AuraPhase;
  compact?: boolean; // true = dots only, false = dots + label
}
```

Design specs:
- Four small circles in a horizontal row, 8px diameter, 12px gap
- Active phase: filled with phase color, slightly larger (10px)
- Inactive phases: outlined only, using `--parent-text-light` at 30% opacity
- Phase colors (use CSS variables, define in globals.css):
  - Assess: teal (`#0F6E56`)
  - Understand: purple (`#534AB7`)
  - Respond: coral (`#D85A30`)
  - Assimilate: amber (`#BA7517`)
- When `compact` is false, show phase name below dots in uppercase 10px tracking-wide text
- Entire component should be ~32px tall in compact mode, ~48px in full mode
- Animate transitions between phases with a subtle scale + opacity change

### Verify
- Import into `src/app/dashboard/page.tsx` temporarily and render at top of page
- Confirm it displays correctly in both light and dark sky modes
- Confirm all four phases render with correct colors
- Remove the temporary import after verification

---

## Task 2: Rename clinicalSource to inspirationSource

### Read first
- `src/config/onboarding-questions.ts` (has clinicalSource fields)
- `src/config/relationship-dimensions.ts` (has researchBasis fields — these are fine, leave them)
- `src/components/onboarding/QuestionDisplay.tsx` (may reference clinicalSource)
- Search entire `src/` for any usage of `clinicalSource`

### Build
1. In `src/config/onboarding-questions.ts`:
   - Rename the `clinicalSource` field in the `OnboardingQuestion` interface to `inspirationSource`
   - Update every occurrence in the question definitions. Change the values:
     - `'RSES Item 1'` → `'Inspired by Rosenberg Self-Esteem Scale'`
     - `'RSES Item 2'` → `'Inspired by Rosenberg Self-Esteem Scale'`
     - `'RSES Item 3'` → `'Inspired by Rosenberg Self-Esteem Scale'`
     - `'RSES Item 4'` → `'Inspired by Rosenberg Self-Esteem Scale'`
     - `'RSES Item 7'` → `'Inspired by Rosenberg Self-Esteem Scale'`
     - `'Physical Self-Concept'` → `'Physical self-concept research'`
     - `'VIA-IS Creativity'` → `'Inspired by VIA Character Strengths'`
     - (same pattern for all VIA-IS items)
     - `'Vanderbilt ADHD - Inattention'` → `'Inspired by Vanderbilt ADHD Assessment'`
     - (same pattern for all Vanderbilt items)
   - Rename the section title `'Character Strengths (VIA Survey)'` → `'Character Strengths Snapshot'`

2. Update the `assessmentScores.selfWorth.category` type:
   - In `src/types/person-manual.ts`, change `'low' | 'moderate' | 'high'` to `'area_for_growth' | 'developing' | 'area_of_strength'`
   - Search for any code that sets or reads this field and update the values

3. Update any components that display clinicalSource to display inspirationSource instead.

### Verify
- Run `grep -r "clinicalSource" src/` — should return zero results
- Run `grep -r "RSES Item" src/` — should return zero results
- Run `grep -r "VIA-IS" src/config/` — should return zero results (but may exist in relationship-dimensions.ts researchDetail prose, which is fine)
- TypeScript should compile with no errors: `npx tsc --noEmit`

---

## Task 3: Remove Raw Scores from Dashboard

### Read first
- `src/app/dashboard/page.tsx` (the score display section around line 130-160)
- `src/lib/climate-engine.ts` (the `scoreToClimate` function and `Climate` type)

### Build
In `src/app/dashboard/page.tsx`, replace the current score display:

Current pattern (the big "3.2" number with "Warm · Clear skies" subtitle):
```tsx
<span className="score-temp block" style={{...fontSize: 'clamp(3.5rem, 10vw, 5rem)'...}}>
  {health.score.toFixed(1)}
</span>
```

Replace with the climate label as the primary display element:
- The weather state name becomes the hero text (e.g., "Clear skies" or "Partly cloudy")
- Use the display font at the same size the greeting uses
- The trend phrase sits below it as a subtitle
- Remove the numeric score entirely from the main dashboard view
- Keep `scoreToTemp()` function available but don't display it prominently — if desired, show it as a tiny aside like "64°" in weather-app style (optional, skip if in doubt)

Also update the `RelationshipCard` component if it shows raw dimension scores — these should display as qualitative bands instead. Check `src/components/dashboard/RelationshipCard.tsx`.

### Verify
- No numeric scores (like "3.2" or "4.1") visible on the dashboard at any viewport size
- Climate state names and trend phrases are clearly readable
- Relationship cards show qualitative descriptions, not numbers
- The page still looks balanced without the large number

---

## Task 4: Unify Question Renderer Wrapper

### Read first
- `src/components/onboarding/QuestionRenderer.tsx` (current implementation)
- `src/components/onboarding/QuestionDisplay.tsx`
- `src/components/onboarding/LikertScaleQuestion.tsx`
- `src/components/onboarding/FrequencyQuestion.tsx`
- `src/components/onboarding/MultipleChoiceQuestion.tsx`
- `src/components/onboarding/QualitativeComment.tsx`
- `src/app/people/[personId]/manual/onboard/ClientPage.tsx` (observer flow)
- `src/app/people/[personId]/manual/self-onboard/ClientPage.tsx` (self flow)
- `src/app/people/[personId]/manual/kid-session/ClientPage.tsx` (child flow)

### Build
Create `src/components/shared/AssessmentShell.tsx` — a wrapper that provides the consistent visual container for ALL assessment experiences. Every questionnaire flow wraps its content in this shell.

```typescript
interface AssessmentShellProps {
  // Context
  phase?: AuraPhase;          // defaults to 'assess'
  personName: string;
  sectionName: string;
  sectionDescription: string;
  sectionIcon?: string;
  sectionEmoji?: string;

  // Progress
  currentSection: number;
  totalSections: number;
  currentQuestion: number;
  totalQuestions: number;

  // Content
  children: React.ReactNode;

  // Actions
  onSkipSection?: () => void;
  canSkip?: boolean;
}
```

The shell renders:
- AuraPhaseIndicator at top (compact mode)
- Section header: icon + name + description (consistent typography)
- Progress bar: section progress + question progress (dual track)
- Estimated time remaining (based on remaining questions × 1.5 min)
- The children (the actual question input)
- Skip section button if `canSkip` is true

Then update the three onboarding ClientPage files to wrap their question content in `AssessmentShell` instead of ad-hoc card layouts. The goal is visual consistency — same card, same progress bar, same typography — regardless of whether you're doing self-onboarding, observer onboarding, or a child session.

### Verify
- Self-onboarding, observer onboarding, and child sessions all show the same outer shell
- Progress bars work correctly in all three flows
- Phase indicator shows "assess" in all three flows
- Section transitions feel consistent across all flows

---

## Task 5: Build the Workbook Data Model

### Read first
- `src/types/person-manual.ts` (understand existing data patterns)
- `src/types/growth-arc.ts` (understand existing growth types)
- `src/config/relationship-dimensions.ts` (the arcGuidance fields on each dimension)
- `src/config/exercise-types.ts` (may already have exercise definitions)

### Build
Create `src/types/workbook.ts`:

```typescript
import { Timestamp } from 'firebase/firestore';
import { DimensionId, DimensionDomain } from '@/config/relationship-dimensions';
import { RelationshipType } from '@/types/person-manual';

// The phase within a workbook chapter's progression
export type ArcPhase = 'awareness' | 'practice' | 'integration';

export type ExerciseType = 'conversation' | 'observation' | 'reflection' | 'practice' | 'ritual';
export type ExerciseDifficulty = 'starter' | 'intermediate' | 'advanced';
export type ReflectionRating = 'didnt_try' | 'tried_hard' | 'went_okay' | 'went_well';

export interface Exercise {
  exerciseId: string;
  dimensionId: DimensionId;

  // Content
  title: string;
  description: string;
  instructions: string[];
  suggestedTiming: string;
  durationMinutes: number;

  // Categorization
  exerciseType: ExerciseType;
  difficulty: ExerciseDifficulty;
  arcPhase: ArcPhase;
  prerequisiteIds: string[];

  // Targeting
  forDomain: DimensionDomain;
  forRelationshipTypes: RelationshipType[];
  minChildAge?: number;
  maxChildAge?: number;

  // Reflection template
  reflectionPrompts: string[];
  successIndicators: string[];

  // Research basis
  researchBasis: string;
}

export interface ExerciseCompletion {
  completionId: string;
  exerciseId: string;
  chapterId: string;
  userId: string;

  // Reflection data
  rating: ReflectionRating;
  reflectionNotes: string;
  completedAt: Timestamp;

  // Manual integration
  suggestedManualEntries: SuggestedManualEntry[];
  manualEntriesAccepted: string[];
}

export interface SuggestedManualEntry {
  id: string;
  targetSection: 'triggers' | 'what_works' | 'what_doesnt_work' | 'boundaries';
  content: string;
  accepted: boolean;
}

export interface WorkbookChapter {
  chapterId: string;
  familyId: string;
  userId: string;

  // Target
  dimensionId: DimensionId;
  personId: string;
  personName: string;

  // State
  status: 'active' | 'paused' | 'completed';
  currentPhase: ArcPhase;
  currentExerciseId: string;

  // Score tracking
  startingScore: number;
  currentScore: number;
  targetScore: number;

  // History
  completions: ExerciseCompletion[];

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}

export const WORKBOOK_COLLECTIONS = {
  WORKBOOK_CHAPTERS: 'workbook_chapters',
  EXERCISES: 'exercises',
} as const;
```

Create `src/hooks/useWorkbook.ts`:
A hook that provides:
- `activeChapters` — all active workbook chapters for the current user
- `getChapter(chapterId)` — single chapter with its exercise history
- `startChapter(dimensionId, personId)` — creates a new chapter
- `completeExercise(chapterId, reflection)` — records completion and suggests manual entries
- `acceptManualEntry(completionId, entryId)` — pushes a suggested entry to the person's manual
- `pauseChapter(chapterId)` / `resumeChapter(chapterId)`

This hook reads from the `workbook_chapters` Firestore collection and writes to both `workbook_chapters` and `person_manuals` (when manual entries are accepted).

### Verify
- TypeScript compiles with no errors
- The hook can be imported without runtime errors
- Types are consistent with existing patterns in `person-manual.ts`

---

## Task 6: Build the Starter Exercise Library

### Read first
- `src/config/relationship-dimensions.ts` (read every dimension's `arcGuidance` field)
- `src/types/workbook.ts` (the Exercise interface you just created)
- `src/config/exercise-types.ts` (check if anything useful exists here already)

### Build
Create `src/config/exercises.ts` — the initial exercise library.

For each of the 20 dimensions, create at minimum 3 exercises (one per arc phase: awareness, practice, integration). That's 60 exercises total. Focus on the highest-priority dimensions first:

**Priority 1 (couple domain — write 5 exercises each):**
- `conflict_style` — exercises based on Gottman's Four Horsemen antidotes
- `negative_cycles` — exercises based on Johnson's EFT cycle-breaking
- `turning_toward` — exercises based on Gottman's bid-tracking research
- `emotional_responsiveness` — exercises based on Johnson's A.R.E. model

**Priority 2 (parent-child domain — write 4 exercises each):**
- `warmth_responsiveness` — exercises based on emotion coaching
- `repair_after_rupture` — exercises based on Siegel's repair research
- `mindsight` — exercises based on reflective functioning

**Priority 3 (self domain — write 3 exercises each):**
- `emotional_regulation` — exercises based on Gross's process model
- `self_care_burnout` — exercises based on Maslach burnout prevention
- `stress_management` — exercises based on Cohen's stress model

**Remaining dimensions: write the minimum 3 exercises each (one per phase).**

Each exercise should have:
- A clear, action-oriented title (not academic — "The open question experiment", not "Love Maps Assessment")
- 3-5 concrete instructions a parent can follow
- A suggested timing that fits real family life ("After kids are in bed", "During a car ride", "At breakfast")
- 2-3 reflection prompts specific to what they'll discover
- 1-2 success indicators ("You'll know this is working when...")
- The research basis in one sentence

Export the library as `EXERCISE_LIBRARY: Exercise[]` and add a helper function:
```typescript
export function getExercisesForDimension(
  dimensionId: DimensionId,
  phase?: ArcPhase
): Exercise[]
```

### Verify
- Every dimension has at least 3 exercises
- Every exercise has all required fields populated (no empty strings)
- `getExercisesForDimension` returns correct results for each dimension
- Exercises read naturally — not clinical, not patronizing

---

## Task 7: Build the Workbook Page

### Read first
- `src/app/dashboard/page.tsx` (understand page layout patterns)
- `src/components/layout/MainLayout.tsx` (understand layout wrapper)
- `src/hooks/useWorkbook.ts` (the hook you built in Task 5)
- `src/config/exercises.ts` (the library you built in Task 6)
- `src/components/layout/AuraPhaseIndicator.tsx` (the indicator from Task 1)

### Build
Create `src/app/workbook/page.tsx` — the main Workbook page.

This page shows all active workbook chapters for the current user. Layout:
- WeatherBackground (same as dashboard for visual consistency)
- Navigation + SideNav
- Phase indicator showing "respond"
- If no active chapters: an empty state with "No active exercises. Visit your dashboard to find areas to work on." and a link to dashboard.
- If active chapters: render a `WorkbookChapterCard` for each one.

Create `src/components/workbook/WorkbookChapterCard.tsx`:

A card (using `glass-card-strong`) that shows:
- Dimension name + the person it's about ("Conflict Style · with Iris")
- Current phase badge (Awareness / Practice / Integration) using the ArcPhase type
- Score context: starting score → current score, shown as qualitative bands (not numbers)
- Current exercise: title, description, timing suggestion
- "Mark complete" button → opens reflection form
- "Pause this chapter" link
- Progress dots showing completed exercises in this chapter

Create `src/components/workbook/ReflectionForm.tsx`:

A modal or slide-up form with:
- Rating question: "How did it go?" with four options (Didn't try / Tried but hard / Went okay / Went well)
- The exercise's specific reflection prompts as text areas
- "What did you discover?" open text area
- Suggested manual entries section (AI-generated or template-based): "Add to {{personName}}'s manual?" with accept/dismiss buttons for each suggestion
- Submit button

### Verify
- Page renders at `/workbook` with correct auth guard
- Active chapters display with all information
- Reflection form opens and submits without errors
- Manual entry suggestions appear after exercise completion
- Phase indicator shows "respond" on this page

---

## Task 8: Build the Weekly Check-In Flow

### Read first
- `src/app/workbook/page.tsx` (the workbook page from Task 7)
- `src/hooks/useRingScores.ts` (how scores are computed)
- `src/components/shared/AssessmentShell.tsx` (the unified question wrapper from Task 4)
- `src/config/relationship-dimensions.ts` (assessment prompts for each dimension)

### Build
Create `src/app/checkin/page.tsx` — the weekly check-in page.

This page runs a mini AURA cycle in one flow:

**Step 1 — Micro-Assess** (phase indicator: "assess")
- For each active workbook chapter, show 1-2 targeted questions from that dimension's `assessmentPrompts`
- Use the `AssessmentShell` wrapper for visual consistency
- Questions should be quick (Likert or frequency, not text)

**Step 2 — Micro-Understand** (phase indicator: "understand")
- After answering, show a brief result:
  - "Your conflict score: Needs attention → Getting better" (qualitative, not numeric)
  - Trend arrow (up, flat, down)
  - One sentence of narrative context from the climate engine

**Step 3 — Micro-Respond** (phase indicator: "respond")
- Show current exercise status
- If completed: suggest next exercise with a preview
- If not completed: encourage with "Still working on [exercise name]? Take your time."

**Step 4 — Micro-Assimilate** (phase indicator: "assimilate")
- "Here's what changed this week" summary
- If scores improved: celebration moment
- If scores declined: compassionate framing ("Tough weeks happen. You're still here.")
- Link to Manual showing any new entries added from Workbook reflections

The whole flow should fit on one scrolling page with clear section breaks, or use a step-by-step wizard. Total interaction time target: under 5 minutes.

### Verify
- Page renders at `/checkin` with correct auth guard
- Phase indicator progresses through all four phases as user scrolls/steps
- Questions pull from the correct dimensions based on active chapters
- Score deltas display as qualitative bands, not raw numbers
- The entire flow takes under 3 minutes to complete with test data

---

## Task 9: Add Workbook to Navigation

### Read first
- `src/components/layout/SideNav.tsx`
- `src/components/layout/Navigation.tsx`
- `src/app/dashboard/page.tsx` (the footer links section)

### Build
1. Add "Workbook" and "Check-in" to the side navigation.
   - Workbook icon: BookOpenIcon from Heroicons
   - Check-in icon: ArrowPathIcon from Heroicons (circular arrow)
   - Position: after "People" in the nav order

2. On the dashboard page, add a "check-in" prompt:
   - If the user has active workbook chapters AND hasn't done a check-in in 7+ days:
   - Show a gentle card above the relationship forecasts: "It's been a week. Ready for a quick check-in?" with a link to `/checkin`
   - Use the AURA amber color for this prompt card

3. On each person's page (`src/app/people/[personId]/...`), add a link to their relevant workbook chapters:
   - "Working on: Conflict Style, Warmth" with a link to `/workbook`

### Verify
- SideNav shows Workbook and Check-in links
- Dashboard shows check-in prompt when appropriate
- Navigation feels natural — user can get to any AURA phase from any page

---

## Task 10: Understanding Reveal Page

### Read first
- `src/app/dashboard/page.tsx` (the `handleAnalyze` function and state transitions)
- `src/lib/scoring-engine.ts` (how scores are computed)
- `src/lib/climate-engine.ts` (how climate and forces are computed)
- `src/components/dashboard/FamilyForces.tsx` (may already render forces)

### Build
Create `src/app/reveal/page.tsx` — the Understanding reveal experience.

This page is shown after the initial analysis (or can be revisited). It presents the scoring results with ceremony:

**Stage 1: Domain Reveal**
For each domain (Self, Couple, Parent-Child), animate the score in sequence:
- Show the domain name
- Animate a climate gradient forming (use the domain's score to determine the climate state)
- Show the qualitative label ("Steady" or "Needs attention")
- Brief pause, then move to next domain
- Use CSS transitions, not a heavy animation library

**Stage 2: Forces**
Display the lifting and weighing forces from `classifyForces()`:
- "What's lifting your family up: [top 3 dimensions]"
- "What needs attention: [bottom 3 dimensions]"
- Each force links to its dimension detail (or could open a Workbook chapter)

**Stage 3: Narrative**
The `buildClimateSummary()` output displayed as editorial text, center-aligned, in the display font.

**Stage 4: Call to Action**
"Ready to start working on something?" → link to Workbook
"Or explore your dashboard" → link to Dashboard

Update `handleAnalyze` in the dashboard to redirect to `/reveal` after analysis completes, rather than staying on the dashboard.

### Verify
- Reveal page animates through all stages
- Forces display correctly from real scored data
- Narrative reads naturally
- Navigation to Workbook or Dashboard works
- Phase indicator shows "understand" throughout

---

## Task 11: Progressive Assessment Engine

> **This task implements the app's core design principle:** The onboarding collects just enough data to get the system started. Rigor builds over time as new questions surface naturally through check-ins, workbook reflections, and acute events. The picture gets sharper with every interaction — the user never sits through another 45-minute questionnaire.

### Read first
- `src/config/relationship-dimensions.ts` (every dimension has `assessmentPrompts` — these are the deeper questions designed for post-onboarding use, separate from `existingQuestionMappings` which point to onboarding questions)
- `src/types/growth-arc.ts` (the `DimensionAssessment` type, especially `dataPointCount` and `confidence` fields)
- `src/lib/scoring-engine.ts` (how confidence is currently computed)
- `src/hooks/useRingScores.ts` (how scores are consumed)
- `src/app/checkin/page.tsx` (the check-in flow from Task 8)
- `src/hooks/useWorkbook.ts` (the workbook hook from Task 5)

### Understand the existing two-layer question architecture
The codebase already separates questions into two tiers:
1. **Onboarding questions** (`existingQuestionMappings` on each dimension) — broad, conversational, collected once during initial setup. These give the system its first rough signal.
2. **Assessment prompts** (`assessmentPrompts` on each dimension) — targeted, dimension-specific, designed for later. Each has a `weight`, a `responseType`, and a `forPerspective`. These are the deeper questions that build rigor over time.

This task connects these two tiers into a continuous pipeline.

### Build

#### 1. Create `src/lib/assessment-needs-engine.ts`

This engine determines which dimensions need more data and which questions to surface next.

```typescript
import { DimensionAssessment } from '@/types/growth-arc';
import { DimensionId, getDimension, ALL_DIMENSIONS, AssessmentPromptTemplate } from '@/config/relationship-dimensions';

export type AssessmentNeedReason =
  | 'below_minimum_data'      // Fewer data points than minDataPointsForScore
  | 'low_confidence'          // Confidence is 'low' despite having some data
  | 'stale_data'              // No new data points in 30+ days for an active dimension
  | 'contradiction_detected'  // Workbook reflection contradicted existing score
  | 'acute_event_impact'      // An acute event hit a low-data dimension
  | 'user_requested';         // User explicitly wants to go deeper

export interface AssessmentNeed {
  dimensionId: DimensionId;
  reason: AssessmentNeedReason;
  priority: 'high' | 'medium' | 'low';
  suggestedPrompts: AssessmentPromptTemplate[];
  promptCount: number; // How many questions to surface (1-3)
  contextMessage: string; // Human-readable explanation shown to user
}

export function computeAssessmentNeeds(
  assessments: DimensionAssessment[],
  activeWorkbookDimensionIds: DimensionId[],
  recentAcuteEventDimensionIds?: DimensionId[]
): AssessmentNeed[]
```

Logic for `computeAssessmentNeeds`:

**High priority triggers (surface 2-3 questions):**
- Dimension has fewer data points than its `minDataPointsForScore` AND the dimension is being actively worked on in a Workbook chapter
- An acute event impacted a dimension that has low confidence
- A Workbook reflection was flagged as contradicting the current score

**Medium priority triggers (surface 1-2 questions):**
- Dimension confidence is 'low' and it's been more than 14 days since the last data point
- Dimension is actively being worked on in a Workbook chapter and hasn't had new assessment data in 30+ days

**Low priority triggers (surface 1 question):**
- Any dimension with confidence below 'high' that hasn't received new data in 60+ days
- Dimensions that only have onboarding-level data (no post-onboarding assessment prompts answered yet)

**Question selection logic:**
For each need, select prompts from the dimension's `assessmentPrompts` that:
- Have NOT already been answered (track which promptIds have been used)
- Match the appropriate perspective (if the user is answering about themselves, use `forPerspective: 'self'` or `'either'`; if about someone else, use `'observer'` or `'either'`)
- Prioritize higher-weight prompts first

**Context messages (shown to the user):**
- Below minimum: "We don't have a clear picture of {{dimensionName}} yet. Two quick questions would help."
- Low confidence: "Your {{dimensionName}} score is based on limited data. Want to sharpen the picture?"
- Stale: "It's been a while since we checked in on {{dimensionName}}. Things may have shifted."
- Contradiction: "Your recent reflection suggests something new about {{dimensionName}}. Let's update the picture."
- Acute event: "That event may have affected {{dimensionName}}. A couple of questions would help us understand."
- User requested: "Let's go deeper on {{dimensionName}}."

#### 2. Create `src/components/dashboard/DeepenCard.tsx`

A dashboard card that surfaces when `computeAssessmentNeeds` returns high or medium priority needs.

```typescript
interface DeepenCardProps {
  need: AssessmentNeed;
  onStart: () => void;
  onDismiss: () => void;
}
```

Design:
- Uses `glass-card-strong` like other dashboard cards
- Shows the AURA phase indicator in 'assess' state
- Headline: the `contextMessage` from the need
- Subtitle: "{{promptCount}} quick questions · ~2 minutes"
- CTA button: "Sharpen the picture" or "Quick check"
- Dismiss link: "Not now" (dismisses for 7 days)
- Limit to showing at most 1-2 DeepenCards on the dashboard at a time, prioritized by need priority

#### 3. Create `src/hooks/useAssessmentNeeds.ts`

A hook that:
- Calls `computeAssessmentNeeds` with current assessments and active workbook dimensions
- Tracks which needs have been dismissed (store dismissals in Firestore or localStorage)
- Returns `visibleNeeds: AssessmentNeed[]` (filtered to non-dismissed, max 2)
- Returns `startAssessment(need: AssessmentNeed)` — navigates to a mini-assessment flow

#### 4. Create the mini-assessment flow at `src/app/deepen/[dimensionId]/page.tsx`

A lightweight assessment page that:
- Shows the AURA phase indicator at 'assess'
- Uses the `AssessmentShell` from Task 4 for visual consistency
- Renders only the 1-3 questions from the `AssessmentNeed.suggestedPrompts`
- After completion, shows a micro-understand moment: "Got it. Your {{dimensionName}} confidence is now medium → high." or "Score updated: {{qualitative change}}"
- Offers to return to dashboard or continue to the Workbook chapter for this dimension
- The whole interaction takes under 2 minutes

#### 5. Integrate with existing flows

**Dashboard integration:**
In `src/app/dashboard/page.tsx`, import `useAssessmentNeeds` and render `DeepenCard` components in the active state, positioned between the climate summary and the relationship cards. These cards should feel like gentle invitations, not obligations.

**Check-in integration:**
In the check-in flow (Task 8), the micro-assess step should pull from `computeAssessmentNeeds` to select which questions to ask. If a dimension has a high-priority need, use those prompts instead of generic check-in questions. This means the weekly check-in automatically targets the biggest data gaps.

**Workbook integration:**
When a user completes a Workbook exercise reflection (Task 7) and the reflection rating contradicts the current dimension score (e.g., they rate an exercise as "went well" but the dimension score is below 2.0, or they rate it "tried but hard" and the score is above 4.0), flag a `contradiction_detected` need for that dimension. This triggers deeper assessment on the next check-in or dashboard visit.

**Acute event integration:**
When an acute event is logged (the `AcuteEvent` type in `ring-scores.ts`), its `aiAnalysis.affectedDimensions` should be cross-referenced with dimension confidence levels. Any affected dimension with confidence below 'high' gets an `acute_event_impact` need.

#### 6. Track assessment prompt usage

Add a field to `DimensionAssessment` (or a new subcollection) that tracks which `promptId`s have been answered:

```typescript
answeredPromptIds: string[]; // e.g., ['lm_1', 'lm_3'] for love_maps
```

This prevents the system from re-asking the same question and ensures it always surfaces fresh prompts. When all prompts for a dimension have been answered, the system stops generating needs for that dimension (it has maximum confidence).

### Verify
- `computeAssessmentNeeds` returns correct needs for various data scenarios:
  - New user with only onboarding data → several low/medium needs
  - Active user with workbook chapters → targeted high-priority needs
  - Well-assessed user → few or no needs
- `DeepenCard` renders on dashboard only when there are genuine data gaps
- Mini-assessment flow at `/deepen/[dimensionId]` works end-to-end
- Completing a mini-assessment increases the dimension's confidence level
- Check-in flow incorporates assessment needs into its question selection
- Dismissed needs don't reappear for 7 days
- No dimension ever re-asks a question the user has already answered

---

## General instructions for Claude Code

When implementing each task:

1. **Read the specified files first** before writing any code. Understand existing patterns.
2. **Follow existing conventions** — use the same hook patterns, the same component structure, the same CSS variable usage.
3. **Keep the design system consistent** — use `glass-card-strong` for cards, the display font for headings, the body font for content, the existing color variables.
4. **Don't break existing functionality** — these are additive changes. If modifying an existing file, preserve all current behavior.
5. **Test with the demo mode** — the app has a demo mode (`?demo=true`) that should continue to work after changes.
6. **Commit after each task** with a descriptive message like `feat: add AURA phase indicator component`.
