# Companion Entries (multi-perspective responses) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When someone writes a journal entry mentioning you, let you write a *companion entry* — your own perspective on the same moment — linked to theirs. Both sit side-by-side: two views of one event.

**Architecture:** Journal entries get a new optional `respondsToEntryId: string` field. Any user who is in the parent entry's `visibleToUserIds` may create a response; the response is an ordinary `journal_entries` document in every other respect (its own author, text, visibility, tags). A response defaults to the parent entry's visibility but the responder may override with the existing Just-me/Everyone pill. The `/journal/[entryId]` page renders the original plus all responses in a chronological column; composing a response happens inline on that page. No Cloud Functions, no chat, no notifications in v1.

**Tech Stack:** Next.js App Router, React, Firebase Auth, Firestore (client SDK), Firebase security rules v2, Vitest for unit tests, `@firebase/rules-unit-testing` for rules tests.

**Out of scope (explicit):**
- Author notifications (in-app or email) — defer.
- Nested responses (response to a response) — responses are flat, one level deep.
- Editing a response's `respondsToEntryId` after create — immutable.
- Changing the synthesis engine to treat pairs specially — responses get swept up by AI enrichment like any entry.

---

## File Structure

**New files:**
- `src/hooks/useEntryResponses.ts` — live Firestore query for entries with a given parent.
- `src/hooks/useIsMentionedIn.ts` — "is the current user a mentioned subject of this entry?"
- `src/components/journal-spread/CompanionComposer.tsx` — inline "Add your perspective" composer.
- `src/components/journal-spread/ResponseBlock.tsx` — render a single response entry.
- `__tests__/hooks/useEntryResponses.test.ts` — hook unit tests.
- `firestore-rules/companion-responses.test.ts` — rules tests for the new create path.

**Modified files:**
- `src/types/journal.ts` — add `respondsToEntryId?: string` to `JournalEntry` and `CreateEntryInput`.
- `src/hooks/useJournal.ts` — `createEntry` accepts and writes `respondsToEntryId`.
- `firestore.rules` — require `respondsToEntryId` immutable after create; caller must be in parent's `visibleToUserIds`.
- `firestore.indexes.json` — composite index for `(respondsToEntryId ASC, createdAt ASC)`.
- `src/app/journal/[entryId]/page.tsx` — render `<ResponseBlock>` list + `<CompanionComposer>` if mentioned.

---

### Task 1: Branch, baseline, type additions

**Files:**
- Modify: `src/types/journal.ts`

- [ ] **Step 1: Create branch from main**

```bash
git checkout main
git pull
git checkout -b feature/companion-entries
```

