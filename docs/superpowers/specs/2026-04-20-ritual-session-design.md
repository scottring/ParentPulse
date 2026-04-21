# Ritual Session — Couple Briefing & Close

**Date:** 2026-04-20
**Status:** Approved

## Overview

The ritual session page (`/rituals/couple/session`) replaces the current placeholder with a cinematic dark-mode briefing that two partners read together on a shared screen. It surfaces what's happened since the last ritual — syntheses, patterns, journal entries, growth arc progress — in a flowing scroll. The briefing is material to draw from, not a script. Partners can ignore it entirely if they walk in with their own agenda.

After the briefing (or instead of it), a ceremony close marks the ritual as completed, with an optional seed note that feeds back into the journal.

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Layout | Cinematic dark scroll | Different register from the daytime app; matches the evening ritual mood |
| Interaction model | Shared device | One screen between both partners; no sync, no privacy filtering |
| Content approach | Curated briefing | Not a script — material to scan and talk about, or ignore |
| Closing | Ceremony close | Ritual number + optional seed note + next ritual date; bookends the experience |
| Empty state | Always available | "Nothing new this week" + direct to close; the ritual is an appointment, not a content gate |

## Visual Register

Dark background (`#14100c`), warm cream text (`#ede4d0`), full-viewport, no navigation bar. This is immersive — a different register from the Journal/Manual/Workbook daytime aesthetic.

- **Typography**: Cormorant italic for headings, DM Sans for body
- **Accent**: sage `#7C9082` for progress bars and the primary close button
- **Dividers**: `1px solid rgba(200, 184, 148, 0.15)` between sections
- **Only persistent UI**: a subtle "Exit" link (top-right corner) that navigates to `/rituals`

## Content Sections

Each section appears **only if it has data**. Empty sections are omitted entirely. Sections appear in this order, from most important to least — if you only get through the first two items before going off-script, you got the best stuff.

### 1. Header

Always shown. Centered at the top of the scroll.

```
This Week
APRIL 14 – APRIL 20
```

The date range spans from the day after the last completed ritual to today. If no prior completion exists, uses the last 7 days.

### 2. New Syntheses

The headline act. Each synthesis card shows:
- The synthesis quote (italic, large)
- Type badge: alignment / gap / blind spot / tension
- Which person it's about
- Date synthesized

Filtered to syntheses created since the last completed ritual (or last 7 days).

### 3. Patterns Detected

Recurring themes the AI noticed across journal entries. Each card shows:
- Pattern description (italic)
- Scope: "Family-wide" or person-specific label

Filtered to patterns detected since last ritual.

### 4. Journal Entries This Week

Summary cards — not full text. Each shows:
- Author name (Scott / Iris)
- One-line summary or title
- Date

Both partners' entries are shown. Private-to-self entries are excluded (this is a shared screen). Filtered to entries since last ritual.

### 5. Growth Arcs

Compact status for each active arc:
- Arc name
- "Week N of M"
- Progress bar (sage green)

Only shown if at least one growth arc is active.

### 6. Empty State

If no sections 2–5 have data, a single centered message replaces them all:

```
Nothing new this week.
Talk about whatever's on your mind.
```

Followed directly by the closing section.

## The Close

After the last content section (or the empty state message), the user reaches a dedicated closing screen. This appears when scrolling past the final content item.

### Layout

```
                    Done.
          RITUAL III · APRIL 20, 2026

    ┌─────────────────────────────────────┐
    │ Leave a note for next time          │
    │                                     │
    │ (textarea — optional free text)     │
    │                                     │
    └─────────────────────────────────────┘
    Optional. This becomes a journal entry
    tagged to your ritual.

    [ Close without note ]  [ Save note & close ]

          Next ritual: Friday, April 25
                  at 6:30 PM
```

### Behavior

- **Ritual number**: auto-incremented count of completed occurrences for this ritual + 1 (displayed as Roman numeral)
- **Seed note**: large free-text textarea (min-height ~200px, 8+ rows), optional. Sized generously to encourage long-form writing — this is a journal app, not a feedback form. If provided, saved as a journal entry with `category: 'reflection'` and tagged to both participants via `sharedWithUserIds`
- **"Close without note"**: ghost-style button. Marks the ritual occurrence as completed (no note). Navigates to `/rituals`.
- **"Save note & close"**: sage green button. Saves the seed note as a journal entry, marks the occurrence as completed. Navigates to `/rituals`.
- **Next ritual date**: computed from `nextOccurrence()` utility. Small, de-emphasized text below the buttons.

