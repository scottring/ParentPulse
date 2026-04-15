# Plan 1 — Entry Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce the canonical `Entry` type and a read-side adapter that exposes existing legacy collections (`journal_entries`, `contributions`, `person_manuals.synthesizedContent`, `growth_items`) as unified `Entry` objects — with zero impact on the current UI or writes.

**Architecture:** Add a new type (`Entry`) as a discriminated union. Build pure adapter functions (legacy doc → Entry). Wrap them in a query layer that reads from multiple Firestore collections concurrently. Expose a React hook (`useEntries`) for consumers. No UI. No writes. No deletions. Later plans build on this foundation.

**Tech Stack:** TypeScript, Next.js 16, React 19, Firebase 12 (Firestore), Vitest.

**Spec reference:** `docs/superpowers/specs/2026-04-15-one-journal-design.md` — Section 1 (Entry model), Section 6 Step 1 (implementation order).

---

## File Structure

### New files

- `src/types/entry.ts` — `Entry` discriminated union, entry-type enums, subject/author shapes, type guards.
- `src/lib/entries/adapter.ts` — pure functions: `journalEntryToEntry`, `contributionToEntries`, `synthesizedContentToEntries`, `growthItemToEntry`. No Firestore I/O.
- `src/lib/entries/query.ts` — `fetchEntries(familyId, filter)` that runs Firestore queries against legacy collections and returns `Entry[]` via the adapter. Includes sorting/filtering.
- `src/hooks/useEntries.ts` — React hook subscribing to `fetchEntries` output with real-time updates.
- `__tests__/types/entry.test.ts` — type guard tests.
- `__tests__/lib/entries/adapter.test.ts` — pure adapter unit tests.
- `__tests__/lib/entries/query.test.ts` — query layer test with mocked Firestore.
- `__tests__/hooks/useEntries.test.ts` — hook test with mocked `fetchEntries`.

### Modified files

- `firestore.rules` — add read/write rules for a forward-looking `entries` collection (writes gated to family members; reads follow the existing `visibleToUserIds` pattern from journal entries).
- `firestore.indexes.json` — add composite index `entries: familyId ASC, createdAt DESC`.

### Not touched in this plan

- No existing hook, page, or component is modified.
- No data migration. No writes to new collections.
- UI remains exactly as it is today.

---

## Task 1: Define Entry types

**Files:**
- Create: `src/types/entry.ts`
- Test: `__tests__/types/entry.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/types/entry.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  isWrittenEntry,
  isSynthesisEntry,
  isConversationEntry,
  type Entry,
} from '@/types/entry';
import { Timestamp } from 'firebase/firestore';

describe('Entry type guards', () => {
  const base = {
    id: 'e1',
    familyId: 'f1',
    author: { kind: 'person' as const, personId: 'p1' },
    subjects: [{ kind: 'person' as const, personId: 'p2' }],
    content: 'hello',
    tags: [],
    visibleToUserIds: ['u1'],
    sharedWithUserIds: [],
    createdAt: Timestamp.now(),
  };

  it('recognises written entries', () => {
    const e: Entry = { ...base, type: 'written' };
    expect(isWrittenEntry(e)).toBe(true);
    expect(isSynthesisEntry(e)).toBe(false);
  });

  it('recognises synthesis entries', () => {
    const e: Entry = {
      ...base,
      type: 'synthesis',
      author: { kind: 'system' },
      sourceEntryIds: ['e0'],
    };
    expect(isSynthesisEntry(e)).toBe(true);
    expect(isWrittenEntry(e)).toBe(false);
  });

  it('recognises conversation entries and requires turns', () => {
    const e: Entry = {
      ...base,
      type: 'conversation',
      turns: [
        { author: base.author, content: 'first', createdAt: base.createdAt },
      ],
    };
    expect(isConversationEntry(e)).toBe(true);
    if (isConversationEntry(e)) {
      expect(e.turns.length).toBe(1);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/types/entry.test.ts`
Expected: FAIL with module-not-found error on `@/types/entry`.

- [ ] **Step 3: Implement `src/types/entry.ts`**

Create `src/types/entry.ts`:

```typescript
import { Timestamp } from 'firebase/firestore';

// ==================== Entry Type ====================

export type EntryType =
  | 'written'       // user free-text
  | 'observation'   // user, about another person
  | 'activity'      // completed practice / outing / check-in
  | 'synthesis'     // AI, about a subject
  | 'nudge'         // AI, "one thing to try"
  | 'prompt'        // AI question to user
  | 'reflection'    // user answer to a prompt
  | 'conversation'; // threaded Ask-about-this dialogue

export type EntryAuthor =
  | { kind: 'person'; personId: string }
  | { kind: 'system' };

export type EntrySubject =
  | { kind: 'person'; personId: string }
  | { kind: 'bond'; personIds: [string, string] }
  | { kind: 'family' };

export interface ConversationTurn {
  author: EntryAuthor;
  content: string;
  createdAt: Timestamp;
}

export interface Entry {
  id: string;
  familyId: string;

  type: EntryType;
  author: EntryAuthor;
  subjects: EntrySubject[];
  content: string;

  // Only populated for type === 'conversation'.
  turns?: ConversationTurn[];

  // For conversations started from "Ask about this".
  anchorEntryId?: string;

  // For syntheses/nudges: entries this was derived from.
  sourceEntryIds?: string[];

  // Dimension IDs, emotion tags — invisible to user, used for filtering + intelligence.
  tags: string[];

  // Visibility (follows existing journal-entry pattern).
  visibleToUserIds: string[];
  sharedWithUserIds: string[];

  createdAt: Timestamp;
  archivedAt?: Timestamp;
}

// ==================== Type Guards ====================

export function isWrittenEntry(e: Entry): e is Entry & { type: 'written' } {
  return e.type === 'written';
}

export function isObservationEntry(e: Entry): e is Entry & { type: 'observation' } {
  return e.type === 'observation';
}

export function isSynthesisEntry(e: Entry): e is Entry & { type: 'synthesis' } {
  return e.type === 'synthesis';
}

export function isNudgeEntry(e: Entry): e is Entry & { type: 'nudge' } {
  return e.type === 'nudge';
}

export function isPromptEntry(e: Entry): e is Entry & { type: 'prompt' } {
  return e.type === 'prompt';
}

export function isReflectionEntry(e: Entry): e is Entry & { type: 'reflection' } {
  return e.type === 'reflection';
}

export function isActivityEntry(e: Entry): e is Entry & { type: 'activity' } {
  return e.type === 'activity';
}

export function isConversationEntry(
  e: Entry
): e is Entry & { type: 'conversation'; turns: ConversationTurn[] } {
  return e.type === 'conversation' && Array.isArray(e.turns);
}

// ==================== Filter ====================

export interface EntryFilter {
  // Restrict to entries including any of these subjects (OR).
  subjectPersonIds?: string[];
  includeFamilySubject?: boolean;
  includeBonds?: boolean;

  // Restrict to entries of these types (OR).
  types?: EntryType[];

  // Time bounds (inclusive).
  fromDate?: Date;
  toDate?: Date;

  // Include entries soft-archived by the AI cadence (default false).
  includeArchived?: boolean;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/types/entry.test.ts`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/types/entry.ts __tests__/types/entry.test.ts
