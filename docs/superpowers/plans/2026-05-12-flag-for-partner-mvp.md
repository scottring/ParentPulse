# Flag-for-Partner MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the author of an AI chat (coach or per-entry) flag a single message for their partner, with optional note + "needs real reply" toggle. Recipient sees it in their open-threads "Waiting on you" list as an in-place accordion row, replies with emoji or text, closure is tracked.

**Architecture:** New `message_flags` Firestore collection holds one doc per flag. Chat messages get stable `messageId`s on persistence (server-side). Recipient discovery rides on the existing `listOpenThreads` plumbing — we add a new `flagged_for_me` reason and a `flag` kind. The recipient row is a new dedicated component (richer than the generic `ClosingActionCard`). A subtle ⚑ badge in `TopChrome` reflects unopened-flag count.

**Tech Stack:** Next.js 16 (App Router) + React 19 + Firebase (Firestore + Cloud Functions JS) + Vitest + Playwright.

**Spec:** `docs/superpowers/specs/2026-05-12-flag-for-partner-design.md`

**Out of scope (for follow-on plans):**
- Chat-level `sharedWithUserIds` toggle and "Open full conversation" link
- Sender's "Sent" list + retract UI
- `seeBy` deadline + `nudgeOverdueFlags` Cloud Function
- Telemetry counters

The MVP intentionally renders the flag with just the quote + note. The "Open full conversation" link is omitted entirely until the sharing toggle ships. Closure works via emoji/note/reply only; no see-by interruption.

---

## File Structure

**New files:**
- `src/types/flag.ts` — `MessageFlag` interface + collection constant + helpers
- `src/lib/flags.ts` — Firestore CRUD wrappers (`createFlag`, `markFlagSeen`, `respondToFlag`)
- `src/lib/__tests__/flags.test.ts` — unit tests for the wrappers
- `src/hooks/useIncomingFlags.ts` — live subscription to `message_flags` where `toUserId == me`
- `src/components/chat/MessageActionPill.tsx` — hover/long-press action pill on a chat message
- `src/components/chat/FlagComposerSheet.tsx` — the composer modal
- `src/components/chat/__tests__/FlagComposerSheet.test.tsx`
- `src/components/open-threads/FlaggedForMeCard.tsx` — collapsed + expanded states with reply form
- `src/components/open-threads/__tests__/FlaggedForMeCard.test.tsx`

**Modified files:**
- `src/hooks/useCoach.ts` — extend `ChatMessage` with `messageId?: string`
- `src/lib/open-threads.ts` — extend `OpenThreadReason` + `OpenThreadKind`, add `flagsForMe` source, emit `flag` threads
- `__tests__/lib/open-threads.test.ts` — add tests for new reason
- `src/hooks/useOpenThreads.ts` — pull from `useIncomingFlags`, pass to `listOpenThreads`
- `src/components/coach/CoachChat.tsx` — wrap each message in `MessageActionPill`
- `src/components/journal-spread/AskAboutEntrySheet.tsx` — same
- `src/components/layout/TopChrome.tsx` — add ⚑ + dot indicator
- `src/components/layout/__tests__/TopChrome.test.tsx`
- `src/design/workbook/TodaySpread.tsx` — branch rendering: `flagged_for_me` uses `FlaggedForMeCard`, others use `ClosingActionCard`
- `src/design/manual/PersonSheet.tsx` — same branch
- `functions/index.js` — assign `messageId` (uuid) to every persisted chat message in `chatWithCoach` and `chatWithEntry`
- `firestore.rules` — add `match /message_flags/{flagId}` block
- `firestore.indexes.json` — composite index for `(toUserId, status, createdAt desc)`
- `firestore-rules/rules.test.ts` — add coverage for `message_flags`

---

### Task 1: MessageFlag type + collection constant

**Files:**
- Create: `src/types/flag.ts`
- Modify: `src/types/index.ts` (re-export)

- [ ] **Step 1: Write the type file**

```ts
// src/types/flag.ts
import type { Timestamp } from 'firebase/firestore';

export const MESSAGE_FLAGS_COLLECTION = 'message_flags';

export type FlagChatKind = 'coach' | 'entry_chat';
export type FlagSenderRole = 'user' | 'assistant';
export type FlagStatus = 'open' | 'seen' | 'closed' | 'retracted';
export type FlagResponseKind = 'emoji' | 'note' | 'reply';

export interface FlagResponse {
  kind: FlagResponseKind;
  value: string;
  at: Timestamp;
}

export interface MessageFlag {
  flagId: string;
  fromUserId: string;
  toUserId: string;
  chatKind: FlagChatKind;
  chatId: string;
  messageId: string;
  senderRole: FlagSenderRole;
  /** Max ~280 chars. Truncated with ellipsis at create time. */
  quoteText: string;
  note?: string;
  needsRealReply: boolean;
  status: FlagStatus;
  seenAt?: Timestamp;
  closedAt?: Timestamp;
  response?: FlagResponse;
  createdAt: Timestamp;
}

export const MAX_QUOTE_CHARS = 280;

export function truncateQuote(raw: string): string {
  const trimmed = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (trimmed.length <= MAX_QUOTE_CHARS) return trimmed;
  return trimmed.slice(0, MAX_QUOTE_CHARS - 1).trimEnd() + '…';
}
```

- [ ] **Step 2: Re-export from `src/types/index.ts`**

Append a line: `export * from './flag';`

- [ ] **Step 3: Commit**

```bash
git add src/types/flag.ts src/types/index.ts
git commit -m "feat(flags): MessageFlag type + collection constant"
```

---

### Task 2: `truncateQuote` unit test

**Files:**
- Create: `src/types/__tests__/flag.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/types/__tests__/flag.test.ts
import { describe, it, expect } from 'vitest';
import { truncateQuote, MAX_QUOTE_CHARS } from '../flag';

describe('truncateQuote', () => {
  it('trims and collapses whitespace', () => {
    expect(truncateQuote('  hello   world  ')).toBe('hello world');
  });

  it('returns short input unchanged', () => {
    expect(truncateQuote('short')).toBe('short');
  });

  it('truncates with ellipsis when over the cap', () => {
    const big = 'x'.repeat(MAX_QUOTE_CHARS + 50);
    const out = truncateQuote(big);
    expect(out).toHaveLength(MAX_QUOTE_CHARS);
    expect(out.endsWith('…')).toBe(true);
  });

  it('handles empty input', () => {
    expect(truncateQuote('')).toBe('');
    expect(truncateQuote(undefined as unknown as string)).toBe('');
  });
});
```

- [ ] **Step 2: Run**

`npm run test:run -- src/types/__tests__/flag.test.ts`

Expected: PASS (logic was already shipped in Task 1, so this is a guard test, not red-first. Acceptable for pure utilities — note in commit message that this is a unit-guard, not a red-green-refactor.)

- [ ] **Step 3: Commit**

```bash
git add src/types/__tests__/flag.test.ts
git commit -m "test(flags): truncateQuote behavior"
```

---

### Task 3: Firestore CRUD wrappers — `createFlag`