- [ ] **Step 2: Baseline test run**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -v surface-recipes.test
npm run test:run -- --reporter=default 2>&1 | tail -20
```

Expected: no TS errors (except the 3 pre-existing ones in `surface-recipes.test.ts`), vitest green.

- [ ] **Step 3: Add `respondsToEntryId` to JournalEntry**

Edit `src/types/journal.ts`, inside the `JournalEntry` interface add **after** `sharedWithUserIds`:

```ts
  // Companion entry — if set, this entry is a response to another
  // entry where the author is one of the subjects (personMentions).
  // Both entries remain independent (own author, own visibility);
  // the link is denormalized one-way on the response. Null/absent
  // for stand-alone entries. Immutable after create.
  respondsToEntryId?: string;
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -v surface-recipes.test
```

Expected: no output (no new errors).

- [ ] **Step 5: Commit**

```bash
git add src/types/journal.ts
git commit -m "feat(responses): add respondsToEntryId field to JournalEntry type"
```

---

### Task 2: `useJournal.createEntry` accepts `respondsToEntryId`

**Files:**
- Modify: `src/hooks/useJournal.ts`
- Test: `__tests__/hooks/useJournal-respondsToEntryId.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `__tests__/hooks/useJournal-respondsToEntryId.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useJournal } from '@/hooks/useJournal';

// Mock firestore addDoc + collection
const addDocMock = vi.fn(async () => ({ id: 'new-entry-id' }));
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore');
  return {
    ...actual,
    addDoc: (...args: unknown[]) => addDocMock(...args),
    collection: vi.fn((_, name: string) => ({ name })),
    Timestamp: actual.Timestamp,
  };
});

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { userId: 'user-A', familyId: 'fam-1' } }),
}));
vi.mock('@/lib/firebase', () => ({ firestore: {} }));

describe('useJournal.createEntry — respondsToEntryId', () => {
  beforeEach(() => {
    addDocMock.mockClear();
  });

  it('writes respondsToEntryId when provided', async () => {
    const { result } = renderHook(() => useJournal());
    await act(async () => {
      await result.current.createEntry({
        text: 'my take',
        category: 'moment',
        respondsToEntryId: 'parent-entry-1',
      });
    });
    expect(addDocMock).toHaveBeenCalledOnce();
    const [, docData] = addDocMock.mock.calls[0] as unknown as [unknown, Record<string, unknown>];
    expect(docData.respondsToEntryId).toBe('parent-entry-1');
  });

  it('omits respondsToEntryId when not provided (no empty string)', async () => {
    const { result } = renderHook(() => useJournal());
    await act(async () => {
      await result.current.createEntry({ text: 'hi', category: 'moment' });
    });
    const [, docData] = addDocMock.mock.calls[0] as unknown as [unknown, Record<string, unknown>];
    expect('respondsToEntryId' in docData).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/hooks/useJournal-respondsToEntryId.test.ts
```

Expected: FAIL. `respondsToEntryId` is not part of `CreateEntryInput` yet, so TS fails to compile, *or* the produced doc doesn't include the field.

- [ ] **Step 3: Add to `CreateEntryInput` and propagate**

In `src/hooks/useJournal.ts`, update the `CreateEntryInput` interface. After `tags?: string[];` add:

```ts
  // If this entry is a response to another entry, the parent's
  // entryId. Written once at create-time; server rules enforce
  // immutability.
  respondsToEntryId?: string;
```

Then in `createEntry` where `docData` is built, **after** the `subjectType` line, add:

```ts
      if (input.respondsToEntryId) {
        docData.respondsToEntryId = input.respondsToEntryId;
      }
```

- [ ] **Step 4: Run test to verify pass**

```bash
npx vitest run __tests__/hooks/useJournal-respondsToEntryId.test.ts
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useJournal.ts __tests__/hooks/useJournal-respondsToEntryId.test.ts
git commit -m "feat(responses): useJournal.createEntry accepts respondsToEntryId"
```

---

### Task 3: Firestore rule — responses require read access to parent and immutable link

**Files:**
- Modify: `firestore.rules`
- Test: `firestore-rules/companion-responses.test.ts` (new)

- [ ] **Step 1: Write failing rules test**