git commit -m "feat(entries): add Entry type + type guards"
```

---

## Task 2: Adapter — JournalEntry → Entry

**Files:**
- Create: `src/lib/entries/adapter.ts`
- Test: `__tests__/lib/entries/adapter.test.ts`

Reference: the existing `JournalEntry` shape lives at `src/types/journal.ts`. Field map for this task:
- `entryId` → `id`
- `familyId` → `familyId`
- `authorId` → `author = { kind: 'person', personId: authorId }`
- `text` → `content`
- `tags` → `tags`
- `visibleToUserIds`, `sharedWithUserIds` → identical fields
- `createdAt` → `createdAt`
- `subjectPersonId` / `subjectType` (check journal.ts for the subject fields) → `subjects`
- Journal entries do not carry a "type" — they all adapt as `type: 'written'` unless they have a subject other than self, in which case `'observation'`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/entries/adapter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { journalEntryToEntry } from '@/lib/entries/adapter';
import type { JournalEntry } from '@/types/journal';

describe('journalEntryToEntry', () => {
  const baseJournal: JournalEntry = {
    entryId: 'j1',
    familyId: 'f1',
    authorId: 'u1',
    text: 'Dinner was loud tonight.',
    category: 'moment',
    tags: ['dinner'],
    visibleToUserIds: ['u1'],
    sharedWithUserIds: [],
    createdAt: Timestamp.fromMillis(1_700_000_000_000),
  } as JournalEntry;

  it('maps a self-authored entry to written', () => {
    const e = journalEntryToEntry(baseJournal);
    expect(e.id).toBe('j1');
    expect(e.type).toBe('written');
    expect(e.author).toEqual({ kind: 'person', personId: 'u1' });
    expect(e.subjects.length).toBe(0);
    expect(e.content).toBe('Dinner was loud tonight.');
    expect(e.tags).toEqual(['dinner']);
  });

  it('maps an entry about another person to observation', () => {
    const j: JournalEntry = {
      ...baseJournal,
      entryId: 'j2',
      subjectPersonId: 'p-liam',
      subjectType: 'other',
    } as JournalEntry;
    const e = journalEntryToEntry(j);
    expect(e.type).toBe('observation');
    expect(e.subjects).toEqual([{ kind: 'person', personId: 'p-liam' }]);
  });

  it('preserves visibility fields verbatim', () => {
    const j: JournalEntry = {
      ...baseJournal,
      visibleToUserIds: ['u1', 'u2'],
      sharedWithUserIds: ['u2'],
    };
    const e = journalEntryToEntry(j);
    expect(e.visibleToUserIds).toEqual(['u1', 'u2']);
    expect(e.sharedWithUserIds).toEqual(['u2']);
  });

  it('preserves createdAt timestamp', () => {
    const e = journalEntryToEntry(baseJournal);
    expect(e.createdAt.toMillis()).toBe(1_700_000_000_000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/entries/adapter.test.ts`
Expected: FAIL with module-not-found on `@/lib/entries/adapter`.

- [ ] **Step 3: Read the current JournalEntry shape to confirm subject fields**

Run: `cat src/types/journal.ts`
Note: confirm whether subject is `subjectPersonId` + `subjectType` or similar. Adapt the implementation below if field names differ — the test must remain authoritative.

- [ ] **Step 4: Implement `src/lib/entries/adapter.ts`**

Create `src/lib/entries/adapter.ts`:

```typescript
import type { Entry, EntrySubject } from '@/types/entry';
import type { JournalEntry } from '@/types/journal';

/**
 * Convert a legacy JournalEntry into the unified Entry shape.
 *
 * If the journal entry carries a non-self subject, emit type 'observation';
 * otherwise 'written'. Type-inference during the migration stays purely
 * structural — no content analysis here.
 */
export function journalEntryToEntry(j: JournalEntry): Entry {
  const subjects: EntrySubject[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jAny = j as any;
  if (jAny.subjectPersonId && jAny.subjectType && jAny.subjectType !== 'self') {
    subjects.push({ kind: 'person', personId: jAny.subjectPersonId });
  }

  return {
    id: j.entryId,
    familyId: j.familyId,
    type: subjects.length > 0 ? 'observation' : 'written',
    author: { kind: 'person', personId: j.authorId },
    subjects,
    content: j.text,
    tags: j.tags ?? [],
    visibleToUserIds: j.visibleToUserIds ?? [],
    sharedWithUserIds: j.sharedWithUserIds ?? [],
    createdAt: j.createdAt,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/entries/adapter.test.ts`
