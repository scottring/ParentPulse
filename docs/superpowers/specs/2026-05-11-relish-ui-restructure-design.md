# Relish UI Restructure — Rooms, Rail, and Wiring

**Date:** 2026-05-11
**Status:** Draft (awaiting review)

## Overview

A coordinated restructure of Relish's user-facing surface. Six destination rooms become reachable from a persistent left rail; three currently-broken rooms (Therapy, Rituals, Growth → now Experiments) get wired; one new room is introduced (Unspoken Queue); the child check-in route is renamed and gains a scheduled-ritual entry point. The Journal home stays the primary writing surface — it gains the Family Manual-grade synthesis as a separate destination, and removes coach-chip clutter.

Visual treatment is decided externally — six Stitch screens in `~/Downloads/stitch_the_relish_manual` and a follow-on set are the source of truth for typography, palette, and component idiom. This spec is functional. It says *what* each surface contains and how it behaves, not what color it is.

## Animating Idea

The product is a private family journal. Users write about the people in their lives — partner, kids, friends — and the app turns that writing into multiple outputs: profiles, briefs, scheduled rituals, experiments, a holding queue for unspoken thoughts, and an AI chat scoped per-person.

The journal is the primary surface (~75% of the product). Family Manual is secondary (~20%). Therapy / Rituals / Experiments / Unspoken / Coach are *tools that act on what the journal has collected*; they don't generate content on their own.

The animating idea: **the magic comes from holding multiple perspectives on the same person or moment together** — sometimes they agree, sometimes they diverge, sometimes the combined picture reveals something neither view could alone. Every synthesis surface (Manual, Therapy brief, Unspoken queue) is an expression of this.

## Information Architecture

### Rooms (rail order)

| Room | Route | Purpose |
|---|---|---|
| Journal | `/` | Writing surface. Home. |
| People | `/manual` | Family Manual index + per-person profiles |
| Therapy | `/therapy` | PIN-gated narrative brief for therapist sessions |
| Rituals | `/rituals` | Scheduled couple ritual + scheduled family check-ins; Experiments pinned alongside |
| Experiments | `/experiments` | Multi-week hypotheses with micro-actions (renamed from Growth) |
| Unspoken | `/unspoken` | Holding queue for things written but not said |
| Archive | `/archive` | Chronological log of every entry |

### Non-room destinations

- **Coach** — reachable from a person's Manual page only, not from the rail. Not surfaced on the Journal home. Existing `/coach?personId=...` route preserved.
- **Settings** — user menu (top-right), not the rail.
- **Child check-in** — `/check-in/[personId]`, full-screen mode, no rail. Renamed from `/kid/`.

### Global chrome

Every authed page renders, in order:

1. **Top strip** — Relish wordmark top-left, settings gear + user-menu pip top-right. (User menu contains Settings, Log out.)
2. **Left rail** — destination links (per table above) on every authed page except `/`, `/login`, `/register`, and `/check-in/*`.
3. **Page content** — full-width inside the remaining viewport.

### Mobile rail behavior

On screens `< 860px`, the rail collapses to an icon-only strip on the left edge. Monoline SVG glyphs (not emoji) in a consistent stroke. A small lock glyph adjacent to Therapy indicates its PIN gate.

## Per-Room Specifications

### Journal Home (`/`)

The cold-open writing surface. The user lands here on every signed-in visit.

**Above the fold (top-to-bottom):**

- **Masthead.** The user's own name in serif italic display type. (Pulled from `user.name` — fallback to first name if full name absent.) Acts as a personal signature on the journal.
- **Date eyebrow.** `TUESDAY, NOVEMBER 12, 2024` in all-caps body sans. No exclamatory greeting. ("Good morning, Scott." is retired.)
- **Optional nudge line.** A single italic sentence when a child hasn't been written about in ≥5 days: "*Liam hasn't had a moment in a while.*" Suppressed when not warranted. No avatars, no visual decay.

**Writing card:**

