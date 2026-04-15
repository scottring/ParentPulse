# Plan 3 — Unified Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the journal spread's "+ Add an entry" button to the existing CaptureSheet with a first-class visibility selector, add a "Just me" filter pill, show a lock glyph on private entries, and fix the synthesis-subject display-name lookup.

**Architecture:** Reuse the existing `CaptureSheet` component (lives at `src/components/capture/CaptureSheet.tsx`; already supports per-person sharing, media, and ask-about-this). The "+ Add an entry" button dispatches the existing `relish:open-capture` window event. The visibility selector inside the sheet gets promoted from a picker row to a required, defaulted choice. Spread components learn to look up display names for person subjects via a new `usePeopleMap()` hook. Writes continue to land in `journal_entries` — the Entry adapter already surfaces them. A later plan migrates the write path to the `entries` collection alongside the AI pipeline migration.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Firebase 12, Vitest 4.

**Spec reference:** `docs/superpowers/specs/2026-04-15-one-journal-design.md` — Section 3 (Capture). Carryover items in `~/.claude/projects/.../memory/project_plan_3_carryover.md`.

---

## File Structure

### New files

- `src/hooks/usePeopleMap.ts` — returns `Record<personId, Person>` indexed by `personId`. Small wrapper over `usePerson` (the hook that already loads family people) — cleaner consumption from deep components.
- `__tests__/hooks/usePeopleMap.test.ts`

### Modified files

- `src/components/journal-spread/EntryBlock.tsx` — `SynthesisPull` shows the real person name from `usePeopleMap`. Private entries (visible only to the author) render with a small lock glyph in the kicker.
- `src/components/journal-spread/FilterPills.tsx` — add a `'just-me'` variant.
- `src/app/page.tsx` (`SpreadHome`) — wire the `'just-me'` pill to a filter, wire "+ Add an entry" to `window.dispatchEvent(new Event('relish:open-capture'))`, pass the current-user uid down so the EntryBlock can decide private-entry rendering.
- `src/components/capture/CaptureSheet.tsx` — promote the visibility selector to a required step in the composing view; default to last-used choice (localStorage); three presets: *Just me* / *[spouse name] and me* / *Everyone in the family*. Existing per-person share list becomes an "advanced" toggle inside the Everyone preset.

### Not touched in this plan

- Writes still go to `journal_entries` via `useJournal.createEntry`. Migrating to `entries` comes with Plan 4 when the AI pipeline migrates.
- Ask-about-this chat (the `chatting` state inside CaptureSheet) is preserved as-is — it already works.
- `/journal` route and the floating-action button on it stay functional.
- Retirement of old routes is Plan 6.

---

## Task 1: `usePeopleMap` hook

**Files:**
- Create: `src/hooks/usePeopleMap.ts`
- Create: `__tests__/hooks/usePeopleMap.test.ts`

The spread currently renders `about p-liam` instead of `about Liam` because `SynthesisPull` only has the `personId` string. Give it a way to resolve to a display name.

- [ ] **Step 1: Failing test**

```typescript
// __tests__/hooks/usePeopleMap.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePeopleMap } from '@/hooks/usePeopleMap';

vi.mock('@/hooks/usePerson', () => ({
  usePerson: () => ({
    people: [
      { personId: 'p1', name: 'Liam' },
      { personId: 'p2', name: 'Mia' },
    ],
    loading: false,
  }),
}));

describe('usePeopleMap', () => {
  it('indexes people by personId', async () => {
    const { result } = renderHook(() => usePeopleMap());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.byId['p1'].name).toBe('Liam');
    expect(result.current.byId['p2'].name).toBe('Mia');
  });

  it('returns a display-name helper that falls back to personId', async () => {
    const { result } = renderHook(() => usePeopleMap());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.nameOf('p1')).toBe('Liam');
    expect(result.current.nameOf('unknown')).toBe('unknown');
  });
});
```

- [ ] **Step 2: Confirm fail**

Run: `npx vitest run __tests__/hooks/usePeopleMap.test.ts` — expect module-not-found.