**Files:**
- Create: `src/lib/flags.ts`
- Create: `src/lib/__tests__/flags.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/__tests__/flags.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock firestore module BEFORE importing flags
const addDocMock = vi.fn();
const serverTimestampMock = vi.fn(() => ({ __server: true }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, name) => ({ __collection: name })),
  addDoc: (...args: unknown[]) => addDocMock(...args),
  serverTimestamp: () => serverTimestampMock(),
  Timestamp: { now: () => ({ __ts: true }) },
}));
vi.mock('@/lib/firebase', () => ({ firestore: { __firestore: true } }));

import { createFlag } from '../flags';

describe('createFlag', () => {
  beforeEach(() => {
    addDocMock.mockReset();
    addDocMock.mockResolvedValue({ id: 'flag-abc' });
  });

  it('writes a flag doc with status=open, truncated quote, and a server timestamp', async () => {
    const id = await createFlag({
      fromUserId: 'u1',
      toUserId: 'u2',
      chatKind: 'coach',
      chatId: 'conv-1',
      messageId: 'msg-1',
      senderRole: 'assistant',
      quoteText: 'a very long message ' + 'x'.repeat(500),
      note: 'look at this',
      needsRealReply: true,
    });
    expect(id).toBe('flag-abc');
    expect(addDocMock).toHaveBeenCalledTimes(1);
    const [coll, payload] = addDocMock.mock.calls[0];
    expect(coll).toEqual({ __collection: 'message_flags' });
    expect(payload.status).toBe('open');
    expect(payload.fromUserId).toBe('u1');
    expect(payload.toUserId).toBe('u2');
    expect(payload.needsRealReply).toBe(true);
    expect(payload.quoteText.length).toBeLessThanOrEqual(280);
    expect(payload.quoteText.endsWith('…')).toBe(true);
    expect(payload.createdAt).toEqual({ __server: true });
  });

  it('omits note when empty', async () => {
    await createFlag({
      fromUserId: 'u1',
      toUserId: 'u2',
      chatKind: 'coach',
      chatId: 'c',
      messageId: 'm',
      senderRole: 'user',
      quoteText: 'short',
      note: '',
      needsRealReply: false,
    });
    const [, payload] = addDocMock.mock.calls[0];
    expect('note' in payload).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL ("cannot find module ../flags")**

`npm run test:run -- src/lib/__tests__/flags.test.ts`

- [ ] **Step 3: Implement `createFlag`**

```ts
// src/lib/flags.ts
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import {
  MESSAGE_FLAGS_COLLECTION,
  truncateQuote,
  type FlagChatKind,
  type FlagSenderRole,
} from '@/types/flag';

export interface CreateFlagInput {
  fromUserId: string;
  toUserId: string;
  chatKind: FlagChatKind;
  chatId: string;
  messageId: string;
  senderRole: FlagSenderRole;
  quoteText: string;
  note?: string;
  needsRealReply: boolean;
}

export async function createFlag(input: CreateFlagInput): Promise<string> {
  const payload: Record<string, unknown> = {
    fromUserId: input.fromUserId,
    toUserId: input.toUserId,
    chatKind: input.chatKind,
    chatId: input.chatId,
    messageId: input.messageId,
    senderRole: input.senderRole,
    quoteText: truncateQuote(input.quoteText),
    needsRealReply: input.needsRealReply,
    status: 'open',
    createdAt: serverTimestamp(),
  };
  if (input.note && input.note.trim().length > 0) {
    payload.note = input.note.trim();
  }
  const ref = await addDoc(
    collection(firestore, MESSAGE_FLAGS_COLLECTION),
    payload,
  );
  return ref.id;
}
```

- [ ] **Step 4: Run — expect PASS**

`npm run test:run -- src/lib/__tests__/flags.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/flags.ts src/lib/__tests__/flags.test.ts
git commit -m "feat(flags): createFlag wrapper with quote truncation"
```

---

### Task 4: CRUD wrappers — `markFlagSeen` and `respondToFlag`

**Files:**
- Modify: `src/lib/flags.ts`
- Modify: `src/lib/__tests__/flags.test.ts`

- [ ] **Step 1: Append failing tests**

```ts
// add to src/lib/__tests__/flags.test.ts
import { markFlagSeen, respondToFlag } from '../flags';

const updateDocMock = vi.fn();
vi.mock('firebase/firestore', async () => {
  const mod = await vi.importActual<typeof import('firebase/firestore')>(
    'firebase/firestore',
  );
  return {
    ...mod,
    doc: vi.fn((_db, coll, id) => ({ __doc: `${coll}/${id}` })),
    updateDoc: (...args: unknown[]) => updateDocMock(...args),
    serverTimestamp: () => ({ __server: true }),
  };
});

describe('markFlagSeen', () => {
  beforeEach(() => { updateDocMock.mockReset(); });

  it('sets status=seen and seenAt only when status is currently open (idempotent)', async () => {
    await markFlagSeen('flag-1', { currentStatus: 'open' });
    expect(updateDocMock).toHaveBeenCalledWith(
      { __doc: 'message_flags/flag-1' },
      expect.objectContaining({ status: 'seen', seenAt: { __server: true } }),
    );
  });

  it('no-ops if already seen or closed', async () => {
    await markFlagSeen('flag-1', { currentStatus: 'seen' });
    await markFlagSeen('flag-1', { currentStatus: 'closed' });
    expect(updateDocMock).not.toHaveBeenCalled();
  });
});

