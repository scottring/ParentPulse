# Relish: Full Perfectification Plan

## Current State Summary

Relish is a Next.js 16 + React 19 app with Firebase backend and Claude AI integration. It builds "operating manuals" for family members by collecting multi-perspective contributions, synthesizing them with AI, and generating personalized growth activities across 20 relationship dimensions in 3 domains (self, couple, parent-child).

**What's solid:** Auth, onboarding wizards, contribution system, AI synthesis pipeline, scoring/climate/progression engines, growth items + arcs, workbooks, weather-themed dashboard, glassmorphic design system with 60+ components.

**What's missing or incomplete:** Dashboard is onboarding-focused not ongoing-use-focused, People page lacks health indicators, no report/therapist export, no structured manual read view, RoleSections not surfaced, no freshness/staleness tracking, no action item system, no baseline snapshots.

---

## Phase 1: Data Layer Foundations (No UI changes)

These changes add fields and logic that every later phase depends on.

### 1.1 Baseline Snapshot Flag
**Files:** `src/types/growth-arc.ts`, `functions/index.js`
- Add `isBaseline: boolean` field to `ScoreSnapshot` type
- When `seedDimensionAssessments` runs in cloud functions, tag initial snapshots with `isBaseline: true`
- Add helper `getBaselineSnapshot(assessment: DimensionAssessment): ScoreSnapshot | null` to `scoring-engine.ts` that finds the first snapshot where `isBaseline === true`

### 1.2 Freshness Tracking
**Files:** `src/types/person-manual.ts`, `src/lib/freshness-engine.ts` (new)
- Add `lastContributionAt: Timestamp` field to `PersonManual`
- Update `useContribution.linkContributionToManual()` to set this timestamp on contribution completion
- Create `freshness-engine.ts` with:
  ```
  computeFreshness(manual: PersonManual): 'fresh' | 'aging' | 'stale'
  // fresh: < 30 days, aging: 30-90 days, stale: > 90 days
  
  computeContributionCoverage(manual: PersonManual, contributions: Contribution[]): {
    hasSelfPerspective: boolean
    observerCount: number
    missingPerspectives: string[]  // e.g. "spouse", "child observer"
    oldestContribution: Timestamp | null
    newestContribution: Timestamp | null
  }
  
  computeFamilyCompleteness(people: Person[], manuals: PersonManual[], contributions: Contribution[]): {
    overallPercent: number  // 0-100
    coverage: number       // people with manuals / total people
    freshness: number      // fresh manuals / total manuals
    depth: number          // avg contribution count per manual
    perPerson: Array<{personId, name, status: 'complete'|'partial'|'empty'|'stale'}>
  }
  ```

### 1.3 Action Item System
**Files:** `src/types/action-items.ts` (new), `src/lib/action-engine.ts` (new), `src/hooks/useActionItems.ts` (new)

Define a unified action item type:
```typescript
interface ActionItem {
  id: string
  familyId: string
  type: 'missing_data' | 'stale_data' | 'synthesis_alert' | 'check_in_due' | 'contribution_request' | 'milestone'
  priority: 'low' | 'medium' | 'high'
  title: string
  description: string
  targetPersonId?: string
  targetPersonName?: string
  actionRoute: string  // where to navigate
  createdAt: Timestamp
  dismissedAt?: Timestamp
  completedAt?: Timestamp
  source: 'system' | 'synthesis' | 'schedule' | 'user'
}
```

Create `action-engine.ts` that generates action items from current state:
- **Missing data:** Person has no manual, manual has no self-perspective, manual has no observer perspectives
- **Stale data:** Contribution older than 90 days, no journal entries in 3 weeks, no check-in in 2 weeks
- **Synthesis alerts:** AI synthesis found significant gaps, behavioral pattern shift detected
- **Milestones:** Child birthday approaching (developmental stage shift), arc graduation
- **Check-in due:** Weekly check-in not completed

Action items are computed client-side from existing Firestore data (not a new collection) — they're derived state, not stored state. The hook `useActionItems()` calls the engine with dashboard data.

### 1.4 Contribution Request System (Lightweight)
**Files:** `src/types/person-manual.ts`, `src/hooks/useContributionRequest.ts` (new)