- [ ] **Step 3: Implement**

```typescript
// src/hooks/usePeopleMap.ts
'use client';

import { useMemo } from 'react';
import { usePerson } from '@/hooks/usePerson';
import type { Person } from '@/types/person-manual';

export interface PeopleMap {
  byId: Record<string, Person>;
  nameOf: (personId: string) => string;
  loading: boolean;
}

export function usePeopleMap(): PeopleMap {
  const { people, loading } = usePerson();

  const byId = useMemo(() => {
    const map: Record<string, Person> = {};
    for (const p of people ?? []) {
      map[p.personId] = p;
    }
    return map;
  }, [people]);

  const nameOf = useMemo(
    () => (personId: string) => byId[personId]?.name ?? personId,
    [byId]
  );

  return { byId, nameOf, loading };
}
```

- [ ] **Step 4: Pass + commit**

Run: `npx vitest run __tests__/hooks/usePeopleMap.test.ts` — expect pass.

```bash
git add src/hooks/usePeopleMap.ts __tests__/hooks/usePeopleMap.test.ts
git commit -m "feat(capture): usePeopleMap hook for personId → name lookup"
```

---

## Task 2: Display-name lookup in SynthesisPull (and beyond)

**Files:**
- Modify: `src/components/journal-spread/EntryBlock.tsx`
- Modify: `__tests__/components/journal-spread/EntryBlock.test.tsx`

`SynthesisPull` currently prints `about ${subject.personId}`. It should print `about ${name}`. The cleanest shape: accept an optional `nameOf` function as a prop on `EntryBlock`, thread it through to `SynthesisPull`. Consumers that don't pass one get the existing `personId` fallback — no breaking change.

- [ ] **Step 1: Failing test — EntryBlock passes nameOf to SynthesisPull**

Append to `__tests__/components/journal-spread/EntryBlock.test.tsx`:

```tsx
it('renders the resolved person name for synthesis pull-quote when nameOf is provided', () => {
  const synth: Entry = {
    ...baseEntry,
    id: 's1',
    type: 'synthesis',
    author: { kind: 'system' },
    subjects: [{ kind: 'person', personId: 'p-liam' }],
    content: 'Short synthesis.',
  };
  render(<EntryBlock entry={synth} nameOf={(id) => (id === 'p-liam' ? 'Liam' : id)} />);
  expect(screen.getByText(/about Liam/i)).toBeInTheDocument();
  expect(screen.queryByText(/p-liam/)).not.toBeInTheDocument();
});

it('falls back to personId when nameOf is not provided', () => {
  const synth: Entry = {
    ...baseEntry,
    id: 's2',
    type: 'synthesis',
    author: { kind: 'system' },
    subjects: [{ kind: 'person', personId: 'p-liam' }],
    content: 'Short.',
  };
  render(<EntryBlock entry={synth} />);
  expect(screen.getByText(/about p-liam/i)).toBeInTheDocument();
});
```

(The existing `baseEntry` fixture at the top of the file should work; if not, define one local to these tests.)

- [ ] **Step 2: Confirm fail**

Run: `npx vitest run __tests__/components/journal-spread/EntryBlock.test.tsx` — expect the new tests to fail.

- [ ] **Step 3: Thread `nameOf` prop through EntryBlock**

In `src/components/journal-spread/EntryBlock.tsx`:

- Change the top-level signature: `export function EntryBlock({ entry, nameOf }: { entry: Entry; nameOf?: (personId: string) => string })`.
- Pass `nameOf` into `SynthesisPull` when dispatching for person-subject syntheses:

```tsx
return <SynthesisPull entry={entry} nameOf={nameOf} />;
```

- Update `SynthesisPull` to accept `nameOf` and use it:

```tsx
function SynthesisPull({ entry, nameOf }: { entry: Entry; nameOf?: (personId: string) => string }) {
  // ... existing state ...
  const subject = entry.subjects[0];
  const subjectName =
    subject?.kind === 'person'
      ? (nameOf ? nameOf(subject.personId) : subject.personId)
      : 'them';
  const subjectLabel = `about ${subjectName}`;
  // ... rest unchanged ...
}
```

