# Plan 4 — The Surface

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the signed-in home (currently the journal book/spread) with a single curated surface that draws from all three data sources (journal, manual, growth) and adapts to the user's current state. The book, manual, workbook, and reports become drill-down destinations reachable from the surface, not daily ones.

**Why:** The three-book model fragments attention. Synthesis insights are buried a click away. The perspective-gap magic is invisible unless you dig for it. A single surface surfaces the right thing at the right time and collapses the other destinations into "go deeper" links.

**Spec reference:** `memory/project_the_surface.md`, `memory/project_coherent_story.md`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Firebase 12, Vitest 4.

---

## Key decisions (confirm before starting)

1. **Route split.** Current `/` = book. New `/` = Surface. Current book moves to `/journal` and **replaces** the magazine view living there today (which is older and less polished). Accepted answer assumed: **yes, replace the magazine**. If no, book moves to `/library` or similar.
2. **Navigation.** Top-right avatar → menu surfaces: Home · Journal · Manual · Workbook · Reports · Settings. No persistent side nav.
3. **Priority hierarchy.** What the surface shows, in order: (1) unfinished business → (2) time-sensitive → (3) new information (fresh synthesis/nudge) → (4) synthesis overview → (5) growth items → (6) gaps → (7) calm-state invitation. At most one "hero" card + 2-3 secondary cards.
4. **Stage awareness.** `new_user` → onboarding prompt. `self_complete` → invite someone. `has_people` → first observation prompt. `has_contributions` → fresh synthesis. `active` → full priority hierarchy.
5. **No new backend.** Surface assembles from existing entries, contributions, syntheses, growth_items. If a data source is empty, it falls through to the next priority level.

---

## Incremental steps

Each step ships independently. After each step, the app is shippable.

### Step 1 — Route split + scaffold

- [ ] Rename current `/` content to `/journal` (replacing the magazine page). Keep the existing JournalSpread wiring; update any internal links.
- [ ] New `/` becomes `SurfaceHome` — a near-empty scaffold with: Relish wordmark (top-left), user avatar (top-right), a centered placeholder saying "Your surface is coming together." + a single link "Open the journal →".
- [ ] `src/app/journal/page.tsx` swapped to the book view (current `SpreadHome`).
- [ ] Basic test: `/` renders Surface placeholder; `/journal` renders the spread.

**Risk:** breaks anyone deep-linking `/` to see the book. Acceptable — this is a deliberate redirect of intent.

### Step 2 — State-aware greeting

- [ ] `useUserStage()` hook returns `new_user | self_complete | has_people | has_contributions | active` based on counts of self-contributions, people, observer-contributions, total entries.
- [ ] Surface renders a stage-specific greeting card: warm one-liner + a single CTA that maps to the next meaningful action.
- [ ] No test magic — snapshot the five greeting variants.

### Step 3 — "Next thing" hero card

- [ ] `useSurfaceNext()` hook walks the priority hierarchy and returns the single most important item, or `null` for calm.
- [ ] `NextThingCard` component renders the item with a headline, one sentence of context, and a primary action button that deep-links into the relevant book.
- [ ] Handles the top-3 levels: unfinished contribution (resume), time-sensitive (e.g., "new gap identified"), fresh synthesis.

### Step 4 — Fresh synthesis card

- [ ] `SynthesisHighlightCard` pulls the freshest synthesis insight (SynthesisPull-style) and renders it pull-quote style.
- [ ] Tap → opens AskAboutEntrySheet seeded with that synthesis (reuses the component we just shipped).
- [ ] Only appears when no higher-priority item exists.

### Step 5 — Calm-state card

- [ ] When priority hierarchy returns `null`, show a gentle summary: "All quiet. You've been listening well."
- [ ] Includes a small "drop a thought" affordance that opens CaptureSheet.
- [ ] Not an empty state — a named feature of the app.

### Step 6 — Inline journal peek

- [ ] Below the hero: last 2-3 journal entries as compact inline snippets (headline + first sentence).
- [ ] "Open the journal →" link at the bottom of the peek.
- [ ] Uses the same EntryBlock variants but in a compressed "peek" mode.

### Step 7 — Navigation reconciliation + drill-down polish

- [ ] User-avatar menu gets proper routes: Home (/), Journal (/journal), Manual (/family-manual), Workbook (/workbook), Reports (/reports), Settings (/settings).
- [ ] All drill-down pages have a consistent "← Home" back button in the top-left, replacing the Relish wordmark when not on home.
- [ ] Remove any stale bookshelf/three-book home-page code (if found).

---

## File structure

### New files

- `src/app/page.tsx` (rewritten as SurfaceHome — move old SpreadHome content to the journal page)
- `src/components/surface/SurfaceHome.tsx` — composition root for the surface
- `src/components/surface/NextThingCard.tsx`
- `src/components/surface/SynthesisHighlightCard.tsx`
- `src/components/surface/CalmStateCard.tsx`
- `src/components/surface/InlineJournalPeek.tsx`
- `src/components/surface/StageGreeting.tsx`
- `src/components/layout/UserMenu.tsx` (avatar + dropdown)
- `src/hooks/useUserStage.ts`
- `src/hooks/useSurfaceNext.ts`
- `__tests__/hooks/useUserStage.test.ts`
- `__tests__/hooks/useSurfaceNext.test.ts`
- `__tests__/components/surface/NextThingCard.test.tsx`

### Modified files

- `src/app/journal/page.tsx` — becomes the old SpreadHome (book)
- `src/components/journal-spread/JournalSpread.tsx` — no change expected; it's already the right component

### Not touched

- `CaptureSheet`, `AskAboutEntrySheet`, `EntryBlock`, privacy lock, `useEntries`, synthesis cloud functions

---

## Out of scope

- Push notifications or email digests driven by the surface
- New backend automation (contribution → synthesis → growth pipeline already exists)
- Mobile-specific layouts (surface reuses the existing responsive patterns)
- PIN-reset flow (carried over from Plan 3.5)
- Deletion of `/journal` magazine primitives — left alone in case parts are reused elsewhere

---

## Risks / tradeoffs

- **Losing the book as home.** Users who loved the book now have to click once more. Mitigated by making the peek section visually echo the book's warmth, and by a prominent journal link in the hero when nothing more urgent exists.
- **Priority-hierarchy thrashing.** If "unfinished business" fires too often the surface feels naggy. Mitigate with snooze/dismiss in a later iteration.
- **Stage-detection edge cases.** A user with 1 person but no contributions is "has_people" — greeting should gently nudge to invite them to contribute, not pressure them.

---

## Pre-start check

- [ ] Key decision #1 (route split) confirmed
- [ ] Key decision #2 (user-menu nav) confirmed
- [ ] Key decision #3 (priority order) confirmed