Add a `contribution_requests` Firestore collection:
```typescript
interface ContributionRequest {
  requestId: string
  familyId: string
  requestedByUserId: string
  requestedByName: string
  targetEmail: string  // spouse or family member
  targetPersonId: string  // person the contribution is about
  targetPersonName: string
  perspectiveType: 'self' | 'observer'
  message?: string  // "Can you update your perspective on bedtime with Caleb?"
  status: 'pending' | 'completed' | 'expired'
  createdAt: Timestamp
  completedAt?: Timestamp
  expiresAt: Timestamp  // 14 days
}
```

This is the lightweight approach — generates a sharable link, doesn't require the recipient to have an account. The link routes to the onboarding wizard pre-filled with context.

---

## Phase 2: Dashboard Redesign

Transform the dashboard from onboarding-focused to ongoing-use hub.

### 2.1 Family Completeness Ring
**Files:** `src/components/dashboard/FamilyCompletenessRing.tsx` (new)
- SVG donut chart with 3 segments: Coverage, Freshness, Depth
- Each segment colored by health (green/amber/red)
- Center shows overall percentage
- Tapping a segment shows detail breakdown
- Uses `computeFamilyCompleteness()` from freshness-engine

### 2.2 Action Items Feed
**Files:** `src/components/dashboard/ActionFeed.tsx` (new), `src/components/dashboard/ActionCard.tsx` (new)
- Replaces the current onboarding-step cards for post-onboarding users
- Shows top 3-5 action items sorted by priority
- Each card: icon + title + description + CTA button
- Dismissable (swipe or X)
- Categories with distinct styling:
  - Missing data → blue info style
  - Stale data → amber warning style  
  - Synthesis alert → purple insight style
  - Check-in due → green action style
  - Contribution request → warm tan request style

### 2.3 Family Member Quick Status
**Files:** `src/components/dashboard/FamilyStatusRow.tsx` (new)
- Horizontal scrollable row of small avatar circles (one per family member)
- Each circle has a colored ring indicating their manual health
- Tap to navigate to their manual/portrait
- Shows name below, tiny badge for action count

### 2.4 Dashboard Page Restructure
**Files:** `src/app/dashboard/page.tsx`, `src/hooks/useDashboard.ts`
- Restructure layout:
  1. Greeting + Weather background (keep existing)
  2. Family Completeness Ring (new)
  3. Action Items Feed (new, replaces onboarding cards post-onboarding)
  4. Family Member Quick Status row (new)
  5. Relationship Forecast cards (keep existing RelationshipCards)
  6. Weekly Activity section (keep existing)
- The existing onboarding flow cards remain for users who haven't completed onboarding
- Add conditional rendering: `isOnboarded` flag determines which dashboard variant shows
- Update `useDashboard` hook to also return freshness and action item data

---

## Phase 3: People Page Enhancement

### 3.1 Enhanced Spouse Card
**Files:** `src/components/people/SpouseCard.tsx` (new)
- Distinct from child cards in layout and metrics
- Shows:
  - **Connection quality indicator:** Derived from couple-domain dimension scores (love_maps, fondness_admiration, turning_toward, etc.) — averaged into a single 1-5 score displayed as a weather icon
  - **Manual freshness:** "Updated 2 weeks ago" with color coding
  - **Perspective alignment:** If both partners have contributed, show alignment percentage from synthesis (count of alignments vs gaps+blindspots)
  - **Active areas:** Pull from synthesized gaps with `significant_gap` severity, show as tags
  - **Quick actions:** "Update my perspective", "Request their update", "View manual"

### 3.2 Enhanced Child Card
**Files:** `src/components/people/ChildCard.tsx` (new)
- Shows:
  - **Emotional visibility score:** Computed from: has self-perspective? has observer perspectives? journal entries mentioning this child in last 30 days? manual freshness? Displayed as a fill meter (0-100%)
  - **Pattern indicators:** Pull from `emergingPatterns` on PersonManual — show up to 3 most recent patterns with confidence badges (emerging/consistent/validated)
  - **Developmental context:** Age badge with age-group label (toddler/preschool/school-age/tween/teen) derived from `dateOfBirth`
  - **What's working / what's not:** 1-line summary from synthesized overview
  - **Trajectory arrows:** Per active dimension, show trend (improving/stable/declining) as small colored arrows

### 3.3 People Page Layout
**Files:** `src/app/people/page.tsx`
- Restructure:
  1. "Your Manual" card at top (self)
  2. "Partner" section with SpouseCard
  3. "Children" section with ChildCards in a responsive grid
  4. "Others" section for elderly_parent, friend, etc. (existing PersonCard)
  5. Add Person button at bottom
- Each section has a subtle header with the section name