- **Headline prompt** in serif italic: "What remains from today?" (or time-of-day variant: "What's worth keeping from today?" for evening).
- **Textarea** with auto-grow. Voice mic button bottom-right of the textarea. Saves a local draft to `localStorage` on a 400ms debounce.
- **Three pickers** below the textarea (chip-style):
  - **Writing as ·** [user / a child] — toggle between self-authored and child-proxy entries. When set to a child, the entry is saved with `subjectType: 'child_proxy'`.
  - **About ·** [one or more family members] — multi-select. Determines `personMentions`.
  - **Who can see ·** [just me / partner / family] — visibility preset. Resolves to `sharedWithUserIds`.
- **Feeling accelerator (collapsible, optional).** Two pill groups under the textarea: self-feelings and relationship-feelings. Five core pills visible; "More…" reveals the rest. Tapping records structured `checkIn` data alongside the body text. Writing alone is a complete entry; tags are never required.
- **Commit affordance — "Keep →".** A single button at the bottom of the card. Commits feelings + targets + body + visibility as one journal entry. Renamed from "Save". The commit moment is preserved because the visibility decision is high-stakes; the language is softened.

**Below the writing card:**

- **Focusing on.** Up to two large hero cards, one per child, with stock or uploaded imagery. Tapping a card launches the child check-in (`/check-in/[personId]`) in impromptu mode.
- **Recent Echoes.** A short timeline (3–5 entries) grouped by subject:
  - "About Liam" — entries that mention Liam
  - "Self" — entries with `subjectType: 'self'` and no person mentions
  - "Relationships" — entries that mention an adult family member
  - Each row shows a date, subject label, and a one-line excerpt. Tap routes to `/journal/[entryId]`.
  - Headline link "View all →" routes to `/archive`.

**What's removed from the Journal home:**

- The "Ask the book" coach chips. AI chat is reachable from a person's Manual page only.
- The "Good morning/evening, [name]" salutation.

### Family Manual — Index (`/manual`)

The People room landing page. List of family members with summary state per person (completeness, last activity, perspectives present). Existing structure largely intact; no functional changes in this spec beyond the rail wrapping.

### Family Manual — Person (`/people/[personId]/manual`)

A single person's manual, redesigned around the synthesis-of-perspectives idea.

**Page structure (top-to-bottom):**

- **Portrait** (uploaded or initials placeholder).
- **Name** in serif italic display.
- **Role line** — small all-caps subtitle (e.g., "MATRIARCH & ARCHIVIST" — or for a child, "8 · CHILD"). Pulled from the Person record's relationship-type + age, with manual override.
- **Perspective Layers** — a stack of tinted cards, one per perspective:
  - **Self View** — what the person says about themselves (from their own Contribution)
  - **[Author]'s View** — what the journal author has written about them
  - **The Children's Lens** (etc.) — what other family members have contributed
  - Each card shows a short pull-quote synthesized from the underlying contributions, plus a "Read more" expand. Tints are decided in the visual layer.