- [ ] **Step 4: Pass + commit**

Run: `npx vitest run __tests__/components/journal-spread/` — all green.

```bash
git add src/components/journal-spread/EntryBlock.tsx __tests__/components/journal-spread/EntryBlock.test.tsx
git commit -m "feat(capture): resolve person display names in synthesis pull-quote"
```

---

## Task 3: Consume `usePeopleMap` in SpreadHome and pass nameOf through

**Files:**
- Modify: `src/components/journal-spread/JournalSpread.tsx`
- Modify: `src/app/page.tsx`

Thread `nameOf` from `SpreadHome` → `JournalSpread` → each `EntryBlock`.

- [ ] **Step 1: Add `nameOf` prop to `JournalSpreadProps`**

In `JournalSpread.tsx`:

```tsx
export interface JournalSpreadProps {
  // ... existing props ...
  nameOf?: (personId: string) => string;
}
```

Thread it down to every `<EntryBlock entry={e} nameOf={nameOf} />` call.

- [ ] **Step 2: Update `SpreadHome` in `src/app/page.tsx`**

```tsx
import { usePeopleMap } from '@/hooks/usePeopleMap';

// inside SpreadHome, after useDashboard:
const { nameOf } = usePeopleMap();

// pass it to JournalSpread:
<JournalSpread
  /* ... existing props ... */
  nameOf={nameOf}
/>
```

- [ ] **Step 3: Run existing journal-spread tests**