### 3.4 Contribution Coverage Matrix
**Files:** `src/components/people/ContributionMatrix.tsx` (new)
- Table/grid showing: rows = family members, columns = contributors
- Cell shows: check (contributed), clock (stale), empty (no contribution)
- Highlights gaps: "Nobody has observed Caleb yet", "Iris hasn't self-contributed"
- Accessible from People page as a toggleable overlay or expandable section

---

## Phase 4: Portrait View (Structured Manual Read Mode)

### 4.1 Portrait Page
**Files:** `src/app/people/[personId]/portrait/page.tsx` (new), `src/components/portrait/` (new directory)

A read-only, beautifully formatted view of all raw + synthesized data for a person.

**Layout:**
1. **Header:** Name, age, relationship type, developmental stage, last updated
2. **Overview section:** Synthesized overview paragraph
3. **Perspectives panel:** Tabbed or accordion — "Self View" | "Observer: [Name]" for each contributor
   - Under each perspective: their answers organized by section (triggers, what works, boundaries, etc.)
   - Show contribution date and freshness
4. **Synthesis section:** 
   - Alignments (green cards)
   - Gaps (amber cards with severity badge)
   - Blind spots (purple cards)
   - Cross-references to other family members (linked cards)
5. **Patterns & Progress:**
   - Emerging patterns timeline
   - Progress notes
   - Score history sparklines per dimension
6. **Role Sections:** (surfacing existing RoleSection data)
   - Expandable cards per role (e.g., "As a parent to Ella", "As a spouse")
   - Each shows: role-specific triggers, strategies, strengths, challenges
   - Link to strategic plan if one exists

### 4.2 Portrait Components
- `PortraitHeader.tsx` — Name, age, badges, freshness indicator
- `PerspectivePanel.tsx` — Tabbed raw contribution viewer
- `SynthesisCards.tsx` — Alignment/gap/blindspot cards with severity styling
- `CrossReferenceLinks.tsx` — Cards linking to related family members
- `PatternTimeline.tsx` — Visual timeline of emerging patterns
- `ScoreSparkline.tsx` — Tiny inline charts for dimension score history
- `RoleSectionCard.tsx` — Expandable role-specific content

### 4.3 Manual Page Tab Integration
**Files:** `src/app/people/[personId]/manual/page.tsx`
- Add tab bar at top: "Chat" | "Portrait" | "Roles"
- Chat tab = existing ManualChat
- Portrait tab = new Portrait view (or link to portrait page)
- Roles tab = RoleSection cards

---

## Phase 5: Reports & Therapist Export

### 5.1 Reports Page
**Files:** `src/app/reports/page.tsx` (new), `src/components/reports/` (new directory)

**Layout:**
1. **Period selector:** Last 2 weeks | Last month | Last quarter | Custom range
2. **Family overview card:** Overall health score + trend, climate state, completeness
3. **Per-person status cards:** Expandable cards for each family member showing:
   - Dimension scores with trends (sparklines)
   - Notable patterns (new, worsening, improving)
   - Recent synthesis insights
   - Journal entry count and themes
4. **Cross-family patterns:** Insights that span multiple people (from crossReferences)
5. **Growth activity summary:** Items completed, skipped, impact ratings
6. **Therapist Report button:** Big CTA at bottom

### 5.2 Therapist Report Generator
**Files:** `src/components/reports/TherapistReport.tsx` (new), `src/components/reports/TherapistReportPreview.tsx` (new), `functions/index.js` (add new cloud function)

**Flow:**
1. User clicks "Generate Therapist Report"
2. Selects period (default: last 30 days)
3. Cloud function `generateTherapistReport` runs:
   - Gathers: dimension scores + trends, synthesis insights, journal themes, growth activity summary, pattern changes
   - Claude generates clinical-tone report with sections:
     - Family Overview (members, ages, key theme)
     - Patterns of Note (data-backed observations)
     - Areas for Discussion (prioritized by severity)
     - Progress Since Last Report (if baseline exists)
     - Raw Data Summary (entry counts, score changes)
4. Preview screen shows the report in a clean, printable layout
5. User can **redact** sections (toggle visibility per section/bullet)
6. Export options: Copy to clipboard, Download PDF, Print
7. Report is NOT stored in Firestore (privacy) — generated on demand

**Cloud Function:**
```javascript
exports.generateTherapistReport = onCall(async (request) => {
  // Auth check
  // Gather period data: scores, syntheses, journal entries, growth items
  // Build prompt with clinical framing guidelines
  // Call Claude (Sonnet) to generate report
  // Return structured report JSON
});
```

