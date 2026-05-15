# Dyadic Mirror Check-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the bare "Mirror moment" v1 — two people answer one projective prompt about the space between them (hidden from each other via pass-the-device on one iPad), then see both answers side by side with one synthesized, no-advice reflection line, which is silently deposited to a per-dyad record.

**Architecture:** New `mirror` feature, fully additive — the existing `/check-in` flow is untouched. Pure logic (dyad key, prompt rendering, request shaping) lives in `src/lib/mirror/` and is unit-tested. A thin constrained Cloud Function (`synthesizeMirror`) produces the one reflection line. A `useMirror` hook writes a `dyads` doc (deterministic id from sorted participant ids, future-proof for 3+) and appends a `mirror_entries` doc. A phase-machine page at `/mirror` drives: pick pairing → turn A → handoff → turn B → synthesizing → reveal → saved.

**Tech Stack:** Next.js 16 App Router (client components), React 19, TypeScript, Firebase Firestore + Auth + Cloud Functions (Anthropic SDK), vitest, `@firebase/rules-unit-testing`.

**Spec:** `docs/superpowers/specs/2026-05-15-dyadic-mirror-checkin-design.md`

**Model note:** New Cloud Function uses `claude-sonnet-4-6` (latest Sonnet, per standing user preference). The codebase elsewhere pins an older snapshot — do **not** migrate those; only the new function uses the latest id.

**Scope fence (from spec — do NOT build):** no "us" manual surfaced, no Repair/Catch, no advice in v1 (deferred, not forbidden), no two-device parallel, no triad UI, one prompt only, no streaks/reminders, existing 3-card check-in untouched.

---

### Task 1: Types + deterministic dyad key

**Files:**
- Create: `src/types/mirror.ts`
- Create: `src/lib/mirror/dyadKey.ts`
- Test: `src/lib/mirror/dyadKey.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/mirror/dyadKey.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { dyadKeyFromParticipantIds } from './dyadKey';

describe('dyadKeyFromParticipantIds', () => {
  it('is order-independent for a pair', () => {
    expect(dyadKeyFromParticipantIds(['scott', 'kaleb']))
      .toBe(dyadKeyFromParticipantIds(['kaleb', 'scott']));
  });

  it('joins sorted ids with a double underscore', () => {
    expect(dyadKeyFromParticipantIds(['kaleb', 'scott'])).toBe('kaleb__scott');
  });

  it('supports 3+ participants (future triad), still sorted', () => {
    expect(dyadKeyFromParticipantIds(['scott', 'ella', 'kaleb']))
      .toBe('ella__kaleb__scott');
  });

  it('dedupes and rejects empty', () => {
    expect(dyadKeyFromParticipantIds(['a', 'a', 'b'])).toBe('a__b');
    expect(() => dyadKeyFromParticipantIds([])).toThrow();
    expect(() => dyadKeyFromParticipantIds(['only'])).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/mirror/dyadKey.test.ts`
Expected: FAIL — cannot find module `./dyadKey`.

- [ ] **Step 3: Write the types**

Create `src/types/mirror.ts`:

```typescript
import type { Timestamp } from 'firebase/firestore';

/** One participant's hidden answer to the mirror prompt. */
export interface MirrorAnswer {
  /** personId for family people, or the steward's auth uid for the adult. */
  participantId: string;
  /** Display label used in the rendered prompt + reveal, e.g. "Dad", "Kaleb". */
  label: string;
  text: string;
}

/** The per-relationship record. Doc id === dyadKey. participantIds extensible to 3+. */
export interface Dyad {
  dyadKey: string;
  familyId: string;
  participantIds: string[];
  createdAt: Timestamp;
  lastEntryAt: Timestamp;
  entryCount: number;
}

/** One mirror exchange. Deposited silently; nothing reads it in v1. */
export interface MirrorEntry {
  entryId: string;
  dyadKey: string;
  familyId: string;
  stewardUserId: string;
  prompt: string;
  answers: MirrorAnswer[];
  /** The single synthesized reflection line. */
  mirrorLine: string;
  createdAt: Timestamp;
}

/** Cloud Function request/response. */
export interface SynthesizeMirrorRequest {
  prompt: string;
  answers: { label: string; text: string }[];
}
export interface SynthesizeMirrorResponse {
  mirrorLine: string;
}

export const MIRROR_COLLECTIONS = {
  DYADS: 'dyads',
  MIRROR_ENTRIES: 'mirror_entries',
} as const;
```

- [ ] **Step 4: Write minimal implementation**

Create `src/lib/mirror/dyadKey.ts`:

