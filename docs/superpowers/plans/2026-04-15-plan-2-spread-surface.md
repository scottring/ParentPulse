# Plan 2 — The Spread Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the library-desk home with a single bound-journal spread at `/` that reads from `useEntries` (Plan 1) and renders entries as colored article-blocks across two facing pages, with filter pills, horizontal flip, and a + Add button. Ship behind a feature flag.

**Architecture:** Two sequential moves. First, fix the two carryover issues from Plan 1's review (visibility honoring + rule-compatible scoped queries) so the read side is safe to consume. Then build the spread as a small component family (`JournalSpread`, `EntryBlock`, `MastheadRow`, `FilterPills`, `FlipNav`) sitting on a real-photography frame layer. The spread route is gated behind `NEXT_PUBLIC_JOURNAL_SPREAD=1` so the existing home stays default until assets and acceptance are confirmed.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Firebase 12, Vitest 4, Playwright 1.57.

**Spec reference:** `docs/superpowers/specs/2026-04-15-one-journal-design.md` — Sections 1, 2, 7. Carryover from Plan 1 review captured in `~/.claude/projects/.../memory/project_plan_2_carryover.md`.

---

## File Structure

### New files

- `src/components/journal-spread/JournalSpread.tsx` — outer bound-book frame; composes left/right pages and pagination state.
- `src/components/journal-spread/EntryBlock.tsx` — type-aware colored block; renders one entry.
- `src/components/journal-spread/MastheadRow.tsx` — avatars + family/volume/date.
- `src/components/journal-spread/FilterPills.tsx` — Everyone / per-person / Syntheses pills.
- `src/components/journal-spread/FlipNav.tsx` — ‹ › arrows + keyboard support.
- `src/components/journal-spread/usePageWindow.ts` — hook that takes the full filtered entry list and returns the current spread's slice + flip handlers.
- `src/components/journal-spread/assets.ts` — asset path constants + availability check (honest flat fallback).
- `src/components/journal-spread/types.ts` — shared local types (e.g., `SpreadPage`).
- `public/images/book/README.md` — required-asset manifest (filenames, dimensions, sources).
- `__tests__/components/journal-spread/EntryBlock.test.tsx`
- `__tests__/components/journal-spread/MastheadRow.test.tsx`
- `__tests__/components/journal-spread/FilterPills.test.tsx`
- `__tests__/components/journal-spread/usePageWindow.test.ts`
- `__tests__/components/journal-spread/JournalSpread.test.tsx`
- `__e2e__/journal-spread.spec.ts` — Playwright happy-path.

### Modified files

- `src/lib/entries/adapter.ts` — `contributionToEntries` honors `answerVisibility`.
- `__tests__/lib/entries/adapter.test.ts` — new tests for visibility paths.
- `src/lib/entries/query.ts` — `firestoreEntrySource.contributions` uses split-query (own-drafts ∪ family-completes); journal/growth queries scoped to `archivedAt == null`. `useEntries`/`fetchEntries` accepts a `currentUserId` so the source can compose rule-compatible queries.
- `src/types/entry.ts` — `EntryFilter` adds optional `currentUserId` if needed (or pass alongside).
- `src/hooks/useEntries.ts` — pass `currentUserId` through.
- `__tests__/lib/entries/query.test.ts` — test the new source query shape with stubs.
- `__tests__/hooks/useEntries.test.ts` — test pass-through.
- `src/app/page.tsx` — flag-gated branch: render `<JournalSpread>` when `NEXT_PUBLIC_JOURNAL_SPREAD === '1'` and user is signed in; otherwise fall back to the existing library-desk home.

### Not touched in this plan

- No retirement of `/family-manual`, `/workbook`, `/relish`, etc. They keep working in parallel. Plan 6 retires them.
- No new writes to the `entries` collection. Capture still writes to `journal_entries` via the existing capture sheet — Plan 3 unifies writes.
- No AI pipeline changes. Plan 4.
- No onboarding changes. Plan 5.

---

## Feature flag

A single env var: `NEXT_PUBLIC_JOURNAL_SPREAD`.
- `'1'` → spread renders at `/` for signed-in users; signed-out fallback unchanged.
- Anything else (default) → existing library-desk home.

The flag is read at module level in `src/app/page.tsx`. Toggle in `.env.local` for development. Production flips when the spread is ready.

---

## Asset policy (Section 7)

The spread component MUST gracefully degrade when photographic assets are missing.