### 5.3 Score Trajectory Charts
**Files:** `src/components/reports/TrajectoryChart.tsx` (new)
- Line chart showing score over time per dimension
- Uses simple SVG (no charting library needed — matches existing custom SVG approach)
- Baseline marker line if baseline snapshot exists
- Hover tooltips with score + date + trigger
- Filterable by domain

### 5.4 Navigation Update
**Files:** `src/components/layout/Navigation.tsx`, `src/components/layout/SideNav.tsx`
- Add "Reports" to main navigation (desktop top nav + mobile bottom nav)
- Icon: ClipboardDocumentListIcon from Heroicons
- Route: `/reports`

---

## Phase 6: Journal & Check-in Improvements

### 6.1 Journal Entry Tagging
**Files:** `src/types/index.ts` (or wherever journal types live), journal creation components
- Add structured tags to journal entries: `personMentions: string[]` (personIds mentioned)
- Either auto-detect from text or let user tag which family members an entry relates to
- This enables: "3 journal entries mentioned Caleb this week" on child cards

### 6.2 Enhanced Check-in Flow
**Files:** `src/app/checkin/page.tsx`
- After completing dimension check-in, show:
  - What changed since last check-in (score deltas)
  - Comparison to baseline (if exists)
  - Suggested next action based on biggest movement

### 6.3 Scheduled Check-in Reminders
**Files:** `src/lib/action-engine.ts`
- Action engine generates check-in-due items based on `lastAssessedAt` on DimensionAssessment
- If no check-in in 14 days → medium priority action item
- If no check-in in 30 days → high priority

---

## Phase 7: Polish & Missing Features