Expected: PASS — 4 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/entries/adapter.ts __tests__/lib/entries/adapter.test.ts
git commit -m "feat(entries): adapt JournalEntry -> Entry"
```

---

## Task 3: Adapter — Contribution → prompt/reflection pairs

**Files:**
- Modify: `src/lib/entries/adapter.ts`
- Modify: `__tests__/lib/entries/adapter.test.ts`

Each `Contribution.answers` is a map keyed by `"sectionId.questionId"` to answer text. This task emits two Entries per non-empty answer:
- A `prompt` entry authored by `system`, content = question prose (looked up from the existing question bank; for this plan, emit a placeholder `"(question: sectionId.questionId)"` and let a future plan wire the bank).
- A `reflection` entry authored by `{kind: 'person', personId: contributorId}`, anchored to the prompt's id, content = the answer string.

Both entries are tagged with the sectionId as a dimension tag. Both use the contribution's `createdAt` as `createdAt`. Both use the contribution's visibility (derived from the contributor — for the `u1` contributor, `visibleToUserIds: [contributorId]` until a later plan wires family-wide visibility).

- [ ] **Step 1: Add failing tests for contribution adapter**

Append to `__tests__/lib/entries/adapter.test.ts`:

```typescript
import { contributionToEntries } from '@/lib/entries/adapter';
import type { Contribution } from '@/types/person-manual';