## Data Model

### New: `ritual_occurrences` subcollection

```
couple_rituals/{ritualId}/occurrences/{occurrenceId}
```

```typescript
interface RitualOccurrence {
  completedAt: Timestamp;
  completedByUserId: string;
  seedEntryId?: string;   // journal entry ID if a seed note was saved
}
```

### Firestore Security Rules

```javascript
match /couple_rituals/{ritualId}/occurrences/{occurrenceId} {
  allow read: if isSignedIn()
    && belongsToFamily(get(/databases/$(database)/documents/couple_rituals/$(ritualId)).data.familyId);
  allow create: if isSignedIn()
    && request.auth.uid in get(/databases/$(database)/documents/couple_rituals/$(ritualId)).data.participantUserIds;
  allow update, delete: if false; // occurrences are immutable
}
```

Both participants can read. Either participant can create (mark as completed). Occurrences cannot be edited or deleted.

### Seed Note Journal Entry

When a seed note is saved, it's created as a standard journal entry using the existing `useJournal().createEntry()` hook:

```typescript
{
  type: 'written',
  category: 'reflection',
  title: `Ritual ${romanNumeral} — ${dateString}`,
  text: seedNoteText,
  authorId: currentUserId,
  familyId: user.familyId,
  sharedWithUserIds: [currentUserId, spouseUserId],
  visibleToUserIds: [currentUserId, spouseUserId],
  createdAt: Timestamp.now(),
}
```

Uses `category: 'reflection'` (existing valid category) rather than a custom type. The title format (`Ritual III — April 20, 2026`) makes it identifiable in the Journal. This entry appears like any other and will be surfaced in the next ritual's briefing under "Journal Entries This Week."

## "Since Last Ritual" Filtering

All content sections filter to items created after the last completed ritual occurrence:

1. Query `couple_rituals/{ritualId}/occurrences` ordered by `completedAt` descending, limit 1
2. If an occurrence exists, use its `completedAt` as the cutoff
3. If no occurrences exist, use `now - 7 days` as the cutoff

This ensures the briefing always shows what's new since you last sat down together.

## Data Flow

All data is fetched client-side using existing hooks:

| Data | Source |
|------|--------|
| Syntheses | `useEntries({ filter: { types: ['synthesis'] } })` filtered by date. Synthesis type (alignment/gap/blind spot) is in the entry's `category` field. |
| Patterns | `PersonManual.emergingPatterns` array from `useDashboard().manuals`. Filter by `detectedAt` timestamp if available, else show all. |
| Journal entries | `useEntries({ excludePrivateToCurrentUser: true, types: ['written', 'observation'] })` filtered by date |
| Growth arcs | `useGrowthFeed()` — `activeItems` and `arcGroups` |
| Ritual info | `useCoupleRitual()` — schedule, next occurrence |
| Spouse name | `useSpouse()` — for the seed note's `sharedWithUserIds` |
| Last occurrence | New query on `ritual_occurrences` subcollection |

No new Cloud Functions needed.

## New Hook: `useRitualOccurrences`

```typescript
function useRitualOccurrences(ritualId: string | undefined) {
  // Returns:
  //   occurrences: RitualOccurrence[]  (ordered by completedAt desc)
  //   lastCompleted: RitualOccurrence | null
  //   completionCount: number
  //   loading: boolean
  //   markCompleted: (seedEntryId?: string) => Promise<void>
}
```

## Route & Navigation

- **Route**: `/rituals/couple/session` (existing, currently a placeholder)
- **Entry point**: "Begin together" button on `/rituals` overview page (already exists)
- **No nav bar**: the session page does not render `Navigation`. Only a subtle "Exit →" link in the top-right corner returns to `/rituals`.
- **After close**: both buttons navigate to `/rituals`

## Accessibility

- All sections use semantic HTML (`<article>`, `<section>`, heading hierarchy)
- The textarea has a visible label ("Leave a note for next time")
- Both close buttons are focusable with clear labels
- Color contrast: cream text on dark background meets WCAG AA (ratio > 7:1)
- The "Exit" link has an `aria-label="Exit ritual session"`

## What's NOT in Scope

- No real-time sync between devices (shared device model)
- No occurrence history UI (data exists for filtering, no dedicated view)
- No push notifications
- No ritual streaks or guilt mechanics
- No AI-generated prompts specific to the ritual (syntheses/patterns ARE the prompts)
- No dinner prompt integration (wrong register for a ritual)
- No assessment score changes (too clinical)
- No manual content updates (too operational)