- **The Intersection of Truths** panel — the AI synthesis:
  - Named insight headlines (e.g., "The Silence Gap") with a 1-2 sentence narrative
  - Two-column breakdown: **Alignments** (places perspectives agree) and **Divergences** (places they don't)
  - Drives off the existing `synthesizedContent` field on the PersonManual document
- **Ask the Coach about [Name]** — a single dark CTA card at the bottom of the manual. Reads "The Coach has synthesized [N] journal entries and [M] contributions to help you navigate your relationship with [Name]." Two example questions as suggestion chips. Tapping the CTA routes to `/coach?personId=[id]&name=[firstName]`.

### Therapy (`/therapy`)

PIN-gated room for material to take to a therapist.

**Landing (unlocked):**

- "Prepare a brief" CTA — compiles the last 14 days of entries via the `generateTherapyBrief` Cloud Function.
- Past briefs list — each row shows date and a short list of themes. Tap routes to `/therapy/[briefId]`.

**PIN handling:**

- First visit (no PIN set) → "Set a PIN" flow via existing `PinSetupModal`.
- Subsequent visits (PIN set but not unlocked this session) → `PinKeypad`.

**Brief detail page (`/therapy/[briefId]`) — "Narrative Summary":**

- Eyebrow: `SECURE SESSION BRIEF`
- Title: "Narrative Summary"
- Period line: dated window
- Sectioned narrative:
  - **Current Emotional Landscape** — paragraph
  - **Core Conflict Perspectives** — pulled quotes from journal entries with labels ("The Internal Critic" / "The Observing Self")
  - **Interpersonal Dynamics** — paragraph with optional single image
  - **Somatic Observations** — paragraph
- End-of-summary CTAs: **Download PDF**, **Archive Brief**.

**Auto-lock (new):**

- 10-minute **idle** timer (any interaction — scroll, keypress, click — resets it).
- Silent until the last 60 seconds, then a small warning surfaces.
- After lock, returning to the brief shows the PIN keypad and resumes the previous scroll position.
- The brief itself is still PIN-gated to enter; idle-lock is the "you walked away" backstop. Total countdown is **never** constantly visible.

### Rituals (`/rituals`)

The room for scheduled, recurring family practices. Two sections side-by-side on desktop, stacked on mobile.

**Section A — Rituals (left column):**

- **Current Focus card** — pinned at the top of the page. Shows a single micro-action sourced from an active experiment ("Take 3 minutes to write one thing you appreciate about your heritage today."), with "Complete Action" CTA. Suppressed when no experiment is in a phase that surfaces a daily micro-action.
- **Couple ritual card** (where one exists) — heading, schedule summary ("Friday, 7:00 PM"), intention quote, partner avatars, status (Upcoming / Accepted / etc.). CTA: "Begin today's session" → existing `/rituals/couple/session` flow.
- **Other ritual rows** below — past or upcoming non-couple rituals (Sunday Hearth Reading · Weekly; New Moon Intentions · Monthly).
- **Family check-ins section (new)** — scheduled recurring child check-ins. Each row: child name + cadence ("Weekly check-in with Liam · Sundays 5pm"). Setup flow lives at `/rituals/family/setup`. When the scheduled time arrives, the system surfaces a "Begin check-in with [Name]" card here, routing into `/check-in/[personId]?ritualId=[id]`.

**Section B — Experiments (right column):**

- **Active Hypothesis** — the current experiment statement ("If we abstain from digital light after sunset for 14 days, then our shared morning dialogue will become more vivid and layered."), progress bar (Day N of M), and "Record Observation" CTA.
- **Recent Discovery** — a short tile linking to a recent insight surfaced by the experiment ("Handwritten correspondence frequency").

**Below both columns:**

- **Inspired by your Journal card** — AI-derived suggestion tying a recent journal entry back to a ritual or experiment refinement. ("Your entry from Tuesday mentioned a desire for more 'unstructured presence.' Should we adapt the Ritual script?" → "Refine Ritual" CTA.)

### Experiments (`/experiments`)

Standalone destination for the deeper experiments view (the Rituals page only previews a single active experiment).

- List of active experiments grouped by domain (Connection, Communication, Values & meaning, Household, Play & joy, Growth of self, Intimacy).
- Each experiment shows hypothesis statement, current phase (Awareness / Practice / Integration), week N of M, progress bar, and the next micro-action.
- Tap an experiment to route to `/experiments/[experimentId]` (renamed from `/growth/[itemId]`).
- Empty state: "Experiments are born from the dimensions Relish tracks quietly in the background. When one has enough signal to work on, a new experiment will appear here."

**Underlying data model preserved.** The existing GrowthArc + GrowthItem documents stay; vocabulary changes only. `arc.title` becomes "Hypothesis statement," `currentPhase` stays the same, `activeItems[0]` becomes "Next micro-action."

### Unspoken (`/unspoken`)

New room. A holding queue for thoughts the user has written but not said.

**Page structure:**

- **Hero** — eyebrow `SAFE HOLDING SPACE`, title *"Thoughts awaiting their time."*, intro: "A private sanctuary for the words you've written but aren't ready to release. These entries are held here, protected, until your next session or ritual."
- **The Queue** — list of pending entries. Each row:
  - Date
  - Headline (the entry's first line or AI-extracted summary)
  - **Destination label** — a *prediction*, not a route. E.g., "Likely to surface in: your next ritual with Iris." Labels are advisory; the user can change, dismiss, or leave them.
  - Status badge (`IMMINENT` for items whose next destination is within 48 hours; `IMPROMPTU` for items not tied to a scheduled event)
- **Integration Path card** — informational only. Shows what's coming up that *could* consume unspoken items (Next Session: Oct 28 · 10:00 AM; Upcoming Ritual: Full Moon Reflection). Does **not** auto-route.
- **Sanctuary for Stillness section** — a Vellum Stack component (component idiom from Stitch), linking to `/archive` to browse prior unspoken items that have since been integrated.

**Behavior model — "predict, don't route" (locked decision):**

- Unspoken items live in the queue *without* a routing decision. They just sit.
- AI suggests a destination label as informational metadata. User can change or dismiss it.
- When a ritual session starts or a therapy brief is generated, the system pulls unspoken items from the relevant window/people. The user picks which to actually bring up.
- The destination label is helpful narration, not the rails the data runs on. This preserves user agency at high-stakes moments.

**Entry into the queue:**

- From the journal-entry detail page (`/journal/[entryId]`), an "Move to Unspoken" action.
- In v1, items enter Unspoken from the journal-entry detail page only. A "Hold this for later" affordance adjacent to "Keep" on the home writing card is deferred to v2 (also listed in Out of Scope).

### Archive (`/archive`)

Chronological log of every entry. Existing structure preserved; no functional change in this spec beyond the rail wrapping.

### Child Check-in (`/check-in/[personId]`)

Renamed from `/kid/[personId]`. Full-screen, no rail. Parent-supervised.

**Chrome:**

- **Top strip** — `✕ EXIT TO PARENT JOURNAL` button top-left (explicit, not a hamburger). Tapping returns the parent to `/`. Smiley + settings gear icons top-right.
- **No left rail** in this view.

**Body (top-to-bottom):**

- **Headline** — addresses the child by name: *"How are you today, Leo?"*
- **Ritual chip (conditional)** — a small pill below the headline: `📅 Sunday Ritual` — surfaced *only* when the check-in is launched from a scheduled ritual (query param `?ritualId=[id]`). Absent on impromptu launches.
- **Subtitle** — "Pick the picture that feels like you right now."
- **Feeling tiles, multi-select.** Twelve tiles in a 3×4 grid: Happy · Sad · Mad · Worried · Tired · Calm · Brave · Silly · Quiet · Thinking · Excited · Loved. Tapping a tile toggles it on/off; multiple can be selected. Each tile is an icon-in-tile + label. (Icons sourced from the Stitch design system; final glyphs picked at implementation time from the available icon library.)
- **Tell us more** — single text input with mic button bottom-right (matches adult home pattern). Optional.
- **Share with…** — three avatar options:
  - First adult (default selected, labeled with their role + first name, e.g., "MAMA STACY")
  - Second adult (e.g., "PAPA")
  - "EVERYONE" (group icon, sends to all linked family adults)
  - Labels pulled from People records (each adult Person's `relationshipRole` field + first name). Fallback to "MAMA" / "DADA" generic when role is missing.
  - At least one option is always selected. Cannot deselect to "just me" — kid entries always share with ≥1 adult.
- **Keep →** commit button at the bottom.

**On commit:**

- Writes a journal entry with `subjectType: 'self'`, `authorId` = the child's `userId` (or `subjectPersonId` for proxy semantics if the child isn't a linked user), `sharedWithUserIds` = the resolved selection, `checkIn` payload (`selfFeelings` = the array of picked tile words), and any body text.
- If launched from a scheduled ritual, the entry is tagged with the `ritualId` and counted toward the ritual's session log.
- After Keep, the screen shows a brief confirmation and returns to the parent's `/` view.

**Entry points:**

- **Impromptu** — Focusing-on card on Journal home → `/check-in/[personId]`.
- **Scheduled** — Family check-in row in Rituals → `/check-in/[personId]?ritualId=[id]`.

### Coach (`/coach?personId=...`)

No structural changes. Continues to be reachable only from a person's Manual page (the "Ask the Coach about [Name]" CTA). Removed from the Journal home.

### Settings (`/settings`)

No structural changes. Reachable via the user menu in the top chrome (gear icon or user pip dropdown). Removed from the rail.

## Global Components

### Left Rail (`LeftRail.tsx`)

Mounted in `src/app/layout.tsx`. Replaces the existing rail-less chrome on inner pages.

**Items (top → bottom):**

1. Journal — `/`
2. People — `/manual`
3. Therapy — `/therapy` (with small lock glyph)
4. Rituals — `/rituals`
5. Experiments — `/experiments`
6. Unspoken — `/unspoken`
7. — separator —
8. Archive — `/archive`

**Active state:** the current room's link is rendered with full ink color + a thin left accent. Inactive items are dimmer.

**Hide rules:** `/login`, `/register`, `/check-in/*`, and the signed-out variant of `/`.

**Mobile (`< 860px`):** collapse to icon-only strip. Same items, same routes.

### Top Chrome

- **Wordmark** "Relish" top-left, routes to `/`.
- **User menu** top-right: small dot-with-name button (existing pattern from `journal-first/Home.tsx`). Items: Settings, Log out. (People, Archive, Therapy, Rituals, Experiments, Unspoken move out of this menu and into the rail.)
- **Settings gear** as a separate icon next to the user pip (Stitch convention).

### Quick Capture (deferred to v2)

The "New Entry" button shown in the Stitch rail mocks suggests a global quick-capture modal. Deferring to v2; for v1, new entries originate on the Journal home only.

## Wiring Fixes (Currently-Broken Flows)

Three rooms render but don't function. Root causes need diagnosis as part of implementation, but the design-level requirements are:

### Therapy — "Could not prepare a brief"

- The page at `src/app/therapy/page.tsx:42-48` calls `httpsCallable(functions, 'generateTherapyBrief')`. The alert fires on any thrown exception.
- **Fix scope:** confirm the Cloud Function is deployed and authorized. If missing, deploy it. If misconfigured, fix the configuration. If failing at runtime (e.g., zero entries in the window, missing API key), surface a more specific error message: "No entries in the last 14 days to compile from" vs. the generic "try again."

### Rituals — "Can't prepare the session"

- The page at `src/app/rituals/ClientPage.tsx` branches on `useSpouse().spouseName` and `useCoupleRitual().ritual`. If no spouse is linked, the CTA routes to `/settings` instead of `/rituals/couple/setup`. If a spouse is linked but no ritual is configured, the CTA routes to setup. If a ritual exists, "Begin today's session" routes to `/rituals/couple/session`.
- **Fix scope:** diagnose whether the user has a spouse Person record with `linkedUserId`. If not, the room is correctly routing to Settings — surface clearer messaging *why* ("Couple rituals need both of you in the family"). If a spouse exists but the session endpoint fails, fix the session flow.

### Growth / Experiments — "Two cards, neither clickable"

- The page at `src/app/growth/page.tsx:124-191` renders `ArcCard` as a `<li>` with a nested "Next" `<Link>` that only appears when `activeItems[0]` exists.
- **Fix scope:** make the entire card a link to `/experiments/[arcId]`, not just the "Next" sublink. If no active items are queued for an arc, the arc detail page still loads — it's the right place to start one. Removes the dead-card UX.
- **Vocabulary swap:** rename `/growth` → `/experiments` (preserve old route as a redirect for shared links). "Growth arcs" → "Experiments" in copy. Underlying data model unchanged.

## What Stays the Same

- **Auth flow** — Firebase Auth, `useAuth()` context, no changes.
- **Firestore data model** — Person, PersonManual, Contribution, JournalEntry, GrowthArc, GrowthItem, RitualSession, TherapyBrief docs all preserved. Vocabulary changes are surface-level only.
- **Voice input** — `MicButton` component reused in both adult writing area and child check-in.
- **Privacy lock** — `usePrivacyLock` hook + `PinSetupModal` / `PinKeypad` reused for Therapy.
- **Walkthrough / capture sheet / dinner prompt API** — out of scope; existing implementations preserved.

## Visual Design Reference

Visual treatment is decided in the Stitch project (see `~/Downloads/stitch_the_relish_manual/` for the first export, with follow-up screens pending). The design system is captured in that folder's `DESIGN.md`:

- Palette: "Quiet & Soft" — warm monochrome neutrals (linen, deep charcoal) with desaturated rose / sage / azure accent overlays for per-person tinting in the Manual.
- Typography: `Libre Caslon Text` for serif headlines, `Inter` for body and UI.
- Depth: tonal layering and backdrop blur, no shadows.
- Component idiom: Vellum Stack (overlapping translucent perspective cards), organic blob shapes for background, low-contrast paper-edge borders.

This spec does **not** prescribe colors, fonts, or component styling. Implementation references the Stitch screens as the source of truth.

**Brand name:** "Relish" everywhere. The Stitch mocks use "Heirloom" as a placeholder; substitute "Relish" in all wordmarks, footers, and copy.

## Out of Scope

- **Mirror view** — a child-perspective view that re-frames the parent's notes as the child's narrative. Excluded because presenting an AI-confabulated "from Liam's perspective" version risks feeling false, being wrong in ways the parent can't easily detect, and muddying the synthesis principle (which is about real perspectives, not imagined ones).
- **Therapy heatmap** — a topographical visualization replacing the narrative brief. Excluded; narrative brief preserved. A heatmap may be added as an adjunct in a later spec.
- **Avatar decay** — visual fading of a child's image when underwritten-about. Excluded; the existing one-line italic nudge is the right register.
- **Venn-diagram Manual** — replacing the three-section Manual with a Venn diagram. Excluded; the existing Perspective Layers + Intersection of Truths structure already implements the synthesis idea and handles 3+ perspectives cleanly (a Venn doesn't).
- **Sentiment-only feeling capture** — replacing feeling pills with AI-inferred mood. Excluded; pills stay as an optional accelerator. Inferred mood may layer on top in a later spec but doesn't replace structured tags.
- **Continuous-flow (no Save) writing** — excluded for entries with a visibility decision. The "Keep" commit moment is preserved because visibility is high-stakes.
- **Global quick-capture modal ("New Entry" button)** — deferred to v2.
- **"Hold this for later" affordance on Journal home writing card** — deferred; in v1, items enter Unspoken from `/journal/[entryId]` detail page only.

## Implementation Notes

- The `/growth/*` routes should be aliased to `/experiments/*` with 301-equivalent redirects for any existing shared links.
- The `/kid/[personId]` route should be aliased to `/check-in/[personId]` similarly.
- The rail mount lives in `src/app/layout.tsx`. The existing `GlobalNav` component (which currently mounts `TopNav` + `CaptureSheet`) is replaced with a new layout component that mounts: `TopChrome` (wordmark + settings + user menu), `LeftRail`, and the `CaptureSheet` is left as-is for now.
- The Stitch screens use "Heirloom" branding throughout. All wordmarks, footers, copy, and meta-tags substitute "Relish".
- All user names shown on mocks (Eleanor Vance, Evelyn Vance, Leo, Iris, Mama Stacy, Papa) are placeholders. The implementation pulls real values from `user.name`, Person records, and family roles.

## Open Questions

None at the time of this draft. If discovered during implementation, raise them inline before completing the affected room.