Create `firestore-rules/companion-responses.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { join } from 'path';
import { doc, setDoc, getDoc, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'relish-rules-test',
    firestore: {
      rules: readFileSync(join(process.cwd(), 'firestore.rules'), 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

// Helpers
async function seedUser(uid: string, familyId: string) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), {
      userId: uid,
      familyId,
      role: 'parent',
    });
  });
}
async function seedEntry(entryId: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'journal_entries', entryId), data);
  });
}

describe('journal_entries — respondsToEntryId', () => {
  const FAM = 'fam-1';
  const IRIS = 'iris-uid';
  const SCOTT = 'scott-uid';
  const STRANGER = 'stranger-uid';

  beforeEach(async () => {
    await seedUser(IRIS, FAM);
    await seedUser(SCOTT, FAM);
    await seedUser(STRANGER, 'fam-2');
    // Parent entry: Iris authored, shared with Scott
    await seedEntry('entry-parent', {
      familyId: FAM,
      authorId: IRIS,
      text: 'Scott and I had an argument.',
      category: 'moment',
      visibleToUserIds: [IRIS, SCOTT],
      sharedWithUserIds: [SCOTT],
      personMentions: ['person-scott'],
      tags: [],
      createdAt: Timestamp.now(),
    });
  });

  it('Scott (can read parent) can create a response', async () => {
    const db = env.authenticatedContext(SCOTT).firestore();
    await assertSucceeds(addDoc(collection(db, 'journal_entries'), {
      familyId: FAM,
      authorId: SCOTT,
      text: 'My side.',
      category: 'moment',
      visibleToUserIds: [SCOTT, IRIS],
      sharedWithUserIds: [IRIS],
      personMentions: [],
      tags: [],
      respondsToEntryId: 'entry-parent',
      createdAt: Timestamp.now(),
    }));
  });

  it('Stranger (cannot read parent) cannot create a response', async () => {
    const db = env.authenticatedContext(STRANGER).firestore();
    await assertFails(addDoc(collection(db, 'journal_entries'), {
      familyId: 'fam-2',
      authorId: STRANGER,
      text: 'butting in',
      category: 'moment',
      visibleToUserIds: [STRANGER],
      sharedWithUserIds: [],
      personMentions: [],
      tags: [],
      respondsToEntryId: 'entry-parent',
      createdAt: Timestamp.now(),
    }));
  });

  it('Response author cannot change respondsToEntryId after create', async () => {
    const db = env.authenticatedContext(SCOTT).firestore();
    const ref = await addDoc(collection(db, 'journal_entries'), {
      familyId: FAM,
      authorId: SCOTT,
      text: 'My side.',
      category: 'moment',
      visibleToUserIds: [SCOTT, IRIS],
      sharedWithUserIds: [IRIS],
      personMentions: [],
      tags: [],
      respondsToEntryId: 'entry-parent',
      createdAt: Timestamp.now(),
    });
    await assertFails(updateDoc(ref, { respondsToEntryId: 'some-other-entry' }));
  });

  it('Stand-alone entries still work (no respondsToEntryId)', async () => {
    const db = env.authenticatedContext(SCOTT).firestore();
    await assertSucceeds(addDoc(collection(db, 'journal_entries'), {
      familyId: FAM,
      authorId: SCOTT,
      text: 'just a note',
      category: 'moment',
      visibleToUserIds: [SCOTT],
      sharedWithUserIds: [],
      personMentions: [],
      tags: [],
      createdAt: Timestamp.now(),
    }));
  });
});
```

- [ ] **Step 2: Run rules test to verify it fails**

```bash
npm run test:rules -- firestore-rules/companion-responses.test.ts
```

Expected: at least "cannot change respondsToEntryId after create" FAILS (no such rule yet) and "Stranger cannot create" may pass only coincidentally via the family-mismatch check — we still need to tighten the rule.

- [ ] **Step 3: Update `firestore.rules`**

In `firestore.rules`, locate the `/journal_entries/{entryId}` block. Replace the existing `allow create:` and `allow update:` clauses with these. **Preserve the existing `allow read:` and `allow delete:` clauses unchanged.**

```
      // Creates: author must be caller + in visibleToUserIds (existing
      // rules). If respondsToEntryId is set, the caller must be able to
      // read the parent entry (i.e. be in its visibleToUserIds).
      allow create: if isParent() &&
                       belongsToFamily(request.resource.data.familyId) &&
                       request.resource.data.authorId == request.auth.uid &&
                       request.resource.data.visibleToUserIds is list &&
                       request.auth.uid in request.resource.data.visibleToUserIds &&
                       (
                         !('respondsToEntryId' in request.resource.data) ||
                         request.auth.uid in
                           get(/databases/$(database)/documents/journal_entries/$(request.resource.data.respondsToEntryId)).data.visibleToUserIds
                       );

      // Updates: author-only (existing). respondsToEntryId must NOT
      // change after create — either stay absent or keep the same value.
      allow update: if isParent() &&
                       belongsToFamily(resource.data.familyId) &&
                       resource.data.authorId == request.auth.uid &&
                       (!('visibleToUserIds' in request.resource.data) ||
                        request.auth.uid in request.resource.data.visibleToUserIds) &&
                       (
                         !('respondsToEntryId' in request.resource.data) && !('respondsToEntryId' in resource.data) ||
                         request.resource.data.respondsToEntryId == resource.data.respondsToEntryId
                       );
```