Run: `npx vitest run __tests__/components/journal-spread/`
Expected: all green (the new `nameOf` prop is optional; existing tests don't pass it, which exercises the fallback path).

- [ ] **Step 4: Commit**

```bash
git add src/components/journal-spread/JournalSpread.tsx src/app/page.tsx
git commit -m "feat(capture): thread nameOf through JournalSpread from SpreadHome"
```

---

## Task 4: "Just me" filter pill

**Files:**
- Modify: `src/components/journal-spread/FilterPills.tsx`
- Modify: `__tests__/components/journal-spread/FilterPills.test.tsx`
- Modify: `src/app/page.tsx` (wire the filter)

Add a new pill value `{ kind: 'just-me' }`. Position it as the first pill on the row, right after "Everyone".

- [ ] **Step 1: Update failing tests**

Append to `__tests__/components/journal-spread/FilterPills.test.tsx`:

```tsx
it('renders a "Just me" pill between Everyone and the people pills', () => {
  render(
    <FilterPills
      people={[{ id: 'p1', name: 'Sarah' }]}
      active={{ kind: 'everyone' }}
      onChange={() => {}}
    />
  );
  expect(screen.getByText(/just me/i)).toBeInTheDocument();
});

it('fires onChange with kind "just-me" when the pill is clicked', () => {
  const onChange = vi.fn();
  render(
    <FilterPills
      people={[]}
      active={{ kind: 'everyone' }}
      onChange={onChange}
    />
  );
  fireEvent.click(screen.getByText(/just me/i));
  expect(onChange).toHaveBeenCalledWith({ kind: 'just-me' });
});
```

- [ ] **Step 2: Confirm fail**

Run: `npx vitest run __tests__/components/journal-spread/FilterPills.test.tsx`

- [ ] **Step 3: Update `FilterSelection` and the pill row**

In `src/components/journal-spread/FilterPills.tsx`:

```tsx
export type FilterSelection =
  | { kind: 'everyone' }
  | { kind: 'just-me' }
  | { kind: 'person'; personId: string }
  | { kind: 'syntheses' };
```

Insert a pill between Everyone and the people pills:

```tsx
const pills: Array<{ label: string; sel: FilterSelection }> = [
  { label: 'Everyone', sel: { kind: 'everyone' } },
  { label: 'Just me',  sel: { kind: 'just-me' } },
  ...people.map((p) => ({ label: p.name, sel: { kind: 'person' as const, personId: p.id } })),
  { label: 'Syntheses', sel: { kind: 'syntheses' } },
];
```

- [ ] **Step 4: Wire the filter in `SpreadHome` (`src/app/page.tsx`)**

In the `entryFilter` useMemo, handle the new kind:

```tsx
const entryFilter: EntryFilter = useMemo(() => {
  if (filterSel.kind === 'person')    return { subjectPersonIds: [filterSel.personId] };
  if (filterSel.kind === 'syntheses') return { types: ['synthesis'] };
  if (filterSel.kind === 'just-me')   return { onlyPrivateToCurrentUser: true };
  return {};
}, [filterSel]);
```

`onlyPrivateToCurrentUser` is a new `EntryFilter` flag (see Step 5 below).

- [ ] **Step 5: Add the filter to `EntryFilter` + `applyFilter`**

In `src/types/entry.ts`, add:

```typescript
  // When true, return only entries whose visibleToUserIds contains
  // exactly the current user (private entries). Requires the consumer
  // to know who the current user is.
  onlyPrivateToCurrentUser?: boolean;
```

In `src/lib/entries/query.ts`'s `applyFilter`:

Add near the top of the function (before the tag filters):

```typescript
  if (filter.onlyPrivateToCurrentUser) {
    // caller passes the uid via a separate filter field below, or we
    // rely on fetchEntries-level threading. Simplest: expose a
    // `currentUserIdForFilter` alongside — set by fetchEntries.
    const uid = (filter as EntryFilter & { currentUserIdForFilter?: string })
      .currentUserIdForFilter;
    if (uid) {
      out = out.filter(
        (e) =>
          e.visibleToUserIds.length === 1 && e.visibleToUserIds[0] === uid
      );
    }
  }
```

In `fetchEntries` (same file), after adapting entries and before calling `applyFilter`, set the side-channel:

```typescript
  const effective: EntryFilter & { currentUserIdForFilter?: string } = {
    ...filter,
    currentUserIdForFilter: currentUserId,
  };
  return applyFilter(entries, effective);
```

(This is intentionally a tiny private field rather than a public filter prop — consumers shouldn't need to pass the uid twice.)

- [ ] **Step 6: Run + commit**

Run: `npx vitest run __tests__/components/journal-spread/ __tests__/lib/entries/ __tests__/hooks/`
Expected: all green.

```bash
git add src/components/journal-spread/FilterPills.tsx __tests__/components/journal-spread/FilterPills.test.tsx src/app/page.tsx src/types/entry.ts src/lib/entries/query.ts
git commit -m "feat(capture): Just me filter pill with private-entry filter"
```

---

## Task 5: Lock glyph on private entries

**Files:**
- Modify: `src/components/journal-spread/EntryBlock.tsx`
- Modify: `__tests__/components/journal-spread/EntryBlock.test.tsx`

An entry is "private" when `visibleToUserIds.length === 1` and that one id equals the current user. Show a small 🔒 glyph in the kicker for the variants that have kickers (`ProseEntry`, `ActivityLine`, and the AI variants don't need it — they're system-authored). Keep it understated: Unicode character, muted color, same size as the kicker text.

- [ ] **Step 1: Failing test**

Append to `__tests__/components/journal-spread/EntryBlock.test.tsx`:

```tsx
it('shows a lock glyph when the entry is private to the current user', () => {
  const privateEntry: Entry = {
    ...baseEntry,
    type: 'written',
    visibleToUserIds: ['u1'],
  };
  render(<EntryBlock entry={privateEntry} currentUserId="u1" />);
  expect(screen.getByText(/🔒|private/i)).toBeInTheDocument();
});

it('does not show the lock glyph when the entry is shared', () => {
  const sharedEntry: Entry = {
    ...baseEntry,
    type: 'written',
    visibleToUserIds: ['u1', 'u2'],
  };
  render(<EntryBlock entry={sharedEntry} currentUserId="u1" />);
  expect(screen.queryByText('🔒')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Implement**

Add `currentUserId?: string` prop to `EntryBlock` and `ProseEntry`. In `ProseEntry`, compute:

```tsx
const isPrivate =
  currentUserId !== undefined &&
  entry.visibleToUserIds.length === 1 &&
  entry.visibleToUserIds[0] === currentUserId;
```

Render a small locked indicator in the kicker:

```tsx
<div className="entry-meta">
  {kicker}
  {isPrivate && <span className="lock" aria-label="Private">🔒</span>}
</div>
```

Add styles:

```css
.lock {
  margin-left: 6px;
  opacity: 0.55;
  font-size: 10px;
}
```

- [ ] **Step 3: Thread currentUserId through JournalSpread → EntryBlock**

`JournalSpread` accepts `currentUserId?: string`. `SpreadHome` passes `user?.userId`.

- [ ] **Step 4: Pass + commit**

Run: `npx vitest run __tests__/components/journal-spread/`

```bash
git add src/components/journal-spread/ __tests__/components/journal-spread/ src/app/page.tsx
git commit -m "feat(capture): lock glyph on private entries in the spread"
```

---

## Task 6: Wire "+ Add an entry" to open CaptureSheet

**Files:**
- Modify: `src/components/journal-spread/JournalSpread.tsx`

Currently `onCapture` in `SpreadHome` does `window.location.href = '/journal'` — wrong surface. `CaptureSheet` listens for a `relish:open-capture` window event (existing pattern in the codebase). Dispatch that instead.

- [ ] **Step 1: Update `SpreadHome` onCapture in `src/app/page.tsx`**

Replace:

```tsx
onCapture={() => {
  window.location.href = '/journal';
}}
```

with:

```tsx
onCapture={() => {
  window.dispatchEvent(new Event('relish:open-capture'));
}}
```

- [ ] **Step 2: Verify `CaptureSheet` is mounted on `/`**

`CaptureSheet` is rendered inside `Navigation` (see `src/components/layout/Navigation.tsx`). Confirm `SpreadHome` (inside `src/app/page.tsx`) renders `<Navigation />` — if not, add it so the sheet is mounted on the `/` route. Check the current state of `src/app/page.tsx` and the layout; if layout.tsx already wraps routes in Navigation, nothing to do. Otherwise include `<Navigation />` inside `SpreadHome`.

Run: `grep -n "Navigation" src/app/layout.tsx src/app/page.tsx`

If Navigation is in `layout.tsx`, no change needed. If not, import and render `<Navigation />` inside `SpreadHome` above the `<JournalSpread>` call (or wherever is idiomatic). Preserve existing signed-out behavior.

- [ ] **Step 3: Smoke test**

Start the dev server, sign in, click `+ Add an entry`. Expect the CaptureSheet to slide up. If it doesn't, inspect the console for missing event listener — likely means Navigation isn't mounted on `/`.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(capture): wire + Add an entry to open CaptureSheet"
```

---

## Task 7: Promote visibility selector in CaptureSheet

**Files:**
- Modify: `src/components/capture/CaptureSheet.tsx`

Today, visibility is hidden inside a picker toggle (`openPicker === 'privacy'`). Promote it to a visible, required choice — three labelled presets at the top of the composing view:

- **Just me** — sets `sharedWith = []`
- **[Spouse name] and me** — sets `sharedWith = [spouseUid]` (if there's exactly one linked non-self person); preset hidden if no spouse yet
- **Everyone in the family** — sets `sharedWith = <all linked non-self userIds>`

Under the three presets, keep an "Adjust who can see this →" disclosure that expands to the current per-person list (the existing UI, just hidden by default).

Also persist the last-used choice in `localStorage` under key `relish:capture:last-visibility` and restore it when the sheet opens.

- [ ] **Step 1: Read the current CaptureSheet privacy picker**

Run: `grep -n "privacy\|sharedWith" src/components/capture/CaptureSheet.tsx | head -20`

Identify where `sharedWith` is derived and rendered. The composing state is lines ~75–end; look for the toolbar picker.

- [ ] **Step 2: Add three preset buttons**

Inside the composing view, above the textarea (or immediately below, per the existing layout), insert a three-button row:

```tsx
<div className="visibility-presets">
  <button type="button" className={selectedPreset === 'just-me' ? 'active' : ''}
          onClick={() => applyVisibilityPreset('just-me')}>
    Just me
  </button>
  {spouse && (
    <button type="button" className={selectedPreset === 'spouse' ? 'active' : ''}
            onClick={() => applyVisibilityPreset('spouse')}>
      {spouse.name} and me
    </button>
  )}
  <button type="button" className={selectedPreset === 'family' ? 'active' : ''}
          onClick={() => applyVisibilityPreset('family')}>
    Everyone
  </button>
</div>
```

Where `spouse` is the first `shareCandidates` entry (they're all non-self family members with linked accounts), or `null` if none exist. `applyVisibilityPreset` updates `sharedWith` to the matching array and persists to localStorage.

```tsx
function applyVisibilityPreset(preset: 'just-me' | 'spouse' | 'family') {
  setSelectedPreset(preset);
  if (preset === 'just-me') setSharedWith([]);
  if (preset === 'spouse' && spouse)
    setSharedWith([spouse.userId]);
  if (preset === 'family')
    setSharedWith(shareCandidates.map((c) => c.userId));
  localStorage.setItem('relish:capture:last-visibility', preset);
}
```

- [ ] **Step 3: Restore last-used preset on sheet open**

In the existing `useEffect` that focuses the textarea when entering `composing`, also restore the preset:

```tsx
useEffect(() => {
  if (state !== 'composing') return;
  const stored = localStorage.getItem('relish:capture:last-visibility');
  const preset = stored === 'family' ? 'family' : stored === 'spouse' ? 'spouse' : 'just-me';
  applyVisibilityPreset(preset);
  const t = setTimeout(() => textareaRef.current?.focus(), 150);
  return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [state]);
```

- [ ] **Step 4: Demote the per-person picker to a disclosure**

The existing `openPicker === 'privacy'` picker row stays; just make it a "Adjust who can see this →" link/button below the three preset row. Clicking it opens the existing checkbox list.

- [ ] **Step 5: Styles**

```css
.visibility-presets {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}
.visibility-presets button {
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 16px;
  border: 1px solid #8a6f4a;
  color: #5a4628;
  background: transparent;
  cursor: pointer;
  font-family: -apple-system, sans-serif;
}
.visibility-presets button.active {
  background: #3d2f1f;
  color: #f5ecd8;
  border-color: #3d2f1f;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/capture/CaptureSheet.tsx
git commit -m "feat(capture): promote visibility selector to first-class presets"
```

---

## Task 8: Full-suite green check

- [ ] **Step 1: Run the full test suite**

Run: `npm run test:run`
Expected: all green.

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules | head -20`
Expected: no errors.

- [ ] **Step 3: Branch summary**

Run: `git log --oneline main..HEAD`
Expected: 7 commits matching tasks 1–7.

If anything is red, fix inline and re-commit.

---

## Done state

- "+ Add an entry" on the spread opens the CaptureSheet (not a redirect to `/journal`).
- The CaptureSheet leads with three visibility presets (Just me / [spouse] and me / Everyone) as the primary choice. Persists last choice per user.
- A "Just me" filter pill on the spread filters to private entries only.
- Private entries show a small 🔒 in their kicker.
- Synthesis pull-quotes render `about Liam` (real name) instead of `about p-liam`.
- Writes continue to land in `journal_entries` — the adapter surfaces them to the spread. Plan 4 will move writes to `entries`.
- `/journal` route, media upload, ask-about-this chat inside the CaptureSheet — all unchanged.

Plan 4 (AI pipeline migration) can now migrate `synthesizeManualContent`, workbook activity seeding, and family synthesis to write into `entries` directly, and switch the read path fully to the new collection.
