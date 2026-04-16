# Marginalia Authoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users add short (≤80 char) handwritten-style notes in the margins of their journal entries, for both self-annotation and observer reactions, with visibility inherited from the parent entry.

**Architecture:** New top-level Firestore collection `margin_notes`, structurally parallel to `journal_entries` (denormalized `visibleToUserIds`, `isParent()`-gated rules, visibility cascade via Cloud Function). Inline click-the-margin composer on the existing journal spread. v1 only annotates journal-backed entries (`written` / `observation`) — synthetic entries (synthesis / reflection / growth / nudge) are not annotatable in v1.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Firestore, Firebase Cloud Functions (Node), Vitest, Testing Library, `@firebase/rules-unit-testing`.

**Spec:** `docs/superpowers/specs/2026-04-16-marginalia-authoring-design.md`

---

## File Structure

### New files
- `src/types/marginNote.ts` — `MarginNote` TypeScript interface.
- `src/hooks/useMarginNotes.ts` — realtime subscription + CRUD.
- `src/components/journal-spread/MarginNoteComposer.tsx` — inline 80-char input.
- `src/components/journal-spread/UserMarginNote.tsx` — rendered note (read-only + edit-mode).
- `__tests__/hooks/useMarginNotes.test.ts`
- `__tests__/components/journal-spread/MarginNoteComposer.test.tsx`
- `__tests__/components/journal-spread/UserMarginNote.test.tsx`

### Modified files
- `src/components/journal-spread/MarginColumn.tsx` — `MarginItem` accepts notes + callbacks; renders notes above tag/synth lines; renders composer trigger when annotatable.
- `src/components/journal-spread/JournalSpread.tsx` — hydrate notes for current page; thread down; pass callbacks.
- `__tests__/components/journal-spread/MarginColumn.test.tsx` — additional cases.
- `firestore.rules` — add `match /margin_notes/{noteId}` block.
- `firestore-rules/rules.test.ts` — seed a journal entry + add margin-notes test cases.
- `functions/index.js` — add `cascadeMarginNoteVisibility` trigger.

### Files not touched
- `src/types/entry.ts` — `Entry` is virtual; no change needed.
- `src/lib/entries/adapter.ts` — margin notes are a *parallel* concept to entries, not another entry type.
- Existing hooks (`useJournal`, `useJournalEntries`) — unchanged.

---

## Task 1: Define the `MarginNote` type

**Files:**
- Create: `src/types/marginNote.ts`

- [ ] **Step 1: Write the new type file**

Create `src/types/marginNote.ts`:

```ts
import { Timestamp } from 'firebase/firestore';

// A user-authored note rendered in the margin of a journal entry.
// v1 attaches only to journal_entries docs (not synthetic entries).
export interface MarginNote {
  id: string;
  familyId: string;
  // Real journal_entries doc id. For written/observation entries the
  // virtual Entry.id equals this; we name it explicitly so consumers
  // know this is a Firestore foreign key.
  journalEntryId: string;
  authorUserId: string;
  content: string; // 1..80 chars, trimmed plain text
  createdAt: Timestamp;
  editedAt?: Timestamp;

  // Denormalized from the parent journal entry. Clients must NOT edit
  // these directly after create — the cascade function keeps them in
  // sync when the parent's visibility changes.
  visibleToUserIds: string[];
  sharedWithUserIds: string[];
}

// Input to createNote — the hook fills in everything else.
export interface CreateMarginNoteInput {
  journalEntryId: string;
  content: string;
}

export const MARGIN_NOTE_MAX_LENGTH = 80;
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors; existing code untouched).

- [ ] **Step 3: Commit**

```bash
git add src/types/marginNote.ts
git commit -m "feat(marginalia): add MarginNote type"
```

---

## Task 2: `useMarginNotes` — subscription query

**Files:**
- Create: `src/hooks/useMarginNotes.ts`
- Test: `__tests__/hooks/useMarginNotes.test.ts`

This task builds ONLY the read-side subscription. Create/update/delete come in Task 3.

- [ ] **Step 1: Write failing test for grouping by entry**

Create `__tests__/hooks/useMarginNotes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { groupNotesByEntry } from '@/hooks/useMarginNotes';
import type { MarginNote } from '@/types/marginNote';

const note = (over: Partial<MarginNote>): MarginNote => ({
  id: 'n',
  familyId: 'f1',
  journalEntryId: 'e1',
  authorUserId: 'u1',
  content: 'x',
  createdAt: Timestamp.fromMillis(1_000),
  visibleToUserIds: ['u1'],
  sharedWithUserIds: [],
  ...over,
});

