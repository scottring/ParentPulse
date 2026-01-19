# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server on http://localhost:3000
npm run build        # Build production bundle
npm run start        # Start production server
npm run lint         # Run ESLint

# Testing
npm test             # Run unit tests with vitest (watch mode)
npm run test:run     # Run unit tests once
npm run test:watch   # Run unit tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run test:e2e     # Run Playwright end-to-end tests
npm run test:e2e:ui  # Run E2E tests with UI
npm run test:functions # Run Cloud Functions tests
npm run test:rules   # Test Firestore security rules
npm run test:all     # Run all tests (unit, functions, rules)

# Firebase deployment
firebase deploy --only firestore:rules    # Deploy security rules
firebase deploy --only firestore:indexes  # Deploy Firestore indexes
firebase deploy --only functions          # Deploy Cloud Functions
firebase deploy                           # Deploy all
```

## High-Level Architecture

**LifeManual** (formerly ParentPulse) is a Next.js 16 application that helps users create "operating manuals" for the important people in their lives. Think of it as creating personalized user guides for understanding and supporting the people you care about - children, spouses, friends, elderly parents, etc.

### Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: Firebase (Firestore, Authentication, Cloud Functions)
- **AI**: Anthropic Claude API (via Cloud Functions)
  - Claude 3.5 Sonnet for complex generation (strategic plans, manual content)
  - Claude 3 Haiku for quick operations (daily actions, chat)

### Core Architecture: Person-Centric Manual System (Phase 1 - Simplified)

**Current Implementation** (Phase 1):

The application uses a simplified two-tier architecture:

1. **Person** (`/people` collection) - Core entity representing anyone in the family network
2. **PersonManual** (`/person_manuals` collection) - Contains all content directly inside the document

```typescript
Person → PersonManual (with content directly inside)
{
  manualId, personId, personName, relationshipType,
  coreInfo: { sensoryNeeds, interests, strengths, notes },
  triggers: ManualTrigger[],
  whatWorks: ManualStrategy[],
  whatDoesntWork: ManualStrategy[],
  boundaries: ManualBoundary[],
  patterns: ManualPattern[],
  progressNotes: ManualProgressNote[]
}
```

**Key Principle**: All content lives directly in the person's manual. No role sections or relationship manuals in Phase 1.

**Future (Phase 2)**: Will add `involvedPeople` arrays to content items for filtered relationship views while maintaining single source of truth.

### Manual Content Structure

Each PersonManual contains:

**Core Information**:
- 📝 **Core Info** - Sensory needs, interests, strengths, general notes
- ⚡ **Triggers** - Causes of stress, typical responses, severity levels, deescalation strategies
- ✨ **What Works** - Effective strategies with 1-5 effectiveness ratings
- 🚫 **What Doesn't Work** - Approaches to avoid
- 🛡️ **Boundaries** - Categorized as immovable/negotiable/preference
- 📊 **Patterns** - Recurring behavioral or situational patterns
- 📔 **Progress Notes** - Timestamped observations and updates

**Relationship Types** (determines onboarding questions):
- **Child**, **Spouse**, **Elderly Parent**, **Friend**, **Professional**, **Sibling**, **Other**

### Weekly Workbook System

**NEW**: Parent-driven weekly goal tracking with tablet-friendly activities (see [WEEKLY_WORKBOOK_IMPLEMENTATION.md](WEEKLY_WORKBOOK_IMPLEMENTATION.md)):

**Collections**:
- `weekly_workbooks` - Weekly workbook documents with parent goals and activities

**Structure**:
```typescript
WeeklyWorkbook {
  personId, manualId, weekNumber, startDate, endDate,
  parentGoals: ParentBehaviorGoal[],      // 3-5 parent behavior goals
  dailyActivities: DailyActivity[],       // 2-3 interactive activities
  weeklyReflection?: WeeklyReflection,
  status: 'active' | 'completed'
}
```

**Key Features**:
- AI generates goals from manual triggers/strategies using Claude 3.5 Sonnet
- 6 tablet-friendly activity types: emotion-checkin, choice-board, daily-win, visual-schedule, gratitude, feeling-thermometer
- Parent tracks their own behavior changes (NOT child compliance)
- Weekly reflection and iterative improvement
- Real-time Firestore subscriptions for live updates

**Hooks**:
- `useWeeklyWorkbook(personId)` - CRUD operations for workbooks
- `useActiveWorkbooks()` - Query all active workbooks for family
- `useWorkbookHistory(personId, weekCount)` - Fetch historical workbooks

## Manual Creation Flow

### Three-Step Process

1. **Creation Wizard** ([/src/app/people/[personId]/create-manual/page.tsx](src/app/people/[personId]/create-manual/page.tsx))
   - User selects relationship type (child, spouse, friend, etc.)
   - Creates empty PersonManual with selected relationship type
   - Navigates to onboarding wizard

2. **Onboarding Wizard** ([/src/app/people/[personId]/manual/onboard/page.tsx](src/app/people/[personId]/manual/onboard/page.tsx))
   - **Typeform-style UI**: Large fonts, one question at a time, keyboard navigation
   - Asks 2-4 conversational questions per section (relationship-specific)
   - Questions defined in [/src/config/onboarding-questions.ts](src/config/onboarding-questions.ts)
   - User answers sent to Cloud Function `generateInitialManualContent`
   - AI (Claude 3.5 Sonnet) generates structured content from answers
   - User reviews/edits generated content before saving
   - Content saved directly to PersonManual using `useSaveManualContent` hook

3. **Workbook Generation** (NEW - automatic after manual creation)
   - System calls Cloud Function `generateWeeklyWorkbook`
   - AI analyzes manual triggers/strategies
   - Generates 3-5 parent behavior goals + 2-3 suggested activities
   - Creates first weekly workbook in Firestore
   - Redirects user to workbook page for daily tracking

### AI Content Generation

**Cloud Function**: `generateInitialManualContent` ([/functions/index.js](functions/index.js:957-1027))

**Flow**:
1. Receives user's conversational answers
2. Builds prompt asking Claude to generate structured JSON
3. Returns organized content: triggers, strategies, boundaries, strengths, etc.
4. Frontend displays for review/editing
5. User approves → Content saved to Firestore

**Prompt Strategy**: The AI prompt is designed to extract structured, actionable content from free-form conversational answers while maintaining empathy and specificity. See `buildManualContentPrompt()` function.

## Key React Hooks

All hooks follow Firebase real-time patterns and handle authentication via `useAuth()`.

### Data Management Hooks

**Person Manuals** (Phase 1 - Simplified):

- **`usePersonManual`** ([/src/hooks/usePersonManual.ts](src/hooks/usePersonManual.ts)) - CRUD for PersonManual with content
  - `createManual()` - Creates empty manual with empty content arrays
  - Content CRUD: `addTrigger()`, `addStrategy()`, `addBoundary()`, `addPattern()`, `addProgressNote()`
  - Updates: `updateTrigger()`, `updateStrategy()`, `updateBoundary()`, `updatePattern()`, `updateCoreInfo()`
  - Deletes: `deleteTrigger()`, `deleteStrategy()`, `deleteBoundary()`, `deletePattern()`, `deleteProgressNote()`
  - All operations update counters (totalTriggers, totalStrategies, totalBoundaries)
  - All operations update `lastEditedBy`, `version`, timestamps automatically

- **`useManualOnboarding`** ([/src/hooks/useManualOnboarding.ts](src/hooks/useManualOnboarding.ts)) - Manages wizard state
  - Handles calling Cloud Function for AI generation
  - Tracks current step, section, question index
  - Manages localStorage for resuming interrupted sessions

- **`useSaveManualContent`** ([/src/hooks/useSaveManualContent.ts](src/hooks/useSaveManualContent.ts)) - Saves AI-generated content
  - Batch saves all generated content to Firestore
  - Updates PersonManual with triggers, strategies, boundaries, patterns, coreInfo
  - Updates all counters and metadata

**Weekly Workbooks** (NEW):

- **`useWeeklyWorkbook(personId)`** ([/src/hooks/useWeeklyWorkbook.ts](src/hooks/useWeeklyWorkbook.ts)) - CRUD for workbooks
  - `createWorkbook()` - Creates new weekly workbook with goals and activities
  - `updateWorkbook()` - Updates workbook data
  - `logGoalCompletion()` - Logs parent goal completion (checkbox tracking)
  - `completeActivity()` - Records child's response to activity
  - `saveReflection()` - Saves weekly reflection (4 questions)
  - `completeWorkbook()` - Marks week as completed
  - Real-time Firestore subscription for live updates

- **`useActiveWorkbooks()`** - Query all active workbooks for family
- **`useWorkbookHistory(personId, weekCount)`** - Fetch historical workbooks

**Other Hooks**:

- **`usePeople`** - Fetch all people in family
- **`usePersonById`** - Fetch single person by ID
- **`useFamilyManual`** - Separate from person manuals, for family-wide content

## Firebase Cloud Functions

All functions in [/functions/index.js](functions/index.js):

### AI-Powered Functions

1. **`generateInitialManualContent`** (lines 957-1027)
   - **Model**: Claude 3.5 Sonnet
   - **Purpose**: Generate manual content from onboarding wizard answers
   - **Input**: User's conversational answers to questions
   - **Output**: Structured JSON (triggers, strategies, boundaries, etc.)

2. **`generateWeeklyWorkbook`** (lines 1389-1604) **NEW**
   - **Model**: Claude 3.5 Sonnet
   - **Purpose**: Generate weekly workbook with parent behavior goals from manual content
   - **Input**: Manual content (triggers, whatWorks, boundaries), previous week reflection
   - **Output**: 3-5 parent goals + 2-3 suggested activities + weekly focus
   - **Integration**: Automatically called after manual onboarding completion

3. **`generateStrategicPlan`** (lines 749-951)
   - **Model**: Claude 3.5 Sonnet
   - **Purpose**: Create 30-90 day strategic plans for specific challenges
   - **Input**: Child profile, journal entries, knowledge base items
   - **Output**: Phased plan with activities, milestones, resources

4. **`generateDailyActions`** (lines 23-62) + **`generateDailyActionsManual`** (lines 67-100)
   - **Model**: Claude 3 Haiku
   - **Purpose**: Daily parenting action generation from journal entries
   - **Schedule**: Runs automatically at 9 PM (can also be manually triggered)
   - **Output**: 2-5 actionable items for next day

5. **`chatWithCoach`** (lines 107-210)
   - **Model**: Claude 3 Haiku
   - **Purpose**: Conversational AI coach with RAG (Retrieval-Augmented Generation)
   - **Context**: Retrieves recent journal entries, knowledge base, actions
   - **Use Case**: Ask questions about parenting, relationships, personal growth

### Helper Functions

- **`retrieveChatContext()`** - RAG retrieval for chat coach
- **`processFamilyAnalysis()`** - Core logic for daily action generation
- **`buildManualContentPrompt()`** - Prompt construction for manual generation

## Firestore Security Rules

Rules in [/firestore.rules](firestore.rules):

### Key Patterns

**Authentication Helpers**:
```javascript
function isSignedIn() { return request.auth != null; }
function isParent() { return isSignedIn() && getUserData().role == 'parent'; }
function belongsToFamily(familyId) { return isSignedIn() && getUserData().familyId == familyId; }
```

**Role Sections** (lines 317-330):
- **Read**: Any family member can read
- **Create**: Any authenticated family member
- **Update**: Any family member (collaborative editing)
- **Delete**: Parents only

**Person Manuals** (lines 302-315):
- Family members can read
- Parents can create/update/delete
- Collaborative updates allowed for manual content

**Note**: Security rules were recently simplified to enable collaborative editing. Previously used `isContributor()` check which was overly restrictive.

## State Management & Wizard Flow

### Onboarding Wizard State

The wizard ([/src/app/people/[personId]/manual/onboard/page.tsx](src/app/people/[personId]/manual/onboard/page.tsx)) uses React state to manage:

```typescript
currentStep: 'welcome' | 'questions' | 'generating' | 'review' | 'complete'
currentSectionIndex: number     // Which section (0-N)
currentQuestionIndex: number    // Which question within section (0-M)
answers: Record<string, Record<string, string>>  // Nested by section/question
generatedContent: ManualContent | null
```

**Navigation**:
- `handleNextQuestion()` - Advance to next question or section
- `handlePreviousQuestion()` - Go back
- `handleSkipQuestion()` - Skip current question
- Progress calculated across ALL questions in ALL sections

**Keyboard Shortcuts**:
- Enter: Continue on welcome screen
- Ctrl/Cmd + Enter: Submit answer and continue

**Typeform Style**:
- Large typography (text-3xl to text-5xl for questions)
- One question at a time (not full section)
- Large textarea inputs (6 rows)
- Prominent Continue/Skip buttons

## Important Files Reference

### Type Definitions
- [/src/types/person-manual.ts](src/types/person-manual.ts) - Complete type system for manual architecture

### Configuration
- [/src/config/section-templates.ts](src/config/section-templates.ts) - Section definitions by relationship type
- [/src/config/onboarding-questions.ts](src/config/onboarding-questions.ts) - Wizard questions configuration

### Utilities
- [/src/utils/manual-initialization.ts](src/utils/manual-initialization.ts) - Creates empty role sections from templates

### Components
- [/src/components/manual/AddTriggerModal.tsx](src/components/manual/AddTriggerModal.tsx) - Add trigger CRUD
- [/src/components/manual/AddStrategyModal.tsx](src/components/manual/AddStrategyModal.tsx) - Add strategy CRUD
- [/src/components/manual/AddBoundaryModal.tsx](src/components/manual/AddBoundaryModal.tsx) - Add boundary CRUD

### Pages
- [/src/app/people/page.tsx](src/app/people/page.tsx) - People management (list, create, edit, delete)
- [/src/app/people/[personId]/create-manual/page.tsx](src/app/people/[personId]/create-manual/page.tsx) - Step 1: Select relationship type
- [/src/app/people/[personId]/manual/onboard/page.tsx](src/app/people/[personId]/manual/onboard/page.tsx) - Step 2: AI-assisted onboarding
- [/src/app/people/[personId]/roles/[roleId]/page.tsx](src/app/people/[personId]/roles/[roleId]/page.tsx) - View/edit role section

## Development Patterns

### Adding New Relationship Types

1. Add type to `RelationshipType` enum in [person-manual.ts](src/types/person-manual.ts:22-34)
2. Create section templates in [section-templates.ts](src/config/section-templates.ts)
3. Create onboarding questions in [onboarding-questions.ts](src/config/onboarding-questions.ts)
4. Update `getOnboardingSections()` helper to include new sections

### Extending AI Capabilities

**For Manual Generation**:
- Modify `buildManualContentPrompt()` in [functions/index.js](functions/index.js:1032-1118)
- Update response JSON structure
- Add new fields to TypeScript types

**For Other AI Features**:
- Follow existing patterns (Claude 3.5 Sonnet for complex, Haiku for simple)
- Always include error handling and fallback responses
- Log generation for debugging: `logger.info("Calling Claude for...")`

### Common Development Tasks

**Enable Edit UI**: All CRUD modals exist, just need to remove `disabled` props on buttons

**Add New Section Content Type**:
1. Add type to `RoleSection` interface
2. Create add/edit modal component
3. Add CRUD methods to `useRoleSection` hook
4. Update security rules if needed

**Modify Wizard Questions**:
- Edit [onboarding-questions.ts](src/config/onboarding-questions.ts)
- Questions support `{{personName}}` placeholder for personalization
- Mark questions as `required: true/false`
- Set sections as `skippable: true/false`

## Authentication & Family Context

All data operations require:
1. **User Authentication**: Via Firebase Auth (`useAuth()` hook)
2. **Family Context**: User must have `familyId` from their user document
3. **Role Check**: Some operations restricted to `role === 'parent'`

**Auth Flow**:
- AuthContext provides `user` object with `userId`, `familyId`, `role`
- All Firestore queries filter by `familyId`
- Security rules enforce family-based access control

## CSS & Theming

Uses Tailwind CSS 4 with CSS variables for theming:

```css
--parent-bg: Background color
--parent-text: Primary text
--parent-text-light: Secondary text
--parent-accent: Brand accent color
--parent-border: Border colors
```

**Owner's Manual Aesthetic**:
- Vintage technical manual design
- Warm, approachable but professional
- Large, readable typography
- Clear visual hierarchy

## Troubleshooting

**Firestore Permission Errors**:
- Check security rules match data structure
- Verify user has correct `familyId` and `role`
- Ensure `belongsToFamily()` check is used correctly

**AI Generation Failures**:
- Check Cloud Function logs: `firebase functions:log`
- Verify `ANTHROPIC_API_KEY` secret is configured
- Review prompt construction for JSON parsing issues
- Fallback responses should handle API failures gracefully

**Wizard State Issues**:
- Check localStorage for saved progress (key pattern: `manual-wizard-*`)
- Verify question count calculation across sections
- Ensure answer state is properly nested by section/question

## Future Development Notes

- Manual system is designed for **collaborative editing** - multiple contributors can edit same role section
- Strategic plans have **approval workflow** - requires all relationship contributors to approve
- **Progressive prompts**: Future feature to suggest manual updates from journal entries
- **Version tracking**: All updates increment `version` field for history/audit trail
- **CRITICAL: Multi-participant onboarding** - Allow both participants in relationship manuals to complete onboarding separately, then merge perspectives:
  - Each participant fills out age-appropriate questionnaire
  - Child version (8-12): simplified language, concrete examples, emoji choices
  - Teen version (13-17): age-appropriate tone and examples
  - Adult version (18+): current question set
  - AI combines both participants' answers into unified manual
  - Questions like "What makes you feel loved?" answered by each person about themselves
  - Age detection from Person's birthdate field
  - UI adjustments for children (bigger text, more visual, less reading)