- [ ] **Step 4: Run rules test to verify pass**

```bash
npm run test:rules -- firestore-rules/companion-responses.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add firestore.rules firestore-rules/companion-responses.test.ts
git commit -m "feat(responses): firestore rule gating respondsToEntryId by parent visibility"
```

---

### Task 4: Composite index for `respondsToEntryId`

**Files:**
- Modify: `firestore.indexes.json`

- [ ] **Step 1: Inspect existing indexes**

```bash
cat firestore.indexes.json | head -40
```

- [ ] **Step 2: Add the new composite index**

In `firestore.indexes.json`, locate the top-level `"indexes": [` array. Append an entry (mind the trailing comma of the previous entry):

```json
    {
      "collectionGroup": "journal_entries",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "respondsToEntryId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    }
```

- [ ] **Step 3: Deploy the index (from firebase CLI)**

```bash
firebase deploy --only firestore:indexes
```

Expected: `+  firestore: deployed indexes in firestore.indexes.json successfully`.

- [ ] **Step 4: Commit**

```bash
git add firestore.indexes.json
git commit -m "feat(responses): add composite index for respondsToEntryId"
```

---

### Task 5: `useEntryResponses(entryId)` live query hook

**Files:**
- Create: `src/hooks/useEntryResponses.ts`
- Test: `__tests__/hooks/useEntryResponses.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `__tests__/hooks/useEntryResponses.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEntryResponses } from '@/hooks/useEntryResponses';

// Fake onSnapshot — emits a single snapshot synchronously.
const fakeEntries = [
  { id: 'r2', data: () => ({ entryId: 'r2', text: 'B', respondsToEntryId: 'p1', authorId: 'u2', createdAt: { toDate: () => new Date('2026-04-18T11:00:00Z') } }) },
  { id: 'r1', data: () => ({ entryId: 'r1', text: 'A', respondsToEntryId: 'p1', authorId: 'u1', createdAt: { toDate: () => new Date('2026-04-18T10:00:00Z') } }) },
];
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore');
  return {
    ...actual,
    collection: vi.fn(() => ({})),
    query: vi.fn((...args: unknown[]) => ({ args })),
    where: vi.fn((...args: unknown[]) => ({ where: args })),
    orderBy: vi.fn((...args: unknown[]) => ({ orderBy: args })),
    onSnapshot: vi.fn((_q: unknown, cb: (snap: unknown) => void) => {
      cb({ docs: fakeEntries });
      return () => {};
    }),
  };
});
vi.mock('@/lib/firebase', () => ({ firestore: {} }));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { userId: 'u1', familyId: 'fam-1' } }),
}));