### 7.1 Settings Page Completion
**Files:** `src/app/settings/page.tsx`
- Wire up all GrowthPreferences fields: engagementMode, dailyItemTarget, preferredItemTypes, focusDomain, quietHours
- Add notification preferences (even if email isn't built yet — store preferences)
- Add data management: export family data, delete account
- Theme toggle (light/dark)

### 7.2 Contribution Request UI
**Files:** `src/components/people/RequestContributionModal.tsx` (new)
- Modal accessible from SpouseCard / ChildCard / Portrait page
- Form: select person, select perspective type, optional message
- Generates a shareable link (route: `/contribute/[requestId]`)
- Shows pending requests on dashboard action feed

### 7.3 Acute Event Integration
**Files:** `src/components/dashboard/EventInjectionModal.tsx` (already exists — enhance)
- When user logs an acute event, action engine generates relevant action items
- Connect to existing `AcuteEvent` type
- After AI analysis, show affected dimensions and recommended actions

### 7.4 Family Re-sync Enhancement
**Files:** `src/app/dashboard/page.tsx`, `functions/index.js`
- The existing "re-sync" button should trigger `synthesizeFamilyManuals`
- Show progress indicator during synthesis
- After completion, highlight what changed (new cross-references, shifted gaps)

---

## Phase 8: Performance & Quality

### 8.1 Loading States
- Ensure all new components have proper skeleton/shimmer states matching glassmorphic style
- Use consistent loading pattern: glass card with shimmer animation (already defined in globals.css)

### 8.2 Error Boundaries
- Add error boundaries around new page-level components (Reports, Portrait)
- Graceful fallback: "Unable to load — try refreshing"

### 8.3 Empty States
- Design empty states for:
  - Dashboard with no data yet (distinct from onboarding)
  - Reports with insufficient data ("Need at least 2 weeks of data")
  - Portrait with no contributions yet
  - Action feed with nothing to do ("You're all caught up")

### 8.4 Responsive Design
- All new components must work on mobile-first
- Portrait page: single column on mobile, two-column on desktop
- Reports page: stacked cards on mobile, grid on desktop
- Therapist report preview: full-width printable layout

### 8.5 Accessibility
- All new interactive elements need proper ARIA labels
- Color indicators always paired with text/icon (not color-only)
- Keyboard navigable tabs on Portrait and Reports pages

---

## Implementation Order & Dependencies

```
Phase 1 (Foundations)     — No dependencies, enables everything else
  1.1 Baseline flag       — 1 hour
  1.2 Freshness engine    — 2-3 hours  
  1.3 Action engine       — 3-4 hours
  1.4 Contribution requests — 2-3 hours

Phase 2 (Dashboard)       — Depends on Phase 1
  2.1 Completeness ring   — 2-3 hours
  2.2 Action feed         — 3-4 hours
  2.3 Family status row   — 1-2 hours
  2.4 Page restructure    — 2-3 hours

Phase 3 (People)          — Depends on Phase 1.2
  3.1 Spouse card         — 3-4 hours
  3.2 Child card          — 3-4 hours
  3.3 Page layout         — 1-2 hours
  3.4 Coverage matrix     — 2-3 hours

Phase 4 (Portrait)        — Depends on Phase 1.2
  4.1 Portrait page       — 4-5 hours
  4.2 Portrait components — 4-5 hours
  4.3 Manual tab integration — 1-2 hours

Phase 5 (Reports)         — Depends on Phase 1.1, 1.2
  5.1 Reports page        — 4-5 hours
  5.2 Therapist report    — 5-6 hours (includes cloud function)
  5.3 Trajectory charts   — 3-4 hours
  5.4 Navigation update   — 30 minutes

Phase 6 (Journal/Check-in) — Depends on Phase 1.3
  6.1 Journal tagging     — 2-3 hours
  6.2 Enhanced check-in   — 2-3 hours
  6.3 Scheduled reminders — 1 hour

Phase 7 (Polish)          — Depends on Phase 1.4
  7.1 Settings            — 2-3 hours
  7.2 Request UI          — 2-3 hours
  7.3 Acute events        — 2-3 hours
  7.4 Re-sync             — 1-2 hours

Phase 8 (Quality)         — After all features
  8.1-8.5 Polish pass     — 4-6 hours
```

**Phases 2, 3, 4 can run in parallel** after Phase 1 is complete.
**Phase 5 can start as soon as Phase 1.1 + 1.2 are done.**

---

## New Files Summary

### Types
- `src/types/action-items.ts`

### Engines/Libs
- `src/lib/freshness-engine.ts`
- `src/lib/action-engine.ts`

### Hooks
- `src/hooks/useActionItems.ts`
- `src/hooks/useContributionRequest.ts`
- `src/hooks/useFreshness.ts`
- `src/hooks/useTherapistReport.ts`

### Pages
- `src/app/people/[personId]/portrait/page.tsx`
- `src/app/reports/page.tsx`
- `src/app/contribute/[requestId]/page.tsx`

### Components
- `src/components/dashboard/FamilyCompletenessRing.tsx`
- `src/components/dashboard/ActionFeed.tsx`
- `src/components/dashboard/ActionCard.tsx`
- `src/components/dashboard/FamilyStatusRow.tsx`
- `src/components/people/SpouseCard.tsx`
- `src/components/people/ChildCard.tsx`
- `src/components/people/ContributionMatrix.tsx`
- `src/components/people/RequestContributionModal.tsx`
- `src/components/portrait/PortraitHeader.tsx`
- `src/components/portrait/PerspectivePanel.tsx`
- `src/components/portrait/SynthesisCards.tsx`
- `src/components/portrait/CrossReferenceLinks.tsx`
- `src/components/portrait/PatternTimeline.tsx`
- `src/components/portrait/ScoreSparkline.tsx`
- `src/components/portrait/RoleSectionCard.tsx`
- `src/components/reports/ReportOverview.tsx`
- `src/components/reports/PersonStatusCard.tsx`
- `src/components/reports/TherapistReport.tsx`
- `src/components/reports/TherapistReportPreview.tsx`
- `src/components/reports/TrajectoryChart.tsx`
- `src/components/reports/PeriodSelector.tsx`

### Cloud Functions
- `generateTherapistReport` (in `functions/index.js`)

### Modified Files
- `src/types/growth-arc.ts` (baseline flag on ScoreSnapshot)
- `src/types/person-manual.ts` (lastContributionAt field)
- `src/lib/scoring-engine.ts` (getBaselineSnapshot helper)
- `src/hooks/useDashboard.ts` (freshness + action data)
- `src/app/dashboard/page.tsx` (restructured layout)
- `src/app/people/page.tsx` (sectioned layout, new cards)
- `src/app/people/[personId]/manual/page.tsx` (tab integration)
- `src/app/checkin/page.tsx` (enhanced post-checkin)
- `src/app/settings/page.tsx` (complete preferences)
- `src/components/layout/Navigation.tsx` (add Reports link)
- `src/components/layout/SideNav.tsx` (add Reports link)
- `src/components/dashboard/EventInjectionModal.tsx` (acute event connection)
- `functions/index.js` (therapist report function)