```typescript
/**
 * Deterministic key for a relationship from its participant ids.
 * Order-independent and deduped so {a,b} and {b,a} map to one record.
 * Accepts 3+ for future triad/all-together; v1 only ever passes 2.
 */
export function dyadKeyFromParticipantIds(participantIds: string[]): string {
  const unique = Array.from(new Set(participantIds.map((id) => id.trim()).filter(Boolean)));
  if (unique.length < 2) {
    throw new Error('A dyad needs at least two distinct participants');
  }
  return unique.sort().join('__');
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:run -- src/lib/mirror/dyadKey.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/types/mirror.ts src/lib/mirror/dyadKey.ts src/lib/mirror/dyadKey.test.ts
git commit -m "feat(mirror): dyad types + deterministic dyad key"
```

---

### Task 2: The v1 prompt, rendered per chair

**Files:**
- Create: `src/lib/mirror/prompt.ts`
- Test: `src/lib/mirror/prompt.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/mirror/prompt.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { MIRROR_V1_PROMPT_TEMPLATE, renderMirrorPrompt } from './prompt';

describe('renderMirrorPrompt', () => {
  it('frames the prompt from the answerer toward the other person', () => {
    expect(renderMirrorPrompt('Dad')).toBe(
      'If today between you and Dad was an animal — what animal, and what was it doing?',
    );
    expect(renderMirrorPrompt('Kaleb')).toBe(
      'If today between you and Kaleb was an animal — what animal, and what was it doing?',
    );
  });

  it('template contains the {other} placeholder exactly once', () => {
    expect(MIRROR_V1_PROMPT_TEMPLATE.match(/\{other\}/g)).toHaveLength(1);
  });

  it('trims the other label', () => {
    expect(renderMirrorPrompt('  Dad  ')).toContain('you and Dad was');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/mirror/prompt.test.ts`
Expected: FAIL — cannot find module `./prompt`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/mirror/prompt.ts`:

```typescript
/** v1 prompt. {other} is the OTHER person in the dyad, from the answerer's chair. */
export const MIRROR_V1_PROMPT_TEMPLATE =
  'If today between you and {other} was an animal — what animal, and what was it doing?';

export function renderMirrorPrompt(otherLabel: string): string {
  return MIRROR_V1_PROMPT_TEMPLATE.replace('{other}', otherLabel.trim());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/mirror/prompt.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/mirror/prompt.ts src/lib/mirror/prompt.test.ts
git commit -m "feat(mirror): per-chair v1 prompt rendering"
```

---

### Task 3: Synthesis request builder (pure)

Shapes the exact payload sent to the Cloud Function so the function stays dumb and the contract is unit-tested.

**Files:**
- Create: `src/lib/mirror/buildSynthesisRequest.ts`
- Test: `src/lib/mirror/buildSynthesisRequest.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/mirror/buildSynthesisRequest.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildSynthesisRequest } from './buildSynthesisRequest';
import type { MirrorAnswer } from '@/types/mirror';

const answers: MirrorAnswer[] = [
  { participantId: 'scott', label: 'Dad', text: '  A porcupine, needing space.  ' },
  { participantId: 'kaleb', label: 'Kaleb', text: 'A puppy that wanted to play' },
];