- `src/components/journal-spread/assets.ts` exports constants pointing at `/images/book/cover.jpg`, `/images/book/paper-left.jpg`, etc., plus `assetsAvailable: boolean` (a build-time check using `fs.existsSync` on the public path inside `assets.ts` is **not allowed** in the App Router; use `import.meta` won't help either — instead, gate by checking `process.env.NEXT_PUBLIC_BOOK_ASSETS_PRESENT === '1'`, set manually after sourcing assets).
- When `assetsAvailable === false`, components render honest flat cream backgrounds. **Never CSS-faked leather/paper textures.**
- `public/images/book/README.md` documents the required asset manifest so a designer/photographer can produce them independently.

---

## Task 1: Honor `answerVisibility` in `contributionToEntries`

**Files:**
- Modify: `src/lib/entries/adapter.ts`
- Modify: `__tests__/lib/entries/adapter.test.ts`

The adapter currently sets `visibleToUserIds: [c.contributorId]` on every prompt and reflection emitted from a contribution. That under-shares "visible" answers (the default) — they should match the contribution's own visibility surface (contributor + family members when `status === 'complete'`).

New behavior:
- For each `(sectionId, questionId)` in `c.answers`, look up `c.answerVisibility?.[sectionId]?.[questionId]`. Treat missing as `'visible'`.
- If visibility is `'private'` → emit prompt+reflection with `visibleToUserIds: [c.contributorId]` (current behavior).
- If visibility is `'visible'` AND `c.status === 'complete'` → emit with a family-wide audience flag instead of a hard list. Since we don't have the family roster in the adapter (pure function, no I/O), encode this by setting `visibleToUserIds: [c.contributorId]` AND adding a sentinel to `tags: ['_visibility:family']`. The query layer will resolve this sentinel against the family roster and rewrite `visibleToUserIds` before returning entries.
- If visibility is `'visible'` AND `c.status === 'draft'` → behave as private (drafts only readable by contributor) — unchanged semantically.

The sentinel approach keeps the adapter pure. Resolution happens in `query.ts` where the family roster is in scope.

- [ ] **Step 1: Add failing tests for visibility paths**

Append to `__tests__/lib/entries/adapter.test.ts`:

```typescript
describe('contributionToEntries — answerVisibility', () => {
  const baseContribution: Contribution = {
    contributionId: 'c1',
    manualId: 'm1',
    personId: 'p-liam',
    familyId: 'f1',
    contributorId: 'u1',
    contributorName: 'Scott',
    perspectiveType: 'observer',
    relationshipToSubject: 'parent',
    topicCategory: 'triggers',
    answers: {
      'sec.private_q': 'private content',
      'sec.public_q': 'public content',
    },
    answerVisibility: {
      sec: {
        private_q: 'private',
        public_q: 'visible',
      },
    },
    status: 'complete',
    createdAt: Timestamp.fromMillis(1_700_000_000_000),
    updatedAt: Timestamp.fromMillis(1_700_000_000_000),
  } as unknown as Contribution;

  it('private answers stay contributor-only', () => {
    const entries = contributionToEntries(baseContribution);
    const reflection = entries.find(
      (e) => e.type === 'reflection' && e.content === 'private content'
    );
    expect(reflection?.visibleToUserIds).toEqual(['u1']);
    expect(reflection?.tags).not.toContain('_visibility:family');
  });

  it('visible answers in completed contributions tag _visibility:family', () => {
    const entries = contributionToEntries(baseContribution);
    const reflection = entries.find(
      (e) => e.type === 'reflection' && e.content === 'public content'
    );
    expect(reflection?.tags).toContain('_visibility:family');
  });

  it('visible answers in DRAFT contributions stay contributor-only', () => {
    const draft: Contribution = { ...baseContribution, status: 'draft' };
    const entries = contributionToEntries(draft);
    const reflection = entries.find(
      (e) => e.type === 'reflection' && e.content === 'public content'
    );
    expect(reflection?.tags).not.toContain('_visibility:family');
    expect(reflection?.visibleToUserIds).toEqual(['u1']);
  });

  it('missing answerVisibility defaults to visible', () => {
    const c: Contribution = { ...baseContribution, answerVisibility: undefined };
    const entries = contributionToEntries(c);
    for (const e of entries.filter((x) => x.type === 'reflection')) {
      expect(e.tags).toContain('_visibility:family');
    }
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

Run: `npx vitest run __tests__/lib/entries/adapter.test.ts`
Expected: the four new tests fail.

- [ ] **Step 3: Update `contributionToEntries`**

In `src/lib/entries/adapter.ts`, replace the existing `tags` and `visibleToUserIds` derivation inside the loop with:

```typescript
    const [sectionId, questionId] = questionKey.split('.');
    const promptId = `${c.contributionId}:${questionKey}:prompt`;
    const reflectionId = `${c.contributionId}:${questionKey}:reflection`;

    const subjects: EntrySubject[] = [{ kind: 'person', personId: c.personId }];

    // Visibility resolution. Pure function — emit a sentinel tag for
    // visible+complete answers; the query layer resolves the sentinel
    // against the family roster.
    const answerVisibility =
      c.answerVisibility?.[sectionId]?.[questionId] ?? 'visible';
    const isFamilyVisible =
      answerVisibility === 'visible' && c.status === 'complete';

    const baseTags: string[] = [];
    if (questionKey.includes('.')) baseTags.push(sectionId);
    if (isFamilyVisible) baseTags.push('_visibility:family');

    const visibleToUserIds = [c.contributorId];
```

(Keep the rest of the per-iteration body the same — replace the existing `tags`/`visibleToUserIds` lines with the new derivation. Both the prompt and reflection objects continue to use the same `baseTags` and `visibleToUserIds`.)

Note: ensure both pushed objects use `tags: baseTags` (not the old `tags`).

- [ ] **Step 4: Run tests to confirm pass**

Run: `npx vitest run __tests__/lib/entries/adapter.test.ts`
Expected: all 22+ tests pass (existing 18 + 4 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/entries/adapter.ts __tests__/lib/entries/adapter.test.ts
git commit -m "fix(entries): contribution adapter honors answerVisibility"
```

---

## Task 2: Rule-compatible scoped queries in `firestoreEntrySource`

**Files:**
- Modify: `src/lib/entries/query.ts`
- Modify: `__tests__/lib/entries/query.test.ts`

The current `firestoreEntrySource.contributions(familyId)` does a single `where('familyId', '==', familyId)` query. Existing security rules require either `contributorId == me` OR `status == 'complete'`. An unscoped list will be denied at scale.

Fix:
- `EntrySource` and `fetchEntries` both accept a new arg `currentUserId: string`.
- `firestoreEntrySource.contributions(familyId, currentUserId)` issues TWO queries in parallel — `(familyId == X AND contributorId == me)` for own drafts, and `(familyId == X AND status == 'complete')` for family completes — then dedupes by `contributionId`.
- `firestoreEntrySource.journalEntries`, `personManuals`, `growthItems` are unchanged but accept the second arg for signature parity.
- Family-roster resolution: also resolve the `_visibility:family` sentinel by fetching the family's user list once and rewriting `visibleToUserIds` for tagged entries before returning. Use the `families` collection (or whatever roster the existing app reads from — confirm in `useDashboard` or similar). If the sentinel is present, replace `visibleToUserIds` with the full family member uid list and strip the sentinel tag.

- [ ] **Step 1: Inspect how the existing app reads family rosters**

Run: `grep -rn "familyId\|memberUids\|familyMembers" src/hooks src/lib | grep -v "test\|adapter\|entries" | head -20`

Identify which collection holds the membership list. Most likely: `users` documents have `familyId`, or `families/{id}` has `memberUserIds[]`. Confirm before writing the helper.

- [ ] **Step 2: Add failing tests for split contribution query**

Append to `__tests__/lib/entries/query.test.ts`:

```typescript
import { fetchEntries, type EntrySource } from '@/lib/entries/query';

describe('fetchEntries — currentUserId pass-through', () => {
  it('passes currentUserId to every source method', async () => {
    const source: EntrySource = {
      journalEntries: vi.fn().mockResolvedValue([]),
      contributions: vi.fn().mockResolvedValue([]),
      personManuals: vi.fn().mockResolvedValue([]),
      growthItems: vi.fn().mockResolvedValue([]),
    };
    await fetchEntries('f1', {}, source, 'u1');
    expect(source.journalEntries).toHaveBeenCalledWith('f1', 'u1');
    expect(source.contributions).toHaveBeenCalledWith('f1', 'u1');
    expect(source.personManuals).toHaveBeenCalledWith('f1', 'u1');
    expect(source.growthItems).toHaveBeenCalledWith('f1', 'u1');
  });
});

describe('fetchEntries — _visibility:family sentinel resolution', () => {
  it('replaces visibleToUserIds with family roster when sentinel present', async () => {
    const t = Timestamp.fromMillis(1_700_000_000_000);
    const source: EntrySource = {
      journalEntries: vi.fn().mockResolvedValue([]),
      contributions: vi.fn().mockResolvedValue([
        {
          contributionId: 'c1',
          manualId: 'm1',
          personId: 'p1',
          familyId: 'f1',
          contributorId: 'u1',
          contributorName: 'A',
          perspectiveType: 'observer',
          relationshipToSubject: 'parent',
          topicCategory: 'triggers',
          answers: { 'sec.q': 'visible answer' },
          answerVisibility: undefined,
          status: 'complete',
          createdAt: t,
          updatedAt: t,
        } as unknown as Contribution,
      ]),
      personManuals: vi.fn().mockResolvedValue([]),
      growthItems: vi.fn().mockResolvedValue([]),
    };

    const familyRoster = ['u1', 'u2', 'u3'];
    const entries = await fetchEntries(
      'f1',
      {},
      source,
      'u1',
      async () => familyRoster
    );

    const reflection = entries.find((e) => e.type === 'reflection');
    expect(reflection?.visibleToUserIds).toEqual(familyRoster);
    expect(reflection?.tags).not.toContain('_visibility:family');
  });

  it('keeps contributor-only visibility when no sentinel', async () => {
    const t = Timestamp.fromMillis(1_700_000_000_000);
    const source: EntrySource = {
      journalEntries: vi.fn().mockResolvedValue([]),
      contributions: vi.fn().mockResolvedValue([
        {
          contributionId: 'c2',
          manualId: 'm1',
          personId: 'p1',
          familyId: 'f1',
          contributorId: 'u1',
          contributorName: 'A',
          perspectiveType: 'observer',
          relationshipToSubject: 'parent',
          topicCategory: 'triggers',
          answers: { 'sec.q': 'private answer' },
          answerVisibility: { sec: { q: 'private' } },
          status: 'complete',
          createdAt: t,
          updatedAt: t,
        } as unknown as Contribution,
      ]),
      personManuals: vi.fn().mockResolvedValue([]),
      growthItems: vi.fn().mockResolvedValue([]),
    };

    const entries = await fetchEntries('f1', {}, source, 'u1', async () => ['u1', 'u2']);
    const reflection = entries.find((e) => e.type === 'reflection');
    expect(reflection?.visibleToUserIds).toEqual(['u1']);
  });
});
```

- [ ] **Step 3: Run tests to confirm failure**

Run: `npx vitest run __tests__/lib/entries/query.test.ts`
Expected: new tests fail because (a) `fetchEntries` signature doesn't accept `currentUserId` or roster fetcher; (b) sentinel resolution doesn't exist.

- [ ] **Step 4: Update `EntrySource`, `fetchEntries`, and add sentinel resolver**

In `src/lib/entries/query.ts`:

Replace `EntrySource` interface to take `currentUserId`:

```typescript
export interface EntrySource {
  journalEntries(familyId: string, currentUserId: string): Promise<JournalEntry[]>;
  contributions(familyId: string, currentUserId: string): Promise<Contribution[]>;
  personManuals(familyId: string, currentUserId: string): Promise<PersonManual[]>;
  growthItems(familyId: string, currentUserId: string): Promise<GrowthItem[]>;
}

export type FamilyRosterFetcher = (familyId: string) => Promise<string[]>;
```

Update `fetchEntries`:

```typescript
const SENTINEL_FAMILY_VISIBILITY = '_visibility:family';

export async function fetchEntries(
  familyId: string,
  filter: EntryFilter,
  source: EntrySource,
  currentUserId: string,
  fetchRoster?: FamilyRosterFetcher
): Promise<Entry[]> {
  const [journals, contribs, manuals, growth] = await Promise.all([
    source.journalEntries(familyId, currentUserId),
    source.contributions(familyId, currentUserId),
    source.personManuals(familyId, currentUserId),
    source.growthItems(familyId, currentUserId),
  ]);

  const entries: Entry[] = [];
  for (const j of journals) entries.push(journalEntryToEntry(j));
  for (const c of contribs) entries.push(...contributionToEntries(c));
  for (const m of manuals) {
    if (m.synthesizedContent) {
      entries.push(
        ...synthesizedContentToEntries({
          familyId: m.familyId,
          manualId: m.manualId,
          personId: m.personId ?? null,
          synth: m.synthesizedContent,
        })
      );
    }
  }
  for (const g of growth) entries.push(growthItemToEntry(g));

  // Resolve _visibility:family sentinel against the roster, lazily.
  const needsRoster = entries.some((e) =>
    e.tags.includes(SENTINEL_FAMILY_VISIBILITY)
  );
  if (needsRoster && fetchRoster) {
    const roster = await fetchRoster(familyId);
    for (const e of entries) {
      if (e.tags.includes(SENTINEL_FAMILY_VISIBILITY)) {
        e.visibleToUserIds = roster;
        e.tags = e.tags.filter((t) => t !== SENTINEL_FAMILY_VISIBILITY);
      }
    }
  }

  return applyFilter(entries, filter);
}
```

Update `firestoreEntrySource`:

```typescript
export const firestoreEntrySource: EntrySource = {
  async journalEntries(familyId) {
    // (unchanged — existing rules permit a parent in family to read all entries.)
    const snap = await getDocs(
      query(collection(firestore, 'journal_entries'), where('familyId', '==', familyId))
    );
    return snap.docs.map(
      (d) => ({ entryId: d.id, ...(d.data() as Omit<JournalEntry, 'entryId'>) })
    );
  },
  async contributions(familyId, currentUserId) {
    // Split-query: own contributions (any status) UNION family completes.
    const [ownSnap, completeSnap] = await Promise.all([
      getDocs(
        query(
          collection(firestore, 'contributions'),
          where('familyId', '==', familyId),
          where('contributorId', '==', currentUserId)
        )
      ),
      getDocs(
        query(
          collection(firestore, 'contributions'),
          where('familyId', '==', familyId),
          where('status', '==', 'complete')
        )
      ),
    ]);
    const seen = new Set<string>();
    const out: Contribution[] = [];
    for (const d of [...ownSnap.docs, ...completeSnap.docs]) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      out.push({ contributionId: d.id, ...(d.data() as Omit<Contribution, 'contributionId'>) });
    }
    return out;
  },
  async personManuals(familyId) {
    const snap = await getDocs(
      query(collection(firestore, 'person_manuals'), where('familyId', '==', familyId))
    );
    return snap.docs.map(
      (d) => ({ manualId: d.id, ...(d.data() as Omit<PersonManual, 'manualId'>) })
    );
  },
  async growthItems(familyId) {
    const snap = await getDocs(
      query(collection(firestore, 'growth_items'), where('familyId', '==', familyId))
    );
    return snap.docs.map(
      (d) => ({ growthItemId: d.id, ...(d.data() as Omit<GrowthItem, 'growthItemId'>) })
    );
  },
};
```

Add `firestoreFamilyRoster` helper at the end of `query.ts`:

```typescript
/**
 * Production family-roster fetcher. Reads `users` collection where
 * familyId == X and returns the member uids. Used by fetchEntries to
 * resolve the _visibility:family sentinel.
 */
export const firestoreFamilyRoster: FamilyRosterFetcher = async (familyId) => {
  const snap = await getDocs(
    query(collection(firestore, 'users'), where('familyId', '==', familyId))
  );
  return snap.docs.map((d) => d.id);
};
```

(If Step 1's inspection revealed a different roster source — e.g., `families/{id}.memberUserIds[]` — adjust this helper accordingly. The interface stays the same.)

- [ ] **Step 5: Update `useEntries` to pass `currentUserId` and roster fetcher**

In `src/hooks/useEntries.ts`:

```typescript
import {
  fetchEntries,
  firestoreEntrySource,
  firestoreFamilyRoster,
  type EntrySource,
  type FamilyRosterFetcher,
} from '@/lib/entries/query';
import { useAuth } from '@/context/AuthContext';

export interface UseEntriesArgs {
  familyId: string | null;
  filter: EntryFilter;
  source?: EntrySource;
  fetchRoster?: FamilyRosterFetcher;
}

export function useEntries({
  familyId,
  filter,
  source = firestoreEntrySource,
  fetchRoster = firestoreFamilyRoster,
}: UseEntriesArgs): UseEntriesResult {
  const { user } = useAuth();
  // ... existing state setup ...

  useEffect(() => {
    if (!familyId || !user) {
      setEntries([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchEntries(familyId, filter, source, user.uid, fetchRoster)
      .then((es) => { /* existing */ })
      .catch((err) => { /* existing */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, filterKey, source, fetchRoster, user]);
  // ... rest unchanged ...
}
```

Update `__tests__/hooks/useEntries.test.ts` to mock `useAuth` returning `{ user: { uid: 'u1' } }`. Pattern (add to top of file):

```typescript
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));
```

- [ ] **Step 6: Run all entries tests**

Run: `npx vitest run __tests__/types/ __tests__/lib/entries/ __tests__/hooks/useEntries.test.ts`
Expected: all green (existing + new visibility/roster tests).

- [ ] **Step 7: TypeScript check**

Run: `npx tsc --noEmit 2>&1 | grep -E "(entries|useEntries)" | head -10`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/entries/query.ts src/hooks/useEntries.ts __tests__/lib/entries/query.test.ts __tests__/hooks/useEntries.test.ts
git commit -m "fix(entries): rule-compatible scoped queries + family roster resolution"
```

---

## Task 3: Asset placeholders + manifest

**Files:**
- Create: `src/components/journal-spread/assets.ts`
- Create: `public/images/book/README.md`
- Create: `__tests__/components/journal-spread/assets.test.ts`

The spread relies on real photographic assets. Until those exist, the components fall back to flat cream — but the asset path constants and presence flag must already be wired so the moment assets land, no code changes are needed.

- [ ] **Step 1: Create `assets.ts`**

```typescript
// src/components/journal-spread/assets.ts

/**
 * Asset constants for the journal spread.
 *
 * Real photography lives in `/public/images/book/`. Until the assets
 * land, components MUST gracefully degrade to honest flat colors —
 * never fake leather/paper with CSS gradients.
 *
 * Toggle BOOK_ASSETS_AVAILABLE by setting NEXT_PUBLIC_BOOK_ASSETS_PRESENT=1
 * after sourcing assets. See public/images/book/README.md for the manifest.
 */

export const BOOK_ASSETS_AVAILABLE =
  process.env.NEXT_PUBLIC_BOOK_ASSETS_PRESENT === '1';

export const BOOK_ASSETS = {
  cover: '/images/book/cover.jpg',
  spineLeather: '/images/book/spine-leather.jpg',
  paperLeft: '/images/book/paper-left.jpg',
  paperRight: '/images/book/paper-right.jpg',
  gutterShadow: '/images/book/gutter-shadow.png',
  bindingThread: '/images/book/binding-thread.png', // optional
} as const;

/** Honest flat fallback colors when assets are unavailable. */
export const FLAT_COLORS = {
  paper: '#f5ecd8',
  spineDark: '#3d2f1f',
  ink: '#2d2418',
  inkMuted: '#8a6f4a',
} as const;
```

- [ ] **Step 2: Create the asset manifest README**

```markdown
<!-- public/images/book/README.md -->
# Journal Spread Asset Manifest

Required photographic assets for the bound-journal spread (Plan 2).
Components fall back to flat cream when assets are missing —
never fake textures with CSS gradients.

| Filename | Purpose | Recommended size | Notes |
|---|---|---|---|
| `cover.jpg` | Backdrop: open book photographed top-down | 2400 × 1600 | Soft daylight, neutral surface |
| `spine-leather.jpg` | Tileable leather texture for binding | 512 × 512 | Warm tan or oxblood, real grain |
| `paper-left.jpg` | Tileable aged paper, left page | 1200 × 1600 | Ivory/cream, subtle fiber |
| `paper-right.jpg` | Tileable aged paper, right page | 1200 × 1600 | Slight variation from left |
| `gutter-shadow.png` | Photographed gutter shadow strip, transparent PNG | 80 × 1200 | Real photo, not a gradient |
| `binding-thread.png` | (Optional) Sewn binding detail at gutter | 60 × 1200 | Adds warmth |

**Sources:** Curated stock from Unsplash/Adobe Stock filtered for physical-object realism, or one custom half-day shoot covering all six.

**Activation:** After placing assets in `/public/images/book/`, set `NEXT_PUBLIC_BOOK_ASSETS_PRESENT=1` in `.env.local`. The components will pick them up automatically.
```

- [ ] **Step 3: Write a test**

Create `__tests__/components/journal-spread/assets.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { BOOK_ASSETS, FLAT_COLORS, BOOK_ASSETS_AVAILABLE } from '@/components/journal-spread/assets';

describe('journal-spread assets', () => {
  it('exports the required asset paths', () => {
    expect(BOOK_ASSETS.cover).toBe('/images/book/cover.jpg');
    expect(BOOK_ASSETS.spineLeather).toContain('/images/book/');
    expect(BOOK_ASSETS.paperLeft).toContain('/images/book/');
    expect(BOOK_ASSETS.paperRight).toContain('/images/book/');
    expect(BOOK_ASSETS.gutterShadow).toContain('/images/book/');
  });

  it('exports flat fallback colors', () => {
    expect(FLAT_COLORS.paper).toMatch(/^#[0-9a-f]{6}$/i);
    expect(FLAT_COLORS.ink).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('availability flag is a boolean', () => {
    expect(typeof BOOK_ASSETS_AVAILABLE).toBe('boolean');
  });
});
```

- [ ] **Step 4: Run + commit**

Run: `npx vitest run __tests__/components/journal-spread/assets.test.ts`
Expected: 3 tests pass.

```bash
git add src/components/journal-spread/assets.ts public/images/book/README.md __tests__/components/journal-spread/assets.test.ts
git commit -m "feat(spread): asset constants + manifest"
```

---

## Task 4: `<EntryBlock>` component

**Files:**
- Create: `src/components/journal-spread/EntryBlock.tsx`
- Create: `__tests__/components/journal-spread/EntryBlock.test.tsx`

Renders one `Entry`. Color is determined by `entry.type`. Header shows the type kicker + signature (avatar of author or "Synthesis · about [name]"). Body shows `entry.content`.

Color palette (from the approved mockup):
- `synthesis` → coral background (`#e8a17a`), ink `#3d2518`
- `nudge` → pink (`#c487a3`), ink `#3d1830`
- `observation` → yellow (`#f3e6b8`), ink `#3d3218`
- `written` → cream-with-border (`#faf3e2` + 1px `#8a6f4a`)
- `activity` → sage (`#9bb59b`), ink `#1f3020`
- `prompt` → muted cream (`#efe6cd`)
- `reflection` → cream (`#faf3e2`)
- `conversation` → slate-blue (`#6a8aa0`), ink `#f5ecd8`

- [ ] **Step 1: Failing test**

Create `__tests__/components/journal-spread/EntryBlock.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { EntryBlock } from '@/components/journal-spread/EntryBlock';
import type { Entry } from '@/types/entry';

const baseEntry: Entry = {
  id: 'e1',
  familyId: 'f1',
  type: 'written',
  author: { kind: 'person', personId: 'p1' },
  subjects: [],
  content: 'Dinner was loud tonight.',
  tags: [],
  visibleToUserIds: ['u1'],
  sharedWithUserIds: [],
  createdAt: Timestamp.now(),
};

describe('EntryBlock', () => {
  it('renders the entry content', () => {
    render(<EntryBlock entry={baseEntry} />);
    expect(screen.getByText('Dinner was loud tonight.')).toBeInTheDocument();
  });

  it('shows a kicker label appropriate for the type', () => {
    render(<EntryBlock entry={{ ...baseEntry, type: 'synthesis' }} />);
    expect(screen.getByText(/synthesis/i)).toBeInTheDocument();
  });

  it('applies a distinct className per entry type', () => {
    const { container, rerender } = render(<EntryBlock entry={baseEntry} />);
    const writtenClasses = container.firstElementChild?.className ?? '';
    rerender(<EntryBlock entry={{ ...baseEntry, type: 'synthesis' }} />);
    const synthesisClasses = container.firstElementChild?.className ?? '';
    expect(writtenClasses).not.toEqual(synthesisClasses);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run __tests__/components/journal-spread/EntryBlock.test.tsx`
Expected: module not found.

- [ ] **Step 3: Implement `EntryBlock.tsx`**

```tsx
'use client';

import type { Entry, EntryType } from '@/types/entry';

const KICKERS: Record<EntryType, string> = {
  written: 'Written',
  observation: 'Observation',
  activity: 'Activity',
  synthesis: 'Synthesis',
  nudge: 'One thing to try',
  prompt: 'Question',
  reflection: 'Reflection',
  conversation: 'Conversation',
};

const TYPE_CLASSES: Record<EntryType, string> = {
  written: 'block-written',
  observation: 'block-observation',
  activity: 'block-activity',
  synthesis: 'block-synthesis',
  nudge: 'block-nudge',
  prompt: 'block-prompt',
  reflection: 'block-reflection',
  conversation: 'block-conversation',
};

export function EntryBlock({ entry }: { entry: Entry }) {
  return (
    <article className={`entry-block ${TYPE_CLASSES[entry.type]}`}>
      <div className="entry-kicker">{KICKERS[entry.type]}</div>
      <p className="entry-content">{entry.content}</p>
      <style jsx>{`
        .entry-block {
          border-radius: 6px;
          padding: 14px 16px;
          margin-bottom: 10px;
          font-family: Georgia, 'Times New Roman', serif;
          color: #2d2418;
        }
        .entry-kicker {
          font-size: 9px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .entry-content {
          font-size: 14px;
          line-height: 1.5;
          margin: 0;
          font-style: italic;
        }
        .block-written  { background: #faf3e2; border: 1px solid rgba(120,90,50,0.3); }
        .block-written  .entry-kicker { color: #8a6f4a; }
        .block-observation { background: #f3e6b8; }
        .block-observation .entry-kicker { color: #7a5f1a; }
        .block-activity { background: #9bb59b; color: #1f3020; }
        .block-activity .entry-kicker { color: #2f5a38; }
        .block-synthesis { background: #e8a17a; color: #3d2518; }
        .block-synthesis .entry-kicker { color: #7a2f1a; }
        .block-nudge    { background: #c487a3; color: #3d1830; }
        .block-nudge    .entry-kicker { color: #591a42; }
        .block-prompt   { background: #efe6cd; }
        .block-prompt   .entry-kicker { color: #8a6f4a; }
        .block-reflection { background: #faf3e2; }
        .block-reflection .entry-kicker { color: #8a6f4a; }
        .block-conversation { background: #6a8aa0; color: #f5ecd8; }
        .block-conversation .entry-kicker { color: #d0e1ea; }
      `}</style>
    </article>
  );
}
```

- [ ] **Step 4: Confirm pass + commit**

Run: `npx vitest run __tests__/components/journal-spread/EntryBlock.test.tsx`
Expected: 3 tests pass.

```bash
git add src/components/journal-spread/EntryBlock.tsx __tests__/components/journal-spread/EntryBlock.test.tsx
git commit -m "feat(spread): EntryBlock component with type-aware coloring"
```

---

## Task 5: `<MastheadRow>` component

**Files:**
- Create: `src/components/journal-spread/MastheadRow.tsx`
- Create: `__tests__/components/journal-spread/MastheadRow.test.tsx`

Shows family avatars (initials), volume label, and date range for the current spread.

- [ ] **Step 1: Failing test**

```tsx
// __tests__/components/journal-spread/MastheadRow.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MastheadRow } from '@/components/journal-spread/MastheadRow';

describe('MastheadRow', () => {
  it('renders family member initials', () => {
    render(
      <MastheadRow
        familyName="Kaufman"
        volumeLabel="Volume IV · Spring"
        dateRangeLabel="April 14"
        members={[
          { id: 'u1', name: 'Scott' },
          { id: 'u2', name: 'Rachel' },
          { id: 'u3', name: 'Liam' },
        ]}
      />
    );
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument();
  });

  it('renders volume label and date', () => {
    render(
      <MastheadRow
        familyName="Kaufman"
        volumeLabel="Volume IV · Spring"
        dateRangeLabel="April 14"
        members={[]}
      />
    );
    expect(screen.getByText(/Volume IV/i)).toBeInTheDocument();
    expect(screen.getByText(/April 14/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, fail.** `npx vitest run __tests__/components/journal-spread/MastheadRow.test.tsx`

- [ ] **Step 3: Implement**

```tsx
// src/components/journal-spread/MastheadRow.tsx
'use client';

export interface MastheadMember {
  id: string;
  name: string;
}

export interface MastheadRowProps {
  familyName: string;
  volumeLabel: string;
  dateRangeLabel: string;
  members: MastheadMember[];
}

export function MastheadRow({
  familyName,
  volumeLabel,
  dateRangeLabel,
  members,
}: MastheadRowProps) {
  return (
    <header className="masthead-row">
      <div className="masthead-avatars">
        {members.map((m) => (
          <span key={m.id} className="avatar" title={m.name}>
            {m.name.charAt(0).toUpperCase()}
          </span>
        ))}
      </div>
      <div className="masthead-text">
        <div className="masthead-volume">
          The {familyName} Family · <em>{volumeLabel}</em>
        </div>
        <div className="masthead-date">{dateRangeLabel}</div>
      </div>
      <style jsx>{`
        .masthead-row {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 14px 0 12px;
          border-bottom: 1px solid rgba(80, 60, 40, 0.2);
          margin-bottom: 14px;
        }
        .masthead-avatars { display: inline-flex; margin-bottom: 8px; }
        .avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #d4b483;
          color: #3d2f1f;
          font-weight: 700;
          font-family: -apple-system, sans-serif;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-left: -5px;
          border: 2px solid #f5ecd8;
        }
        .avatar:first-child { margin-left: 0; }
        .masthead-volume {
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #8a6f4a;
          font-family: -apple-system, sans-serif;
          text-align: center;
        }
        .masthead-volume em {
          font-family: Georgia, serif;
          font-style: italic;
          font-size: 14px;
          letter-spacing: 0;
          color: #3d2f1f;
          text-transform: none;
        }
        .masthead-date {
          font-size: 10px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #8a6f4a;
          margin-top: 6px;
          text-align: center;
        }
      `}</style>
    </header>
  );
}
```

- [ ] **Step 4: Pass + commit**

```bash
git add src/components/journal-spread/MastheadRow.tsx __tests__/components/journal-spread/MastheadRow.test.tsx
git commit -m "feat(spread): MastheadRow component"
```

---

## Task 6: `<FilterPills>` component

**Files:**
- Create: `src/components/journal-spread/FilterPills.tsx`
- Create: `__tests__/components/journal-spread/FilterPills.test.tsx`

Pills above the spread. Each pill represents a filter selector. Selecting Everyone clears all filters; selecting a person sets `subjectPersonIds=[id]`; Syntheses sets `types=['synthesis']`. Single-select for now (multi-select deferred).

- [ ] **Step 1: Failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterPills } from '@/components/journal-spread/FilterPills';

describe('FilterPills', () => {
  const people = [
    { id: 'p1', name: 'Sarah' },
    { id: 'p2', name: 'Liam' },
  ];

  it('renders a pill per person plus Everyone and Syntheses', () => {
    render(
      <FilterPills
        people={people}
        active={{ kind: 'everyone' }}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Everyone')).toBeInTheDocument();
    expect(screen.getByText('Sarah')).toBeInTheDocument();
    expect(screen.getByText('Liam')).toBeInTheDocument();
    expect(screen.getByText('Syntheses')).toBeInTheDocument();
  });

  it('marks the active pill', () => {
    render(
      <FilterPills
        people={people}
        active={{ kind: 'person', personId: 'p1' }}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Sarah').closest('button')?.className).toContain('active');
  });

  it('calls onChange when a pill is clicked', () => {
    const onChange = vi.fn();
    render(
      <FilterPills
        people={people}
        active={{ kind: 'everyone' }}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByText('Liam'));
    expect(onChange).toHaveBeenCalledWith({ kind: 'person', personId: 'p2' });
    fireEvent.click(screen.getByText('Syntheses'));
    expect(onChange).toHaveBeenCalledWith({ kind: 'syntheses' });
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// src/components/journal-spread/FilterPills.tsx
'use client';

export type FilterSelection =
  | { kind: 'everyone' }
  | { kind: 'person'; personId: string }
  | { kind: 'syntheses' };

export interface FilterPillsPerson {
  id: string;
  name: string;
}

export interface FilterPillsProps {
  people: FilterPillsPerson[];
  active: FilterSelection;
  onChange: (next: FilterSelection) => void;
}

function isActive(active: FilterSelection, candidate: FilterSelection): boolean {
  if (active.kind !== candidate.kind) return false;
  if (active.kind === 'person' && candidate.kind === 'person') {
    return active.personId === candidate.personId;
  }
  return true;
}

export function FilterPills({ people, active, onChange }: FilterPillsProps) {
  const pills: Array<{ label: string; sel: FilterSelection }> = [
    { label: 'Everyone', sel: { kind: 'everyone' } },
    ...people.map((p) => ({ label: p.name, sel: { kind: 'person' as const, personId: p.id } })),
    { label: 'Syntheses', sel: { kind: 'syntheses' } },
  ];

  return (
    <div className="filter-pills">
      {pills.map((pill, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(pill.sel)}
          className={`pill${isActive(active, pill.sel) ? ' active' : ''}`}
        >
          {pill.label}
        </button>
      ))}
      <style jsx>{`
        .filter-pills {
          display: flex;
          gap: 6px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .pill {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          border: 1px solid #8a6f4a;
          color: #5a4628;
          background: transparent;
          font-family: -apple-system, sans-serif;
          letter-spacing: 0.05em;
          cursor: pointer;
        }
        .pill.active {
          background: #3d2f1f;
          color: #f5ecd8;
          border-color: #3d2f1f;
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 3: Pass + commit**

```bash
git add src/components/journal-spread/FilterPills.tsx __tests__/components/journal-spread/FilterPills.test.tsx
git commit -m "feat(spread): FilterPills component"
```

---

## Task 7: `usePageWindow` hook

**Files:**
- Create: `src/components/journal-spread/usePageWindow.ts`
- Create: `__tests__/components/journal-spread/usePageWindow.test.ts`

Takes the full filtered `Entry[]` (sorted newest-first by `useEntries`) and the page size `pageSize`. Returns:
- `currentEntries: Entry[]` — the slice for the current spread (the next `pageSize` entries from the current offset)
- `flipNewer()`, `flipOlder()` handlers
- `canFlipNewer`, `canFlipOlder` booleans
- `currentPageIndex` and `totalPages`

When the entry list changes, the window resets to page 0 (the newest entries).

- [ ] **Step 1: Failing test**

```typescript
// __tests__/components/journal-spread/usePageWindow.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { usePageWindow } from '@/components/journal-spread/usePageWindow';
import type { Entry } from '@/types/entry';

const make = (i: number): Entry => ({
  id: `e${i}`,
  familyId: 'f1',
  type: 'written',
  author: { kind: 'person', personId: 'p1' },
  subjects: [],
  content: `entry ${i}`,
  tags: [],
  visibleToUserIds: ['u1'],
  sharedWithUserIds: [],
  createdAt: Timestamp.fromMillis(1_700_000_000_000 - i * 1000),
});

describe('usePageWindow', () => {
  it('returns the first page of entries by default', () => {
    const entries = Array.from({ length: 25 }, (_, i) => make(i));
    const { result } = renderHook(() => usePageWindow(entries, 10));
    expect(result.current.currentEntries.length).toBe(10);
    expect(result.current.currentEntries[0].id).toBe('e0');
    expect(result.current.canFlipNewer).toBe(false);
    expect(result.current.canFlipOlder).toBe(true);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.currentPageIndex).toBe(0);
  });

  it('flips to older entries', () => {
    const entries = Array.from({ length: 25 }, (_, i) => make(i));
    const { result } = renderHook(() => usePageWindow(entries, 10));
    act(() => result.current.flipOlder());
    expect(result.current.currentEntries[0].id).toBe('e10');
    expect(result.current.canFlipNewer).toBe(true);
  });

  it('flips back to newer', () => {
    const entries = Array.from({ length: 25 }, (_, i) => make(i));
    const { result } = renderHook(() => usePageWindow(entries, 10));
    act(() => result.current.flipOlder());
    act(() => result.current.flipNewer());
    expect(result.current.currentEntries[0].id).toBe('e0');
  });

  it('resets to page 0 when entries change', () => {
    const a = Array.from({ length: 25 }, (_, i) => make(i));
    const { result, rerender } = renderHook(
      ({ list, size }: { list: Entry[]; size: number }) => usePageWindow(list, size),
      { initialProps: { list: a, size: 10 } }
    );
    act(() => result.current.flipOlder());
    expect(result.current.currentPageIndex).toBe(1);
    const b = Array.from({ length: 5 }, (_, i) => make(i));
    rerender({ list: b, size: 10 });
    expect(result.current.currentPageIndex).toBe(0);
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// src/components/journal-spread/usePageWindow.ts
'use client';

import { useEffect, useState } from 'react';
import type { Entry } from '@/types/entry';

export interface PageWindow {
  currentEntries: Entry[];
  currentPageIndex: number;
  totalPages: number;
  canFlipNewer: boolean;
  canFlipOlder: boolean;
  flipNewer: () => void;
  flipOlder: () => void;
}

export function usePageWindow(entries: Entry[], pageSize: number): PageWindow {
  const [pageIndex, setPageIndex] = useState(0);

  // Reset when the underlying list identity changes.
  useEffect(() => {
    setPageIndex(0);
  }, [entries]);

  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const safeIndex = Math.min(pageIndex, totalPages - 1);
  const start = safeIndex * pageSize;
  const currentEntries = entries.slice(start, start + pageSize);

  return {
    currentEntries,
    currentPageIndex: safeIndex,
    totalPages,
    canFlipNewer: safeIndex > 0,
    canFlipOlder: safeIndex < totalPages - 1,
    flipNewer: () => setPageIndex((i) => Math.max(0, i - 1)),
    flipOlder: () => setPageIndex((i) => Math.min(totalPages - 1, i + 1)),
  };
}
```

- [ ] **Step 3: Pass + commit**

```bash
git add src/components/journal-spread/usePageWindow.ts __tests__/components/journal-spread/usePageWindow.test.ts
git commit -m "feat(spread): usePageWindow hook"
```

---

## Task 8: `<JournalSpread>` composite component

**Files:**
- Create: `src/components/journal-spread/JournalSpread.tsx`
- Create: `__tests__/components/journal-spread/JournalSpread.test.tsx`

Composes everything: filter pills, masthead, two facing pages with entry blocks, flip arrows, the bound-book frame using `BOOK_ASSETS` (or flat fallback).

The half-page split is mechanical: the first half of `currentEntries` goes on the left page, the second half on the right.

- [ ] **Step 1: Failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { JournalSpread } from '@/components/journal-spread/JournalSpread';
import type { Entry } from '@/types/entry';

const make = (i: number): Entry => ({
  id: `e${i}`,
  familyId: 'f1',
  type: 'written',
  author: { kind: 'person', personId: 'p1' },
  subjects: [],
  content: `entry-${i}`,
  tags: [],
  visibleToUserIds: ['u1'],
  sharedWithUserIds: [],
  createdAt: Timestamp.fromMillis(1_700_000_000_000 - i * 1000),
});

describe('JournalSpread', () => {
  const props = {
    familyName: 'Kaufman',
    volumeLabel: 'Volume IV · Spring',
    dateRangeLabel: 'April 14',
    members: [{ id: 'u1', name: 'Scott' }],
    people: [{ id: 'p1', name: 'Liam' }],
    onCapture: vi.fn(),
  };

  it('renders an entry block for each visible entry', () => {
    const entries = Array.from({ length: 4 }, (_, i) => make(i));
    render(<JournalSpread {...props} entries={entries} />);
    expect(screen.getByText('entry-0')).toBeInTheDocument();
    expect(screen.getByText('entry-3')).toBeInTheDocument();
  });

  it('shows + Add an entry button', () => {
    render(<JournalSpread {...props} entries={[]} />);
    expect(screen.getByRole('button', { name: /add an entry/i })).toBeInTheDocument();
  });

  it('invokes onCapture when + Add is clicked', () => {
    const onCapture = vi.fn();
    render(<JournalSpread {...props} entries={[]} onCapture={onCapture} />);
    fireEvent.click(screen.getByRole('button', { name: /add an entry/i }));
    expect(onCapture).toHaveBeenCalled();
  });

  it('renders empty-state copy when there are no entries', () => {
    render(<JournalSpread {...props} entries={[]} />);
    expect(screen.getByText(/quiet day/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement**

```tsx
'use client';

import { useState } from 'react';
import type { Entry } from '@/types/entry';
import { EntryBlock } from './EntryBlock';
import { MastheadRow, type MastheadMember } from './MastheadRow';
import { FilterPills, type FilterPillsPerson, type FilterSelection } from './FilterPills';
import { usePageWindow } from './usePageWindow';
import { BOOK_ASSETS, BOOK_ASSETS_AVAILABLE, FLAT_COLORS } from './assets';

const PAGE_SIZE = 12; // 6 per page × 2 pages

export interface JournalSpreadProps {
  entries: Entry[];
  familyName: string;
  volumeLabel: string;
  dateRangeLabel: string;
  members: MastheadMember[];
  people: FilterPillsPerson[];
  onCapture: () => void;
  /** Optional: parent can control the active filter to drive useEntries refetches. */
  filter?: FilterSelection;
  onFilterChange?: (next: FilterSelection) => void;
}

export function JournalSpread({
  entries,
  familyName,
  volumeLabel,
  dateRangeLabel,
  members,
  people,
  onCapture,
  filter,
  onFilterChange,
}: JournalSpreadProps) {
  const [internalFilter, setInternalFilter] = useState<FilterSelection>({ kind: 'everyone' });
  const activeFilter = filter ?? internalFilter;
  const handleFilterChange = (next: FilterSelection) => {
    if (onFilterChange) onFilterChange(next);
    else setInternalFilter(next);
  };

  const { currentEntries, canFlipNewer, canFlipOlder, flipNewer, flipOlder, currentPageIndex, totalPages } =
    usePageWindow(entries, PAGE_SIZE);

  const half = Math.ceil(currentEntries.length / 2);
  const leftEntries = currentEntries.slice(0, half);
  const rightEntries = currentEntries.slice(half);

  const bgStyle = BOOK_ASSETS_AVAILABLE
    ? { backgroundImage: `url(${BOOK_ASSETS.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: '#1f160e' };
  const paperLeftStyle = BOOK_ASSETS_AVAILABLE
    ? { backgroundImage: `url(${BOOK_ASSETS.paperLeft})`, backgroundSize: 'cover' }
    : { backgroundColor: FLAT_COLORS.paper };
  const paperRightStyle = BOOK_ASSETS_AVAILABLE
    ? { backgroundImage: `url(${BOOK_ASSETS.paperRight})`, backgroundSize: 'cover' }
    : { backgroundColor: FLAT_COLORS.paper };

  return (
    <div className="spread-stage" style={bgStyle}>
      <FilterPills people={people} active={activeFilter} onChange={handleFilterChange} />
      <div className="book">
        {canFlipNewer && (
          <button type="button" className="flip flip-left" onClick={flipNewer} aria-label="Newer entries">
            ‹
          </button>
        )}
        {canFlipOlder && (
          <button type="button" className="flip flip-right" onClick={flipOlder} aria-label="Older entries">
            ›
          </button>
        )}
        <div className="page page-left" style={paperLeftStyle}>
          <MastheadRow
            familyName={familyName}
            volumeLabel={volumeLabel}
            dateRangeLabel={dateRangeLabel}
            members={members}
          />
          {leftEntries.map((e) => (
            <EntryBlock key={e.id} entry={e} />
          ))}
        </div>
        <div className="page page-right" style={paperRightStyle}>
          {rightEntries.map((e) => (
            <EntryBlock key={e.id} entry={e} />
          ))}
          {currentEntries.length === 0 && (
            <p className="empty-state">A quiet day. Nothing yet — write the first thing.</p>
          )}
        </div>
      </div>
      <button type="button" className="capture-btn" onClick={onCapture}>
        + Add an entry
      </button>
      <div className="page-meta">
        Page {currentPageIndex + 1} of {totalPages}
      </div>
      <style jsx>{`
        .spread-stage { padding: 30px 20px 60px; min-height: 100vh; }
        .book {
          position: relative;
          max-width: 960px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: ${BOOK_ASSETS_AVAILABLE ? 'transparent' : FLAT_COLORS.spineDark};
          padding: 16px;
          border-radius: 4px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .page { padding: 22px 22px 26px; min-height: 540px; position: relative; color: ${FLAT_COLORS.ink}; }
        .page-left  { border-radius: 2px 0 0 2px; }
        .page-right { border-radius: 0 2px 2px 0; }
        .flip {
          position: absolute; top: 50%; transform: translateY(-50%);
          width: 32px; height: 56px;
          background: rgba(245,236,216,0.12);
          border: 1px solid rgba(245,236,216,0.3);
          color: #f5ecd8;
          font-size: 22px;
          font-style: italic;
          cursor: pointer;
          z-index: 5;
        }
        .flip-left  { left: -38px; border-radius: 3px 0 0 3px; }
        .flip-right { right: -38px; border-radius: 0 3px 3px 0; }
        .capture-btn {
          display: block;
          margin: 18px auto 0;
          background: ${FLAT_COLORS.spineDark};
          color: #f5ecd8;
          padding: 10px 22px;
          border: none;
          border-radius: 22px;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: -apple-system, sans-serif;
        }
        .page-meta {
          text-align: center;
          margin-top: 14px;
          font-size: 10px;
          color: ${FLAT_COLORS.inkMuted};
          letter-spacing: 0.2em;
          text-transform: uppercase;
          font-style: italic;
          font-family: -apple-system, sans-serif;
        }
        .empty-state {
          font-family: Georgia, serif;
          font-style: italic;
          color: ${FLAT_COLORS.inkMuted};
          text-align: center;
          margin-top: 60px;
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 3: Pass + commit**

Run: `npx vitest run __tests__/components/journal-spread/JournalSpread.test.tsx`
Expected: 4 tests pass.

```bash
git add src/components/journal-spread/JournalSpread.tsx __tests__/components/journal-spread/JournalSpread.test.tsx
git commit -m "feat(spread): JournalSpread composite component"
```

---

## Task 9: Wire `/` to render the spread behind the flag

**Files:**
- Modify: `src/app/page.tsx`

When `process.env.NEXT_PUBLIC_JOURNAL_SPREAD === '1'` AND the user is signed in, render `<JournalSpread>` with data sourced from `useEntries`, `useDashboard` (for `familyId` + members), and the existing capture-sheet trigger. Otherwise fall back to the existing library-desk component (which means: do NOT delete the existing component — wrap it in a conditional).

The current `src/app/page.tsx` is the library-desk implementation. Restructure it so the existing JSX is extracted into a `LibraryDeskHome` inline component (or kept inline), and a new branch returns `<SpreadHome>` when the flag is on.

- [ ] **Step 1: Read the existing page**

Run: `cat src/app/page.tsx | head -50`

- [ ] **Step 2: Implement the branch**

Modify `src/app/page.tsx`. At the top of `HomePage`:

```tsx
const SHOW_SPREAD = process.env.NEXT_PUBLIC_JOURNAL_SPREAD === '1';

// inside HomePage(), after isSignedIn is computed:
if (SHOW_SPREAD && isSignedIn) {
  return <SpreadHome />;
}
```

Then add the `SpreadHome` component in the same file (or split into a sibling file `src/app/SpreadHome.tsx` if it grows). It uses `useDashboard` to get `familyId` and `people`, `useAuth` for the current user, `useEntries` for the stream, and triggers the existing capture flow on `+ Add an entry`.

```tsx
'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useEntries } from '@/hooks/useEntries';
import { JournalSpread } from '@/components/journal-spread/JournalSpread';
import type { FilterSelection } from '@/components/journal-spread/FilterPills';
import type { EntryFilter } from '@/types/entry';

function SpreadHome() {
  const { user } = useAuth();
  const { familyId, people, selfPerson } = useDashboard();
  const [filterSel, setFilterSel] = useState<FilterSelection>({ kind: 'everyone' });

  const entryFilter: EntryFilter = useMemo(() => {
    if (filterSel.kind === 'person') return { subjectPersonIds: [filterSel.personId] };
    if (filterSel.kind === 'syntheses') return { types: ['synthesis'] };
    return {};
  }, [filterSel]);

  const { entries, loading, error } = useEntries({
    familyId: familyId ?? null,
    filter: entryFilter,
  });

  const members = useMemo(
    () => (people ?? []).map((p) => ({ id: p.personId, name: p.name })),
    [people]
  );
  const peopleForPills = members; // pills use the same person list

  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>;
  if (error) return <div style={{ padding: 40, textAlign: 'center' }}>Error: {error.message}</div>;

  return (
    <JournalSpread
      entries={entries}
      familyName={selfPerson?.name?.split(' ').slice(-1)[0] ?? 'Family'}
      volumeLabel="Volume IV · Spring, in progress"
      dateRangeLabel={dateLabel}
      members={members}
      people={peopleForPills}
      filter={filterSel}
      onFilterChange={setFilterSel}
      onCapture={() => {
        // Plan 3 wires this to the unified capture sheet. For now: navigate
        // to /journal which has the existing capture entrypoint.
        window.location.href = '/journal';
      }}
    />
  );
}
```

(Adjust `useDashboard` field names — `familyId`, `people`, `selfPerson` — if the actual hook exposes them differently. Read `src/hooks/useDashboard.ts` first.)

- [ ] **Step 3: Manual smoke test (no automated test in this task)**

Set `NEXT_PUBLIC_JOURNAL_SPREAD=1` in `.env.local`, run `npm run dev`, sign in, visit `/`. Verify the spread renders with the existing test data. Flip arrows when there are enough entries.

Then unset the flag, restart, visit `/`. Verify the library-desk home is unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(spread): wire / behind NEXT_PUBLIC_JOURNAL_SPREAD flag"
```

---

## Task 10: Mobile single-page variant

**Files:**
- Modify: `src/components/journal-spread/JournalSpread.tsx`

On viewports `< 640px`, the spread renders as a single page (right page content only, with masthead at top). Flip arrows still flip a full PAGE_SIZE slice. CSS-only change.

- [ ] **Step 1: Add a CSS media query inside the existing `<style jsx>` block**

Append:

```css
@media (max-width: 640px) {
  .book {
    grid-template-columns: 1fr;
  }
  .page-left {
    display: none;
  }
  .page-right {
    border-radius: 2px;
  }
  .flip-left  { left: 4px; }
  .flip-right { right: 4px; }
}
```

Adjust the conditional rendering: on mobile, all entries should land on the right page so they're visible. Modify the JSX so when the viewport is mobile, both left and right slices merge. The simplest implementation: render all `currentEntries` on the right page only; the left page is hidden by CSS. To make this consistent, change the JSX so that when `leftEntries.length === 0` (or equivalently always), all entries go on the right. Acceptable approach: render the masthead on right (move it from the left page into a wrapper above the grid), and keep left entries on the left page.

A cleaner approach: lift the masthead out of `page-left` to be its own header above the book; then on mobile, the left page can be hidden cleanly.

Restructure the JSX:

```tsx
<div className="spread-stage" style={bgStyle}>
  <FilterPills .../>
  <MastheadRow .../>           {/* moved out of page-left */}
  <div className="book">
    ...
    <div className="page page-left" style={paperLeftStyle}>
      {leftEntries.map(...)}
    </div>
    <div className="page page-right" style={paperRightStyle}>
      {rightEntries.map(...)}
      ...
    </div>
  </div>
  ...
</div>
```

And on mobile, also dump `leftEntries` onto the right page since the left is hidden. Use a small client-side check, or simpler: use `display: contents` trick or a CSS-only union — or, easiest, render `[...leftEntries, ...rightEntries]` on the right page when on mobile via window.matchMedia in an effect. To avoid an effect, accept that on mobile only `rightEntries` show (half a spread). Document this trade-off.

Actually the cleanest behavior: when mobile, set PAGE_SIZE to 6 instead of 12 and put everything on the right page. Implement by reading `useEffect` matchMedia. Skip — keep it simple: on mobile, only the right page shows but the slice is the full PAGE_SIZE (12). Update the half-split to allocate ALL entries to the right page when mobile is detected.

**Final pragmatic approach: introduce a `useIsMobile` hook (or inline `useEffect` with `matchMedia`) and when true, set `leftEntries = []` and `rightEntries = currentEntries`.**

```tsx
import { useEffect, useState } from 'react';

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isMobile;
}
```

Use it in `JournalSpread`:

```tsx
const isMobile = useIsMobile();
const half = isMobile ? 0 : Math.ceil(currentEntries.length / 2);
```

- [ ] **Step 2: Re-run the existing JournalSpread tests to ensure nothing regresses**

Run: `npx vitest run __tests__/components/journal-spread/`
Expected: all green (the matchMedia API is polyfilled by happy-dom; `matchMedia` returns matches=false by default, so tests run as desktop).

- [ ] **Step 3: Commit**

```bash
git add src/components/journal-spread/JournalSpread.tsx
git commit -m "feat(spread): mobile single-page variant"
```

---

## Task 11: Playwright happy-path E2E

**Files:**
- Create: `__e2e__/journal-spread.spec.ts`

End-to-end: with the flag enabled, a signed-in test user visits `/`, sees the spread, sees at least one entry block, can click a filter pill, and can click + Add an entry.

This task assumes the Playwright config and a signed-in fixture already exist (`playwright.config.ts` is at the repo root). If a sign-in fixture does not exist, mark this task DONE_WITH_CONCERNS and document the gap — Plan 2 ships without E2E and Plan 3 must add the fixture.

- [ ] **Step 1: Inspect existing E2E setup**

Run: `cat playwright.config.ts && ls __e2e__ 2>/dev/null`

If there's a sign-in helper or `auth.json`, use it. Otherwise, stop and report the gap.

- [ ] **Step 2: Write the spec**

```typescript
// __e2e__/journal-spread.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Journal spread (flagged)', () => {
  test.use({ baseURL: 'http://localhost:3000' });

  test('renders spread when flag is on and user is signed in', async ({ page }) => {
    // Assumes NEXT_PUBLIC_JOURNAL_SPREAD=1 in the dev server's env
    // and a pre-authenticated session via storageState (fixture).
    await page.goto('/');
    await expect(page.locator('text=The').first()).toBeVisible(); // masthead "The Family"
    await expect(page.getByRole('button', { name: /add an entry/i })).toBeVisible();
  });

  test('filter pill restyles the spread', async ({ page }) => {
    await page.goto('/');
    const synthPill = page.getByRole('button', { name: /^Syntheses$/ });
    await synthPill.click();
    await expect(synthPill).toHaveClass(/active/);
  });
});
```

If signed-in storage state isn't wired, this test will land at `/login`. Mark DONE_WITH_CONCERNS in that case.

- [ ] **Step 3: Run E2E**

Run: `NEXT_PUBLIC_JOURNAL_SPREAD=1 npm run test:e2e`
Expected: 2 specs pass (or DONE_WITH_CONCERNS if auth fixture missing).

- [ ] **Step 4: Commit**

```bash
git add __e2e__/journal-spread.spec.ts
git commit -m "test(spread): playwright happy-path E2E"
```

---

## Task 12: Full-suite green check + branch verification

- [ ] **Step 1: Run the full test suite**

Run: `npm run test:run`
Expected: all unit/integration tests green.

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20`
Expected: no errors from changed files.

- [ ] **Step 3: Branch summary**

Run: `git log --oneline main..HEAD`
Confirm 11–12 commits matching the task numbers.

If anything red, fix in place and recommit. No new task needed — this is the hygiene gate before merge.

---

## Done state

After all tasks pass:

- Plan 1's two carryover issues are fixed (visibility + scoped queries).
- A `<JournalSpread>` component family renders entries as colored blocks across two facing pages with filter pills, flip arrows, capture button, and a real-photography-or-flat-fallback frame.
- `/` renders the spread when `NEXT_PUBLIC_JOURNAL_SPREAD=1`. Flag off, the library-desk home is unchanged.
- Mobile renders a single page with the same content rhythm.
- An E2E test exercises the happy path (or a documented gap).
- The `journal_entries`, `family-manual`, `workbook`, `relish`, and `dashboard` routes all still work — Plan 2 does not retire anything.

Plan 3 (Unified capture) can now wire the + Add an entry button to a capture sheet that writes directly to the new `entries` collection.