describe('respondToFlag', () => {
  beforeEach(() => { updateDocMock.mockReset(); });

  it('writes response + status=closed for an emoji reply', async () => {
    await respondToFlag('flag-1', { kind: 'emoji', value: '🫶' });
    expect(updateDocMock).toHaveBeenCalledWith(
      { __doc: 'message_flags/flag-1' },
      expect.objectContaining({
        status: 'closed',
        response: expect.objectContaining({ kind: 'emoji', value: '🫶' }),
        closedAt: { __server: true },
      }),
    );
  });

  it('rejects empty text for a "reply" closure', async () => {
    await expect(
      respondToFlag('flag-1', { kind: 'reply', value: '   ' }),
    ).rejects.toThrow(/non-empty/);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// append to src/lib/flags.ts
import { doc, updateDoc } from 'firebase/firestore';
import type { FlagStatus, FlagResponseKind } from '@/types/flag';

export async function markFlagSeen(
  flagId: string,
  ctx: { currentStatus: FlagStatus },
): Promise<void> {
  // Idempotent: only transition open → seen.
  if (ctx.currentStatus !== 'open') return;
  await updateDoc(doc(firestore, MESSAGE_FLAGS_COLLECTION, flagId), {
    status: 'seen',
    seenAt: serverTimestamp(),
  });
}

export interface RespondInput {
  kind: FlagResponseKind;
  value: string;
}

export async function respondToFlag(
  flagId: string,
  input: RespondInput,
): Promise<void> {
  const trimmed = (input.value ?? '').trim();
  if (input.kind !== 'emoji' && trimmed.length === 0) {
    throw new Error('respondToFlag: a non-empty value is required for note/reply.');
  }
  await updateDoc(doc(firestore, MESSAGE_FLAGS_COLLECTION, flagId), {
    status: 'closed',
    response: {
      kind: input.kind,
      value: input.kind === 'emoji' ? input.value : trimmed,
      at: serverTimestamp(),
    },
    closedAt: serverTimestamp(),
  });
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/flags.ts src/lib/__tests__/flags.test.ts
git commit -m "feat(flags): markFlagSeen + respondToFlag with validation"
```

---

### Task 5: Firestore rules for `message_flags`

**Files:**
- Modify: `firestore.rules`
- Modify: `firestore-rules/rules.test.ts`

- [ ] **Step 1: Add rule tests (RED)**

Append a `describe('message_flags', ...)` block to `firestore-rules/rules.test.ts` with cases:

```ts
describe('message_flags', () => {
  it('sender can create a flag addressed to a connected adult', async () => {
    /* arrange two adult users + family; assertSucceeds on add to message_flags */
  });
  it('sender cannot create a flag with fromUserId != auth.uid', async () => {
    /* assertFails */
  });
  it('non-participant cannot read', async () => {
    /* user u3 attempts get; assertFails */
  });
  it('recipient can update status from open to seen + set seenAt', async () => {
    /* assertSucceeds */
  });
  it('recipient cannot mutate fromUserId or quoteText', async () => {
    /* assertFails */
  });
  it('recipient can write a response and set status=closed', async () => {
    /* assertSucceeds */
  });
  it('sender can set status=retracted only when response is absent', async () => {
    /* assertSucceeds; also assertFails when response exists */
  });
});
```

Use the existing rules-test scaffolding (same shape as `journal_entries` cases already in `rules.test.ts`).

- [ ] **Step 2: Run — expect FAIL on missing rule**

`npm run test:rules`

- [ ] **Step 3: Add rules**

Insert in `firestore.rules` (after the existing journal_entries block):

```
match /message_flags/{flagId} {
  // Read: participants only.
  allow read: if isSignedIn()
              && (resource.data.fromUserId == request.auth.uid
                  || resource.data.toUserId == request.auth.uid);

  // Create: sender writes a doc whose fromUserId is themselves,
  // status is 'open', and toUserId is a different signed-in user.
  allow create: if isSignedIn()
                && request.resource.data.fromUserId == request.auth.uid
                && request.resource.data.toUserId != request.auth.uid
                && request.resource.data.status == 'open';

  // Update by recipient: may set seenAt + status=seen, or response +
  // status=closed + closedAt. May not touch fromUserId/toUserId/
  // chatId/messageId/quoteText/note/needsRealReply.
  allow update: if isSignedIn()
                && resource.data.toUserId == request.auth.uid
                && request.resource.data.fromUserId == resource.data.fromUserId
                && request.resource.data.toUserId == resource.data.toUserId
                && request.resource.data.chatId == resource.data.chatId
                && request.resource.data.messageId == resource.data.messageId
                && request.resource.data.quoteText == resource.data.quoteText
                && request.resource.data.needsRealReply == resource.data.needsRealReply
                && (
                  // open -> seen
                  (resource.data.status == 'open'
                   && request.resource.data.status == 'seen')
                  ||
                  // any -> closed (with response payload)
                  (request.resource.data.status == 'closed'
                   && request.resource.data.response.size() > 0)
                );

  // Retract by sender: only if no response yet.
  allow update: if isSignedIn()
                && resource.data.fromUserId == request.auth.uid
                && !('response' in resource.data)
                && request.resource.data.status == 'retracted';

  allow delete: if false;
}
```

- [ ] **Step 4: Run — expect PASS**

`npm run test:rules`

- [ ] **Step 5: Commit**

```bash
git add firestore.rules firestore-rules/rules.test.ts
git commit -m "feat(flags): firestore rules for message_flags + tests"
```

---

### Task 6: Firestore composite index

**Files:**
- Modify: `firestore.indexes.json`

- [ ] **Step 1: Add index for the recipient query**

```jsonc
{
  "collectionGroup": "message_flags",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "toUserId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

- [ ] **Step 2: Deploy to emulator/staging on next run; commit**

```bash
git add firestore.indexes.json
git commit -m "feat(flags): firestore composite index for recipient query"
```

---

### Task 7: Stable `messageId` on coach chat (server)

**Files:**
- Modify: `functions/index.js`

- [ ] **Step 1: Read the existing `chatWithCoach` write site**

Inspect `functions/index.js` around line 973-985. The current code creates `{role, content}` objects without IDs.

- [ ] **Step 2: Add uuid id at message creation**

In `functions/index.js`, near the top of the file (with other requires), ensure `crypto` is required:

```js
const crypto = require('crypto');
function newMessageId() {
  return crypto.randomUUID();
}
```

Then update the two assignments in `chatWithCoach` (the new user message and the new assistant message):

```js
const newUserMessage = {
  messageId: newMessageId(),
  role: 'user',
  content: userMessage,
  // ...existing fields like timestamp, etc.
};
// ...
const newAssistantMessage = {
  messageId: newMessageId(),
  role: 'assistant',
  content: response,
};
```

Existing stored messages without `messageId` remain readable. The client treats `messageId == null` as "not flaggable."

- [ ] **Step 3: Local smoke test against the emulator (or staging)**

Run a chatWithCoach call; verify the new doc's `messages[]` items contain `messageId` strings.

- [ ] **Step 4: Commit**

```bash
git add functions/index.js
git commit -m "feat(chat): assign stable messageId to new coach messages"
```

---

### Task 8: Confirm entry-chat turn IDs are already stable

**No code change.** Entry chat is stored as a subcollection at
`journal_entries/{entryId}/chat/{turnId}` (see `src/hooks/useEntryChat.ts:15-22`).
The Firestore doc id (`turnId`) is already a stable per-message identifier — no
server change needed for this surface.

For the flag wiring (Task 20): use `chatId = entryId` and `messageId = turnId`
when flagging an entry-chat turn.

- [ ] **Step 1: Confirm by reading `src/hooks/useEntryChat.ts:15-22` — `ChatTurn` already has a `turnId` field.**
- [ ] **Step 2: No commit required.**

---

### Task 9: Client `ChatMessage` type extension

**Files:**
- Modify: `src/hooks/useCoach.ts`

- [ ] **Step 1: Add optional `messageId` field to `ChatMessage`**

In `src/hooks/useCoach.ts`, change the interface:

```ts
export interface ChatMessage {
  messageId?: string;  // server-assigned uuid; absent on optimistic pre-send and legacy messages
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  excluded?: boolean;
}
```

When the server response arrives, populate `messageId` from the response if present. (The current code in `useCoach.ts` constructs `ChatMessage` objects from the callable's return — extend it to copy through any `messageId` the function returns. Server side does not currently return `messageId` in the response payload — that's a follow-up if the client needs it before the next refresh. For MVP we depend on the persisted Firestore stream being re-fetched on focus, which gives stable ids; or we can pass `messageId` back from the callable in Task 7.)

**Implementation note:** add `assistantMessageId` to the `chatWithCoach` callable response in Task 7's return so the client can hydrate stably:

```js
return {
  success: true,
  conversationId: conversationRef.id,
  response,
  assistantMessageId: newAssistantMessage.messageId,
  userMessageId: newUserMessage.messageId,
  // ...
};
```

And in `useCoach.ts` consume them:

```ts
const userMessage: ChatMessage = {
  messageId: undefined, // will be patched below
  role: 'user',
  content,
};
// after callable resolves:
userMessage.messageId = res.data.userMessageId;
const assistantMessage: ChatMessage = {
  messageId: res.data.assistantMessageId,
  role: 'assistant',
  content: res.data.response,
};
```

- [ ] **Step 2: No change needed for `useEntryChat`**

`ChatTurn` already has `turnId` (see Task 8). The flag wiring in Task 20 uses `turnId` directly as `messageId`.

- [ ] **Step 3: Run typecheck**

`npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useCoach.ts functions/index.js
git commit -m "feat(chat): propagate stable messageId to client"
```

---

### Task 10: `useIncomingFlags` hook

**Files:**
- Create: `src/hooks/useIncomingFlags.ts`
- Create: `src/hooks/__tests__/useIncomingFlags.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/hooks/__tests__/useIncomingFlags.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const onSnapshotMock = vi.fn();
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn((...args) => args),
  where: vi.fn((...args) => ({ where: args })),
  orderBy: vi.fn((...args) => ({ orderBy: args })),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
}));
vi.mock('@/lib/firebase', () => ({ firestore: {} }));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'me' } }),
}));

import { useIncomingFlags } from '../useIncomingFlags';

describe('useIncomingFlags', () => {
  beforeEach(() => onSnapshotMock.mockReset());

  it('subscribes to message_flags where toUserId == me && status in [open, seen]', async () => {
    let cb: ((snap: { docs: Array<{ id: string; data: () => unknown }> }) => void) | null = null;
    onSnapshotMock.mockImplementation((_q, callback) => {
      cb = callback;
      return () => {};
    });
    const { result } = renderHook(() => useIncomingFlags());
    expect(result.current.flags).toEqual([]);
    cb?.({
      docs: [
        { id: 'f1', data: () => ({ status: 'open', toUserId: 'me' }) },
        { id: 'f2', data: () => ({ status: 'closed', toUserId: 'me' }) }, // filtered client-side as defense
      ],
    });
    await waitFor(() => expect(result.current.flags.length).toBeGreaterThan(0));
    expect(result.current.flags.map((f) => f.flagId)).toContain('f1');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

`npm run test:run -- src/hooks/__tests__/useIncomingFlags.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/hooks/useIncomingFlags.ts
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  MESSAGE_FLAGS_COLLECTION,
  type MessageFlag,
} from '@/types/flag';

interface UseIncomingFlagsReturn {
  flags: MessageFlag[];
  loading: boolean;
}

/**
 * Live feed of MessageFlag docs where the current user is the recipient
 * and the flag is not yet closed or retracted.
 *
 * Server-side filter uses `status in ['open', 'seen']`. We also filter
 * client-side as a defense-in-depth (e.g., if a doc transitions to
 * 'closed' mid-stream but the snapshot still includes it briefly).
 */
export function useIncomingFlags(): UseIncomingFlagsReturn {
  const { user } = useAuth();
  const [flags, setFlags] = useState<MessageFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setFlags([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(firestore, MESSAGE_FLAGS_COLLECTION),
      where('toUserId', '==', user.uid),
      where('status', 'in', ['open', 'seen']),
    );
    const unsub = onSnapshot(q, (snap) => {
      const out: MessageFlag[] = snap.docs.map((d) => ({
        ...(d.data() as Omit<MessageFlag, 'flagId'>),
        flagId: d.id,
      })).filter((f) => f.status === 'open' || f.status === 'seen');
      setFlags(out);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user?.uid]);

  return { flags, loading };
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useIncomingFlags.ts src/hooks/__tests__/useIncomingFlags.test.ts
git commit -m "feat(flags): useIncomingFlags hook"
```

---

### Task 11: Extend `open-threads.ts` with `flagged_for_me`

**Files:**
- Modify: `src/lib/open-threads.ts`
- Modify: `__tests__/lib/open-threads.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
// add to __tests__/lib/open-threads.test.ts

describe('flagged_for_me', () => {
  it('emits a flag thread for each open/seen flag addressed to me', () => {
    const flags = [
      {
        flagId: 'f1',
        fromUserId: 'scott',
        toUserId: 'me',
        chatKind: 'coach',
        chatId: 'c1',
        messageId: 'm1',
        senderRole: 'assistant',
        quoteText: 'an important line',
        needsRealReply: false,
        status: 'open',
        createdAt: { toDate: () => new Date(), toMillis: () => Date.now() },
      },
    ] as const;
    const out = listOpenThreads({
      moments: [], rituals: [], entries: [],
      flagsForMe: flags as unknown as never,
      me: { userId: 'me', personIds: [] },
    } as never);
    const flagged = out.filter((t) => t.reason === 'flagged_for_me');
    expect(flagged).toHaveLength(1);
    expect(flagged[0].kind).toBe('flag');
    expect(flagged[0].subtitle).toContain('an important line');
  });

  it('orders flagged_for_me before mention_for_me but after pending_invite', () => {
    const now = new Date();
    const makeTs = (d: Date) => ({ toDate: () => d, toMillis: () => d.getTime() });
    const out = listOpenThreads({
      moments: [],
      rituals: [],
      entries: [
        // Entry by someone else, tagged with `me` → mention_for_me
        {
          entryId: 'e1', authorId: 'scott',
          text: 'something about iris',
          personMentions: ['p-iris'],
          createdAt: makeTs(now),
        } as never,
      ],
      pendingInvitesForMe: [
        { momentId: 'mo1', status: 'pending', createdAt: makeTs(now), prompt: 'p' } as never,
      ],
      flagsForMe: [
        {
          flagId: 'f1', fromUserId: 'scott', toUserId: 'me',
          chatKind: 'coach', chatId: 'c1', messageId: 'm1',
          senderRole: 'assistant', quoteText: 'q',
          needsRealReply: false, status: 'open',
          createdAt: makeTs(now),
        } as never,
      ],
      me: { userId: 'me', personIds: ['p-iris'] },
    } as never);
    const reasons = out.map((t) => t.reason);
    const flagIdx = reasons.indexOf('flagged_for_me');
    const invIdx = reasons.indexOf('pending_invite');
    const mentionIdx = reasons.indexOf('mention_for_me');
    expect(invIdx).toBeGreaterThanOrEqual(0);
    expect(flagIdx).toBeGreaterThanOrEqual(0);
    expect(mentionIdx).toBeGreaterThanOrEqual(0);
    expect(invIdx).toBeLessThan(flagIdx);
    expect(flagIdx).toBeLessThan(mentionIdx);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

In `src/lib/open-threads.ts`:

```ts
// Update the unions at the top:
export type OpenThreadReason =
  | 'pending_invite'
  | 'unclosed_divergence'
  | 'incomplete_practice'
  | 'overdue_ritual'
  | 'mention_for_me'
  | 'flagged_for_me';

export type OpenThreadKind = 'moment' | 'entry' | 'ritual' | 'practice' | 'flag';

// Update REASON_PRECEDENCE — insert flagged_for_me at position 2:
const REASON_PRECEDENCE: Record<OpenThreadReason, number> = {
  overdue_ritual: 0,
  pending_invite: 1,
  flagged_for_me: 2,
  incomplete_practice: 3,
  unclosed_divergence: 4,
  mention_for_me: 5,
};

// Extend Sources to include flagsForMe:
interface Sources {
  moments: Moment[];
  rituals: Ritual[];
  entries: JournalEntry[];
  pendingInvitesForMe?: MomentInvite[];
  flagsForMe?: MessageFlag[];  // NEW
  me?: {
    userId: string;
    personIds: string[];
    settledMentionIds?: Set<string>;
  };
  now?: Date;
}

// Inside listOpenThreads, after the mention_for_me block, add:
for (const f of sources.flagsForMe ?? []) {
  if (f.status !== 'open' && f.status !== 'seen') continue;
  open.push({
    id: f.flagId,
    kind: 'flag',
    reason: 'flagged_for_me',
    subtitle: `"${f.quoteText}"`,
    openedAt: f.createdAt?.toDate?.(),
    closingAction: {
      label: 'Open',
      // Rendered inline as an accordion in the FlaggedForMeCard.
      // The href is here for keyboard navigation / deep-link fallback;
      // the Cover surface intercepts and expands in-place.
      href: `?flag=${f.flagId}`,
    },
  });
}
```

Don't forget to import `MessageFlag`:

```ts
import type { MessageFlag } from '@/types/flag';
```

- [ ] **Step 4: Run — expect PASS**

`npm run test:run -- __tests__/lib/open-threads.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/open-threads.ts __tests__/lib/open-threads.test.ts
git commit -m "feat(flags): open-threads emits flagged_for_me rows"
```

---

### Task 12: Wire flags into `useOpenThreads`

**Files:**
- Modify: `src/hooks/useOpenThreads.ts`

- [ ] **Step 1: Use the new hook + pass into listOpenThreads**

At the top of `useOpenThreads.ts`:

```ts
import { useIncomingFlags } from '@/hooks/useIncomingFlags';
```

Inside the hook body, alongside the existing `useJournalEntries()`, `useMomentInvite()`, etc.:

```ts
const { flags } = useIncomingFlags();
```

Inside the `useMemo` (or wherever `listOpenThreads(...)` is called), pass `flagsForMe: flags`.

- [ ] **Step 2: Typecheck**

`npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useOpenThreads.ts
git commit -m "feat(flags): hydrate open-threads with incoming flags"
```

---

### Task 13: `FlaggedForMeCard` — collapsed state

**Files:**
- Create: `src/components/open-threads/FlaggedForMeCard.tsx`
- Create: `src/components/open-threads/__tests__/FlaggedForMeCard.test.tsx`

This component renders the in-place accordion. Collapsed = a row that looks like the mockup (`.superpowers/brainstorm/57979-1778579743/content/cover-row-restored.html`). Expanded = the accordion content from `cover-row-expanded.html`.

- [ ] **Step 1: Write a failing render test**

```tsx
// src/components/open-threads/__tests__/FlaggedForMeCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FlaggedForMeCard } from '../FlaggedForMeCard';
import type { MessageFlag } from '@/types/flag';

const baseFlag: MessageFlag = {
  flagId: 'f1',
  fromUserId: 'scott',
  toUserId: 'iris',
  chatKind: 'coach',
  chatId: 'c1',
  messageId: 'm1',
  senderRole: 'assistant',
  quoteText: 'he waited until bedtime to say it',
  note: 'Read this — I think this is what is going on at dinners.',
  needsRealReply: true,
  status: 'open',
  createdAt: { toDate: () => new Date(), toMillis: () => Date.now() } as never,
};

describe('FlaggedForMeCard (collapsed)', () => {
  it('renders title with sender name and a Needs reply pill when needsRealReply=true', () => {
    render(<FlaggedForMeCard flag={baseFlag} senderDisplayName="Scott" />);
    expect(screen.getByText(/Scott flagged/i)).toBeInTheDocument();
    expect(screen.getByText(/Needs reply/i)).toBeInTheDocument();
  });

  it('does not show the pill when needsRealReply=false', () => {
    render(
      <FlaggedForMeCard
        flag={{ ...baseFlag, needsRealReply: false }}
        senderDisplayName="Scott"
      />,
    );
    expect(screen.queryByText(/Needs reply/i)).not.toBeInTheDocument();
  });

  it('renders quote excerpt as the subtitle', () => {
    render(<FlaggedForMeCard flag={baseFlag} senderDisplayName="Scott" />);
    expect(screen.getByText(/he waited until bedtime/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement collapsed state**

```tsx
// src/components/open-threads/FlaggedForMeCard.tsx
'use client';

import { useState } from 'react';
import type { MessageFlag } from '@/types/flag';

interface Props {
  flag: MessageFlag;
  /** Pretty name for `fromUserId`, looked up by caller. */
  senderDisplayName: string;
  /** Called after a successful response. Parent should refresh / dismiss. */
  onClosed?: () => void;
}

export function FlaggedForMeCard({ flag, senderDisplayName, onClosed }: Props) {
  const [expanded, setExpanded] = useState(false);
  // Implementation of expanded state added in Task 14.
  // For now: collapsed-only render.

  return (
    <button
      type="button"
      className="flag-row"
      onClick={() => setExpanded((v) => !v)}
      aria-expanded={expanded}
    >
      <span className="row-icon" aria-hidden>⚑</span>
      <span className="row-text">
        <span className="title">
          {senderDisplayName} flagged a moment for you
          {flag.needsRealReply && <span className="pill-warn"> Needs reply</span>}
        </span>
        <span className="sub">&ldquo;{flag.quoteText}&rdquo;</span>
      </span>

      <style jsx>{`
        .flag-row {
          all: unset;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          background: #fffaf0;
          border: 1px solid #ead9b4;
          border-left: 3px solid #b65f3a;
          border-radius: 8px;
          padding: 11px 14px;
          margin-bottom: 7px;
          box-sizing: border-box;
        }
        .row-icon {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, #b65f3a, #d4a25a);
          color: white;
          display: grid; place-items: center;
          font-size: 14px; flex-shrink: 0;
        }
        .row-text {
          flex: 1; display: flex; flex-direction: column; gap: 2px;
          text-align: left;
        }
        .title { font-size: 13px; font-weight: 600; color: #2a2a2a; }
        .sub {
          font-size: 12px; color: #6a6055; font-style: italic;
          overflow: hidden; text-overflow: ellipsis;
          display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical;
        }
        .pill-warn {
          display: inline-block; margin-left: 6px;
          background: #f4ddc4; color: #8b3a18;
          font-size: 10px; padding: 1px 7px; border-radius: 999px;
          text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;
        }
      `}</style>
    </button>
  );
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/open-threads/FlaggedForMeCard.tsx src/components/open-threads/__tests__/FlaggedForMeCard.test.tsx
git commit -m "feat(flags): FlaggedForMeCard collapsed state"
```

---

### Task 14: `FlaggedForMeCard` — expanded state + reply flow

**Files:**
- Modify: `src/components/open-threads/FlaggedForMeCard.tsx`
- Modify: `src/components/open-threads/__tests__/FlaggedForMeCard.test.tsx`

- [ ] **Step 1: Append failing tests**

```tsx
import { fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('@/lib/flags', () => ({
  markFlagSeen: vi.fn().mockResolvedValue(undefined),
  respondToFlag: vi.fn().mockResolvedValue(undefined),
}));
import { markFlagSeen, respondToFlag } from '@/lib/flags';

describe('FlaggedForMeCard (expanded)', () => {
  it('calls markFlagSeen with the flag id on first expand', async () => {
    render(<FlaggedForMeCard flag={baseFlag} senderDisplayName="Scott" />);
    fireEvent.click(screen.getByRole('button', { name: /Scott flagged/i }));
    expect(markFlagSeen).toHaveBeenCalledWith('f1', { currentStatus: 'open' });
  });

  it('shows the note + quote when expanded', async () => {
    render(<FlaggedForMeCard flag={baseFlag} senderDisplayName="Scott" />);
    fireEvent.click(screen.getByRole('button', { name: /Scott flagged/i }));
    expect(await screen.findByText(/Read this/)).toBeInTheDocument();
  });

  it('emoji buttons are hidden when needsRealReply is true', () => {
    render(<FlaggedForMeCard flag={baseFlag} senderDisplayName="Scott" />);
    fireEvent.click(screen.getByRole('button', { name: /Scott flagged/i }));
    expect(screen.queryByRole('button', { name: '🫶' })).not.toBeInTheDocument();
  });

  it('clicking an emoji on a non-needsReply flag calls respondToFlag', () => {
    render(
      <FlaggedForMeCard
        flag={{ ...baseFlag, needsRealReply: false }}
        senderDisplayName="Scott"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Scott flagged/i }));
    fireEvent.click(screen.getByRole('button', { name: '🫶' }));
    expect(respondToFlag).toHaveBeenCalledWith('f1', { kind: 'emoji', value: '🫶' });
  });

  it('Send button submits the text reply', () => {
    render(<FlaggedForMeCard flag={baseFlag} senderDisplayName="Scott" />);
    fireEvent.click(screen.getByRole('button', { name: /Scott flagged/i }));
    const input = screen.getByPlaceholderText(/Write Scott back/);
    fireEvent.change(input, { target: { value: 'Got it. Lets talk tonight.' } });
    fireEvent.click(screen.getByRole('button', { name: /Send/i }));
    expect(respondToFlag).toHaveBeenCalledWith('f1', {
      kind: 'reply',
      value: 'Got it. Lets talk tonight.',
    });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement expanded UI**

Replace the body of `FlaggedForMeCard.tsx` with the full version. The collapsed surface stays the same; we add an expanded section below it.

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { markFlagSeen, respondToFlag } from '@/lib/flags';
import type { MessageFlag } from '@/types/flag';

interface Props {
  flag: MessageFlag;
  senderDisplayName: string;
  onClosed?: () => void;
}

const EMOJI_OPTIONS = ['🫶', '😬', '🤔', '👀', '👍'] as const;

export function FlaggedForMeCard({ flag, senderDisplayName, onClosed }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const seenFiredRef = useRef(false);

  useEffect(() => {
    if (!expanded || seenFiredRef.current) return;
    seenFiredRef.current = true;
    markFlagSeen(flag.flagId, { currentStatus: flag.status }).catch(() => {
      // swallow — non-critical
    });
  }, [expanded, flag.flagId, flag.status]);

  const handleEmoji = async (e: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await respondToFlag(flag.flagId, { kind: 'emoji', value: e });
      onClosed?.();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSend = async () => {
    const text = replyText.trim();
    if (text.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      await respondToFlag(flag.flagId, {
        kind: flag.needsRealReply ? 'reply' : 'note',
        value: text,
      });
      onClosed?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`flag-row ${expanded ? 'expanded' : ''}`}>
      <button
        type="button"
        className="row-head"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="row-icon" aria-hidden>⚑</span>
        <span className="row-text">
          <span className="title">
            {senderDisplayName} flagged a moment for you
            {flag.needsRealReply && <span className="pill-warn"> Needs reply</span>}
          </span>
          {!expanded ? (
            <span className="sub">&ldquo;{flag.quoteText}&rdquo;</span>
          ) : (
            <span className="sub">
              {timeAgo(flag.createdAt)}
              {flag.needsRealReply ? ' · wants a written reply' : ''}
            </span>
          )}
        </span>
        <span className="caret" aria-hidden>{expanded ? '▴' : '▾'}</span>
      </button>

      {expanded && (
        <div className="expanded-body">
          {flag.note && <p className="note">{flag.note}</p>}
          <blockquote className="quote">&ldquo;{flag.quoteText}&rdquo;</blockquote>

          <div className="reply-row">
            <input
              type="text"
              className="reply-input"
              placeholder={`Write ${senderDisplayName} back…`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
            />
            <button
              type="button"
              className="send"
              onClick={handleSend}
              disabled={submitting || replyText.trim().length === 0}
            >
              Send
            </button>
          </div>

          {!flag.needsRealReply && (
            <div className="emoji-row" role="group" aria-label="Quick reactions">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  className="emoji"
                  onClick={() => handleEmoji(e)}
                  disabled={submitting}
                  aria-label={e}
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          {flag.needsRealReply && (
            <p className="needs-line">
              {senderDisplayName} asked for a written reply, not just a tap.
            </p>
          )}
        </div>
      )}

      <style jsx>{`
        .flag-row {
          background: #fffaf0;
          border: 1px solid #ead9b4;
          border-left: 3px solid #b65f3a;
          border-radius: 8px;
          padding: 0;
          margin-bottom: 7px;
        }
        .row-head {
          all: unset;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 11px 14px;
          box-sizing: border-box;
        }
        .row-icon {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, #b65f3a, #d4a25a);
          color: white;
          display: grid; place-items: center;
          font-size: 14px; flex-shrink: 0;
        }
        .row-text {
          flex: 1; display: flex; flex-direction: column; gap: 2px;
          text-align: left;
        }
        .title { font-size: 13px; font-weight: 600; color: #2a2a2a; }
        .sub {
          font-size: 12px; color: #6a6055; font-style: italic;
        }
        .pill-warn {
          display: inline-block; margin-left: 6px;
          background: #f4ddc4; color: #8b3a18;
          font-size: 10px; padding: 1px 7px; border-radius: 999px;
          text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;
        }
        .caret { color: #8a7a55; font-size: 12px; }
        .expanded-body {
          padding: 0 18px 14px 58px;
        }
        .note {
          font-size: 13px; line-height: 1.55; color: #4a4030;
          margin: 0 0 12px;
        }
        .quote {
          margin: 0 0 14px; padding: 2px 0 2px 12px;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 17px; line-height: 1.5; color: #2a2a2a;
          font-style: italic; border-left: 2px solid #b65f3a;
        }
        .reply-row {
          display: flex; gap: 8px; align-items: center;
          border-top: 1px solid #f0e6cf; padding-top: 12px;
        }
        .reply-input {
          flex: 1; border: 1px solid #ead9b4; border-radius: 6px;
          padding: 8px 10px; font-size: 13px; background: #fffefb;
        }
        .send {
          background: #b65f3a; color: white; border: none;
          padding: 8px 14px; border-radius: 6px;
          font-size: 12px; font-weight: 600; cursor: pointer;
        }
        .send:disabled { opacity: 0.5; cursor: default; }
        .emoji-row { display: flex; gap: 6px; margin-top: 10px; }
        .emoji {
          background: #f1ead4; border: 1px solid #d9c98a;
          width: 34px; height: 34px; border-radius: 50%;
          display: grid; place-items: center;
          font-size: 17px; cursor: pointer;
        }
        .needs-line {
          font-size: 11px; color: #8b3a18;
          font-style: italic; margin: 8px 0 0;
        }
      `}</style>
    </div>
  );
}

function timeAgo(ts: { toMillis?: () => number } | null | undefined): string {
  const ms = ts?.toMillis?.();
  if (!ms) return 'just now';
  const diffMin = Math.floor((Date.now() - ms) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/open-threads/FlaggedForMeCard.tsx src/components/open-threads/__tests__/FlaggedForMeCard.test.tsx
git commit -m "feat(flags): FlaggedForMeCard expanded accordion + reply"
```

---

### Task 15: Render `FlaggedForMeCard` from existing open-threads consumers

**Files:**
- Modify: `src/design/workbook/TodaySpread.tsx`
- Modify: `src/design/manual/PersonSheet.tsx`

These are the surfaces that currently call `threads.map(...)` to render `ClosingActionCard`. They need to branch on `thread.kind === 'flag'`.

- [ ] **Step 1: Modify TodaySpread**

Locate the `threads.map(...)` block (around line 69 in `TodaySpread.tsx`). Replace with:

```tsx
{threads.map((t, i) => {
  if (t.kind === 'flag') {
    return (
      <FlaggedForMeCard
        key={t.id}
        flag={flagsById[t.id]}
        senderDisplayName={lookupDisplayName(flagsById[t.id]?.fromUserId)}
      />
    );
  }
  return <ClosingActionCard key={t.id} thread={t} />;
})}
```

Both helpers are derived inside the surface component (no API surface changes to `useOpenThreads`):

```tsx
import { useMemo } from 'react';
import { useIncomingFlags } from '@/hooks/useIncomingFlags';
import { usePerson } from '@/hooks/usePerson';

// inside the component:
const { flags } = useIncomingFlags();
const { people } = usePerson();
const flagsById = useMemo(
  () => Object.fromEntries(flags.map((f) => [f.flagId, f])),
  [flags],
);
const displayNameByUserId = useMemo(() => {
  const map: Record<string, string> = {};
  for (const p of people) {
    if (p.linkedUserId && p.displayName) {
      map[p.linkedUserId] = p.displayName;
    }
  }
  return map;
}, [people]);
const lookupDisplayName = (userId: string | undefined): string =>
  (userId && displayNameByUserId[userId]) || 'Someone';
```

- [ ] **Step 2: Same change to PersonSheet**

Apply the identical pattern in `PersonSheet.tsx` around line 115.

- [ ] **Step 3: Manual smoke test**

Start the dev server: `npm run dev`. Create a flag in Firestore manually (or via dev tools). Verify it renders correctly in TodaySpread for the recipient.

- [ ] **Step 4: Commit**

```bash
git add src/design/workbook/TodaySpread.tsx src/design/manual/PersonSheet.tsx
git commit -m "feat(flags): render FlaggedForMeCard in open-threads surfaces"
```

---

### Task 16: Top-chrome ⚑ badge

**Files:**
- Modify: `src/components/layout/TopChrome.tsx`
- Modify: `src/components/layout/__tests__/TopChrome.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { vi } from 'vitest';

vi.mock('@/hooks/useIncomingFlags', () => ({
  useIncomingFlags: () => ({
    flags: [{ flagId: 'f1', status: 'open' }],
    loading: false,
  }),
}));

it('renders a flag indicator dot when there is at least one open flag', () => {
  render(<TopChrome />);
  expect(screen.getByLabelText(/flagged for you/i)).toBeInTheDocument();
});
```

(If the existing test file doesn't already mock `useAuth`/etc., extend the existing mocks to include the same.)

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

In `src/components/layout/TopChrome.tsx`, add:

```tsx
import { useIncomingFlags } from '@/hooks/useIncomingFlags';

// inside the component:
const { flags } = useIncomingFlags();
const openFlagCount = flags.length; // already filtered to open/seen by hook

// in the chrome-right cluster:
{openFlagCount > 0 && (
  <a
    className="flag-bell"
    href="/" /* or whatever surface renders FlaggedForMeCard */
    aria-label={`${openFlagCount} flagged for you`}
  >
    <span aria-hidden>⚑</span>
    <span className="dot" aria-hidden />
    {openFlagCount > 1 && <span className="count">{openFlagCount}</span>}
  </a>
)}
```

Add scoped styles matching the mockup — a small clay dot and (when count ≥ 2) a number.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/TopChrome.tsx src/components/layout/__tests__/TopChrome.test.tsx
git commit -m "feat(flags): top-chrome ⚑ indicator for incoming flags"
```

---

### Task 17: `MessageActionPill` component

**Files:**
- Create: `src/components/chat/MessageActionPill.tsx`
- Create: `src/components/chat/__tests__/MessageActionPill.test.tsx`

The pill is a small floating pill that appears on hover/long-press over a chat message, with a primary "Flag for…" action. For MVP we render it as a "More" trigger button that opens a popover with options; the only option for now is "Flag for…" (Copy, Keep are out of scope unless they already exist).

- [ ] **Step 1: Test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageActionPill } from '../MessageActionPill';

describe('MessageActionPill', () => {
  it('calls onFlag when Flag for is clicked', () => {
    const onFlag = vi.fn();
    render(<MessageActionPill onFlag={onFlag} />);
    fireEvent.click(screen.getByRole('button', { name: /Flag for/i }));
    expect(onFlag).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```tsx
'use client';

interface Props {
  onFlag: () => void;
}

export function MessageActionPill({ onFlag }: Props) {
  return (
    <div className="action-pill" role="toolbar" aria-label="Message actions">
      <button type="button" className="action primary" onClick={onFlag}>
        ⚑ Flag for…
      </button>

      <style jsx>{`
        .action-pill {
          position: absolute;
          top: -12px;
          right: 8px;
          background: #2a2a2a;
          color: #f1ead4;
          border-radius: 999px;
          padding: 3px 9px;
          font-size: 10px;
          display: flex;
          gap: 9px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .action {
          all: unset;
          cursor: pointer;
          opacity: 0.85;
        }
        .action.primary { color: #ffd49b; opacity: 1; font-weight: 600; }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/MessageActionPill.tsx src/components/chat/__tests__/MessageActionPill.test.tsx
git commit -m "feat(flags): MessageActionPill component"
```

---

### Task 18: `FlagComposerSheet` component

**Files:**
- Create: `src/components/chat/FlagComposerSheet.tsx`
- Create: `src/components/chat/__tests__/FlagComposerSheet.test.tsx`

For MVP, this sheet has: quote preview, recipient chip (single connected adult auto-default), note textarea, needsRealReply toggle, Cancel/Submit.

(The "see by" field is deferred to the nudge follow-on plan. Don't add it.)

- [ ] **Step 1: Tests**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FlagComposerSheet } from '../FlagComposerSheet';

vi.mock('@/lib/flags', () => ({
  createFlag: vi.fn().mockResolvedValue('new-flag-id'),
}));
import { createFlag } from '@/lib/flags';

const baseProps = {
  open: true,
  quoteText: 'he waited until bedtime to say it',
  chatKind: 'coach' as const,
  chatId: 'c1',
  messageId: 'm1',
  senderRole: 'assistant' as const,
  fromUserId: 'scott',
  defaultRecipient: { userId: 'iris', displayName: 'Iris' },
  onClose: vi.fn(),
};

describe('FlagComposerSheet', () => {
  it('renders the quote and a default recipient chip', () => {
    render(<FlagComposerSheet {...baseProps} />);
    expect(screen.getByText(/he waited until bedtime/)).toBeInTheDocument();
    expect(screen.getByText('Iris')).toBeInTheDocument();
  });

  it('submits createFlag with current form state', async () => {
    render(<FlagComposerSheet {...baseProps} />);
    fireEvent.change(screen.getByLabelText(/Note/i), {
      target: { value: 'look at this' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Flag for Iris/i }));
    await waitFor(() => expect(createFlag).toHaveBeenCalled());
    expect(createFlag).toHaveBeenCalledWith(expect.objectContaining({
      fromUserId: 'scott',
      toUserId: 'iris',
      chatKind: 'coach',
      chatId: 'c1',
      messageId: 'm1',
      senderRole: 'assistant',
      quoteText: 'he waited until bedtime to say it',
      note: 'look at this',
      needsRealReply: false,
    }));
  });

  it('passes needsRealReply=true when toggle is on', async () => {
    render(<FlagComposerSheet {...baseProps} />);
    fireEvent.click(screen.getByRole('switch', { name: /Needs a real reply/i }));
    fireEvent.click(screen.getByRole('button', { name: /Flag for Iris/i }));
    await waitFor(() => expect(createFlag).toHaveBeenCalled());
    expect(createFlag).toHaveBeenCalledWith(expect.objectContaining({
      needsRealReply: true,
    }));
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```tsx
'use client';

import { useState } from 'react';
import { createFlag } from '@/lib/flags';
import type { FlagChatKind, FlagSenderRole } from '@/types/flag';

interface Recipient {
  userId: string;
  displayName: string;
}

interface Props {
  open: boolean;
  fromUserId: string;
  defaultRecipient: Recipient;
  chatKind: FlagChatKind;
  chatId: string;
  messageId: string;
  senderRole: FlagSenderRole;
  quoteText: string;
  onClose: () => void;
}

export function FlagComposerSheet({
  open,
  fromUserId,
  defaultRecipient,
  chatKind,
  chatId,
  messageId,
  senderRole,
  quoteText,
  onClose,
}: Props) {
  const [note, setNote] = useState('');
  const [needsRealReply, setNeedsRealReply] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await createFlag({
        fromUserId,
        toUserId: defaultRecipient.userId,
        chatKind,
        chatId,
        messageId,
        senderRole,
        quoteText,
        note: note.trim() || undefined,
        needsRealReply,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="sheet">
        <h4>Flag this for someone</h4>
        <blockquote className="quote">&ldquo;{quoteText}&rdquo;</blockquote>

        <div className="field">
          <label className="label">For</label>
          <span className="chip">
            <span className="avatar" aria-hidden>
              {defaultRecipient.displayName.charAt(0)}
            </span>
            {defaultRecipient.displayName}
          </span>
        </div>

        <div className="field">
          <label className="label" htmlFor="flag-note">Note (optional)</label>
          <textarea
            id="flag-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What do you want them to notice?"
          />
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={needsRealReply}
          aria-label="Needs a real reply"
          className={`toggle ${needsRealReply ? 'on' : 'off'}`}
          onClick={() => setNeedsRealReply((v) => !v)}
        >
          <span className="switch" aria-hidden />
          <span className="toggle-body">
            <strong>Needs a real reply</strong>
            <span>
              An emoji or tap won't close the loop — they'll see this is
              marked for a written response.
            </span>
          </span>
        </button>

        <div className="footer">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            Flag for {defaultRecipient.displayName}
          </button>
        </div>

        <style jsx>{`
          .overlay {
            position: fixed; inset: 0;
            background: rgba(40, 30, 18, 0.4);
            display: grid; place-items: center;
            z-index: 1000;
          }
          .sheet {
            background: white;
            border: 1px solid #d9c98a;
            border-radius: 12px;
            padding: 18px;
            box-shadow: 0 10px 28px rgba(0,0,0,0.10);
            max-width: 440px;
            width: calc(100% - 32px);
          }
          h4 {
            font-family: 'Cormorant Garamond', Georgia, serif;
            font-size: 18px; margin: 0 0 12px; color: #2a2a2a;
          }
          .quote {
            margin: 0 0 14px;
            background: #fbf6ea;
            border-left: 3px solid #b65f3a;
            padding: 8px 11px; border-radius: 4px;
            font-size: 12px; line-height: 1.5;
            color: #4a4030; font-style: italic;
          }
          .field { margin-bottom: 12px; }
          .label {
            display: block; font-size: 11px;
            text-transform: uppercase; letter-spacing: 0.06em;
            color: #8a7a55; margin-bottom: 4px;
          }
          .chip {
            display: inline-flex; align-items: center; gap: 6px;
            background: #f1ead4; border: 1px solid #d9c98a;
            border-radius: 999px; padding: 3px 10px 3px 4px;
            font-size: 12px;
          }
          .avatar {
            width: 18px; height: 18px; border-radius: 50%;
            background: linear-gradient(135deg, #b65f3a, #d4a25a);
            color: white; font-size: 10px; font-weight: 600;
            display: grid; place-items: center;
          }
          textarea {
            width: 100%; border: 1px solid #ead9b4; border-radius: 6px;
            padding: 7px 9px; font-size: 13px;
            background: #fffefb; box-sizing: border-box;
            min-height: 56px; resize: vertical; font-family: inherit;
          }
          .toggle {
            all: unset; cursor: pointer; display: flex; gap: 9px;
            padding: 10px; border: 1px dashed #d9c98a;
            border-radius: 6px; background: #fdfaf0;
            margin-bottom: 10px; align-items: flex-start;
          }
          .switch {
            width: 30px; height: 16px; border-radius: 999px;
            background: #c8bfa8; position: relative; flex-shrink: 0;
            margin-top: 2px;
          }
          .switch::after {
            content: ''; position: absolute;
            width: 12px; height: 12px;
            background: white; border-radius: 50%;
            top: 2px; left: 2px;
          }
          .toggle.on .switch { background: #b65f3a; }
          .toggle.on .switch::after { left: auto; right: 2px; }
          .toggle-body { font-size: 12px; line-height: 1.4; }
          .toggle-body strong { display: block; font-size: 13px; color: #2a2a2a; }
          .toggle-body span { color: #6a6055; }
          .footer { display: flex; gap: 9px; justify-content: flex-end; margin-top: 10px; }
          .primary {
            background: #b65f3a; color: white; border: none;
            padding: 8px 14px; border-radius: 6px;
            font-size: 13px; font-weight: 600; cursor: pointer;
          }
          .primary:disabled { opacity: 0.5; cursor: default; }
          .ghost {
            background: transparent; color: #6a6055;
            border: 1px solid #d9c98a; padding: 8px 14px;
            border-radius: 6px; font-size: 13px; cursor: pointer;
          }
        `}</style>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/FlagComposerSheet.tsx src/components/chat/__tests__/FlagComposerSheet.test.tsx
git commit -m "feat(flags): FlagComposerSheet component"
```

---

### Task 19: Wire pill + composer into `CoachChat`

**Files:**
- Modify: `src/components/coach/CoachChat.tsx`

- [ ] **Step 1: Add state for the open composer**

In `CoachChat.tsx`, near the existing state declarations:

```tsx
import { MessageActionPill } from '@/components/chat/MessageActionPill';
import { FlagComposerSheet } from '@/components/chat/FlagComposerSheet';
import { useAuth } from '@/context/AuthContext';
import { useConnectedPartner } from '@/hooks/useConnectedPartner';
// (useConnectedPartner is a small new util — see step 2)

const [flagTarget, setFlagTarget] = useState<{
  messageId: string;
  quote: string;
  senderRole: 'user' | 'assistant';
} | null>(null);
const { user } = useAuth();
const partner = useConnectedPartner();
```

- [ ] **Step 2: Add a `useConnectedPartner` hook**

```ts
// src/hooks/useConnectedPartner.ts
'use client';
import { usePerson } from '@/hooks/usePerson';

export interface ConnectedPartner {
  userId: string;
  displayName: string;
}

export function useConnectedPartner(): ConnectedPartner | null {
  const { people } = usePerson();
  const partnerPerson = people.find(
    (p) => p.relationshipType === 'spouse' && p.linkedUserId,
  );
  if (!partnerPerson?.linkedUserId) return null;
  return {
    userId: partnerPerson.linkedUserId,
    displayName: partnerPerson.displayName ?? 'Partner',
  };
}
```

- [ ] **Step 3: Render the pill on each message**

In the JSX that renders messages — find the loop that creates the bubble for each message. Wrap each rendered bubble with a positioned container that hosts the pill on hover:

```tsx
{messages.map((m) => (
  <div key={m.messageId ?? m.timestamp} className="bubble-wrap">
    {m.messageId && partner && (
      <MessageActionPill
        onFlag={() => setFlagTarget({
          messageId: m.messageId!,
          quote: m.content,
          senderRole: m.role,
        })}
      />
    )}
    {/* existing bubble JSX */}
  </div>
))}
```

Note: if `messageId` is missing (legacy messages), the pill is suppressed — flags require a stable id.

Add CSS that hides `.bubble-wrap > [role=toolbar]` by default and shows on `:hover` / `:focus-within`.

- [ ] **Step 4: Render the composer**

At the end of the component's JSX:

```tsx
{flagTarget && user?.uid && partner && conversationId && (
  <FlagComposerSheet
    open
    fromUserId={user.uid}
    defaultRecipient={partner}
    chatKind="coach"
    chatId={conversationId}
    messageId={flagTarget.messageId}
    senderRole={flagTarget.senderRole}
    quoteText={flagTarget.quote}
    onClose={() => setFlagTarget(null)}
  />
)}
```

- [ ] **Step 5: Manual smoke test**

Start dev server. Start a coach conversation. Hover over an assistant message → pill appears. Click "Flag for…" → composer opens with the message text. Submit. Verify Firestore has a new `message_flags` doc.

- [ ] **Step 6: Commit**

```bash
git add src/components/coach/CoachChat.tsx src/hooks/useConnectedPartner.ts
git commit -m "feat(flags): wire MessageActionPill + composer into coach chat"
```

---

### Task 20: Wire pill + composer into `AskAboutEntrySheet`

**Files:**
- Modify: `src/components/journal-spread/AskAboutEntrySheet.tsx`

Same pattern as Task 19, with these adjustments for entry-chat:
- `chatKind = 'entry_chat'`
- `chatId = entryId` (the parent entry's id — the entry-chat is a subcollection under it)
- `messageId = turn.turnId` (already stable; see Task 8)
- Map over `turns` (from `useEntryChat`) instead of `messages` (from `useCoach`)

- [ ] **Step 1: Mirror the wiring**

```tsx
import { MessageActionPill } from '@/components/chat/MessageActionPill';
import { FlagComposerSheet } from '@/components/chat/FlagComposerSheet';
import { useAuth } from '@/context/AuthContext';
import { useConnectedPartner } from '@/hooks/useConnectedPartner';

// inside the component:
const { user } = useAuth();
const partner = useConnectedPartner();
const [flagTarget, setFlagTarget] = useState<{
  turnId: string;
  quote: string;
  role: 'user' | 'assistant';
} | null>(null);

// in the loop that renders turns:
{turns.map((t) => (
  <div key={t.turnId} className="bubble-wrap">
    {partner && (
      <MessageActionPill
        onFlag={() => setFlagTarget({
          turnId: t.turnId,
          quote: t.content,
          role: t.role,
        })}
      />
    )}
    {/* existing bubble JSX */}
  </div>
))}

// at the end of the component:
{flagTarget && user?.uid && partner && entryId && (
  <FlagComposerSheet
    open
    fromUserId={user.uid}
    defaultRecipient={partner}
    chatKind="entry_chat"
    chatId={entryId}
    messageId={flagTarget.turnId}
    senderRole={flagTarget.role}
    quoteText={flagTarget.quote}
    onClose={() => setFlagTarget(null)}
  />
)}
```

- [ ] **Step 2: Manual smoke test**

Open a journal entry → Ask about this entry → exchange a turn → hover an assistant turn → flag it. Verify the flag doc has `chatKind: 'entry_chat'`, `chatId == entryId`, `messageId == turnId`.

- [ ] **Step 3: Commit**

```bash
git add src/components/journal-spread/AskAboutEntrySheet.tsx
git commit -m "feat(flags): wire flag affordance into AskAboutEntry"
```

---

### Task 21: End-to-end smoke test (Playwright)

**Files:**
- Create: `tests/e2e/flag-for-partner.spec.ts` (or whatever the project's e2e directory is)

This is best-effort. The memory note `e2e auth fixture needed` indicates Playwright authenticated flows are blocked until a login fixture is built. If that's still true at execution time, skip Playwright and write a manual smoke checklist instead.

- [ ] **Step 1: Decide**

If a login fixture is available: write a basic e2e (login as A → flag a coach message → log in as B → assert flag appears in TodaySpread → reply → assert closed). Otherwise:

- [ ] **Step 2: Write a manual smoke checklist** in `docs/qa/flag-for-partner-smoke.md`:

```md
# Flag for Partner — Manual Smoke
1. As user A (Scott), start a coach conversation.
2. Exchange a message with the AI.
3. Hover an assistant message — pill appears.
4. Click "Flag for…" — composer opens with the quote.
5. Add a note. Submit.
6. (Confirm in Firestore: a `message_flags` doc with status='open' exists.)
7. Sign out, sign in as user B (Iris).
8. Open the workbook today spread — the flagged row appears with "Scott flagged a moment for you" + clay border.
9. Expand the row — note + quote render; reply input visible.
10. Type a reply, click Send.
11. (Confirm in Firestore: status='closed', response.kind='reply'.)
12. Reload — the row no longer appears.
```

- [ ] **Step 3: Commit**

```bash
git add docs/qa/flag-for-partner-smoke.md
git commit -m "docs(flags): manual smoke checklist for MVP shipping"
```

---

## Verification

Before declaring the MVP done, run:

```bash
npm run test:run         # unit + component tests
npm run test:rules       # firestore rules
npx tsc --noEmit         # typecheck
```

Then go through the smoke checklist as both A and B accounts in the dev environment.

---

## Follow-on plans (not in this MVP)

1. **Chat-level sharing** — add `sharedWithUserIds` to `chat_conversations` + entry-chat parent inheritance, add the visibility pill in CoachChat / AskAboutEntrySheet headers, surface "Open the full conversation" link in `FlaggedForMeCard` only when the recipient has read access to the parent chat.
2. **Sender's Sent list + retract** — `useOutgoingFlags`, a small "Sent" subsurface on the workbook today spread, Retract action wired to a status='retracted' update.
3. **`seeBy` deadline + `nudgeOverdueFlags` Cloud Function** — composer field, scheduler at hourly cadence, nudge once via email/push if not opened by `seeBy − N`.
4. **Soft cap on "Needs a real reply"** — count open needsReply flags from sender→recipient; render a quiet warning when count ≥ 3.
5. **Telemetry counters** — created / seen / closed / retracted / nudged; time-to-open and time-to-close histograms; closure-kind distribution.
