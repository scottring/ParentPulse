# Marginalia Authoring — Design

**Date:** 2026-04-16
**Status:** Approved for planning
**Scope:** Single feature — let users (self and observers) add short handwritten-style notes in the margins of journal entries.

---

## Motivation

The journal spread currently shows *auto-derived* marginalia in the `MarginColumn` — tag chips and synthesis dates — but there is no way for a person to actually *write* in the margin. The original `MarginColumn.tsx:19-21` comment reserved space for "AI annotations, spouse reactions, user notes" as a future feature. This spec covers the user-notes slice of that.

This feature is load-bearing for the project's "synthesis of perspectives" one-liner: when a spouse scribbles *"she said this differently"* next to my entry, that scribble IS the divergence/alignment signal the journal is built to surface.

## Scope

**In scope**
- Self-marginalia (author annotates their own entry) and observer-marginalia (another family member annotates an entry they can see).
- Tied to an entry. No free-floating page scribbles.
- Inline authoring by clicking the empty margin space next to an entry.
- 80-character plain-text cap.
- Visibility inherited from the parent entry.
- Edit and delete by the note's author only.
- Desktop/tablet only for authoring; mobile view hides marginalia entirely (unchanged).

**Out of scope**
- AI-generated annotations (deferred — the tag/synthesis auto-derivation stays as-is).
- Rich text, media, @-mentions, threaded replies on notes.
- Mobile authoring.
- Reactions/emoji on notes (may follow in a later pass).

## Decisions locked with the user

1. **Scope shape:** Both self and observer notes, tied to entries. (Option D of the scope question.)
2. **Trigger:** Click the empty margin space → inline input. Fallback to a per-entry button if the affordance doesn't read in practice. (Option A, fallback B.)
3. **Visibility:** Inherits from parent entry — no per-note choice. (Option A.)
4. **Content shape:** One-line scribble, hard cap 80 characters, plain text. (Option A.)

## Architecture

### Data model — top-level `margin_notes` collection

Chosen over an embedded array on `Entry` or a subcollection because it mirrors the existing `entries` pattern exactly: same visibility denorm, same rule shape, same query shape.

```ts
// src/types/marginNote.ts (new)
import { Timestamp } from 'firebase/firestore';

export interface MarginNote {
  id: string;
  familyId: string;
  entryId: string;              // parent entry foreign key
  authorPersonId: string;       // who wrote the note
  authorUserId: string;         // used for rule checks
  content: string;              // trimmed, 1..80 chars, plain text
  createdAt: Timestamp;
  editedAt?: Timestamp;

  // Denormalized from parent entry at write time. Kept in sync via
  // a Cloud Function cascade when the parent's visibility changes.
  visibleToUserIds: string[];
  sharedWithUserIds: string[];
}
```

### Firestore security rules

Same shape as the existing entry rules (symmetry is the point).

- **Create:** `request.auth.uid == resource.data.authorUserId`; `request.auth.uid` must appear in the parent entry's `visibleToUserIds`; `visibleToUserIds` and `sharedWithUserIds` on the new note must equal the parent's at write time.
- **Read:** `request.auth.uid in resource.data.visibleToUserIds`.
- **Update:** author-only. Only `content` and `editedAt` may change. `visibleToUserIds` / `sharedWithUserIds` may not be client-edited — they only change via the cascade function below.
- **Delete:** author-only.

### Visibility cascade

A Cloud Function `onUpdate` trigger on `entries/{id}` fans out when `visibleToUserIds` or `sharedWithUserIds` changes, batch-updating matching `margin_notes`. This mirrors the existing cascade pattern for denormalized fields in the codebase.

### Components