describe('buildSynthesisRequest', () => {
  it('passes the prompt through and trims answer text', () => {
    const req = buildSynthesisRequest('the prompt', answers);
    expect(req.prompt).toBe('the prompt');
    expect(req.answers).toEqual([
      { label: 'Dad', text: 'A porcupine, needing space.' },
      { label: 'Kaleb', text: 'A puppy that wanted to play' },
    ]);
  });

  it('throws if any answer is blank (both chairs required)', () => {
    expect(() =>
      buildSynthesisRequest('p', [answers[0], { ...answers[1], text: '   ' }]),
    ).toThrow(/both/i);
  });

  it('requires at least two answers', () => {
    expect(() => buildSynthesisRequest('p', [answers[0]])).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/mirror/buildSynthesisRequest.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/mirror/buildSynthesisRequest.ts`:

```typescript
import type { MirrorAnswer, SynthesizeMirrorRequest } from '@/types/mirror';

export function buildSynthesisRequest(
  prompt: string,
  answers: MirrorAnswer[],
): SynthesizeMirrorRequest {
  if (answers.length < 2) {
    throw new Error('Mirror needs at least two answers');
  }
  const shaped = answers.map((a) => ({ label: a.label, text: a.text.trim() }));
  if (shaped.some((a) => !a.text)) {
    throw new Error('Both chairs must be filled before revealing');
  }
  return { prompt, answers: shaped };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/mirror/buildSynthesisRequest.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/mirror/buildSynthesisRequest.ts src/lib/mirror/buildSynthesisRequest.test.ts
git commit -m "feat(mirror): pure synthesis request builder"
```

---

### Task 4: `synthesizeMirror` Cloud Function + client wrapper

No unit-test harness for `functions/` is in scope; the reflection line is a judgment output, not unit-testable. TDD applies to the pure pieces (done) and the rules/hook (next). This task is build + **manual verification**.

**Files:**
- Modify: `functions/index.js` (add new export near other `onCall` exports, e.g. after `chatWithEntry`)
- Create: `src/lib/mirror/synthesizeMirrorClient.ts`

- [ ] **Step 1: Add the Cloud Function**

Append to `functions/index.js` (follow the `chatWithEntry` declaration style at functions/index.js:1039):

```javascript
exports.synthesizeMirror = onCall(
    {
      region: "us-central1",
      memory: "256MiB",
      timeoutSeconds: 30,
      secrets: ["ANTHROPIC_API_KEY"],
    },
    async (request) => {
      if (!request.auth) {
        throw new Error("Authentication required");
      }
      const {prompt, answers} = request.data || {};
      if (!prompt || !Array.isArray(answers) || answers.length < 2) {
        throw new Error("prompt and at least two answers are required");
      }
      for (const a of answers) {
        if (!a || !a.label || !a.text || !String(a.text).trim()) {
          throw new Error("each answer needs a label and non-empty text");
        }
      }

      const userDoc = await admin.firestore()
          .collection("users").doc(request.auth.uid).get();
      const userData = userDoc.data();
      if (!userData || userData.role !== "parent") {
        throw new Error("Only parents can use the mirror");
      }

      const answerBlock = answers
          .map((a) => `${a.label} answered: "${String(a.text).trim()}"`)
          .join("\n");

      const system =
        "You reflect a relationship back to two people who just answered " +
        "the SAME projective prompt about the space between them, from " +
        "their own chair. Output EXACTLY one or two short sentences that " +
        "name the alignment, the gap, or the tension between their two " +
        "answers. Be warm, concrete, specific to what they said. " +
        "ABSOLUTELY NO ADVICE, no suggestions, no 'try', no coaching, no " +
        "questions, no fixing. Only reflect what is there. Do not exceed " +
        "two sentences.";

      const client = getAnthropic();
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 160,
        temperature: 0.6,
        system,
        messages: [{
          role: "user",
          content: `Prompt they both answered: "${prompt}"\n\n${answerBlock}\n\nReflect their two answers back in one or two sentences.`,
        }],
      });

      const mirrorLine = (response.content[0] && response.content[0].text || "").trim();
      if (!mirrorLine) {
        throw new Error("Synthesis returned empty");
      }

      try {
        await logAIUsage(admin.firestore(), {
          familyId: userData.familyId,
          userId: request.auth.uid,
          functionName: "synthesizeMirror",
          model: "claude-sonnet-4-6",
          usage: response.usage,
        });
      } catch (e) {
        // non-critical
      }

      return {mirrorLine};
    },
);
```

- [ ] **Step 2: Add the client wrapper**

Create `src/lib/mirror/synthesizeMirrorClient.ts` (mirror the `transcribeClient.ts` pattern at src/lib/transcribeClient.ts:16):

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type { SynthesizeMirrorRequest, SynthesizeMirrorResponse } from '@/types/mirror';

export async function synthesizeMirror(
  req: SynthesizeMirrorRequest,
): Promise<string> {
  const callable = httpsCallable<SynthesizeMirrorRequest, SynthesizeMirrorResponse>(
    functions,
    'synthesizeMirror',
  );
  const result = await callable(req);
  return result.data.mirrorLine;
}
```

- [ ] **Step 3: Verify `functions` is exported from `@/lib/firebase`**

Run: `grep -n "export const functions" src/lib/firebase.ts`
Expected: a match (already used by `src/lib/transcribeClient.ts`). If absent, stop and report.

- [ ] **Step 4: Manual verification (emulator or deployed)**

Deploy or emulate, then from the app (after Task 10) confirm a call with two sample answers returns a 1–2 sentence line with no advice. Note: deploy command is `firebase deploy --only functions:synthesizeMirror`. Do not deploy automatically — flag for Scott.

- [ ] **Step 5: Commit**

```bash
git add functions/index.js src/lib/mirror/synthesizeMirrorClient.ts
git commit -m "feat(mirror): synthesizeMirror cloud function + client (no-advice, <=2 sentences)"
```

---

### Task 5: `useMirror` hook — synthesize + deposit

Writes the deterministic `dyads` doc (merge) and appends a `mirror_entries` doc. Read is intentionally not implemented (deposits accrue silently in v1).

**Files:**
- Create: `src/hooks/useMirror.ts`
- Test: `src/hooks/useMirror.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useMirror.test.ts` (mirror the mock style of `__tests__/utils/manual-initialization.test.ts`):

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const setDocMock = vi.fn().mockResolvedValue(undefined);
const addDocMock = vi.fn().mockResolvedValue({ id: 'entry-1' });
const docMock = vi.fn((_db, _col, id) => ({ id }));
const collectionMock = vi.fn((_db, name) => ({ name }));

vi.mock('@/lib/firebase', () => ({ firestore: {} }));
vi.mock('firebase/firestore', () => ({
  doc: (...a: unknown[]) => docMock(...a),
  collection: (...a: unknown[]) => collectionMock(...a),
  setDoc: (...a: unknown[]) => setDocMock(...a),
  addDoc: (...a: unknown[]) => addDocMock(...a),
  serverTimestamp: () => 'TS',
  increment: (n: number) => ({ __inc: n }),
  Timestamp: { now: () => 'NOW' },
}));
vi.mock('@/lib/mirror/synthesizeMirrorClient', () => ({
  synthesizeMirror: vi.fn().mockResolvedValue('A puppy and a porcupine, same second.'),
}));

import { runMirror } from './useMirror';

describe('runMirror', () => {
  beforeEach(() => vi.clearAllMocks());

  const params = {
    familyId: 'fam1',
    stewardUserId: 'scott',
    answers: [
      { participantId: 'scott', label: 'Dad', text: 'A porcupine' },
      { participantId: 'kaleb', label: 'Kaleb', text: 'A puppy' },
    ],
    prompt: 'If today between you and X was an animal...',
  };

  it('synthesizes, upserts the dyad doc by deterministic key, appends an entry', async () => {
    const result = await runMirror(params);

    expect(result.mirrorLine).toBe('A puppy and a porcupine, same second.');
    // dyad doc id is deterministic sorted key
    expect(docMock).toHaveBeenCalledWith({}, 'dyads', 'kaleb__scott');
    expect(setDocMock).toHaveBeenCalledTimes(1);
    const setArgs = setDocMock.mock.calls[0];
    expect(setArgs[2]).toEqual({ merge: true });
    expect(setArgs[1]).toMatchObject({
      dyadKey: 'kaleb__scott',
      familyId: 'fam1',
      participantIds: ['kaleb', 'scott'],
    });
    // entry appended to mirror_entries
    expect(collectionMock).toHaveBeenCalledWith({}, 'mirror_entries');
    expect(addDocMock).toHaveBeenCalledTimes(1);
    expect(addDocMock.mock.calls[0][1]).toMatchObject({
      dyadKey: 'kaleb__scott',
      familyId: 'fam1',
      stewardUserId: 'scott',
      mirrorLine: 'A puppy and a porcupine, same second.',
    });
  });

  it('throws if a chair is blank (does not write)', async () => {
    await expect(
      runMirror({ ...params, answers: [params.answers[0], { ...params.answers[1], text: ' ' }] }),
    ).rejects.toThrow(/both/i);
    expect(setDocMock).not.toHaveBeenCalled();
    expect(addDocMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/hooks/useMirror.test.ts`
Expected: FAIL — cannot find module `./useMirror`.

- [ ] **Step 3: Write minimal implementation**

Create `src/hooks/useMirror.ts`:

```typescript
'use client';

import { useState } from 'react';
import {
  doc,
  collection,
  setDoc,
  addDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { dyadKeyFromParticipantIds } from '@/lib/mirror/dyadKey';
import { buildSynthesisRequest } from '@/lib/mirror/buildSynthesisRequest';
import { synthesizeMirror } from '@/lib/mirror/synthesizeMirrorClient';
import { MIRROR_COLLECTIONS, type MirrorAnswer } from '@/types/mirror';

export interface RunMirrorParams {
  familyId: string;
  stewardUserId: string;
  prompt: string;
  answers: MirrorAnswer[];
}

export async function runMirror(
  params: RunMirrorParams,
): Promise<{ mirrorLine: string; dyadKey: string }> {
  const { familyId, stewardUserId, prompt, answers } = params;
  // Validates blanks / count and shapes the request (throws before any write).
  const request = buildSynthesisRequest(prompt, answers);
  const dyadKey = dyadKeyFromParticipantIds(answers.map((a) => a.participantId));
  const participantIds = dyadKey.split('__');

  const mirrorLine = await synthesizeMirror(request);

  await setDoc(
    doc(firestore, MIRROR_COLLECTIONS.DYADS, dyadKey),
    {
      dyadKey,
      familyId,
      participantIds,
      lastEntryAt: serverTimestamp(),
      entryCount: increment(1),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  await addDoc(collection(firestore, MIRROR_COLLECTIONS.MIRROR_ENTRIES), {
    dyadKey,
    familyId,
    stewardUserId,
    prompt,
    answers: answers.map((a) => ({
      participantId: a.participantId,
      label: a.label,
      text: a.text.trim(),
    })),
    mirrorLine,
    createdAt: serverTimestamp(),
  });

  return { mirrorLine, dyadKey };
}

export function useMirror() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (params: RunMirrorParams) => {
    setSaving(true);
    setError(null);
    try {
      return await runMirror(params);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Mirror failed';
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return { submit, saving, error };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/hooks/useMirror.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMirror.ts src/hooks/useMirror.test.ts
git commit -m "feat(mirror): useMirror hook — synthesize + silent deposit"
```

---

### Task 6: Firestore rules for `dyads` and `mirror_entries`

**Files:**
- Modify: `firestore.rules` (add two `match` blocks before the closing brace of `match /databases/{database}/documents`)
- Test: `firestore-rules/mirror.rules.test.ts`

- [ ] **Step 1: Write the failing rules test**

Create `firestore-rules/mirror.rules.test.ts` (mirror the harness in `firestore-rules/rules.test.ts`):

```typescript
import {
  assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { readFileSync, existsSync } from 'fs';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';

const PROJECT_ID = 'test-project';
const FAMILY_ID = 'test-family';
let testEnv: RulesTestEnvironment | undefined;
const emulatorAvailable = !!process.env.FIRESTORE_EMULATOR_HOST;

beforeAll(async () => {
  if (!emulatorAvailable) return;
  if (!existsSync('firestore.rules')) throw new Error('firestore.rules not found');
  const rules = readFileSync('firestore.rules', 'utf8');
  const [host, portStr] = (process.env.FIRESTORE_EMULATOR_HOST || '').split(':');
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules, host: host || 'localhost', port: parseInt(portStr || '8080', 10) },
  });
});
afterAll(async () => { if (testEnv) await testEnv.cleanup(); });

beforeEach(async () => {
  if (!emulatorAvailable || !testEnv) return;
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', 'parent-uid'), { role: 'parent', familyId: FAMILY_ID });
    await setDoc(doc(db, 'users', 'other-parent'), { role: 'parent', familyId: 'other-family' });
  });
});

describe.skipIf(!emulatorAvailable)('Mirror collections rules', () => {
  it('parent in family can create + read a dyad', async () => {
    const db = testEnv!.authenticatedContext('parent-uid').firestore();
    await assertSucceeds(setDoc(doc(db, 'dyads', 'kaleb__scott'), {
      dyadKey: 'kaleb__scott', familyId: FAMILY_ID, participantIds: ['kaleb', 'scott'],
    }));
    await assertSucceeds(getDoc(doc(db, 'dyads', 'kaleb__scott')));
  });

  it('parent from another family cannot read that dyad', async () => {
    await testEnv!.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'dyads', 'kaleb__scott'), {
        dyadKey: 'kaleb__scott', familyId: FAMILY_ID, participantIds: ['kaleb', 'scott'],
      });
    });
    const db = testEnv!.authenticatedContext('other-parent').firestore();
    await assertFails(getDoc(doc(db, 'dyads', 'kaleb__scott')));
  });

  it('parent can append a mirror entry in their family', async () => {
    const db = testEnv!.authenticatedContext('parent-uid').firestore();
    await assertSucceeds(addDoc(collection(db, 'mirror_entries'), {
      dyadKey: 'kaleb__scott', familyId: FAMILY_ID, stewardUserId: 'parent-uid',
      prompt: 'p', answers: [], mirrorLine: 'x',
    }));
  });

  it('unauthenticated cannot write a mirror entry', async () => {
    const db = testEnv!.unauthenticatedContext().firestore();
    await assertFails(addDoc(collection(db, 'mirror_entries'), {
      dyadKey: 'kaleb__scott', familyId: FAMILY_ID,
    }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:rules`
Expected: FAIL — dyad create denied (no rule yet).

- [ ] **Step 3: Add the rules**

In `firestore.rules`, add inside `match /databases/{database}/documents { ... }` (alongside the other collection blocks, using the existing `isSignedIn`/`isParent`/`belongsToFamily` helpers):

```javascript
// Dyad records — per-relationship, family-scoped. Doc id is the deterministic dyadKey.
match /dyads/{dyadKey} {
  allow read: if isSignedIn() && (
    resource == null || (
      isParent() && belongsToFamily(resource.data.familyId)
    )
  );
  allow create: if isParent() && belongsToFamily(request.resource.data.familyId);
  allow update: if isParent() && belongsToFamily(resource.data.familyId);
  allow delete: if false;
}

// Mirror entries — silent deposits, append-only in v1.
match /mirror_entries/{entryId} {
  allow read: if isSignedIn() && (
    resource == null || (
      isParent() && belongsToFamily(resource.data.familyId)
    )
  );
  allow create: if isParent() && belongsToFamily(request.resource.data.familyId);
  allow update, delete: if false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:rules`
Expected: PASS (4 new tests; existing rules tests still pass).

- [ ] **Step 5: Commit**

```bash
git add firestore.rules firestore-rules/mirror.rules.test.ts
git commit -m "feat(mirror): firestore rules for dyads + mirror_entries (family-scoped, append-only)"
```

---

### Task 7: Pairing picker component

**Files:**
- Create: `src/components/mirror/MirrorEntryScreen.tsx`

- [ ] **Step 1: Implement the component**

Create `src/components/mirror/MirrorEntryScreen.tsx`. It lists family people plus the current user, and lets the steward pick exactly two participants (the pairing). No hidden modes — Iris↔Ella is selected the same way as Scott↔Kaleb.

```typescript
'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePerson } from '@/hooks/usePerson';

export interface PairChoice {
  participants: { participantId: string; label: string }[];
}

export function MirrorEntryScreen({ onStart }: { onStart: (pair: PairChoice) => void }) {
  const { user } = useAuth();
  const { people, loading } = usePerson();
  const [selected, setSelected] = useState<string[]>([]);

  const options = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    if (user?.userId) list.push({ id: user.userId, label: user.name || 'Me' });
    for (const p of people) list.push({ id: p.personId, label: p.name });
    return list;
  }, [people, user]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : prev,
    );

  if (loading) return <p style={{ padding: 24 }}>Opening…</p>;

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-parent-display)', fontSize: 28 }}>
        Tonight’s pair
      </h1>
      <p style={{ color: 'var(--parent-text-light)' }}>
        Pick the two people doing this together.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '16px 0' }}>
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => toggle(o.id)}
            style={{
              padding: '10px 16px',
              borderRadius: 999,
              border: '1px solid var(--parent-border)',
              background: selected.includes(o.id) ? 'var(--parent-accent)' : 'transparent',
              color: selected.includes(o.id) ? '#fff' : 'var(--parent-text)',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      <button
        disabled={selected.length !== 2}
        onClick={() =>
          onStart({
            participants: selected.map((id) => ({
              participantId: id,
              label: options.find((o) => o.id === id)!.label,
            })),
          })
        }
        style={{
          padding: '12px 20px',
          borderRadius: 12,
          border: 'none',
          background: selected.length === 2 ? 'var(--parent-accent)' : 'var(--parent-border)',
          color: '#fff',
          fontSize: 16,
        }}
      >
        Begin
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run build` (or rely on the dev server in Task 10). Expected: no type errors in this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/mirror/MirrorEntryScreen.tsx
git commit -m "feat(mirror): pairing picker (Iris-equal, no hidden modes)"
```

---

### Task 8: Turn + pass-the-device handoff components

**Files:**
- Create: `src/components/mirror/MirrorTurn.tsx`
- Create: `src/components/mirror/MirrorHandoff.tsx`

- [ ] **Step 1: Implement `MirrorTurn`**

Create `src/components/mirror/MirrorTurn.tsx` — one person's hidden answer; prompt rendered for *their* chair (the OTHER participant's label); textarea + MicButton (mirror usage from `src/app/check-in/[personId]/page.tsx`).

```typescript
'use client';

import { useState } from 'react';
import { MicButton } from '@/components/voice/MicButton';
import { renderMirrorPrompt } from '@/lib/mirror/prompt';

export function MirrorTurn({
  answererLabel,
  otherLabel,
  onSubmit,
}: {
  answererLabel: string;
  otherLabel: string;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const prompt = renderMirrorPrompt(otherLabel);

  return (
    <div style={{ padding: 24, maxWidth: 560, margin: '0 auto' }}>
      <p style={{ color: 'var(--parent-text-light)', fontSize: 14 }}>
        {answererLabel}, just you. {otherLabel} won’t see this until you both finish.
      </p>
      <h2 style={{ fontFamily: 'var(--font-parent-display)', fontSize: 24, margin: '12px 0 20px' }}>
        {prompt}
      </h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        autoFocus
        style={{
          width: '100%',
          fontFamily: 'var(--font-parent-display)',
          fontStyle: 'italic',
          fontSize: 18,
          padding: 12,
          borderRadius: 12,
          border: '1px solid var(--parent-border)',
        }}
        placeholder="An animal, and what it’s doing…"
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <MicButton onTranscript={(t) => setText((prev) => (prev ? `${prev} ${t}` : t))} />
        <button
          disabled={!text.trim()}
          onClick={() => onSubmit(text.trim())}
          style={{
            padding: '12px 20px',
            borderRadius: 12,
            border: 'none',
            background: text.trim() ? 'var(--parent-accent)' : 'var(--parent-border)',
            color: '#fff',
            fontSize: 16,
          }}
        >
          Done — hide it
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `MirrorHandoff`**

Create `src/components/mirror/MirrorHandoff.tsx` — full-cover interstitial so answer 1 stays hidden while the iPad changes hands. Requires a deliberate tap to continue.

```typescript
'use client';

export function MirrorHandoff({
  nextLabel,
  onReady,
}: {
  nextLabel: string;
  onReady: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--parent-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 24,
        textAlign: 'center',
        zIndex: 50,
      }}
    >
      <p style={{ fontFamily: 'var(--font-parent-display)', fontSize: 26 }}>
        Hand the iPad to {nextLabel}.
      </p>
      <p style={{ color: 'var(--parent-text-light)' }}>
        The first answer is hidden. No peeking.
      </p>
      <button
        onClick={onReady}
        style={{
          padding: '14px 24px',
          borderRadius: 12,
          border: 'none',
          background: 'var(--parent-accent)',
          color: '#fff',
          fontSize: 17,
        }}
      >
        I’m {nextLabel}. I’m ready.
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck & commit**

```bash
git add src/components/mirror/MirrorTurn.tsx src/components/mirror/MirrorHandoff.tsx
git commit -m "feat(mirror): hidden turn + pass-the-device handoff"
```

---

### Task 9: Reveal component

**Files:**
- Create: `src/components/mirror/MirrorReveal.tsx`

- [ ] **Step 1: Implement the component**

Create `src/components/mirror/MirrorReveal.tsx` — both answers side by side + the one synthesized line. No advice, no next-step UI (deferred per spec).

```typescript
'use client';

import type { MirrorAnswer } from '@/types/mirror';

export function MirrorReveal({
  answers,
  mirrorLine,
  onDone,
}: {
  answers: MirrorAnswer[];
  mirrorLine: string;
  onDone: () => void;
}) {
  return (
    <div style={{ padding: 24, maxWidth: 620, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {answers.map((a) => (
          <div
            key={a.participantId}
            style={{
              flex: '1 1 240px',
              border: '1px solid var(--parent-border)',
              borderRadius: 14,
              padding: 16,
            }}
          >
            <div style={{ color: 'var(--parent-text-light)', fontSize: 13 }}>{a.label}</div>
            <div
              style={{
                fontFamily: 'var(--font-parent-display)',
                fontStyle: 'italic',
                fontSize: 19,
                marginTop: 6,
              }}
            >
              {a.text}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 24,
          padding: 20,
          borderRadius: 14,
          background: 'var(--parent-accent)',
          color: '#fff',
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.85 }}>What it looks like together</div>
        <p style={{ fontFamily: 'var(--font-parent-display)', fontSize: 21, marginTop: 8 }}>
          {mirrorLine}
        </p>
      </div>

      <button
        onClick={onDone}
        style={{
          marginTop: 24,
          padding: '12px 20px',
          borderRadius: 12,
          border: '1px solid var(--parent-border)',
          background: 'transparent',
          color: 'var(--parent-text)',
          fontSize: 16,
        }}
      >
        Goodnight
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck & commit**

```bash
git add src/components/mirror/MirrorReveal.tsx
git commit -m "feat(mirror): reveal — side-by-side answers + one mirror line"
```

---

### Task 10: `/mirror` page — phase machine wiring it together

**Files:**
- Create: `src/app/mirror/page.tsx`

- [ ] **Step 1: Implement the page**

Create `src/app/mirror/page.tsx`. Phases: `pick → turnA → handoff → turnB → synthesizing → reveal → saved`. Each turn is rendered with the OTHER participant as the prompt subject. Uses `useMirror`. Auth-guard mirrors `src/app/coach/page.tsx`.

```typescript
'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useMirror } from '@/hooks/useMirror';
import { renderMirrorPrompt } from '@/lib/mirror/prompt';
import { MirrorEntryScreen, type PairChoice } from '@/components/mirror/MirrorEntryScreen';
import { MirrorTurn } from '@/components/mirror/MirrorTurn';
import { MirrorHandoff } from '@/components/mirror/MirrorHandoff';
import { MirrorReveal } from '@/components/mirror/MirrorReveal';
import type { MirrorAnswer } from '@/types/mirror';

type Phase = 'pick' | 'turnA' | 'handoff' | 'turnB' | 'synthesizing' | 'reveal' | 'error';

export default function MirrorPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { submit } = useMirror();

  const [phase, setPhase] = useState<Phase>('pick');
  const [pair, setPair] = useState<PairChoice | null>(null);
  const [answers, setAnswers] = useState<MirrorAnswer[]>([]);
  const [mirrorLine, setMirrorLine] = useState('');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) return <p style={{ padding: 24 }}>Opening…</p>;

  const a = pair?.participants[0];
  const b = pair?.participants[1];

  const finish = async (allAnswers: MirrorAnswer[]) => {
    setPhase('synthesizing');
    try {
      const prompt = renderMirrorPrompt(b!.label); // canonical prompt stored on the entry
      const { mirrorLine: line } = await submit({
        familyId: user.familyId!,
        stewardUserId: user.userId,
        prompt,
        answers: allAnswers,
      });
      setMirrorLine(line);
      setPhase('reveal');
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Something went wrong');
      setPhase('error');
    }
  };

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--parent-bg)' }}>
      {phase === 'pick' && (
        <MirrorEntryScreen
          onStart={(p) => {
            setPair(p);
            setAnswers([]);
            setPhase('turnA');
          }}
        />
      )}

      {phase === 'turnA' && a && b && (
        <MirrorTurn
          answererLabel={a.label}
          otherLabel={b.label}
          onSubmit={(text) => {
            setAnswers([{ participantId: a.participantId, label: a.label, text }]);
            setPhase('handoff');
          }}
        />
      )}

      {phase === 'handoff' && b && (
        <MirrorHandoff nextLabel={b.label} onReady={() => setPhase('turnB')} />
      )}

      {phase === 'turnB' && a && b && (
        <MirrorTurn
          answererLabel={b.label}
          otherLabel={a.label}
          onSubmit={(text) => {
            const all = [
              ...answers,
              { participantId: b.participantId, label: b.label, text },
            ];
            setAnswers(all);
            void finish(all);
          }}
        />
      )}

      {phase === 'synthesizing' && (
        <p style={{ padding: 24, textAlign: 'center' }}>Holding both up to the light…</p>
      )}

      {phase === 'reveal' && (
        <MirrorReveal answers={answers} mirrorLine={mirrorLine} onDone={() => router.push('/')} />
      )}

      {phase === 'error' && (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <p>{errMsg}</p>
          <button onClick={() => setPhase('pick')} style={{ marginTop: 16 }}>
            Start over
          </button>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Manual verification (dev server)**

Run: `npm run dev`, open `http://localhost:3000/mirror`. Walk: pick two people → answer A → handoff cover hides A's text → answer B → synthesizing → reveal shows both + one line → Goodnight returns home. Confirm A's answer is never visible during handoff/turn B.

- [ ] **Step 3: Confirm the deposit**

In Firebase console (or emulator UI), verify a `dyads/{sortedKey}` doc exists with `entryCount: 1` and a `mirror_entries` doc with both answers + `mirrorLine`.

- [ ] **Step 4: Commit**

```bash
git add src/app/mirror/page.tsx
git commit -m "feat(mirror): /mirror phase-machine page (pick→turn→handoff→turn→reveal)"
```

---

### Task 11: Full regression + real-world test handoff

**Files:** none (verification only)

- [ ] **Step 1: Run the full suite**

Run: `npm run test:run`
Expected: all unit tests pass (including the 4 new mirror lib/hook test files).

- [ ] **Step 2: Run rules suite**

Run: `npm run test:rules`
Expected: all pass including `firestore-rules/mirror.rules.test.ts`.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: clean build, `/mirror` route compiled.

- [ ] **Step 4: Flag deploy + the real test (do not auto-deploy)**

Report to Scott: `synthesizeMirror` needs `firebase deploy --only functions:synthesizeMirror` and rules need `firebase deploy --only firestore:rules` before the live bedtime test. Then: the v1 success check is qualitative — run it with Kaleb a few nights and observe whether the pure mirror creates a real moment, and *what kind of advice (if any) it feels like it's missing* (that decides the deferred advice model).

- [ ] **Step 5: Final commit (if any verification fixups were needed)**

```bash
git add -A
git commit -m "chore(mirror): v1 verification fixups"
```

---

## Self-Review

**Spec coverage:**
- Dyad-as-unit → Task 1 (`Dyad` type, deterministic key). ✓
- One-loop model, ship Mirror only → Tasks 4–10 build only Mirror; scope fence in header. ✓
- Iris co-equal / pick-the-pairing → Task 7 (no hidden modes; self + people selectable). ✓
- Single-iPad pass-the-device → Task 8 (`MirrorHandoff` full-cover + deliberate tap). ✓
- Projective v1 prompt, per chair → Task 2 + Task 8/10 (other participant as subject). ✓
- Hidden until both in → Task 8 handoff + Task 10 phase order + Task 3/5 blank-guard. ✓
- One synthesized line, no advice (deferred not forbidden) → Task 4 system prompt; Task 9 no next-step UI. ✓
- Silent deposit to dyad record → Task 5 (`dyads` upsert + `mirror_entries` append; nothing reads). ✓
- Rules family-scoped, append-only → Task 6. ✓
- Existing check-in untouched → no task modifies `/check-in`. ✓
- Two-device parallel / triad designed-for not built → `participantIds`/`dyadKey` accept 3+ (Task 1), no UI for it. ✓

**Placeholder scan:** No TBD/TODO; every code step has full code; commands have expected output. Deploy is intentionally a flagged manual step (risky/shared action), not a placeholder.

**Type consistency:** `MirrorAnswer` (`participantId`, `label`, `text`), `SynthesizeMirrorRequest` (`prompt`, `answers:{label,text}[]`), `runMirror`/`RunMirrorParams`, `dyadKeyFromParticipantIds`, `MIRROR_COLLECTIONS` used identically across Tasks 1, 3, 5, 8, 9, 10. Cloud Function returns `{mirrorLine}`; client `synthesizeMirror` returns the string; `useMirror` consumes it. Consistent.