describe('useEntryResponses', () => {
  it('returns responses ordered chronologically, oldest first', async () => {
    const { result } = renderHook(() => useEntryResponses('p1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.responses.map((r) => r.entryId)).toEqual(['r1', 'r2']);
  });

  it('is a no-op when entryId is empty', async () => {
    const { result } = renderHook(() => useEntryResponses(''));
    expect(result.current.responses).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run __tests__/hooks/useEntryResponses.test.ts
```

Expected: module not found (hook doesn't exist yet).

- [ ] **Step 3: Implement the hook**

Create `src/hooks/useEntryResponses.ts`:

```ts
'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { JournalEntry } from '@/types/journal';

interface UseEntryResponsesReturn {
  responses: JournalEntry[];
  loading: boolean;
}

// Live list of entries whose respondsToEntryId === parentEntryId,
// ordered oldest → newest so the page reads like a conversation.
// Read gating still happens in Firestore rules: the caller only
// sees responses they have visibleToUserIds access to.
export function useEntryResponses(
  parentEntryId: string,
): UseEntryResponsesReturn {
  const { user } = useAuth();
  const [responses, setResponses] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(Boolean(parentEntryId));

  useEffect(() => {
    if (!parentEntryId || !user?.familyId) {
      setResponses([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const q = query(
      collection(firestore, 'journal_entries'),
      where('respondsToEntryId', '==', parentEntryId),
      orderBy('createdAt', 'asc'),
    );
    const unsub: Unsubscribe = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({
        ...(d.data() as JournalEntry),
        entryId: d.id,
      }));
      setResponses(rows);
      setLoading(false);
    });
    return () => unsub();
  }, [parentEntryId, user?.familyId]);

  return { responses, loading };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run __tests__/hooks/useEntryResponses.test.ts
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useEntryResponses.ts __tests__/hooks/useEntryResponses.test.ts
git commit -m "feat(responses): useEntryResponses live query hook"
```

---

### Task 6: `useIsMentionedIn(entry)` helper

**Files:**
- Create: `src/hooks/useIsMentionedIn.ts`
- Test: `__tests__/hooks/useIsMentionedIn.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `__tests__/hooks/useIsMentionedIn.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIsMentionedIn } from '@/hooks/useIsMentionedIn';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { userId: 'scott-uid', familyId: 'fam-1' } }),
}));
vi.mock('@/hooks/usePerson', () => ({
  usePerson: () => ({
    people: [
      { personId: 'person-scott', linkedUserId: 'scott-uid' },
      { personId: 'person-iris',  linkedUserId: 'iris-uid'  },
      { personId: 'person-kaleb', linkedUserId: undefined   },
    ],
  }),
}));

describe('useIsMentionedIn', () => {
  it('true when current user\'s linked personId is in personMentions', () => {
    const { result } = renderHook(() => useIsMentionedIn({ personMentions: ['person-scott'], authorId: 'iris-uid' } as never));
    expect(result.current).toBe(true);
  });
  it('false when only other people are mentioned', () => {
    const { result } = renderHook(() => useIsMentionedIn({ personMentions: ['person-iris'], authorId: 'iris-uid' } as never));
    expect(result.current).toBe(false);
  });
  it('false when the current user is the author', () => {
    const { result } = renderHook(() => useIsMentionedIn({ personMentions: ['person-scott'], authorId: 'scott-uid' } as never));
    expect(result.current).toBe(false);
  });
  it('false when entry is null/undefined', () => {
    const { result } = renderHook(() => useIsMentionedIn(null));
    expect(result.current).toBe(false);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run __tests__/hooks/useIsMentionedIn.test.ts
```

Expected: module not found.

- [ ] **Step 3: Implement the hook**

Create `src/hooks/useIsMentionedIn.ts`:

```ts
'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePerson } from '@/hooks/usePerson';
import type { JournalEntry } from '@/types/journal';

// Returns true when the current signed-in user is a subject of `entry`
// — i.e. one of the Persons whose linkedUserId equals user.userId has
// its personId inside entry.personMentions, AND the user is not the
// author of the entry (you can't respond to yourself).
export function useIsMentionedIn(
  entry: Pick<JournalEntry, 'personMentions' | 'authorId'> | null | undefined,
): boolean {
  const { user } = useAuth();
  const { people } = usePerson();

  return useMemo(() => {
    if (!entry || !user?.userId) return false;
    if (entry.authorId === user.userId) return false;
    const myPersonIds = (people ?? [])
      .filter((p) => p.linkedUserId === user.userId)
      .map((p) => p.personId);
    return (entry.personMentions ?? []).some((pid) => myPersonIds.includes(pid));
  }, [entry, user?.userId, people]);
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run __tests__/hooks/useIsMentionedIn.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useIsMentionedIn.ts __tests__/hooks/useIsMentionedIn.test.ts
git commit -m "feat(responses): useIsMentionedIn helper"
```

---

### Task 7: `<ResponseBlock>` — render one response

**Files:**
- Create: `src/components/journal-spread/ResponseBlock.tsx`

- [ ] **Step 1: Read an existing entry block for style reference**

Run `cat src/components/journal-spread/EntryBlock.tsx | head -60` and skim — match typography, spacing, and the private-entry lock glyph convention.

- [ ] **Step 2: Create the component**

Create `src/components/journal-spread/ResponseBlock.tsx`:

```tsx
'use client';

import type { JournalEntry } from '@/types/journal';

interface ResponseBlockProps {
  response: JournalEntry;
  authorName: string;
  currentUserId?: string;
}

// A single companion-entry panel. Offset from the parent with a
// left rule so it reads as "another voice" rather than a comment
// thread. Serif italic header names the author; body is prose.
export function ResponseBlock({ response, authorName, currentUserId }: ResponseBlockProps) {
  const isPrivate =
    currentUserId !== undefined &&
    response.visibleToUserIds.length === 1 &&
    response.visibleToUserIds[0] === currentUserId;

  const created = response.createdAt?.toDate?.();
  const dateLabel = created
    ? created.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : '';

  return (
    <article
      aria-label={`Response from ${authorName}`}
      style={{
        borderLeft: '2px solid var(--r-rule-3)',
        padding: '16px 0 16px 20px',
        marginTop: 24,
      }}
    >
      <header
        style={{
          display: 'flex', alignItems: 'baseline', gap: 12,
          fontFamily: 'var(--r-sans)', fontSize: 12,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--r-text-4)',
        }}
      >
        <span style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 17, textTransform: 'none', letterSpacing: 0, color: 'var(--r-ink)' }}>
          {authorName}
        </span>
        <span aria-hidden>·</span>
        <span>{dateLabel}</span>
        {isPrivate && <span aria-label="Private">🔒</span>}
      </header>
      <p
        style={{
          marginTop: 8,
          fontFamily: 'var(--r-serif)',
          fontSize: 18,
          lineHeight: 'var(--r-leading-body)',
          color: 'var(--r-text-2)',
          whiteSpace: 'pre-wrap',
        }}
      >
        {response.text}
      </p>
    </article>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -v surface-recipes.test
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/journal-spread/ResponseBlock.tsx
git commit -m "feat(responses): ResponseBlock component"
```

---

### Task 8: `<CompanionComposer>` — inline response composer

**Files:**
- Create: `src/components/journal-spread/CompanionComposer.tsx`

- [ ] **Step 1: Create the composer**

Create `src/components/journal-spread/CompanionComposer.tsx`:

```tsx
'use client';

import { useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePerson } from '@/hooks/usePerson';
import { useJournal } from '@/hooks/useJournal';
import type { JournalEntry } from '@/types/journal';

type Visibility = 'just-me' | 'match-parent';

interface CompanionComposerProps {
  parent: JournalEntry;
  onPosted?: (newEntryId: string) => void;
}

// An inline composer rendered under a journal entry when the
// signed-in user is a mentioned subject. Posts a response entry
// whose respondsToEntryId points back at `parent`. Default
// visibility matches the parent (same sharedWithUserIds); the
// responder may override to just-me.
export function CompanionComposer({ parent, onPosted }: CompanionComposerProps) {
  const { user } = useAuth();
  const { people } = usePerson();
  const { createEntry, saving, error } = useJournal();
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('match-parent');
  const ta = useRef<HTMLTextAreaElement>(null);

  // "match-parent" = share with everyone the parent shared with,
  // excluding the current user (who is always in visibleToUserIds
  // via createEntry's internal merge).
  const matchParentShares = useMemo(() => {
    if (!user?.userId) return [];
    return parent.sharedWithUserIds.filter((uid) => uid !== user.userId)
      .concat(parent.authorId !== user.userId ? [parent.authorId] : [])
      .filter((uid, i, arr) => arr.indexOf(uid) === i);
  }, [parent, user?.userId]);

  if (!user?.userId) return null;

  async function submit() {
    if (!text.trim() || saving) return;
    const sharedWithUserIds = visibility === 'just-me' ? [] : matchParentShares;
    const id = await createEntry({
      text: text.trim(),
      category: 'moment',
      personMentions: [],
      sharedWithUserIds,
      respondsToEntryId: parent.entryId,
    });
    setText('');
    onPosted?.(id);
  }

  const authorLabel = (() => {
    const author = (people ?? []).find((p) => p.linkedUserId === parent.authorId);
    return author?.name ?? 'the author';
  })();

  return (
    <section
      aria-label="Add your perspective"
      style={{
        marginTop: 32,
        padding: 20,
        background: 'var(--r-paper-soft)',
        border: '1px solid var(--r-rule-4)',
        borderRadius: 'var(--r-radius-2)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--r-sans)', fontSize: 12,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--r-text-4)', marginBottom: 8,
        }}
      >
        Your perspective
      </div>
      <textarea
        ref={ta}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`How did you experience this?`}
        rows={4}
        style={{
          width: '100%', resize: 'vertical',
          border: 'none', outline: 'none', background: 'transparent',
          fontFamily: 'var(--r-serif)', fontSize: 19, lineHeight: 1.5,
          color: 'var(--r-ink)',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--r-rule-5)' }}>
        <span style={{ fontFamily: 'var(--r-sans)', fontSize: 12, color: 'var(--r-text-4)', fontStyle: 'italic' }}>For</span>
        {(['match-parent', 'just-me'] as const).map((v) => {
          const active = v === visibility;
          const label = v === 'just-me' ? 'Just me' : `Everyone who saw ${authorLabel}'s entry`;
          return (
            <button
              key={v}
              onClick={() => setVisibility(v)}
              style={{
                all: 'unset', cursor: 'pointer',
                padding: '4px 10px',
                fontFamily: 'var(--r-sans)', fontSize: 12,
                color: active ? 'var(--r-leather)' : 'var(--r-text-3)',
                background: active ? 'var(--r-cream-warm)' : 'transparent',
                border: `1px solid ${active ? 'var(--r-cream-warm)' : 'var(--r-rule-4)'}`,
                borderRadius: 'var(--r-radius-pill)',
              }}
            >
              {label}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button
          onClick={submit}
          disabled={!text.trim() || saving}
          style={{
            all: 'unset', cursor: !text.trim() ? 'not-allowed' : 'pointer',
            padding: '8px 18px',
            background: 'var(--r-leather)', color: 'var(--r-ink-reversed)',
            fontFamily: 'var(--r-sans)', fontSize: 12, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            borderRadius: 'var(--r-radius-3)',
            opacity: !text.trim() ? 0.4 : 1,
          }}
        >
          {saving ? 'Posting…' : 'Post response'}
        </button>
      </div>
      {error && (
        <div style={{ marginTop: 8, color: 'var(--r-warn)', fontSize: 13 }}>{error}</div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -v surface-recipes.test
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/journal-spread/CompanionComposer.tsx
git commit -m "feat(responses): CompanionComposer inline composer"
```

---

### Task 9: Wire it into `/journal/[entryId]`

**Files:**
- Modify: `src/app/journal/[entryId]/page.tsx`

- [ ] **Step 1: Inspect the existing page**

```bash
cat src/app/journal/\[entryId\]/page.tsx | head -80
```

Note where the entry body is rendered and where child content would naturally hang (after body, before any footer/chat).

- [ ] **Step 2: Add the imports**

Near the top of `src/app/journal/[entryId]/page.tsx`, add (alphabetized with existing imports):

```tsx
import { usePerson } from '@/hooks/usePerson';
import { useEntryResponses } from '@/hooks/useEntryResponses';
import { useIsMentionedIn } from '@/hooks/useIsMentionedIn';
import { ResponseBlock } from '@/components/journal-spread/ResponseBlock';
import { CompanionComposer } from '@/components/journal-spread/CompanionComposer';
```

- [ ] **Step 3: Load responses + mention state in the component**

Inside the page component, after the existing entry-fetch hook (search for `useJournalEntry` or `entry` and insert immediately below), add:

```tsx
  const { responses } = useEntryResponses(entry?.entryId ?? '');
  const mentioned = useIsMentionedIn(entry);
  const { people } = usePerson();
  const authorNameOf = (authorId: string) =>
    people?.find((p) => p.linkedUserId === authorId)?.name ?? 'Someone';
```

- [ ] **Step 4: Render responses + composer**

Find the JSX block that renders the entry body. **After** it (but still inside the main article/container), insert:

```tsx
        {responses.length > 0 && (
          <section aria-label="Other perspectives" style={{ marginTop: 32 }}>
            {responses.map((r) => (
              <ResponseBlock
                key={r.entryId}
                response={r}
                authorName={authorNameOf(r.authorId)}
                currentUserId={user?.userId}
              />
            ))}
          </section>
        )}
        {mentioned && entry && (
          <CompanionComposer parent={entry} />
        )}
```

- [ ] **Step 5: Typecheck and run unit tests**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -v surface-recipes.test
npm run test:run 2>&1 | tail -10
```

Expected: clean TS, all unit tests pass.

- [ ] **Step 6: Smoke-test in the browser**

```bash
npm run dev
```

Open the dev server. Log in as Scott, open the morning entry Iris wrote (about the argument). Verify:
- The composer appears below the entry body with "Your perspective" label.
- You can type a response and post it.
- The new response appears immediately under the entry with "Scott · 18 Apr, 13:42".
- Log in as Iris in a second browser (private window), open the same entry — Scott's response is visible there.
- Switch back to Scott, change response visibility to "Just me" and post a second one — verify Iris in her window does NOT see that second response after refresh.

- [ ] **Step 7: Commit**

```bash
git add src/app/journal/\[entryId\]/page.tsx
git commit -m "feat(responses): render companion entries + composer on /journal/[entryId]"
```

---

### Task 10: Deploy + verify

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feature/companion-entries
```

- [ ] **Step 2: Find the Vercel preview URL**

```bash
export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:$PATH"
vercel ls --yes | head -4
```

Wait for the preview marked Building to reach Ready. Grab its URL.

- [ ] **Step 3: Smoke-test the preview**

Open `https://<preview>.vercel.app/journal/y9mVQeiYzWmnOljIcG8d` (the real argument entry). Post a response as Scott, verify it renders, then check it appears in Firestore at:

```bash
node scripts/check-todays-entries.js
```

You should see two entries today — Iris's original and Scott's response with `respondsToEntryId: 'y9mVQeiYzWmnOljIcG8d'`.

- [ ] **Step 4: Merge to main**

```bash
git checkout main
git pull
git merge --ff-only feature/companion-entries
git push origin main
```

- [ ] **Step 5: Verify production**

Wait for the prod deployment at `relish.my` to rebuild. Reload `https://relish.my/journal/y9mVQeiYzWmnOljIcG8d` and confirm the composer + response render. Done.

---

## Self-Review Notes

- **Spec coverage:** responses create ✅ (Task 2/3), read ✅ (Task 5), render ✅ (Task 7/9), permission ✅ (Task 3), mention gating ✅ (Task 6), visibility default-from-parent + override ✅ (Task 8), production path ✅ (Task 10).
- **Deferred items** acknowledged in the header: notifications, nesting, editing respondsToEntryId, synthesis engine changes.
- **Type consistency:** `respondsToEntryId` is the field name everywhere (type, hook input, Firestore rule, composite index, composer, UI). `useEntryResponses` returns `responses` (plural). `useIsMentionedIn` returns a bare boolean.
- **No placeholders:** every step has the actual code, exact commands, expected output.