describe('contributionToEntries', () => {
  const contribution: Contribution = {
    contributionId: 'c1',
    manualId: 'm1',
    personId: 'p-liam',
    familyId: 'f1',
    contributorId: 'u1',
    contributorName: 'Scott',
    perspectiveType: 'observer',
    relationshipToSubject: 'parent',
    topicCategory: 'personality',
    answers: {
      'childhood.firstMemory': 'Riding bikes.',
      'values.whatMatters': 'Honesty.',
    },
    status: 'complete',
    createdAt: Timestamp.fromMillis(1_700_000_000_000),
    updatedAt: Timestamp.fromMillis(1_700_000_000_000),
  } as Contribution;

  it('emits two entries per answer (prompt + reflection)', () => {
    const entries = contributionToEntries(contribution);
    expect(entries.length).toBe(4);
    const prompts = entries.filter((e) => e.type === 'prompt');
    const reflections = entries.filter((e) => e.type === 'reflection');
    expect(prompts.length).toBe(2);
    expect(reflections.length).toBe(2);
  });

  it('anchors each reflection to its prompt', () => {
    const entries = contributionToEntries(contribution);
    const reflections = entries.filter((e) => e.type === 'reflection');
    for (const r of reflections) {
      expect(r.anchorEntryId).toBeDefined();
      const anchor = entries.find((e) => e.id === r.anchorEntryId);
      expect(anchor?.type).toBe('prompt');
    }
  });

  it('attributes prompts to system and reflections to the contributor', () => {
    const entries = contributionToEntries(contribution);
    const prompt = entries.find((e) => e.type === 'prompt');
    const reflection = entries.find((e) => e.type === 'reflection');
    expect(prompt?.author).toEqual({ kind: 'system' });
    expect(reflection?.author).toEqual({ kind: 'person', personId: 'u1' });
  });

  it('sets subject to the person the contribution is about', () => {
    const entries = contributionToEntries(contribution);
    for (const e of entries) {
      expect(e.subjects).toEqual([{ kind: 'person', personId: 'p-liam' }]);
    }
  });

  it('preserves answer content verbatim in reflection', () => {
    const entries = contributionToEntries(contribution);
    const contents = entries
      .filter((e) => e.type === 'reflection')
      .map((e) => e.content);
    expect(contents).toContain('Riding bikes.');
    expect(contents).toContain('Honesty.');
  });

  it('skips empty or missing answers', () => {
    const c: Contribution = {
      ...contribution,
      answers: { 'a.b': '', 'c.d': '   ', 'e.f': 'Real answer.' },
    };
    const entries = contributionToEntries(c);
    expect(entries.filter((e) => e.type === 'reflection').length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/entries/adapter.test.ts`
Expected: FAIL — `contributionToEntries is not defined`.

- [ ] **Step 3: Implement `contributionToEntries`**

Append to `src/lib/entries/adapter.ts`:

```typescript
import type { Contribution } from '@/types/person-manual';

/**
 * Convert a Contribution's answers into prompt + reflection entry pairs.
 *
 * Each non-empty answer emits:
 *   - a 'prompt' entry (authored by system) carrying the question key
 *   - a 'reflection' entry (authored by the contributor) with the answer text,
 *     anchored to the prompt.
 *
 * Question-prose lookup is deferred to a later plan; for now the prompt
 * content is a placeholder derived from the question key.
 */
export function contributionToEntries(c: Contribution): Entry[] {
  const out: Entry[] = [];
  for (const [questionKey, answerValue] of Object.entries(c.answers ?? {})) {
    const answer = typeof answerValue === 'string' ? answerValue : String(answerValue ?? '');
    if (!answer.trim()) continue;

    const [sectionId] = questionKey.split('.');
    const promptId = `${c.contributionId}:${questionKey}:prompt`;
    const reflectionId = `${c.contributionId}:${questionKey}:reflection`;

    const subjects: EntrySubject[] = [{ kind: 'person', personId: c.personId }];
    const tags = sectionId ? [sectionId] : [];

    out.push({
      id: promptId,
      familyId: c.familyId,
      type: 'prompt',
      author: { kind: 'system' },
      subjects,
      content: `(question: ${questionKey})`,
      tags,
      visibleToUserIds: [c.contributorId],
      sharedWithUserIds: [],
      createdAt: c.createdAt,
    });

    out.push({
      id: reflectionId,
      familyId: c.familyId,
      type: 'reflection',
      author: { kind: 'person', personId: c.contributorId },
      subjects,
      content: answer,
      anchorEntryId: promptId,
      tags,
      visibleToUserIds: [c.contributorId],
      sharedWithUserIds: [],
      createdAt: c.createdAt,
    });
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/entries/adapter.test.ts`
Expected: PASS — all adapter tests green (Task 2 + Task 3).

- [ ] **Step 5: Commit**

```bash
git add src/lib/entries/adapter.ts __tests__/lib/entries/adapter.test.ts
git commit -m "feat(entries): adapt Contribution -> prompt/reflection pairs"
```

---

## Task 4: Adapter — SynthesizedContent → synthesis entries

**Files:**
- Modify: `src/lib/entries/adapter.ts`
- Modify: `__tests__/lib/entries/adapter.test.ts`

`SynthesizedContent` lives on a `PersonManual` doc. It has `overview`, `alignments[]`, `gaps[]`, `blindSpots[]`, `lastSynthesizedAt`. This task converts a manual's synthesized content into 1–4 `synthesis` entries: one for overview (if non-empty), and one per distinct alignment/gap/blind-spot bucket that has content.

Each emitted synthesis entry:
- `author: { kind: 'system' }`
- `subjects: [{ kind: 'person', personId }]` (or `[{ kind: 'family' }]` if this is a family-level synthesis)
- `createdAt: lastSynthesizedAt`
- `id: ${manualId}:synthesis:${bucket}` (e.g., `m1:synthesis:overview`)
- `content` = the bucket's text (overview is a string; alignments/gaps/blindSpots are arrays of `SynthesizedInsight` — join their titles/descriptions into a single string, one per line).

- [ ] **Step 1: Add failing tests**

Append to `__tests__/lib/entries/adapter.test.ts`:

```typescript
import { synthesizedContentToEntries } from '@/lib/entries/adapter';
import type { SynthesizedContent } from '@/types/person-manual';

describe('synthesizedContentToEntries', () => {
  const synth: SynthesizedContent = {
    overview: 'Liam is curious and persistent.',
    alignments: [{ id: 'a1', title: 'Both see persistence', description: '...' }],
    gaps: [],
    blindSpots: [{ id: 'b1', title: 'Under-estimates fatigue', description: '...' }],
    lastSynthesizedAt: Timestamp.fromMillis(1_700_000_000_000),
  } as SynthesizedContent;

  it('emits one entry per non-empty bucket, skipping empty ones', () => {
    const entries = synthesizedContentToEntries({
      familyId: 'f1',
      manualId: 'm1',
      personId: 'p-liam',
      synth,
    });
    // overview + alignments + blindSpots (gaps is empty — skipped).
    expect(entries.length).toBe(3);
    expect(entries.every((e) => e.type === 'synthesis')).toBe(true);
    expect(entries.every((e) => e.author.kind === 'system')).toBe(true);
  });

  it('attributes entries to the person subject', () => {
    const entries = synthesizedContentToEntries({
      familyId: 'f1',
      manualId: 'm1',
      personId: 'p-liam',
      synth,
    });
    for (const e of entries) {
      expect(e.subjects).toEqual([{ kind: 'person', personId: 'p-liam' }]);
    }
  });

  it('supports family-level syntheses', () => {
    const entries = synthesizedContentToEntries({
      familyId: 'f1',
      manualId: 'm-family',
      personId: null,
      synth,
    });
    for (const e of entries) {
      expect(e.subjects).toEqual([{ kind: 'family' }]);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/entries/adapter.test.ts`
Expected: FAIL — `synthesizedContentToEntries is not defined`.

- [ ] **Step 3: Implement the function**

Append to `src/lib/entries/adapter.ts`:

```typescript
import type { SynthesizedContent, SynthesizedInsight } from '@/types/person-manual';

function insightsToText(insights: SynthesizedInsight[] | undefined): string {
  if (!insights || insights.length === 0) return '';
  return insights
    .map((i) => (i.title && i.description ? `${i.title} — ${i.description}` : i.title || i.description || ''))
    .filter(Boolean)
    .join('\n');
}

export function synthesizedContentToEntries(args: {
  familyId: string;
  manualId: string;
  personId: string | null; // null = family-level synthesis
  synth: SynthesizedContent;
}): Entry[] {
  const { familyId, manualId, personId, synth } = args;
  const subjects: EntrySubject[] =
    personId === null
      ? [{ kind: 'family' }]
      : [{ kind: 'person', personId }];
  const createdAt = synth.lastSynthesizedAt;

  const buckets: Array<{ key: string; content: string }> = [
    { key: 'overview', content: synth.overview ?? '' },
    { key: 'alignments', content: insightsToText(synth.alignments) },
    { key: 'gaps', content: insightsToText(synth.gaps) },
    { key: 'blindSpots', content: insightsToText(synth.blindSpots) },
  ];

  return buckets
    .filter((b) => b.content.trim().length > 0)
    .map((b) => ({
      id: `${manualId}:synthesis:${b.key}`,
      familyId,
      type: 'synthesis' as const,
      author: { kind: 'system' as const },
      subjects,
      content: b.content,
      tags: [b.key],
      visibleToUserIds: [],
      sharedWithUserIds: [],
      createdAt,
    }));
}
```

Note: `visibleToUserIds` is empty in Plan 1 — downstream visibility is handled in Plan 2 (query layer will enforce family membership and merge with the caller's userId). Keep it empty here; the query layer is authoritative.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/entries/adapter.test.ts`
Expected: PASS — all adapter tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/entries/adapter.ts __tests__/lib/entries/adapter.test.ts
git commit -m "feat(entries): adapt SynthesizedContent -> synthesis entries"
```

---

## Task 5: Adapter — GrowthItem → nudge/prompt/activity entries

**Files:**
- Modify: `src/lib/entries/adapter.ts`
- Modify: `__tests__/lib/entries/adapter.test.ts`

`GrowthItem` has a `type` (15+ variants from `src/types/growth.ts`) and a `status`. Map as follows:
- `reflection_prompt`, `assessment_prompt`, `journaling` → `prompt` (a question posed to the user)
- `micro_activity`, `conversation_guide`, `partner_exercise`, `solo_deep_dive`, `mindfulness`, `repair_ritual`, `gratitude_practice` → `nudge` (one thing to try)
- Items with `status === 'completed'` → `activity` (something the user did)
- `illustrated_story`, `weekly_arc`, `progress_snapshot` → `nudge` (default bucket)

Read `src/types/growth.ts` to confirm the exact `GrowthItem` shape before writing the adapter. Required fields at minimum: `id`, `familyId`, `type`, `status`, `createdAt`, and a body/title.

- [ ] **Step 1: Confirm the GrowthItem shape**

Run: `cat src/types/growth.ts | head -120`

Identify fields: `id`, `familyId`, `type`, `status`, `title`, `body`, `createdAt`, `subjectPersonId` (or equivalent).

- [ ] **Step 2: Add failing tests**

Append to `__tests__/lib/entries/adapter.test.ts`:

```typescript
import { growthItemToEntry } from '@/lib/entries/adapter';
import type { GrowthItem } from '@/types/growth';

describe('growthItemToEntry', () => {
  const base = {
    id: 'g1',
    familyId: 'f1',
    title: 'Try the long answer',
    body: 'Give Liam the real reason when he asks "why" tonight.',
    createdAt: Timestamp.fromMillis(1_700_000_000_000),
  };

  it('maps micro_activity to nudge', () => {
    const g: GrowthItem = { ...base, type: 'micro_activity', status: 'active' } as GrowthItem;
    const e = growthItemToEntry(g);
    expect(e.type).toBe('nudge');
  });

  it('maps reflection_prompt to prompt', () => {
    const g: GrowthItem = { ...base, type: 'reflection_prompt', status: 'active' } as GrowthItem;
    expect(growthItemToEntry(g).type).toBe('prompt');
  });

  it('completed items become activity regardless of original type', () => {
    const g: GrowthItem = { ...base, type: 'micro_activity', status: 'completed' } as GrowthItem;
    expect(growthItemToEntry(g).type).toBe('activity');
  });

  it('combines title and body into content', () => {
    const g: GrowthItem = { ...base, type: 'micro_activity', status: 'active' } as GrowthItem;
    const e = growthItemToEntry(g);
    expect(e.content).toContain('Try the long answer');
    expect(e.content).toContain('Give Liam the real reason');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/entries/adapter.test.ts`
Expected: FAIL — `growthItemToEntry is not defined`.

- [ ] **Step 4: Implement**

Append to `src/lib/entries/adapter.ts`:

```typescript
import type { GrowthItem, GrowthItemType } from '@/types/growth';

const PROMPT_TYPES: GrowthItemType[] = [
  'reflection_prompt',
  'assessment_prompt',
  'journaling',
];

export function growthItemToEntry(g: GrowthItem): Entry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gAny = g as any;

  let entryType: Entry['type'];
  if (g.status === 'completed') {
    entryType = 'activity';
  } else if (PROMPT_TYPES.includes(g.type)) {
    entryType = 'prompt';
  } else {
    entryType = 'nudge';
  }

  const subjects: EntrySubject[] = gAny.subjectPersonId
    ? [{ kind: 'person', personId: gAny.subjectPersonId }]
    : [];

  const content = [gAny.title, gAny.body].filter(Boolean).join('\n\n');

  return {
    id: g.id,
    familyId: g.familyId,
    type: entryType,
    author: { kind: 'system' },
    subjects,
    content,
    tags: [g.type],
    visibleToUserIds: [],
    sharedWithUserIds: [],
    createdAt: g.createdAt,
    archivedAt: g.status === 'expired' || g.status === 'skipped' ? g.createdAt : undefined,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/entries/adapter.test.ts`
Expected: PASS — all adapter tests green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/entries/adapter.ts __tests__/lib/entries/adapter.test.ts
git commit -m "feat(entries): adapt GrowthItem -> nudge/prompt/activity"
```

---

## Task 6: Query layer — fetchEntries

**Files:**
- Create: `src/lib/entries/query.ts`
- Test: `__tests__/lib/entries/query.test.ts`

`fetchEntries(familyId, filter, db)` returns a `Promise<Entry[]>` that:
1. In parallel, queries `journal_entries`, `person_manuals`, `contributions`, and `growth_items` scoped to `familyId`.
2. Runs each result through the appropriate adapter.
3. Concatenates into one array.
4. Applies the filter (subject, type, date range, archived).
5. Sorts by `createdAt` descending.

Firestore is mocked in tests — we pass in a `db` facade for dependency injection rather than importing `firebase/firestore` directly.

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/entries/query.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { fetchEntries, type EntrySource } from '@/lib/entries/query';
import type { JournalEntry } from '@/types/journal';

describe('fetchEntries', () => {
  const now = Timestamp.fromMillis(1_700_000_000_000);
  const earlier = Timestamp.fromMillis(1_600_000_000_000);

  const source: EntrySource = {
    journalEntries: vi.fn().mockResolvedValue([
      {
        entryId: 'j1',
        familyId: 'f1',
        authorId: 'u1',
        text: 'latest',
        category: 'moment',
        tags: [],
        visibleToUserIds: ['u1'],
        sharedWithUserIds: [],
        createdAt: now,
      } as JournalEntry,
      {
        entryId: 'j2',
        familyId: 'f1',
        authorId: 'u1',
        text: 'earlier',
        category: 'moment',
        tags: [],
        visibleToUserIds: ['u1'],
        sharedWithUserIds: [],
        createdAt: earlier,
      } as JournalEntry,
    ]),
    contributions: vi.fn().mockResolvedValue([]),
    personManuals: vi.fn().mockResolvedValue([]),
    growthItems: vi.fn().mockResolvedValue([]),
  };

  it('queries every source in parallel', async () => {
    await fetchEntries('f1', {}, source);
    expect(source.journalEntries).toHaveBeenCalledWith('f1');
    expect(source.contributions).toHaveBeenCalledWith('f1');
    expect(source.personManuals).toHaveBeenCalledWith('f1');
    expect(source.growthItems).toHaveBeenCalledWith('f1');
  });

  it('returns entries sorted by createdAt descending', async () => {
    const entries = await fetchEntries('f1', {}, source);
    expect(entries.map((e) => e.id)).toEqual(['j1', 'j2']);
  });

  it('applies the types filter', async () => {
    const entries = await fetchEntries('f1', { types: ['synthesis'] }, source);
    expect(entries.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/entries/query.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement query layer**

Create `src/lib/entries/query.ts`:

```typescript
import type { Entry, EntryFilter } from '@/types/entry';
import type { JournalEntry } from '@/types/journal';
import type { Contribution, PersonManual } from '@/types/person-manual';
import type { GrowthItem } from '@/types/growth';
import {
  journalEntryToEntry,
  contributionToEntries,
  synthesizedContentToEntries,
  growthItemToEntry,
} from './adapter';

/**
 * Dependency-injection facade so the query layer is testable without a
 * live Firestore. Production binds these to actual collection reads; tests
 * pass stubs.
 */
export interface EntrySource {
  journalEntries(familyId: string): Promise<JournalEntry[]>;
  contributions(familyId: string): Promise<Contribution[]>;
  personManuals(familyId: string): Promise<PersonManual[]>;
  growthItems(familyId: string): Promise<GrowthItem[]>;
}

export async function fetchEntries(
  familyId: string,
  filter: EntryFilter,
  source: EntrySource
): Promise<Entry[]> {
  const [journals, contribs, manuals, growth] = await Promise.all([
    source.journalEntries(familyId),
    source.contributions(familyId),
    source.personManuals(familyId),
    source.growthItems(familyId),
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

  return applyFilter(entries, filter);
}

export function applyFilter(entries: Entry[], filter: EntryFilter): Entry[] {
  let out = entries;

  if (!filter.includeArchived) {
    out = out.filter((e) => !e.archivedAt);
  }

  if (filter.types && filter.types.length > 0) {
    out = out.filter((e) => filter.types!.includes(e.type));
  }

  if (filter.subjectPersonIds || filter.includeFamilySubject || filter.includeBonds) {
    out = out.filter((e) =>
      e.subjects.some((s) => {
        if (s.kind === 'person' && filter.subjectPersonIds?.includes(s.personId)) return true;
        if (s.kind === 'family' && filter.includeFamilySubject) return true;
        if (s.kind === 'bond' && filter.includeBonds) return true;
        return false;
      })
    );
  }

  if (filter.fromDate) {
    const ms = filter.fromDate.getTime();
    out = out.filter((e) => e.createdAt.toMillis() >= ms);
  }
  if (filter.toDate) {
    const ms = filter.toDate.getTime();
    out = out.filter((e) => e.createdAt.toMillis() <= ms);
  }

  return out.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/entries/query.test.ts`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/entries/query.ts __tests__/lib/entries/query.test.ts
git commit -m "feat(entries): query layer with DI-friendly adapter"
```

---

## Task 7: Hook — useEntries

**Files:**
- Create: `src/hooks/useEntries.ts`
- Test: `__tests__/hooks/useEntries.test.ts`

The hook takes a `familyId` and `filter`, calls `fetchEntries` via a production-bound `EntrySource`, and exposes `{ entries, loading, error }`. It re-fetches when `familyId` or the serialized filter changes.

- [ ] **Step 1: Create the production EntrySource binding**

Append to `src/lib/entries/query.ts`:

```typescript
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

export const firestoreEntrySource: EntrySource = {
  async journalEntries(familyId) {
    const snap = await getDocs(
      query(collection(db, 'journal_entries'), where('familyId', '==', familyId))
    );
    return snap.docs.map((d) => ({ entryId: d.id, ...(d.data() as Omit<JournalEntry, 'entryId'>) }));
  },
  async contributions(familyId) {
    const snap = await getDocs(
      query(collection(db, 'contributions'), where('familyId', '==', familyId))
    );
    return snap.docs.map((d) => ({ contributionId: d.id, ...(d.data() as Omit<Contribution, 'contributionId'>) }));
  },
  async personManuals(familyId) {
    const snap = await getDocs(
      query(collection(db, 'person_manuals'), where('familyId', '==', familyId))
    );
    return snap.docs.map((d) => ({ manualId: d.id, ...(d.data() as Omit<PersonManual, 'manualId'>) }));
  },
  async growthItems(familyId) {
    const snap = await getDocs(
      query(collection(db, 'growth_items'), where('familyId', '==', familyId))
    );
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GrowthItem, 'id'>) }));
  },
};
```

- [ ] **Step 2: Write the failing hook test**

Create `__tests__/hooks/useEntries.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { useEntries } from '@/hooks/useEntries';
import type { EntrySource } from '@/lib/entries/query';
import type { JournalEntry } from '@/types/journal';

describe('useEntries', () => {
  it('returns entries sorted newest-first', async () => {
    const source: EntrySource = {
      journalEntries: vi.fn().mockResolvedValue([
        {
          entryId: 'j1',
          familyId: 'f1',
          authorId: 'u1',
          text: 'hello',
          category: 'moment',
          tags: [],
          visibleToUserIds: ['u1'],
          sharedWithUserIds: [],
          createdAt: Timestamp.now(),
        } as JournalEntry,
      ]),
      contributions: vi.fn().mockResolvedValue([]),
      personManuals: vi.fn().mockResolvedValue([]),
      growthItems: vi.fn().mockResolvedValue([]),
    };

    const { result } = renderHook(() =>
      useEntries({ familyId: 'f1', filter: {}, source })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries.length).toBe(1);
    expect(result.current.entries[0].id).toBe('j1');
    expect(result.current.error).toBeNull();
  });

  it('surfaces errors', async () => {
    const source: EntrySource = {
      journalEntries: vi.fn().mockRejectedValue(new Error('boom')),
      contributions: vi.fn().mockResolvedValue([]),
      personManuals: vi.fn().mockResolvedValue([]),
      growthItems: vi.fn().mockResolvedValue([]),
    };

    const { result } = renderHook(() =>
      useEntries({ familyId: 'f1', filter: {}, source })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();
    expect(result.current.entries).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run __tests__/hooks/useEntries.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the hook**

Create `src/hooks/useEntries.ts`:

```typescript
import { useEffect, useMemo, useState } from 'react';
import type { Entry, EntryFilter } from '@/types/entry';
import {
  fetchEntries,
  firestoreEntrySource,
  type EntrySource,
} from '@/lib/entries/query';

export interface UseEntriesArgs {
  familyId: string | null;
  filter: EntryFilter;
  /** Override for tests; defaults to the Firestore-backed source. */
  source?: EntrySource;
}

export interface UseEntriesResult {
  entries: Entry[];
  loading: boolean;
  error: Error | null;
}

export function useEntries({
  familyId,
  filter,
  source = firestoreEntrySource,
}: UseEntriesArgs): UseEntriesResult {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const filterKey = useMemo(() => JSON.stringify(filter), [filter]);

  useEffect(() => {
    if (!familyId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchEntries(familyId, filter, source)
      .then((es) => {
        if (!cancelled) {
          setEntries(es);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setEntries([]);
          setError(err);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // filterKey intentionally participates in identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, filterKey, source]);

  return { entries, loading, error };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run __tests__/hooks/useEntries.test.ts`
Expected: PASS — 2 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useEntries.ts src/lib/entries/query.ts __tests__/hooks/useEntries.test.ts
git commit -m "feat(entries): useEntries hook with production firestore source"
```

---

## Task 8: Firestore rules for entries collection

**Files:**
- Modify: `firestore.rules`
- Create: `firestore-rules/entries.test.ts`

The new `entries` collection will receive writes in Plan 3. For now, add forward-looking rules so that future writes are secure and reads are possible. Rules:
- Read: user must belong to the entry's `familyId` AND the user's uid must be in `visibleToUserIds` (mirrors `journal_entries` rules).
- Create/Update/Delete: user must belong to the entry's `familyId`. We do not tighten further until Plan 3; this rule is correct even though no writes occur yet.

- [ ] **Step 1: Read the existing journal_entries rules for pattern matching**

Run: `grep -A 25 "match /journal_entries" firestore.rules`
Copy the read/write predicate pattern (family membership + visibility list).

- [ ] **Step 2: Write the failing rules test**

Create `firestore-rules/entries.test.ts`:

```typescript
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'node:fs';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'relish-rules-test',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  // Seed user docs so the rules' getUserData() works.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/alice'), { familyId: 'f1', role: 'parent' });
    await setDoc(doc(db, 'users/bob'), { familyId: 'f2', role: 'parent' });
  });
});

describe('entries collection rules', () => {
  it('allows reads when the caller is in visibleToUserIds', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'entries/e1'), {
        familyId: 'f1',
        visibleToUserIds: ['alice'],
        createdAt: serverTimestamp(),
      });
    });
    const alice = env.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(alice, 'entries/e1')));
  });

  it('denies reads when the caller is not in visibleToUserIds', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'entries/e1'), {
        familyId: 'f1',
        visibleToUserIds: ['alice'],
        createdAt: serverTimestamp(),
      });
    });
    const bob = env.authenticatedContext('bob').firestore();
    await assertFails(getDoc(doc(bob, 'entries/e1')));
  });

  it('allows creates when the caller belongs to the target family', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    await assertSucceeds(
      setDoc(doc(alice, 'entries/e2'), {
        familyId: 'f1',
        visibleToUserIds: ['alice'],
        createdAt: serverTimestamp(),
      })
    );
  });

  it('denies creates across families', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(alice, 'entries/e3'), {
        familyId: 'f2',
        visibleToUserIds: ['alice'],
        createdAt: serverTimestamp(),
      })
    );
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Start the emulator (if not running): `firebase emulators:start --only firestore` in a separate shell. Then:

Run: `npx vitest run firestore-rules/entries.test.ts`
Expected: FAIL — no rule yet for `/entries/{id}`.

Alternative one-shot: `npm run test:rules`.

- [ ] **Step 4: Add the rules block**

Edit `firestore.rules`, inserting near the existing `match /journal_entries/{entryId}` block:

```
    // ==================== Entries (unified stream) ====================
    //
    // New collection introduced by Plan 1 (Entry foundation). Mirrors the
    // journal_entries visibility model: denormalized visibleToUserIds
    // controls reads; family membership gates writes.

    match /entries/{entryId} {
      allow read: if isSignedIn()
                  && belongsToFamily(resource.data.familyId)
                  && request.auth.uid in resource.data.visibleToUserIds;

      allow create: if isSignedIn()
                    && belongsToFamily(request.resource.data.familyId);

      allow update, delete: if isSignedIn()
                            && belongsToFamily(resource.data.familyId);
    }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run firestore-rules/entries.test.ts`
Expected: PASS — 4 tests green.

- [ ] **Step 6: Commit**

```bash
git add firestore.rules firestore-rules/entries.test.ts
git commit -m "feat(entries): security rules for entries collection"
```

---

## Task 9: Firestore index for entries

**Files:**
- Modify: `firestore.indexes.json`

Entries will be queried as `where familyId == X order by createdAt desc`. Composite index required.

- [ ] **Step 1: Read current indexes**

Run: `cat firestore.indexes.json`

- [ ] **Step 2: Add the index**

In `firestore.indexes.json`, append an entry to the `indexes` array:

```json
{
  "collectionGroup": "entries",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "familyId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

Preserve valid JSON — ensure the comma placement is correct.

- [ ] **Step 3: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('firestore.indexes.json','utf8')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 4: Commit**

```bash
git add firestore.indexes.json
git commit -m "feat(entries): composite index familyId+createdAt"
```

---

## Task 10: End-to-end smoke test of the foundation

**Files:**
- Create: `__tests__/lib/entries/foundation.smoke.test.ts`

Confirm that a realistic mix of legacy docs passes through the full pipeline (adapter → query → hook consumers) and produces the expected Entry ordering and filtering.

- [ ] **Step 1: Write the smoke test**

Create `__tests__/lib/entries/foundation.smoke.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { fetchEntries, type EntrySource } from '@/lib/entries/query';
import type { JournalEntry } from '@/types/journal';
import type { Contribution, PersonManual } from '@/types/person-manual';
import type { GrowthItem } from '@/types/growth';

describe('entries foundation — smoke', () => {
  it('yields a unified, sorted stream from all four sources', async () => {
    const t0 = Timestamp.fromMillis(1_700_000_000_000);
    const t1 = Timestamp.fromMillis(1_700_000_001_000);
    const t2 = Timestamp.fromMillis(1_700_000_002_000);
    const t3 = Timestamp.fromMillis(1_700_000_003_000);

    const source: EntrySource = {
      journalEntries: vi.fn().mockResolvedValue([
        { entryId: 'j1', familyId: 'f1', authorId: 'u1', text: 'wrote this', category: 'moment', tags: [], visibleToUserIds: ['u1'], sharedWithUserIds: [], createdAt: t2 } as JournalEntry,
      ]),
      contributions: vi.fn().mockResolvedValue([
        { contributionId: 'c1', manualId: 'm1', personId: 'p-liam', familyId: 'f1', contributorId: 'u1', contributorName: 'Scott', perspectiveType: 'observer', relationshipToSubject: 'parent', topicCategory: 'personality', answers: { 'a.b': 'an answer' }, status: 'complete', createdAt: t0, updatedAt: t0 } as Contribution,
      ]),
      personManuals: vi.fn().mockResolvedValue([
        { manualId: 'm1', familyId: 'f1', personId: 'p-liam', personName: 'Liam', createdAt: t1, updatedAt: t1, synthesizedContent: { overview: 'curious', alignments: [], gaps: [], blindSpots: [], lastSynthesizedAt: t1 } } as PersonManual,
      ]),
      growthItems: vi.fn().mockResolvedValue([
        { id: 'g1', familyId: 'f1', type: 'micro_activity', status: 'active', title: 'Try', body: 'the long answer', createdAt: t3 } as GrowthItem,
      ]),
    };

    const entries = await fetchEntries('f1', {}, source);
    // 1 journal + 2 from contribution (prompt + reflection) + 1 synthesis + 1 growth = 5
    expect(entries.length).toBe(5);
    // Sorted desc by createdAt: g1 (t3) first, then j1 (t2), then synthesis (t1), then contribution pair (t0)
    expect(entries[0].id).toBe('g1');
    expect(entries[1].id).toBe('j1');
  });

  it('filters by subject', async () => {
    const t0 = Timestamp.fromMillis(1_700_000_000_000);
    const source: EntrySource = {
      journalEntries: vi.fn().mockResolvedValue([
        { entryId: 'j1', familyId: 'f1', authorId: 'u1', text: 'about me', category: 'moment', tags: [], visibleToUserIds: ['u1'], sharedWithUserIds: [], createdAt: t0 } as JournalEntry,
      ]),
      contributions: vi.fn().mockResolvedValue([]),
      personManuals: vi.fn().mockResolvedValue([
        { manualId: 'm1', familyId: 'f1', personId: 'p-liam', personName: 'Liam', createdAt: t0, updatedAt: t0, synthesizedContent: { overview: 'about Liam', alignments: [], gaps: [], blindSpots: [], lastSynthesizedAt: t0 } } as PersonManual,
      ]),
      growthItems: vi.fn().mockResolvedValue([]),
    };

    const entries = await fetchEntries('f1', { subjectPersonIds: ['p-liam'] }, source);
    expect(entries.length).toBe(1);
    expect(entries[0].type).toBe('synthesis');
  });
});
```

- [ ] **Step 2: Run the smoke test**

Run: `npx vitest run __tests__/lib/entries/foundation.smoke.test.ts`
Expected: PASS — 2 tests green.

- [ ] **Step 3: Run the full vitest suite**

Run: `npm run test:run`
Expected: all tests green, no regressions in existing suites.

- [ ] **Step 4: Commit**

```bash
git add __tests__/lib/entries/foundation.smoke.test.ts
git commit -m "test(entries): end-to-end smoke for the foundation"
```

---

## Done state

After all tasks pass:

- `Entry` type + guards defined and tested.
- Four adapter functions (journal / contribution / synthesized / growth) convert every legacy shape into `Entry` objects, preserving authored content, timestamps, and attribution.
- `fetchEntries` reads all four legacy collections in parallel, applies filters, sorts by time.
- `useEntries` React hook exposes the unified stream.
- `entries` Firestore collection has secure forward-looking rules + composite index.
- No existing UI, route, or write path has been touched. The app behaves exactly as before today.
- `npm run test:run` green.

Plan 2 (Spread surface) can now consume `useEntries` to render the bound-journal UI at `/`.