describe('groupNotesByEntry', () => {
  it('groups notes by journalEntryId', () => {
    const notes = [
      note({ id: 'a', journalEntryId: 'e1', createdAt: Timestamp.fromMillis(3_000) }),
      note({ id: 'b', journalEntryId: 'e2', createdAt: Timestamp.fromMillis(2_000) }),
      note({ id: 'c', journalEntryId: 'e1', createdAt: Timestamp.fromMillis(1_000) }),
    ];
    const map = groupNotesByEntry(notes);
    expect(map.get('e1')?.map((n) => n.id)).toEqual(['c', 'a']);
    expect(map.get('e2')?.map((n) => n.id)).toEqual(['b']);
  });

  it('returns empty map for empty input', () => {
    expect(groupNotesByEntry([]).size).toBe(0);
  });

  it('sorts each group oldest-first by createdAt', () => {
    const notes = [
      note({ id: 'late', createdAt: Timestamp.fromMillis(9_000) }),
      note({ id: 'early', createdAt: Timestamp.fromMillis(1_000) }),
    ];
    const result = groupNotesByEntry(notes).get('e1')!;
    expect(result.map((n) => n.id)).toEqual(['early', 'late']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/hooks/useMarginNotes.test.ts`
Expected: FAIL with module-not-found / `groupNotesByEntry` not exported.

- [ ] **Step 3: Implement the hook file with just the grouping helper**

Create `src/hooks/useMarginNotes.ts`:

```ts
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  query as firestoreQuery,
  where,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { MarginNote } from '@/types/marginNote';

// Firestore 'in' operator caps at 30 values per query. PAGE_SIZE is 6
// in JournalSpread, so a single query is always sufficient.
const FIRESTORE_IN_CAP = 30;

/**
 * Group a flat list of notes by their journalEntryId, with each group
 * sorted oldest-first so render order matches the order they were written.
 */
export function groupNotesByEntry(
  notes: MarginNote[]
): Map<string, MarginNote[]> {
  const map = new Map<string, MarginNote[]>();
  for (const n of notes) {
    const list = map.get(n.journalEntryId);
    if (list) list.push(n);
    else map.set(n.journalEntryId, [n]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
  }
  return map;
}

export interface UseMarginNotesResult {
  notesByEntry: Map<string, MarginNote[]>;
  loading: boolean;
  error: Error | null;
}

/**
 * Subscribe to all margin notes that (a) belong to any entry id in the
 * provided list, AND (b) are visible to the current user. Returns a
 * Map<journalEntryId, MarginNote[]>.
 *
 * When `journalEntryIds` is empty the hook idles — no subscription, no
 * loading flash.
 */
export function useMarginNotesForJournalEntries(
  journalEntryIds: string[]
): UseMarginNotesResult {
  const { user } = useAuth();
  const [notes, setNotes] = useState<MarginNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const idsKey = useMemo(
    () => [...journalEntryIds].sort().join(','),
    [journalEntryIds]
  );

  useEffect(() => {
    if (!user?.userId || !user.familyId || journalEntryIds.length === 0) {
      setNotes([]);
      setLoading(false);
      setError(null);
      return;
    }
    if (journalEntryIds.length > FIRESTORE_IN_CAP) {
      setError(
        new Error(
          `useMarginNotesForJournalEntries: ${journalEntryIds.length} ids exceeds Firestore in-cap of ${FIRESTORE_IN_CAP}`
        )
      );
      return;
    }
    setLoading(true);
    const q = firestoreQuery(
      collection(firestore, 'margin_notes'),
      where('familyId', '==', user.familyId),
      where('journalEntryId', 'in', journalEntryIds),
      where('visibleToUserIds', 'array-contains', user.userId)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const out: MarginNote[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          out.push({
            id: docSnap.id,
            familyId: data.familyId,
            journalEntryId: data.journalEntryId,
            authorUserId: data.authorUserId,
            content: data.content,
            createdAt: data.createdAt as Timestamp,
            editedAt: data.editedAt as Timestamp | undefined,
            visibleToUserIds: data.visibleToUserIds ?? [],
            sharedWithUserIds: data.sharedWithUserIds ?? [],
          });
        });
        setNotes(out);
        setLoading(false);
      },
      (err) => {
        setError(err as Error);
        setLoading(false);
      }
    );
    return () => unsub();
    // idsKey is the change signal for journalEntryIds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId, user?.familyId, idsKey]);

  const notesByEntry = useMemo(() => groupNotesByEntry(notes), [notes]);

  return { notesByEntry, loading, error };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/hooks/useMarginNotes.test.ts`
Expected: PASS — all 3 `groupNotesByEntry` cases.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMarginNotes.ts __tests__/hooks/useMarginNotes.test.ts
git commit -m "feat(marginalia): subscribe to margin notes by journal entry ids"
```

---

## Task 3: `useMarginNotes` — create / update / delete

**Files:**
- Modify: `src/hooks/useMarginNotes.ts`
- Modify: `__tests__/hooks/useMarginNotes.test.ts`

- [ ] **Step 1: Add failing tests for input validation**

Append to `__tests__/hooks/useMarginNotes.test.ts`:

```ts
import { validateNoteContent } from '@/hooks/useMarginNotes';

describe('validateNoteContent', () => {
  it('trims and accepts content within 1..80 chars', () => {
    expect(validateNoteContent('  hello world  ')).toEqual({
      ok: true,
      content: 'hello world',
    });
  });

  it('rejects empty / whitespace-only content', () => {
    expect(validateNoteContent('').ok).toBe(false);
    expect(validateNoteContent('   ').ok).toBe(false);
  });

  it('rejects content over 80 chars after trimming', () => {
    const long = 'a'.repeat(81);
    expect(validateNoteContent(long).ok).toBe(false);
  });

  it('accepts exactly 80 chars', () => {
    const eighty = 'a'.repeat(80);
    const r = validateNoteContent(eighty);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.content).toBe(eighty);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run __tests__/hooks/useMarginNotes.test.ts`
Expected: FAIL — `validateNoteContent` not exported.

- [ ] **Step 3: Add the validator and the CRUD hook**

First, update the imports at the top of `src/hooks/useMarginNotes.ts` so all needed symbols are imported once:

```ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query as firestoreQuery,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { MarginNote } from '@/types/marginNote';
import { MARGIN_NOTE_MAX_LENGTH } from '@/types/marginNote';
```

Then add the following exports at the bottom of the file (below the existing `useMarginNotesForJournalEntries` hook):

export type ValidateNoteResult =
  | { ok: true; content: string }
  | { ok: false; reason: 'empty' | 'too_long' };

export function validateNoteContent(raw: string): ValidateNoteResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, reason: 'empty' };
  if (trimmed.length > MARGIN_NOTE_MAX_LENGTH) {
    return { ok: false, reason: 'too_long' };
  }
  return { ok: true, content: trimmed };
}

export interface UseMarginNotesMutationsResult {
  createNote: (journalEntryId: string, content: string) => Promise<string>;
  updateNote: (noteId: string, content: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  saving: boolean;
  error: Error | null;
}

/**
 * Mutation hook for margin notes. Kept separate from the subscription
 * hook so pure read-only consumers (e.g., a future "recent margin notes"
 * view) don't pull in the write path.
 */
export function useMarginNoteMutations(): UseMarginNotesMutationsResult {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createNote = useCallback(
    async (journalEntryId: string, content: string): Promise<string> => {
      if (!user?.userId || !user.familyId) {
        throw new Error('Not authenticated');
      }
      const v = validateNoteContent(content);
      if (!v.ok) {
        throw new Error(
          v.reason === 'empty' ? 'Note is empty' : 'Note is too long'
        );
      }
      setSaving(true);
      setError(null);
      try {
        // Read the parent entry so we can copy its visibility onto the
        // new note. The rule requires that visibleToUserIds on the note
        // equals the parent's at write time.
        const parentSnap = await getDoc(
          doc(firestore, 'journal_entries', journalEntryId)
        );
        if (!parentSnap.exists()) {
          throw new Error('Parent journal entry not found');
        }
        const parent = parentSnap.data();
        const visibleToUserIds: string[] = parent.visibleToUserIds ?? [];
        const sharedWithUserIds: string[] = parent.sharedWithUserIds ?? [];
        if (!visibleToUserIds.includes(user.userId)) {
          throw new Error('You cannot annotate an entry you cannot see');
        }
        const ref = await addDoc(collection(firestore, 'margin_notes'), {
          familyId: user.familyId,
          journalEntryId,
          authorUserId: user.userId,
          content: v.content,
          createdAt: serverTimestamp(),
          visibleToUserIds,
          sharedWithUserIds,
        });
        return ref.id;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [user?.userId, user?.familyId]
  );

  const updateNote = useCallback(
    async (noteId: string, content: string): Promise<void> => {
      if (!user?.userId) throw new Error('Not authenticated');
      const v = validateNoteContent(content);
      if (!v.ok) {
        throw new Error(
          v.reason === 'empty' ? 'Note is empty' : 'Note is too long'
        );
      }
      setSaving(true);
      setError(null);
      try {
        await updateDoc(doc(firestore, 'margin_notes', noteId), {
          content: v.content,
          editedAt: serverTimestamp(),
        });
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [user?.userId]
  );

  const deleteNote = useCallback(
    async (noteId: string): Promise<void> => {
      if (!user?.userId) throw new Error('Not authenticated');
      setSaving(true);
      setError(null);
      try {
        await deleteDoc(doc(firestore, 'margin_notes', noteId));
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [user?.userId]
  );

  return { createNote, updateNote, deleteNote, saving, error };
}
```

- [ ] **Step 4: Run validator tests**

Run: `npx vitest run __tests__/hooks/useMarginNotes.test.ts`
Expected: PASS — validator tests, in addition to earlier grouping tests.

- [ ] **Step 5: Type-check the full hook**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useMarginNotes.ts __tests__/hooks/useMarginNotes.test.ts
git commit -m "feat(marginalia): useMarginNoteMutations with visibility denorm"
```

---

## Task 4: `MarginNoteComposer` component

**Files:**
- Create: `src/components/journal-spread/MarginNoteComposer.tsx`
- Test: `__tests__/components/journal-spread/MarginNoteComposer.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `__tests__/components/journal-spread/MarginNoteComposer.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarginNoteComposer } from '@/components/journal-spread/MarginNoteComposer';

describe('MarginNoteComposer', () => {
  it('commits trimmed content on Enter', async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(
      <MarginNoteComposer
        side="left"
        initialValue=""
        onCommit={onCommit}
        onCancel={vi.fn()}
      />
    );
    const input = screen.getByRole('textbox');
    await user.type(input, '  hello  ');
    await user.keyboard('{Enter}');
    expect(onCommit).toHaveBeenCalledWith('hello');
  });

  it('cancels on Escape without committing', async () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <MarginNoteComposer
        side="right"
        initialValue=""
        onCommit={onCommit}
        onCancel={onCancel}
      />
    );
    const input = screen.getByRole('textbox');
    await user.type(input, 'nevermind');
    await user.keyboard('{Escape}');
    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it('blocks input past 80 chars', async () => {
    const user = userEvent.setup();
    render(
      <MarginNoteComposer
        side="left"
        initialValue=""
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.type(input, 'a'.repeat(85));
    expect(input.value.length).toBe(80);
  });

  it('does not commit on Enter when empty', async () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <MarginNoteComposer
        side="left"
        initialValue=""
        onCommit={onCommit}
        onCancel={onCancel}
      />
    );
    const input = screen.getByRole('textbox');
    input.focus();
    await user.keyboard('{Enter}');
    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows counter at 60+, amber at 75+', async () => {
    const user = userEvent.setup();
    render(
      <MarginNoteComposer
        side="left"
        initialValue=""
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const input = screen.getByRole('textbox');
    await user.type(input, 'a'.repeat(60));
    expect(screen.getByText(/60.*80/)).toBeInTheDocument();
    await user.type(input, 'a'.repeat(15));
    const counter = screen.getByText(/75.*80/);
    expect(counter).toBeInTheDocument();
    expect(counter.className).toMatch(/amber/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run __tests__/components/journal-spread/MarginNoteComposer.test.tsx`
Expected: FAIL (component does not exist).

- [ ] **Step 3: Implement the composer**

Create `src/components/journal-spread/MarginNoteComposer.tsx`:

```tsx
'use client';

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { MARGIN_NOTE_MAX_LENGTH } from '@/types/marginNote';

export interface MarginNoteComposerProps {
  /** Which margin side we're rendering in — controls text alignment. */
  side: 'left' | 'right';
  /** Pre-filled value when editing an existing note. */
  initialValue: string;
  /** Called with the trimmed, non-empty content when the user commits. */
  onCommit: (content: string) => void;
  /** Called when the user cancels (Escape, or blur with empty value). */
  onCancel: () => void;
  /** Optional auto-focus — default true. */
  autoFocus?: boolean;
}

const COUNTER_SHOW_AT = 60;
const COUNTER_AMBER_AT = 75;

/**
 * Inline 80-char composer for margin notes. Behaves like a one-line
 * text input with hard length cap, Enter-to-commit, Escape-to-cancel.
 */
export function MarginNoteComposer({
  side,
  initialValue,
  onCommit,
  onCancel,
  autoFocus = true,
}: MarginNoteComposerProps) {
  const [value, setValue] = useState(initialValue);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const handleCommitOrCancel = () => {
    const trimmed = value.trim();
    if (trimmed.length === 0) onCancel();
    else onCommit(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommitOrCancel();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const length = value.length;
  const showCounter = length >= COUNTER_SHOW_AT;
  const counterClass = length >= COUNTER_AMBER_AT ? 'counter-amber' : 'counter';

  return (
    <div className={`composer align-${side}`}>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, MARGIN_NOTE_MAX_LENGTH))}
        onKeyDown={handleKeyDown}
        onBlur={handleCommitOrCancel}
        maxLength={MARGIN_NOTE_MAX_LENGTH}
        aria-label="Margin note"
        className="input"
      />
      {showCounter && (
        <div className={counterClass}>
          {length} / {MARGIN_NOTE_MAX_LENGTH}
        </div>
      )}
      <style jsx>{`
        .composer {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          color: #8a6f4a;
          font-size: 11px;
          line-height: 1.5;
          margin-bottom: 34px;
        }
        .align-left { text-align: right; }
        .align-right { text-align: left; }
        .input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px dotted #c8b89a;
          font: inherit;
          color: inherit;
          text-align: inherit;
          padding: 2px 0;
          outline: none;
        }
        .input:focus {
          border-bottom-color: #8a6f4a;
        }
        .counter,
        .counter-amber {
          font-size: 9px;
          letter-spacing: 0.08em;
          margin-top: 2px;
          opacity: 0.7;
        }
        .counter-amber { color: #b07a28; }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/components/journal-spread/MarginNoteComposer.test.tsx`
Expected: PASS — all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/journal-spread/MarginNoteComposer.tsx __tests__/components/journal-spread/MarginNoteComposer.test.tsx
git commit -m "feat(marginalia): inline 80-char margin note composer"
```

---

## Task 5: `UserMarginNote` component

**Files:**
- Create: `src/components/journal-spread/UserMarginNote.tsx`
- Test: `__tests__/components/journal-spread/UserMarginNote.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `__tests__/components/journal-spread/UserMarginNote.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Timestamp } from 'firebase/firestore';
import { UserMarginNote } from '@/components/journal-spread/UserMarginNote';
import type { MarginNote } from '@/types/marginNote';

const base: MarginNote = {
  id: 'n1',
  familyId: 'f1',
  journalEntryId: 'e1',
  authorUserId: 'u-note',
  content: 'reread this',
  createdAt: Timestamp.now(),
  visibleToUserIds: ['u-note', 'u-entry'],
  sharedWithUserIds: ['u-entry'],
};

describe('UserMarginNote', () => {
  it('renders content', () => {
    render(
      <UserMarginNote
        note={base}
        entryAuthorUserId="u-entry"
        currentUserId="u-entry"
        side="left"
        authorName="Miriam"
      />
    );
    expect(screen.getByText('reread this')).toBeInTheDocument();
  });

  it('shows attribution when note author differs from entry author', () => {
    render(
      <UserMarginNote
        note={base}
        entryAuthorUserId="u-entry"
        currentUserId="u-entry"
        side="left"
        authorName="Miriam"
      />
    );
    expect(screen.getByText(/— M\./)).toBeInTheDocument();
  });

  it('hides attribution when note is self-authored on your own entry', () => {
    render(
      <UserMarginNote
        note={{ ...base, authorUserId: 'u-entry' }}
        entryAuthorUserId="u-entry"
        currentUserId="u-entry"
        side="left"
        authorName="Miriam"
      />
    );
    expect(screen.queryByText(/—/)).not.toBeInTheDocument();
  });

  it('is not tap-to-edit for viewers who are not the author', async () => {
    const onStartEdit = vi.fn();
    const user = userEvent.setup();
    render(
      <UserMarginNote
        note={base}
        entryAuthorUserId="u-entry"
        currentUserId="u-entry"
        side="left"
        authorName="Miriam"
        onStartEdit={onStartEdit}
      />
    );
    await user.click(screen.getByText('reread this'));
    expect(onStartEdit).not.toHaveBeenCalled();
  });

  it('is tap-to-edit for the author', async () => {
    const onStartEdit = vi.fn();
    const user = userEvent.setup();
    render(
      <UserMarginNote
        note={base}
        entryAuthorUserId="u-entry"
        currentUserId="u-note"
        side="left"
        authorName="Miriam"
        onStartEdit={onStartEdit}
      />
    );
    await user.click(screen.getByText('reread this'));
    expect(onStartEdit).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run __tests__/components/journal-spread/UserMarginNote.test.tsx`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement the component**

Create `src/components/journal-spread/UserMarginNote.tsx`:

```tsx
'use client';

import type { MarginNote } from '@/types/marginNote';

export interface UserMarginNoteProps {
  note: MarginNote;
  /** userId of the parent journal entry's author. */
  entryAuthorUserId: string;
  /** Current viewer. */
  currentUserId: string;
  /** Which margin side — matches existing MarginColumn props. */
  side: 'left' | 'right';
  /**
   * Pre-resolved display name for the note's author. Callers do the
   * userId → name lookup (e.g., via the people map) — this component
   * stays purely presentational.
   */
  authorName: string;
  /** Invoked when the author clicks their own note to edit it. */
  onStartEdit?: () => void;
}

/**
 * A single rendered margin note. Author-only interactivity: non-authors
 * can only read. Attribution is shown only when the note's author is
 * different from the entry's author — self-notes stay quiet.
 */
export function UserMarginNote({
  note,
  entryAuthorUserId,
  currentUserId,
  side,
  authorName,
  onStartEdit,
}: UserMarginNoteProps) {
  const isAuthor = note.authorUserId === currentUserId;
  const isObserverNote = note.authorUserId !== entryAuthorUserId;
  const initial = authorName?.trim().charAt(0).toUpperCase() ?? '?';

  const handleClick = () => {
    if (isAuthor && onStartEdit) onStartEdit();
  };

  return (
    <div className={`note align-${side} ${isAuthor ? 'editable' : ''}`}>
      <div className="body" onClick={handleClick}>{note.content}</div>
      {isObserverNote && (
        <div className="attribution">— {initial}.</div>
      )}
      <style jsx>{`
        .note {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          color: #8a6f4a;
          font-size: 11px;
          line-height: 1.5;
          margin-bottom: 34px;
          opacity: 0.85;
        }
        .align-left  { text-align: right; }
        .align-right { text-align: left; }
        .body { cursor: default; }
        .editable .body { cursor: text; }
        .attribution {
          font-size: 10px;
          margin-top: 2px;
          opacity: 0.75;
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run __tests__/components/journal-spread/UserMarginNote.test.tsx`
Expected: PASS — all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/journal-spread/UserMarginNote.tsx __tests__/components/journal-spread/UserMarginNote.test.tsx
git commit -m "feat(marginalia): render user margin notes with author-initial attribution"
```

---

## Task 6: Wire notes + composer trigger into `MarginItem`

**Files:**
- Modify: `src/components/journal-spread/MarginColumn.tsx`
- Modify: `__tests__/components/journal-spread/MarginColumn.test.tsx`

- [ ] **Step 1: Write failing tests for new `MarginItem` behavior**

Add these imports to the top of `__tests__/components/journal-spread/MarginColumn.test.tsx` (alongside the existing imports):

```tsx
import userEvent from '@testing-library/user-event';
import { MarginItem } from '@/components/journal-spread/MarginColumn';
import type { MarginNote } from '@/types/marginNote';
```

Then append this as a sibling `describe` at the bottom of the file (outside the existing `describe('MarginColumn', ...)` block):

```tsx
describe('MarginItem', () => {
  const mkNote = (over: Partial<MarginNote>): MarginNote => ({
    id: 'n1',
    familyId: 'f1',
    journalEntryId: 'x',
    authorUserId: 'u1',
    content: 'scribble',
    createdAt: Timestamp.now(),
    visibleToUserIds: ['u1'],
    sharedWithUserIds: [],
    ...over,
  });

  const baseProps = {
    currentUserId: 'u1',
    resolveUserName: (_uid: string) => 'Me',
    onCreateNote: async () => 'new-id',
  };

  it('renders user notes above tags', () => {
    const e = entry({
      id: 'x',
      tags: ['curiosity'],
    });
    const { container } = render(
      <MarginItem
        entry={e}
        side="left"
        notes={[mkNote({ content: 'yes this' })]}
        {...baseProps}
      />
    );
    const text = container.textContent ?? '';
    expect(text.indexOf('yes this')).toBeLessThan(text.indexOf('curiosity'));
  });

  it('shows composer trigger for annotatable entries when viewer can see the entry', () => {
    const e = entry({ id: 'x', type: 'written', visibleToUserIds: ['u1'] });
    render(
      <MarginItem entry={e} side="left" notes={[]} {...baseProps} />
    );
    expect(
      screen.getByRole('button', { name: /add margin note/i })
    ).toBeInTheDocument();
  });

  it('hides composer trigger for non-annotatable entry types', () => {
    const e = entry({ id: 'x', type: 'synthesis', visibleToUserIds: ['u1'] });
    render(
      <MarginItem entry={e} side="left" notes={[]} {...baseProps} />
    );
    expect(
      screen.queryByRole('button', { name: /add margin note/i })
    ).toBeNull();
  });

  it('clicking composer trigger switches to the composer', async () => {
    const e = entry({ id: 'x', type: 'written', visibleToUserIds: ['u1'] });
    const user = userEvent.setup();
    render(
      <MarginItem entry={e} side="left" notes={[]} {...baseProps} />
    );
    await user.click(screen.getByRole('button', { name: /add margin note/i }));
    expect(screen.getByRole('textbox', { name: /margin note/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run __tests__/components/journal-spread/MarginColumn.test.tsx`
Expected: FAIL — `MarginItem` doesn't accept `notes` / `currentUserId` / composer trigger.

- [ ] **Step 3: Update `MarginItem`**

Edit `src/components/journal-spread/MarginColumn.tsx` — replace the current `MarginItem` export with the expanded version below. Leave `SYNTHESIS_BUCKET_TAGS` and all existing styles intact. Also update the `MarginColumn` function's `<MarginItem>` call to pass `side={side}` (the current call omits it because old `MarginItem` didn't accept it). `MarginColumn` callers that want notes/composer behavior should migrate to the per-entry `MarginItem` pattern used by `JournalSpread` — `MarginColumn` itself remains simple and won't render composer triggers (no callbacks passed).

```tsx
import { useState } from 'react';
import type { MarginNote } from '@/types/marginNote';
import { UserMarginNote } from './UserMarginNote';
import { MarginNoteComposer } from './MarginNoteComposer';

const ANNOTATABLE_ENTRY_TYPES = new Set(['written', 'observation']);

export interface MarginItemProps {
  entry: Entry;
  side: 'left' | 'right';
  notes?: MarginNote[];
  currentUserId?: string;
  /**
   * userId → display name resolver (e.g., from the people map, resolved
   * by Person.linkedUserId). Separate from the personId-based `nameOf`
   * used elsewhere — margin note authors are identified by userId.
   */
  resolveUserName?: (userId: string) => string;
  onCreateNote?: (journalEntryId: string, content: string) => void | Promise<void>;
  onUpdateNote?: (noteId: string, content: string) => void | Promise<void>;
  onDeleteNote?: (noteId: string) => void | Promise<void>;
}

export function MarginItem({
  entry,
  side,
  notes = [],
  currentUserId,
  resolveUserName,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
}: MarginItemProps) {
  const [composing, setComposing] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const externalTags = entry.tags.filter(
    (t) => !t.startsWith('_') && !t.includes(':') && !SYNTHESIS_BUCKET_TAGS.has(t)
  );
  const hasSynthesisDate =
    entry.type === 'synthesis' && typeof entry.createdAt?.toDate === 'function';
  const synthDate = hasSynthesisDate
    ? entry.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;

  const viewerCanSeeEntry =
    !!currentUserId && entry.visibleToUserIds.includes(currentUserId);
  const isAnnotatable = ANNOTATABLE_ENTRY_TYPES.has(entry.type);
  const canAuthor = isAnnotatable && viewerCanSeeEntry && !!onCreateNote;

  // For journal-derived entries, Entry.author.personId actually holds
  // the journal entry's authorId, which in this codebase is a userId
  // (see src/lib/entries/adapter.ts:journalEntryToEntry). This naming
  // is a legacy quirk — for margin notes (userId-keyed) the comparison
  // against note.authorUserId is correct.
  const entryAuthorUserId =
    entry.author.kind === 'person' ? entry.author.personId : '';

  const hasAny =
    notes.length > 0 ||
    externalTags.length > 0 ||
    hasSynthesisDate ||
    canAuthor;
  if (!hasAny) return null;

  const resolveName = resolveUserName ?? ((uid: string) => uid.charAt(0));

  return (
    <div className="item">
      {notes.map((n) =>
        editingNoteId === n.id && onUpdateNote ? (
          <MarginNoteComposer
            key={n.id}
            side={side}
            initialValue={n.content}
            onCommit={async (content) => {
              await onUpdateNote(n.id, content);
              setEditingNoteId(null);
            }}
            onCancel={() => setEditingNoteId(null)}
          />
        ) : (
          <UserMarginNote
            key={n.id}
            note={n}
            entryAuthorUserId={entryAuthorUserId}
            currentUserId={currentUserId ?? ''}
            side={side}
            authorName={resolveName(n.authorUserId)}
            onStartEdit={
              onUpdateNote && n.authorUserId === currentUserId
                ? () => setEditingNoteId(n.id)
                : undefined
            }
          />
        )
      )}
      {composing && onCreateNote && (
        <MarginNoteComposer
          side={side}
          initialValue=""
          onCommit={async (content) => {
            await onCreateNote(entry.id, content);
            setComposing(false);
          }}
          onCancel={() => setComposing(false)}
        />
      )}
      {!composing && canAuthor && (
        <button
          type="button"
          className="add-trigger"
          aria-label="Add margin note"
          onClick={() => setComposing(true)}
        >
          note
        </button>
      )}
      {externalTags.map((t) => (
        <div key={t} className="tag">#{t}</div>
      ))}
      {hasSynthesisDate && (
        <div className="date">synthesized {synthDate}</div>
      )}
      <style jsx>{`
        .item { margin-bottom: 34px; font-style: italic; opacity: 0.75; }
        .tag {
          color: #5a4628; font-style: normal; font-size: 10px;
          letter-spacing: 0.1em; text-transform: lowercase;
        }
        .date { color: #8a6f4a; font-size: 10px; font-style: italic; }
        .add-trigger {
          appearance: none; background: transparent; border: none;
          font: inherit; color: #8a6f4a; cursor: pointer;
          opacity: 0.35; padding: 2px 0;
          font-size: 10px; letter-spacing: 0.12em;
        }
        .add-trigger:hover { opacity: 1; }
      `}</style>
    </div>
  );
}
```

Also update the existing `MarginItem` import line — if the file currently exports the old function signature, this replaces it. Make sure the `useState` import is added at the top of the file (merge with existing imports from React if any; the current file has no React hook imports, so add `import { useState } from 'react';`).

- [ ] **Step 4: Run existing + new tests**

Run: `npx vitest run __tests__/components/journal-spread/MarginColumn.test.tsx`
Expected: PASS — existing tests continue to pass, all 4 new cases pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/journal-spread/MarginColumn.tsx __tests__/components/journal-spread/MarginColumn.test.tsx
git commit -m "feat(marginalia): render notes + composer trigger in MarginItem"
```

---

## Task 7: Hydrate notes in `JournalSpread`

**Files:**
- Modify: `src/components/journal-spread/JournalSpread.tsx`

- [ ] **Step 1: Read the current `JournalSpread.tsx`**

Re-open the file. Confirm the structure: `currentEntries` → split into `leftEntries` / `rightEntries` → passed to `PageEntries`, which invokes `MarginItem` per entry.

- [ ] **Step 2: Derive annotatable journal entry ids**

Near the top of `JournalSpread` (inside the component body, after `orderedForSpread` is computed), add:

```tsx
const annotatableJournalEntryIds = useMemo(
  () =>
    orderedForSpread
      .filter((e) => e.type === 'written' || e.type === 'observation')
      .map((e) => e.id),
  [orderedForSpread]
);
```

(Add `useMemo` to the existing React import at the top of the file.)

- [ ] **Step 3: Subscribe and get mutations + build userId-name resolver**

Add these imports at the top of `JournalSpread.tsx`:

```tsx
import {
  useMarginNotesForJournalEntries,
  useMarginNoteMutations,
} from '@/hooks/useMarginNotes';
import { usePeopleMap } from '@/hooks/usePeopleMap';
```

Inside the component body (after the state declarations), add:

```tsx
const { notesByEntry } = useMarginNotesForJournalEntries(annotatableJournalEntryIds);
const { createNote, updateNote, deleteNote } = useMarginNoteMutations();
const { byId: peopleById } = usePeopleMap();

// userId → display name. Derived from the people map by looking up the
// person whose linkedUserId matches. Falls back to the userId itself so
// something is always rendered for unknown users.
const resolveUserName = useMemo(() => {
  const userIdToName = new Map<string, string>();
  for (const p of Object.values(peopleById)) {
    if (p.linkedUserId) userIdToName.set(p.linkedUserId, p.name);
  }
  return (userId: string) => userIdToName.get(userId) ?? userId;
}, [peopleById]);
```

- [ ] **Step 4: Thread notes + callbacks through `PageEntries` → `MarginItem`**

Change `PageEntries`'s signature and its internal `MarginItem` calls. Edit the props interface:

```tsx
function PageEntries({
  entries,
  side,
  nameOf,
  currentUserId,
  onAsk,
  onEdit,
  notesByEntry,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  resolveUserName,
}: {
  entries: Entry[];
  side: 'left' | 'right';
  nameOf?: (personId: string) => string;
  currentUserId?: string;
  onAsk?: (entry: Entry, side: 'left' | 'right') => void;
  onEdit?: (entry: Entry, mode: 'edit' | 'append') => void;
  notesByEntry: Map<string, MarginNote[]>;
  onCreateNote: (journalEntryId: string, content: string) => Promise<string>;
  onUpdateNote: (noteId: string, content: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  resolveUserName: (userId: string) => string;
}) {
```

Inside the map, pass into `<MarginItem>`:

```tsx
<MarginItem
  entry={e}
  side={side}
  notes={notesByEntry.get(e.id) ?? []}
  currentUserId={currentUserId}
  resolveUserName={resolveUserName}
  onCreateNote={onCreateNote}
  onUpdateNote={onUpdateNote}
  onDeleteNote={onDeleteNote}
/>
```

(The `side` prop on `MarginItem` already exists in the updated Task 6 signature. Note the existing `nameOf` — personId-based — stays threaded through `PageEntries` into `EntryBlock`; only margin notes use the new `resolveUserName`.)

Update `PageEntries`'s props interface too — add `resolveUserName: (userId: string) => string` alongside the notes + callbacks it already threads through.

Import `MarginNote` in JournalSpread: `import type { MarginNote } from '@/types/marginNote';`.

- [ ] **Step 5: Pass the new props when calling `PageEntries`**

Find the two `<PageEntries ... />` invocations in `JournalSpread`. Add to each:

```tsx
notesByEntry={notesByEntry}
onCreateNote={createNote}
onUpdateNote={updateNote}
onDeleteNote={deleteNote}
resolveUserName={resolveUserName}
```

- [ ] **Step 6: Build & type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npx vitest run __tests__/components/journal-spread/`
Expected: PASS — all component tests.

- [ ] **Step 7: Manual smoke test**

Run: `npm run dev` in a separate terminal.
- Navigate to `/journal`.
- Observe the margin next to a written/observation entry.
- Confirm a faint "note" trigger appears.
- Click it; confirm the inline input appears.
- Type some text; press Enter; confirm the note appears (network write will 403 until Task 8 deploys rules — that's expected).
- Press Escape before committing; confirm the input disappears without writing.

*(Firestore writes will fail until Task 8; the UI path is what we're verifying here.)*

- [ ] **Step 8: Commit**

```bash
git add src/components/journal-spread/JournalSpread.tsx
git commit -m "feat(marginalia): hydrate notes for current page in JournalSpread"
```

---

## Task 8: Firestore security rules

**Files:**
- Modify: `firestore.rules`
- Modify: `firestore-rules/rules.test.ts`

- [ ] **Step 1: Seed test data for margin notes**

Edit `firestore-rules/rules.test.ts`. Inside the `beforeEach` block, after the existing `contrib-*` seeds, add a seeded journal entry + an existing margin note:

```ts
    // Seed a journal entry owned by parentUser, visible to parent only.
    await setDoc(doc(db, 'journal_entries', 'je-parent-private'), {
      entryId: 'je-parent-private',
      familyId: FAMILY_ID,
      authorId: parentUser.uid,
      text: 'private entry',
      category: 'moment',
      tags: [],
      personMentions: [],
      visibleToUserIds: [parentUser.uid],
      sharedWithUserIds: [],
      createdAt: new Date(),
    });

    // Seed a journal entry owned by parentUser, shared with otherFamilyUser.
    // (otherFamilyUser belongs to a different family, so family-gating
    // rules still block them — this doc is for negative-case tests.)
    await setDoc(doc(db, 'journal_entries', 'je-parent-shared'), {
      entryId: 'je-parent-shared',
      familyId: FAMILY_ID,
      authorId: parentUser.uid,
      text: 'shared entry',
      category: 'moment',
      tags: [],
      personMentions: [],
      visibleToUserIds: [parentUser.uid, childUser.uid],
      sharedWithUserIds: [childUser.uid],
      createdAt: new Date(),
    });

    // Seed an existing margin note owned by parentUser, attached to
    // je-parent-private. Used in read/update/delete tests.
    await setDoc(doc(db, 'margin_notes', 'mn-parent-on-private'), {
      familyId: FAMILY_ID,
      journalEntryId: 'je-parent-private',
      authorUserId: parentUser.uid,
      content: 'seeded',
      createdAt: new Date(),
      visibleToUserIds: [parentUser.uid],
      sharedWithUserIds: [],
    });
```

- [ ] **Step 2: Add failing margin-note rule tests**

At the end of the existing `describe.skipIf(...)` block in `firestore-rules/rules.test.ts`, add:

```ts
  describe('margin_notes', () => {
    it('author parent can read their own note', async () => {
      const ctx = getAuthContext(parentUser.uid);
      await assertSucceeds(
        getDoc(doc(ctx.firestore(), 'margin_notes', 'mn-parent-on-private'))
      );
    });

    it('non-visible user cannot read the note', async () => {
      const ctx = getAuthContext(childUser.uid); // child not in visibleToUserIds
      await assertFails(
        getDoc(doc(ctx.firestore(), 'margin_notes', 'mn-parent-on-private'))
      );
    });

    it('other-family user cannot read the note', async () => {
      const ctx = getAuthContext(otherFamilyUser.uid);
      await assertFails(
        getDoc(doc(ctx.firestore(), 'margin_notes', 'mn-parent-on-private'))
      );
    });

    it('parent can create a note on an entry they can see', async () => {
      const ctx = getAuthContext(parentUser.uid);
      await assertSucceeds(
        addDoc(collection(ctx.firestore(), 'margin_notes'), {
          familyId: FAMILY_ID,
          journalEntryId: 'je-parent-private',
          authorUserId: parentUser.uid,
          content: 'new scribble',
          createdAt: new Date(),
          visibleToUserIds: [parentUser.uid],
          sharedWithUserIds: [],
        })
      );
    });

    it('cannot create a note with mismatched visibility', async () => {
      const ctx = getAuthContext(parentUser.uid);
      await assertFails(
        addDoc(collection(ctx.firestore(), 'margin_notes'), {
          familyId: FAMILY_ID,
          journalEntryId: 'je-parent-private',
          authorUserId: parentUser.uid,
          content: 'sneaky',
          createdAt: new Date(),
          // Parent entry's visibility is just [parentUser.uid], but we
          // claim child can see this too — rule must reject.
          visibleToUserIds: [parentUser.uid, childUser.uid],
          sharedWithUserIds: [childUser.uid],
        })
      );
    });

    it('cannot create a note claiming someone else authored it', async () => {
      const ctx = getAuthContext(parentUser.uid);
      await assertFails(
        addDoc(collection(ctx.firestore(), 'margin_notes'), {
          familyId: FAMILY_ID,
          journalEntryId: 'je-parent-private',
          authorUserId: childUser.uid, // lying
          content: 'spoof',
          createdAt: new Date(),
          visibleToUserIds: [parentUser.uid],
          sharedWithUserIds: [],
        })
      );
    });

    it('cannot create a note on an entry you cannot see', async () => {
      // childUser is in this family (as child role) but not a parent —
      // the rule requires isParent(), so this write fails.
      const ctx = getAuthContext(childUser.uid);
      await assertFails(
        addDoc(collection(ctx.firestore(), 'margin_notes'), {
          familyId: FAMILY_ID,
          journalEntryId: 'je-parent-private',
          authorUserId: childUser.uid,
          content: 'child scribble',
          createdAt: new Date(),
          visibleToUserIds: [childUser.uid],
          sharedWithUserIds: [],
        })
      );
    });

    it('author can edit only content + editedAt', async () => {
      const ctx = getAuthContext(parentUser.uid);
      await assertSucceeds(
        updateDoc(doc(ctx.firestore(), 'margin_notes', 'mn-parent-on-private'), {
          content: 'edited',
          editedAt: new Date(),
        })
      );
    });

    it('author cannot edit visibility fields', async () => {
      const ctx = getAuthContext(parentUser.uid);
      await assertFails(
        updateDoc(doc(ctx.firestore(), 'margin_notes', 'mn-parent-on-private'), {
          visibleToUserIds: [parentUser.uid, childUser.uid],
        })
      );
    });

    it('non-author cannot delete', async () => {
      const ctx = getAuthContext(childUser.uid);
      await assertFails(
        deleteDoc(doc(ctx.firestore(), 'margin_notes', 'mn-parent-on-private'))
      );
    });

    it('author can delete', async () => {
      const ctx = getAuthContext(parentUser.uid);
      await assertSucceeds(
        deleteDoc(doc(ctx.firestore(), 'margin_notes', 'mn-parent-on-private'))
      );
    });
  });
```

- [ ] **Step 3: Run rules tests to verify they fail**

Run: `npm run test:rules`
Expected: FAIL — rules for `margin_notes` do not exist yet; all tests should fail with permission-denied or unrelated errors.

- [ ] **Step 4: Add the margin_notes rules block**

Edit `firestore.rules`. Insert the new block immediately after the `journal_entries` block (after its closing brace, around line 168), before the `// ==================== Entries (unified stream) ====================` comment:

```
    // ==================== Margin Notes ====================
    //
    // User-authored annotations tied to a journal_entries doc. Mirrors
    // the journal_entries visibility model: denormalized visibleToUserIds
    // at create time, cascade-updated by a Cloud Function when the parent
    // entry's visibility changes.
    //
    // Clients may never mutate visibleToUserIds / sharedWithUserIds
    // directly after create — they are derived from the parent entry.
    match /margin_notes/{noteId} {
      allow read: if isParent()
                  && belongsToFamily(resource.data.familyId)
                  && request.auth.uid in resource.data.visibleToUserIds;

      // Create: author must be the caller; denormalized visibility must
      // equal the parent entry's at write time; caller must be in the
      // parent entry's visibleToUserIds.
      allow create: if isParent()
                    && belongsToFamily(request.resource.data.familyId)
                    && request.resource.data.authorUserId == request.auth.uid
                    && request.auth.uid in request.resource.data.visibleToUserIds
                    && request.resource.data.visibleToUserIds ==
                         get(/databases/$(database)/documents/journal_entries/$(request.resource.data.journalEntryId)).data.visibleToUserIds
                    && request.resource.data.sharedWithUserIds ==
                         get(/databases/$(database)/documents/journal_entries/$(request.resource.data.journalEntryId)).data.sharedWithUserIds;

      // Update: author-only; only content and editedAt may change.
      allow update: if isParent()
                    && belongsToFamily(resource.data.familyId)
                    && resource.data.authorUserId == request.auth.uid
                    && request.resource.data.diff(resource.data).affectedKeys()
                        .hasOnly(['content', 'editedAt']);

      // Delete: author-only.
      allow delete: if isParent()
                    && belongsToFamily(resource.data.familyId)
                    && resource.data.authorUserId == request.auth.uid;
    }
```

- [ ] **Step 5: Re-run rules tests**

Run: `npm run test:rules`
Expected: PASS — all new `margin_notes` cases pass; existing tests unaffected.

- [ ] **Step 6: Commit**

```bash
git add firestore.rules firestore-rules/rules.test.ts
git commit -m "feat(marginalia): security rules for margin_notes with visibility denorm check"
```

- [ ] **Step 7: Deploy rules to Firebase**

Run: `firebase deploy --only firestore:rules`
Expected: Deploy succeeds. Confirm in Firebase console that the `margin_notes` rule block is live.

---

## Task 9: Cloud Function — visibility cascade

**Files:**
- Modify: `functions/index.js`

- [ ] **Step 1: Read existing patterns**

Open `functions/index.js` and locate `reEnrichJournalEntry` (around line 9655) — it's a v2 `onDocumentUpdated` trigger on the same `journal_entries/{entryId}` document we're targeting. Match its style exactly (v2 API, event-based signature, `event.data.before/after`, `event.params.entryId`).

- [ ] **Step 2: Add the cascade trigger**

Append to `functions/index.js` (after the last export). This uses v2 `onDocumentUpdated` to match the existing codebase style:

```js
// ================================================================
// cascadeMarginNoteVisibility — onDocumentUpdated trigger
//
// When a journal entry's visibility changes (visibleToUserIds or
// sharedWithUserIds), fan the new values out onto every margin note
// attached to that entry. Runs a no-op when the arrays are unchanged,
// so metadata-only updates (text edits, re-enrichment, etc.) don't
// trigger writes.
// ================================================================
exports.cascadeMarginNoteVisibility = onDocumentUpdated(
    {
      document: "journal_entries/{entryId}",
      region: "us-central1",
      memory: "256MiB",
      timeoutSeconds: 60,
    },
    async (event) => {
      const logger = require("firebase-functions/logger");
      const before = event.data.before.data() || {};
      const after = event.data.after.data() || {};
      const entryId = event.params.entryId;

      const sameArray = (a, b) => {
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        if (a.length !== b.length) return false;
        const sa = [...a].sort();
        const sb = [...b].sort();
        return sa.every((v, i) => v === sb[i]);
      };

      const visibilityUnchanged =
        sameArray(before.visibleToUserIds, after.visibleToUserIds) &&
        sameArray(before.sharedWithUserIds, after.sharedWithUserIds);
      if (visibilityUnchanged) return;

      const db = admin.firestore();
      const snap = await db
          .collection("margin_notes")
          .where("journalEntryId", "==", entryId)
          .get();
      if (snap.empty) {
        logger.info("cascadeMarginNoteVisibility: no notes for entry", {entryId});
        return;
      }

      // Firestore batches cap at 500 ops; a single entry has at most a
      // handful of margin notes in practice, so one batch is always safe.
      const batch = db.batch();
      snap.forEach((doc) => {
        batch.update(doc.ref, {
          visibleToUserIds: after.visibleToUserIds || [],
          sharedWithUserIds: after.sharedWithUserIds || [],
        });
      });
      await batch.commit();
      logger.info("cascadeMarginNoteVisibility: updated notes", {
        entryId,
        count: snap.size,
      });
    },
);
```

- [ ] **Step 3: Run functions tests**

Run: `cd functions && npm test && cd ..`
Expected: Existing function tests pass. If there are no tests for this trigger, that's OK — no new tests required (behavior covered by rules tests + hook integration).

- [ ] **Step 4: Commit**

```bash
git add functions/index.js
git commit -m "feat(marginalia): cascade journal entry visibility to margin notes"
```

- [ ] **Step 5: Deploy the function**

Run: `firebase deploy --only functions:cascadeMarginNoteVisibility`
Expected: Deploy succeeds; function shows in Firebase console.

---

## Task 10: End-to-end smoke verification

**Files:** No code changes — manual verification.

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Sign in as a parent user**

Use an account with `role: 'parent'` and an existing journal with entries.

- [ ] **Step 3: Add a margin note on a written entry**

- Navigate to `/journal`.
- Hover the margin next to any written entry. Expect the faint "note" trigger to appear.
- Click → composer appears → type `test scribble` → press Enter.
- Expect the note to render in the margin, above any tags.
- Expect no attribution (self-note on your own entry).

- [ ] **Step 4: Verify persistence**

Refresh the page. The note should still be visible.

- [ ] **Step 5: Edit the note**

Click the note body. Composer reopens with the content. Change it, press Enter. Confirm the new content renders.

- [ ] **Step 6: Confirm synthetic entries are not annotatable**

Find a synthesis or reflection entry on the page. Confirm no "note" trigger appears in its margin.

- [ ] **Step 7: (If two accounts available) Confirm observer flow**

- Switch to a second account that is in `visibleToUserIds` for one of the entries (i.e., the entry was shared with them).
- Add a margin note on that shared entry.
- Switch back to the first account. Confirm the observer note appears with the attribution `— X.` line.

- [ ] **Step 8: Run the full test suite**

Run: `npm run test:run`
Expected: PASS.

Run: `npm run test:rules` (requires Firebase emulator).
Expected: PASS.

- [ ] **Step 9: Final commit (if any UX polish needed from smoke test)**

If the smoke test surfaced a bug, fix it in a follow-up commit. Otherwise, no commit needed.

---

## Self-review checklist (for the implementer, before handoff)

- [ ] All new files TypeScript-compile with `npx tsc --noEmit`.
- [ ] All new and existing unit tests pass with `npm run test:run`.
- [ ] Rules tests pass with `npm run test:rules`.
- [ ] Rules are deployed (`firebase deploy --only firestore:rules`).
- [ ] Cascade function is deployed (`firebase deploy --only functions:cascadeMarginNoteVisibility`).
- [ ] Manual smoke test completed: can add, read, edit, delete a note on an annotatable entry; cannot add one on a synthesis entry.
- [ ] Spec's risks section reviewed: affordance legibility, initial-collision, cascade latency, synthetic-entry deferral — all still apply; no additional risks surfaced during implementation.

## Follow-ups (not in this plan)

- Observer re-using another person's note (reactions/emoji on notes).
- Annotating synthesis / reflection entries (requires a different keying strategy).
- E2E Playwright coverage — blocked by the outstanding authenticated-fixture work (`project_e2e_auth_fixture_needed`).