| Component | Responsibility |
|---|---|
| `MarginNoteComposer.tsx` *(new)* | Controlled inline input with 80-char cap, side-aware alignment, optimistic state, keyboard handling (Enter commits / Esc cancels / blur commits-or-cancels). |
| `UserMarginNote.tsx` *(new)* | Renders a single saved note. Italic serif, author-initial attribution when author ≠ entry author, tap-to-edit for own notes. |
| `MarginColumn.tsx` / `MarginItem` *(edit)* | Accepts a `notes: MarginNote[]` prop. Renders user notes above the existing tag/synth lines. Renders the `+` empty-state composer trigger when the margin cell has no content and the viewer can write. |
| `useMarginNotes.ts` *(new hook)* | `createNote`, `updateNote`, `deleteNote`, plus a realtime `useMarginNotesForEntries(entryIds)` subscription for hydration. Handles the denorm copy of `visibleToUserIds` / `sharedWithUserIds` from the parent entry at write time. |
| `JournalSpread.tsx` *(edit)* | Passes the current page's entry IDs into the hook, threads `notes` down through `PageEntries` → `MarginItem`. |

### UX detail

**Empty margin cell**
- Invisible click/tap target spans the full cell height.
- Desktop hover: a faint pencil glyph or the word *"note"* at ~50% opacity. No border.
- Mobile: marginalia cells are hidden below 640px (unchanged).

**Composer**
- Italic serif input in-place, matching the existing margin typography.
- Right-aligned on left page, left-aligned on right page.
- Character counter appears at 60, turns amber at 75, blocks at 80.
- Enter commits. Esc cancels. Blur commits if non-empty, cancels if empty.

**Rendered note**
- Italic serif, `#8a6f4a` ink (matches existing marginalia).
- Attribution line `— M.` (first-name initial) **only when author ≠ entry author**. Self-notes stay quiet.
- Timestamp only on hover/long-press tooltip.

**Edit / delete**
- Tap/click own note reopens the composer with the content and a small delete affordance.
- Non-author notes are read-only.

**Ordering inside a margin cell**
1. User notes (chronological)
2. `#tags`
3. Synthesis date line

Existing 34px `margin-bottom` between blocks preserves rhythm.

## Data flow

1. `JournalSpread` computes `currentWindowEntryIds` (≤ `PAGE_SIZE = 6`, well under Firestore's `in`-query cap of 30).
2. `useMarginNotesForEntries(currentWindowEntryIds)` subscribes; returns `Map<entryId, MarginNote[]>`.
3. `PageEntries` threads notes for each entry into its `MarginItem`.
4. `MarginItem` renders user notes + auto-derived marginalia, plus the empty-state composer trigger.
5. Composer writes go through `useMarginNotes.createNote`, which reads the parent entry's visibility and denormalizes it onto the new note doc.

## Testing

- **`MarginColumn.test.tsx`** — existing tests unchanged. Add: user notes render above tags; attribution only when author ≠ entry author; empty state renders composer trigger when viewer can write.
- **`MarginNoteComposer.test.tsx`** *(new)* — 80-char cap; Enter commits; Esc cancels; blur-with-empty cancels; amber counter at 75.
- **`useMarginNotes.test.ts`** *(new)* — denorm copy of `visibleToUserIds` at write time; author-only edit/delete.
- **Firestore rules unit tests** — author creates; visible reader reads; non-visible reader denied; non-author cannot edit or delete; visibility fields cannot be client-edited.
- **E2E** — a full authenticated flow is blocked by the outstanding Playwright auth-fixture work (tracked in project memory as `project_e2e_auth_fixture_needed`). Integration stays component-level until that fixture exists; noted here so it is not silently skipped.

## Risks / open questions

- **Affordance legibility.** Click-the-margin is elegant but may not read as interactive. Decision: ship A, revisit with a per-entry action button (B) if usage data or self-testing shows the empty cell is being missed.
- **Attribution when an entry has multiple visible observers.** First-name initial can collide (e.g., two kids whose names start with M). If this occurs in practice, extend attribution to first name or short handle. Not blocking for v1.
- **Cascade latency.** Parent-visibility changes take one Cloud Function hop to propagate to notes. During that window, a note could briefly be visible to the wrong reader. Acceptable: entry-visibility changes are rare, and the old visibility was already valid.
