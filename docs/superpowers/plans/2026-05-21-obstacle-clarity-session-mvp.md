# Obstacle / Clarity Session MVP — Implementation Plan (Phase 0 + 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the minimum end-to-end clarity loop: a single adult can navigate to a URL, name an obstacle, run a full guided dialogue with the AI, and confirm a prescription. No dashboard, no ascend beat, no integrations.

**Architecture:** New Firestore collection `obstacles/` with an append-only `moves/` subcollection. New Cloud Function `claritySessionTurn` (extracted-handler pattern, mirrors `synthesizeWeeklyFocus.handler.js`) writes both user and assistant turns. New `/clarity/[obstacleId]` route hosts a chat UI subscribed to the obstacle's moves in real time. Privacy axes (`visibility` + `sensitive`) plumbed in but not yet enforced by UI (no list views in this phase); rules enforced at the data layer from day one.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Firebase (Firestore + Cloud Functions), Anthropic SDK (`claude-sonnet-4-6`), Vitest, React Testing Library, Firebase Rules Unit Testing.

**Scope notes:**
- **In:** Obstacle/Move types, status transitions `fresh → clarifying → prescribed`, visibility/sensitivity classification, synthesis-layer privacy prompts, `/clarity/[obstacleId]` chat UI, `claritySessionTurn` CF, PIN-gate reuse (`usePrivacyGate`), kid-handoff state plumbing (no TopChrome UI yet).
- **Out (later phases):** dashboard at `/unspoken`, ascend beat + milestone + chronicle, manual writeback, integrations with Journal/Mirror/Weekly Focus, kid version.
- **Spec:** `docs/superpowers/specs/2026-05-21-obstacle-clarity-loop-design.md`.

**Pragmatic deviation from spec:** The spec mentions streaming responses. To match the existing `chatWithEntry` pattern (which is non-streaming — function writes both turns; client picks up via subscription), v1 uses request/response not streaming. Streaming can be added in a later phase.

---

## File map

**New files (created in this plan):**

```
src/types/obstacle.ts                                    Obstacle/Move/Prescription/Milestone types
src/lib/obstacle/status.ts                               Pure state machine
src/lib/obstacle/visibility.ts                           Visibility resolution
src/lib/obstacle/synthesis-privacy-prompt.ts             Generalization instructions builder
src/lib/obstacle/build-clarity-turn-prompt.ts            Per-turn user-message builder
src/lib/obstacle/parse-clarity-response.ts               LLM JSON envelope parser
src/lib/obstacle/__tests__/status.test.ts
src/lib/obstacle/__tests__/visibility.test.ts
src/lib/obstacle/__tests__/synthesis-privacy-prompt.test.ts
src/lib/obstacle/__tests__/build-clarity-turn-prompt.test.ts
src/lib/obstacle/__tests__/parse-clarity-response.test.ts

functions/claritySessionTurn.handler.js                  Extracted Cloud Function handler
functions/__tests__/claritySessionTurn.test.js           Unit tests for the handler

firestore-rules/obstacles.rules.test.ts                  Rules emulator tests

src/hooks/useKidHandoffMode.ts                           Global UI state for kid-mode
src/hooks/useObstacle.ts                                 Single-obstacle CRUD + subscribe
src/hooks/useClaritySession.ts                           Subscribe to moves + sendMessage callable
src/hooks/__tests__/useKidHandoffMode.test.ts
src/hooks/__tests__/useObstacle.test.ts
src/hooks/__tests__/useClaritySession.test.ts

src/app/clarity/new/page.tsx                             Factory route — creates obstacle, redirects
src/app/clarity/[obstacleId]/page.tsx                    Route shell — auth gate, loads obstacle
src/app/clarity/[obstacleId]/ClientPage.tsx              Orchestrates the chat surface

src/components/clarity/ObstacleHeader.tsx                Title + status pill
src/components/clarity/TurnList.tsx                      Renders turns
src/components/clarity/TurnInput.tsx                     Textarea + send
src/components/clarity/PrescriptionCard.tsx              Confirm/Refine/Not-yet UI
src/components/clarity/__tests__/ObstacleHeader.test.tsx
src/components/clarity/__tests__/TurnList.test.tsx
src/components/clarity/__tests__/TurnInput.test.tsx
src/components/clarity/__tests__/PrescriptionCard.test.tsx
```

**Modified files:**

```
firestore.rules                                          Add /obstacles + /obstacles/{id}/moves rules
functions/index.js                                       Add claritySessionTurn onCall wrapper
```

---

# Phase 0 — Foundation

## Task 1: Obstacle / Move / Prescription types

**Files:**
- Create: `src/types/obstacle.ts`

- [ ] **Step 1: Write `src/types/obstacle.ts` with the full type surface**

```ts
import type { Timestamp } from 'firebase/firestore';

export type ObstacleStatus =
  | 'fresh'
  | 'clarifying'
  | 'prescribed'
  | 'executed'
  | 'cleared'
  | 'paused';

export type ObstacleOrigin =
  | 'journal-entry'
  | 'clarity-session'
  | 'ritual-focus'
  | 'mirror'
  | 'manual'
  | 'direct';

export type VisibilityMode = 'private' | 'shared-with' | 'family';

export interface ObstacleVisibility {
  mode: VisibilityMode;
  /** Always includes the author. Used by both rules and UI. */
  sharedWith: string[];
}

export interface Obstacle {
  id: string;
  title: string;             // empty string while status='fresh' until first AI turn drafts one
  summary: string;
  authorId: string;
  familyId: string;          // denormalized for rules
  subjectPersonIds: string[];
  status: ObstacleStatus;
  visibility: ObstacleVisibility;
  visibleToUserIds: string[]; // denormalized — required for queries
  sensitive: boolean;
  allowSpecificsInOutput: boolean;
  bringToTherapy: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  clearedAt: Timestamp | null;
  origin: ObstacleOrigin;
  originRefId: string | null;
}

export type MoveType =
  | 'clarity-session'
  | 'prescription'
  | 'execution-note'
  | 'reflection'
  | 'milestone'
  | 'revisit'
  | 'manual-writeback';

export type PrescriptionShape =
  | 'atomic'
  | 'sequence'
  | 'experiment'
  | 'illustrated-story';

export interface PrescriptionDraft {
  shape: PrescriptionShape;
  body: string;             // for v1: text only. Sequence/experiment/story shapes can extend body in later phases.
}

export interface ClaritySessionTurnPayload {
  role: 'user' | 'assistant';
  content: string;          // for 'user': raw text. for 'assistant': the reflection + question concatenated.
  reflection?: string;      // assistant only
  question?: string;        // assistant only
  prescriptionDraft?: PrescriptionDraft; // assistant only, present when AI proposes
}

export interface PrescriptionPayload {
  shape: PrescriptionShape;
  body: string;
  forPersonId?: string;
  dueByHint?: string;
  executed: boolean;
  executionNote?: string;
}

export interface Move {
  id: string;
  type: MoveType;
  at: Timestamp;
  byUserId: string;
  /** Concrete payload shape depends on `type`. Validate with discriminated union helpers. */
  payload: ClaritySessionTurnPayload | PrescriptionPayload | Record<string, unknown>;
}

export interface NewObstacleInput {
  authorId: string;
  familyId: string;
  subjectPersonIds?: string[];
  origin?: ObstacleOrigin;
  originRefId?: string | null;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit src/types/obstacle.ts`
Expected: no errors. (May need `npm run lint` instead if a single-file tsc isn't configured — use whichever passes.)

- [ ] **Step 3: Commit**

```bash
git add src/types/obstacle.ts
git commit -m "feat(obstacle): add Obstacle / Move / Prescription type surface"
```

---

## Task 2: Status state machine

**Files:**
- Create: `src/lib/obstacle/status.ts`
- Test: `src/lib/obstacle/__tests__/status.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/obstacle/__tests__/status.test.ts
import { describe, it, expect } from 'vitest';
import { canTransition, nextStatusOnUserAction } from '../status';
import type { ObstacleStatus } from '@/types/obstacle';

describe('canTransition', () => {
  it('allows fresh → clarifying', () => {
    expect(canTransition('fresh', 'clarifying')).toBe(true);
  });
  it('allows clarifying → prescribed', () => {
    expect(canTransition('clarifying', 'prescribed')).toBe(true);
  });
  it('allows clarifying → clarifying (idempotent for back-and-forth turns)', () => {
    expect(canTransition('clarifying', 'clarifying')).toBe(true);
  });
  it('allows any non-cleared → paused', () => {
    const sources: ObstacleStatus[] = ['fresh', 'clarifying', 'prescribed', 'executed'];
    for (const s of sources) {
      expect(canTransition(s, 'paused')).toBe(true);
    }
  });
  it('rejects cleared → anything (terminal)', () => {
    expect(canTransition('cleared', 'fresh')).toBe(false);
    expect(canTransition('cleared', 'clarifying')).toBe(false);
  });
  it('rejects fresh → prescribed (must clarify first)', () => {
    expect(canTransition('fresh', 'prescribed')).toBe(false);
  });
});

describe('nextStatusOnUserAction', () => {
  it('first user message on fresh obstacle → clarifying', () => {
    expect(nextStatusOnUserAction('fresh', 'send-message')).toBe('clarifying');
  });
  it('subsequent user message on clarifying obstacle → clarifying', () => {
    expect(nextStatusOnUserAction('clarifying', 'send-message')).toBe('clarifying');
  });
  it('user confirms prescription on clarifying → prescribed', () => {
    expect(nextStatusOnUserAction('clarifying', 'confirm-prescription')).toBe('prescribed');
  });
});
```

- [ ] **Step 2: Run to verify failing**

Run: `npm test -- src/lib/obstacle/__tests__/status.test.ts --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/obstacle/status.ts`**

```ts
import type { ObstacleStatus } from '@/types/obstacle';

/**
 * Allowed obstacle status transitions for Phase 1.
 *
 * fresh       → clarifying                       (first user message)
 * clarifying  → clarifying | prescribed | paused (loop or confirm or rest)
 * prescribed  → executed | clarifying | paused   (later phases for executed)
 * executed    → cleared | clarifying | paused    (later phases)
 * cleared     → ∅                                (terminal)
 * paused      → fresh | clarifying | prescribed  (resume to prior shape)
 */
const ALLOWED: Record<ObstacleStatus, ObstacleStatus[]> = {
  fresh: ['clarifying', 'paused'],
  clarifying: ['clarifying', 'prescribed', 'paused'],
  prescribed: ['executed', 'clarifying', 'paused'],
  executed: ['cleared', 'clarifying', 'paused'],
  cleared: [],
  paused: ['fresh', 'clarifying', 'prescribed'],
};

export function canTransition(from: ObstacleStatus, to: ObstacleStatus): boolean {
  return ALLOWED[from].includes(to);
}

export type UserAction =
  | 'send-message'
  | 'confirm-prescription'
  | 'pause'
  | 'resume';

export function nextStatusOnUserAction(
  current: ObstacleStatus,
  action: UserAction,
): ObstacleStatus {
  if (action === 'pause' && canTransition(current, 'paused')) return 'paused';
  if (action === 'send-message') {
    if (current === 'fresh') return 'clarifying';
    if (current === 'clarifying') return 'clarifying';
  }
  if (action === 'confirm-prescription' && current === 'clarifying') {
    return 'prescribed';
  }
  // Invalid combinations return current — caller can detect no-op.
  return current;
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npm test -- src/lib/obstacle/__tests__/status.test.ts --run`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/obstacle/status.ts src/lib/obstacle/__tests__/status.test.ts
git commit -m "feat(obstacle): status state machine + tests"
```

---

## Task 3: Visibility resolution

**Files:**
- Create: `src/lib/obstacle/visibility.ts`
- Test: `src/lib/obstacle/__tests__/visibility.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/obstacle/__tests__/visibility.test.ts
import { describe, it, expect } from 'vitest';
import {
  defaultVisibility,
  resolveVisibleToUserIds,
  canRead,
} from '../visibility';
import type { Obstacle, ObstacleVisibility } from '@/types/obstacle';

describe('defaultVisibility', () => {
  it('returns private with author in sharedWith', () => {
    const v = defaultVisibility('user-a');
    expect(v.mode).toBe('private');
    expect(v.sharedWith).toEqual(['user-a']);
  });
});

describe('resolveVisibleToUserIds', () => {
  it('private: author only', () => {
    const v: ObstacleVisibility = { mode: 'private', sharedWith: ['author'] };
    expect(resolveVisibleToUserIds(v, 'author', ['author', 'partner'])).toEqual(['author']);
  });
  it('shared-with: explicit list (author always included)', () => {
    const v: ObstacleVisibility = {
      mode: 'shared-with',
      sharedWith: ['author', 'partner'],
    };
    expect(resolveVisibleToUserIds(v, 'author', ['author', 'partner', 'kid'])).toEqual([
      'author', 'partner',
    ]);
  });
  it('family: all family member ids', () => {
    const v: ObstacleVisibility = { mode: 'family', sharedWith: ['author'] };
    const result = resolveVisibleToUserIds(v, 'author', ['author', 'partner', 'kid']);
    expect(result.sort()).toEqual(['author', 'kid', 'partner']);
  });
});

describe('canRead', () => {
  function makeObstacle(overrides: Partial<Obstacle>): Obstacle {
    return {
      id: 'o1',
      title: 't',
      summary: 's',
      authorId: 'author',
      familyId: 'f1',
      subjectPersonIds: [],
      status: 'fresh',
      visibility: { mode: 'private', sharedWith: ['author'] },
      visibleToUserIds: ['author'],
      sensitive: false,
      allowSpecificsInOutput: false,
      bringToTherapy: false,
      createdAt: { toMillis: () => 0 } as Obstacle['createdAt'],
      updatedAt: { toMillis: () => 0 } as Obstacle['updatedAt'],
      clearedAt: null,
      origin: 'direct',
      originRefId: null,
      ...overrides,
    };
  }
  it('author can read own private', () => {
    expect(canRead(makeObstacle({}), 'author')).toBe(true);
  });
  it('non-author cannot read private', () => {
    expect(canRead(makeObstacle({}), 'partner')).toBe(false);
  });
  it('partner can read shared-with', () => {
    const o = makeObstacle({
      visibility: { mode: 'shared-with', sharedWith: ['author', 'partner'] },
      visibleToUserIds: ['author', 'partner'],
    });
    expect(canRead(o, 'partner')).toBe(true);
    expect(canRead(o, 'stranger')).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failing**

Run: `npm test -- src/lib/obstacle/__tests__/visibility.test.ts --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/obstacle/visibility.ts`**

```ts
import type { Obstacle, ObstacleVisibility } from '@/types/obstacle';

export function defaultVisibility(authorId: string): ObstacleVisibility {
  return { mode: 'private', sharedWith: [authorId] };
}

/**
 * Compute the denormalized `visibleToUserIds` array given a visibility
 * descriptor + the user's own id + the family's full member list.
 *
 * - private:     [authorId]
 * - shared-with: visibility.sharedWith (assumed to include author)
 * - family:      all family member ids (dedup)
 */
export function resolveVisibleToUserIds(
  visibility: ObstacleVisibility,
  authorId: string,
  familyMemberIds: string[],
): string[] {
  if (visibility.mode === 'private') return [authorId];
  if (visibility.mode === 'shared-with') {
    const set = new Set<string>(visibility.sharedWith);
    set.add(authorId);
    return Array.from(set);
  }
  // family
  const set = new Set<string>([authorId, ...familyMemberIds]);
  return Array.from(set);
}

export function canRead(obstacle: Obstacle, viewerId: string): boolean {
  return obstacle.visibleToUserIds.includes(viewerId);
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npm test -- src/lib/obstacle/__tests__/visibility.test.ts --run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/obstacle/visibility.ts src/lib/obstacle/__tests__/visibility.test.ts
git commit -m "feat(obstacle): visibility resolution + canRead"
```

---

## Task 4: Synthesis-layer privacy prompt builder

**Files:**
- Create: `src/lib/obstacle/synthesis-privacy-prompt.ts`
- Test: `src/lib/obstacle/__tests__/synthesis-privacy-prompt.test.ts`

This builds the **generalization instruction block** that gets prepended to every system prompt for any AI surface that emits user-visible synthesized content. Tested by asserting on the prompt structure, not on AI output.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/obstacle/__tests__/synthesis-privacy-prompt.test.ts
import { describe, it, expect } from 'vitest';
import {
  buildSynthesisPrivacyInstruction,
  shouldGeneralize,
} from '../synthesis-privacy-prompt';

describe('buildSynthesisPrivacyInstruction', () => {
  it('always includes the core generalization rule', () => {
    const instr = buildSynthesisPrivacyInstruction({
      allowSpecifics: false,
      sharedWithOthers: false,
    });
    expect(instr).toContain('Synthesize at the level of the dynamic');
    expect(instr).toContain('not the specific');
  });

  it('lists the protected categories', () => {
    const instr = buildSynthesisPrivacyInstruction({
      allowSpecifics: false,
      sharedWithOthers: false,
    });
    expect(instr).toContain('sexual acts');
    expect(instr).toContain('third-party names');
    expect(instr).toContain('financial figures');
    expect(instr).toContain('medical details');
    expect(instr).toContain('quoted private words');
  });

  it('adds the doubly-generalize rule when output is shared with others', () => {
    const instr = buildSynthesisPrivacyInstruction({
      allowSpecifics: false,
      sharedWithOthers: true,
    });
    expect(instr).toContain('read by someone else');
  });

  it('omits the protection list when user opted into specifics', () => {
    const instr = buildSynthesisPrivacyInstruction({
      allowSpecifics: true,
      sharedWithOthers: false,
    });
    expect(instr).not.toContain('sexual acts');
  });

  it('includes the uncomfortable-test sentence', () => {
    const instr = buildSynthesisPrivacyInstruction({
      allowSpecifics: false,
      sharedWithOthers: false,
    });
    expect(instr).toContain('Would the user be uncomfortable');
  });
});

describe('shouldGeneralize', () => {
  it('returns true when allowSpecifics is false', () => {
    expect(shouldGeneralize({ allowSpecifics: false })).toBe(true);
  });
  it('returns false when allowSpecifics is true', () => {
    expect(shouldGeneralize({ allowSpecifics: true })).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failing**

Run: `npm test -- src/lib/obstacle/__tests__/synthesis-privacy-prompt.test.ts --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/obstacle/synthesis-privacy-prompt.ts`**

```ts
export interface SynthesisPrivacyOptions {
  /** Per-obstacle opt-in to include specifics in output. Default false. */
  allowSpecifics: boolean;
  /** True when the synthesized output will be visible to users other than the author. */
  sharedWithOthers: boolean;
}

/**
 * Returns a paragraph of instructions to PREPEND to any system prompt
 * whose output is shown to the user as synthesized text (milestone
 * sentences, chronicle entries, dashboard blurbs, etc.).
 *
 * The principle: specific in, general out. The AI has full detail in
 * its context but writes outputs that generalize.
 */
export function buildSynthesisPrivacyInstruction(
  opts: SynthesisPrivacyOptions,
): string {
  const lines: string[] = [];
  lines.push(
    'PRIVACY: Synthesize at the level of the dynamic, not the specific.',
  );
  if (!opts.allowSpecifics) {
    lines.push(
      'Do not include: sexual acts, third-party names, financial figures, ' +
      'medical details, or quoted private words.',
    );
  }
  if (opts.sharedWithOthers) {
    lines.push(
      'This output may be read by someone else. Doubly generalize. ' +
      'Avoid any phrasing that would be uncomfortable if read by the ' +
      'other party.',
    );
  }
  lines.push(
    'Apply the uncomfortable test: Would the user be uncomfortable if ' +
    'this exact sentence were read by someone they share this with? ' +
    'If yes, generalize further.',
  );
  return lines.join(' ');
}

export function shouldGeneralize(opts: { allowSpecifics: boolean }): boolean {
  return !opts.allowSpecifics;
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npm test -- src/lib/obstacle/__tests__/synthesis-privacy-prompt.test.ts --run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/obstacle/synthesis-privacy-prompt.ts src/lib/obstacle/__tests__/synthesis-privacy-prompt.test.ts
git commit -m "feat(obstacle): synthesis-layer privacy prompt builder"
```

---

## Task 5: Firestore rules for `obstacles/` + `obstacles/{id}/moves/`

**Files:**
- Modify: `firestore.rules` (append rules block before the closing `}` of the `match /databases/{database}/documents` block)

- [ ] **Step 1: Read the current rules file to find the insertion point**

Run: `grep -n "match /therapy_briefs" firestore.rules`
Expected: a single line number, around 1218. Insert the new obstacles block immediately AFTER the therapy_briefs match block closes (find its `}` and place the new block after).

- [ ] **Step 2: Append the obstacles rules block**

Add this block in `firestore.rules`, inside the outermost `match /databases/{database}/documents` block, after `match /therapy_briefs/...`:

```
    // Obstacles — the core unit of the clarity loop.
    //
    // Visibility model (per-obstacle):
    //   An obstacle is readable by any user whose uid is listed in
    //   `visibleToUserIds`. That field is denormalized on every write
    //   from the visibility object. This pattern matches the existing
    //   journal-entry visibility model.
    //
    //   Writes require the user to be the author. Family scope is
    //   enforced via the denormalized familyId on the doc.
    //
    //   Sensitive flag is NOT enforced at the rules layer — it gates
    //   UI display only. Rules-level privacy comes from visibility.
    match /obstacles/{obstacleId} {
      allow read: if isSignedIn()
        && request.auth.uid in resource.data.visibleToUserIds
        && resource.data.familyId == getUserData().familyId;

      allow create: if isSignedIn()
        && request.resource.data.authorId == request.auth.uid
        && request.resource.data.familyId == getUserData().familyId
        && request.auth.uid in request.resource.data.visibleToUserIds;

      allow update: if isSignedIn()
        && resource.data.authorId == request.auth.uid
        && request.resource.data.authorId == resource.data.authorId
        && request.resource.data.familyId == resource.data.familyId;

      // Delete is intentionally not allowed in v1 — obstacles can be
      // paused but not destroyed. Reconsider in a later phase.
      allow delete: if false;

      // Append-only moves subcollection.
      match /moves/{moveId} {
        allow read: if isSignedIn()
          && request.auth.uid in get(/databases/$(database)/documents/obstacles/$(obstacleId)).data.visibleToUserIds;

        // Moves can be created by anyone with read access — for v1
        // that means the author, since obstacles are private by default.
        // Cloud Functions use Admin SDK and bypass these rules.
        allow create: if isSignedIn()
          && request.auth.uid in get(/databases/$(database)/documents/obstacles/$(obstacleId)).data.visibleToUserIds
          && request.resource.data.byUserId == request.auth.uid;

        // Moves are append-only. No update, no delete from client.
        allow update, delete: if false;
      }
    }
```

- [ ] **Step 3: Validate rules syntax**

Run: `firebase emulators:start --only firestore 2>&1 | head -30`
Look for any rules parse errors. Expected: "All emulators ready! It is now safe to connect your app." Kill the emulator after confirming.

Alternative if firebase CLI not available: `npm run test:rules` will surface parse errors when run.

- [ ] **Step 4: Commit**

```bash
git add firestore.rules
git commit -m "feat(obstacle): firestore rules for obstacles + moves subcollection"
```

---

## Task 6: Rules emulator tests for obstacles

**Files:**
- Create: `firestore-rules/obstacles.rules.test.ts`

Mirror the pattern in `firestore-rules/weeklyFocus.rules.test.ts`.

- [ ] **Step 1: Write the test file**

```ts
// firestore-rules/obstacles.rules.test.ts
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { readFileSync, existsSync } from 'fs';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';

const PROJECT_ID = 'obstacles-rules-test';
const FAMILY_ID = 'fam-1';
const OTHER_FAMILY_ID = 'fam-2';

const AUTHOR = 'author-uid';
const PARTNER = 'partner-uid';
const STRANGER = 'stranger-uid';

let testEnv: RulesTestEnvironment | undefined;
const emulatorAvailable = !!process.env.FIRESTORE_EMULATOR_HOST;

beforeAll(async () => {
  if (!emulatorAvailable) return;
  if (!existsSync('firestore.rules')) {
    throw new Error('firestore.rules not found');
  }
  const rules = readFileSync('firestore.rules', 'utf8');
  const [host, portStr] = (process.env.FIRESTORE_EMULATOR_HOST || '').split(':');
  const port = parseInt(portStr || '8080', 10);
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules, host: host || 'localhost', port },
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  if (!emulatorAvailable || !testEnv) return;
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users', AUTHOR), { role: 'parent', familyId: FAMILY_ID });
    await setDoc(doc(db, 'users', PARTNER), { role: 'parent', familyId: FAMILY_ID });
    await setDoc(doc(db, 'users', STRANGER), { role: 'parent', familyId: OTHER_FAMILY_ID });
  });
});

const baseObstacle = (overrides: Record<string, unknown> = {}) => ({
  title: '',
  summary: '',
  authorId: AUTHOR,
  familyId: FAMILY_ID,
  subjectPersonIds: [],
  status: 'fresh',
  visibility: { mode: 'private', sharedWith: [AUTHOR] },
  visibleToUserIds: [AUTHOR],
  sensitive: false,
  allowSpecificsInOutput: false,
  bringToTherapy: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  clearedAt: null,
  origin: 'direct',
  originRefId: null,
  ...overrides,
});

describe.skipIf(!emulatorAvailable)('obstacles rules', () => {
  it('author can create their own private obstacle', async () => {
    const db = testEnv!.authenticatedContext(AUTHOR).firestore();
    await assertSucceeds(addDoc(collection(db, 'obstacles'), baseObstacle()));
  });

  it('user cannot create an obstacle for another user', async () => {
    const db = testEnv!.authenticatedContext(AUTHOR).firestore();
    await assertFails(
      addDoc(collection(db, 'obstacles'), baseObstacle({ authorId: PARTNER })),
    );
  });

  it('user cannot create an obstacle in another family', async () => {
    const db = testEnv!.authenticatedContext(AUTHOR).firestore();
    await assertFails(
      addDoc(collection(db, 'obstacles'), baseObstacle({ familyId: OTHER_FAMILY_ID })),
    );
  });

  it('author can read own private obstacle', async () => {
    let id = '';
    await testEnv!.withSecurityRulesDisabled(async (ctx) => {
      const ref = await addDoc(collection(ctx.firestore(), 'obstacles'), baseObstacle());
      id = ref.id;
    });
    const db = testEnv!.authenticatedContext(AUTHOR).firestore();
    await assertSucceeds(getDoc(doc(db, 'obstacles', id)));
  });

  it('partner cannot read author private obstacle', async () => {
    let id = '';
    await testEnv!.withSecurityRulesDisabled(async (ctx) => {
      const ref = await addDoc(collection(ctx.firestore(), 'obstacles'), baseObstacle());
      id = ref.id;
    });
    const db = testEnv!.authenticatedContext(PARTNER).firestore();
    await assertFails(getDoc(doc(db, 'obstacles', id)));
  });

  it('partner can read shared-with obstacle', async () => {
    let id = '';
    await testEnv!.withSecurityRulesDisabled(async (ctx) => {
      const ref = await addDoc(
        collection(ctx.firestore(), 'obstacles'),
        baseObstacle({
          visibility: { mode: 'shared-with', sharedWith: [AUTHOR, PARTNER] },
          visibleToUserIds: [AUTHOR, PARTNER],
        }),
      );
      id = ref.id;
    });
    const db = testEnv!.authenticatedContext(PARTNER).firestore();
    await assertSucceeds(getDoc(doc(db, 'obstacles', id)));
  });

  it('stranger from another family cannot read', async () => {
    let id = '';
    await testEnv!.withSecurityRulesDisabled(async (ctx) => {
      const ref = await addDoc(collection(ctx.firestore(), 'obstacles'), baseObstacle());
      id = ref.id;
    });
    const db = testEnv!.authenticatedContext(STRANGER).firestore();
    await assertFails(getDoc(doc(db, 'obstacles', id)));
  });

  it('obstacle cannot be deleted', async () => {
    let id = '';
    await testEnv!.withSecurityRulesDisabled(async (ctx) => {
      const ref = await addDoc(collection(ctx.firestore(), 'obstacles'), baseObstacle());
      id = ref.id;
    });
    const db = testEnv!.authenticatedContext(AUTHOR).firestore();
    await assertFails(deleteDoc(doc(db, 'obstacles', id)));
  });

  it('author can append a move to their obstacle', async () => {
    let id = '';
    await testEnv!.withSecurityRulesDisabled(async (ctx) => {
      const ref = await addDoc(collection(ctx.firestore(), 'obstacles'), baseObstacle());
      id = ref.id;
    });
    const db = testEnv!.authenticatedContext(AUTHOR).firestore();
    await assertSucceeds(
      addDoc(collection(db, 'obstacles', id, 'moves'), {
        type: 'clarity-session',
        at: serverTimestamp(),
        byUserId: AUTHOR,
        payload: { role: 'user', content: 'hi' },
      }),
    );
  });

  it('partner cannot append a move to author private obstacle', async () => {
    let id = '';
    await testEnv!.withSecurityRulesDisabled(async (ctx) => {
      const ref = await addDoc(collection(ctx.firestore(), 'obstacles'), baseObstacle());
      id = ref.id;
    });
    const db = testEnv!.authenticatedContext(PARTNER).firestore();
    await assertFails(
      addDoc(collection(db, 'obstacles', id, 'moves'), {
        type: 'clarity-session',
        at: serverTimestamp(),
        byUserId: PARTNER,
        payload: { role: 'user', content: 'sneak' },
      }),
    );
  });

  it('moves cannot be updated or deleted (append-only)', async () => {
    let obstacleId = '';
    let moveId = '';
    await testEnv!.withSecurityRulesDisabled(async (ctx) => {
      const oref = await addDoc(collection(ctx.firestore(), 'obstacles'), baseObstacle());
      obstacleId = oref.id;
      const mref = await addDoc(
        collection(ctx.firestore(), 'obstacles', obstacleId, 'moves'),
        {
          type: 'clarity-session',
          at: serverTimestamp(),
          byUserId: AUTHOR,
          payload: { role: 'user', content: 'x' },
        },
      );
      moveId = mref.id;
    });
    const db = testEnv!.authenticatedContext(AUTHOR).firestore();
    await assertFails(
      updateDoc(doc(db, 'obstacles', obstacleId, 'moves', moveId), { payload: { tampered: true } }),
    );
    await assertFails(deleteDoc(doc(db, 'obstacles', obstacleId, 'moves', moveId)));
  });
});
```

- [ ] **Step 2: Run the emulator + tests**

In one terminal: `firebase emulators:start --only firestore`

In another: `npm run test:rules -- firestore-rules/obstacles.rules.test.ts --run`

Expected: all tests pass.

If the test:rules npm script doesn't accept file args, run: `FIRESTORE_EMULATOR_HOST=localhost:8080 npx vitest run firestore-rules/obstacles.rules.test.ts`.

- [ ] **Step 3: Commit**

```bash
git add firestore-rules/obstacles.rules.test.ts
git commit -m "test(obstacle): firestore rules tests for obstacles + moves"
```

---

## Task 7: Kid handoff mode hook

**Files:**
- Create: `src/hooks/useKidHandoffMode.ts`
- Test: `src/hooks/__tests__/useKidHandoffMode.test.ts`

Global UI state. v1 stores in localStorage so it persists across page loads. TopChrome toggle integration is Phase 2; the hook is the API surface.

- [ ] **Step 1: Write the failing test**

```ts
// src/hooks/__tests__/useKidHandoffMode.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKidHandoffMode } from '../useKidHandoffMode';

beforeEach(() => {
  localStorage.clear();
});

describe('useKidHandoffMode', () => {
  it('defaults to false', () => {
    const { result } = renderHook(() => useKidHandoffMode());
    expect(result.current.kidHandoffMode).toBe(false);
  });

  it('toggles to true and persists', () => {
    const { result } = renderHook(() => useKidHandoffMode());
    act(() => result.current.setKidHandoffMode(true));
    expect(result.current.kidHandoffMode).toBe(true);
    expect(localStorage.getItem('relish:kidHandoffMode')).toBe('1');
  });

  it('rehydrates from localStorage on mount', () => {
    localStorage.setItem('relish:kidHandoffMode', '1');
    const { result } = renderHook(() => useKidHandoffMode());
    expect(result.current.kidHandoffMode).toBe(true);
  });

  it('toggle helper flips current value', () => {
    const { result } = renderHook(() => useKidHandoffMode());
    act(() => result.current.toggle());
    expect(result.current.kidHandoffMode).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.kidHandoffMode).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failing**

Run: `npm test -- src/hooks/__tests__/useKidHandoffMode.test.ts --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/hooks/useKidHandoffMode.ts`**

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'relish:kidHandoffMode';

export interface UseKidHandoffModeReturn {
  kidHandoffMode: boolean;
  setKidHandoffMode: (next: boolean) => void;
  toggle: () => void;
}

/**
 * Global UI state for "kid handoff mode" — when on, sensitive content
 * is hidden across all surfaces. Persists in localStorage so the user
 * doesn't have to re-enable it after a page reload.
 *
 * Phase 1: hook + persistence only. Phase 2 wires it to TopChrome.
 */
export function useKidHandoffMode(): UseKidHandoffModeReturn {
  const [kidHandoffMode, setState] = useState<boolean>(false);

  // Rehydrate from localStorage on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === '1') setState(true);
    } catch {
      // localStorage may be disabled — non-fatal.
    }
  }, []);

  const setKidHandoffMode = useCallback((next: boolean) => {
    setState(next);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      }
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    setKidHandoffMode(!kidHandoffMode);
  }, [kidHandoffMode, setKidHandoffMode]);

  return { kidHandoffMode, setKidHandoffMode, toggle };
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npm test -- src/hooks/__tests__/useKidHandoffMode.test.ts --run`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useKidHandoffMode.ts src/hooks/__tests__/useKidHandoffMode.test.ts
git commit -m "feat(obstacle): kid handoff mode hook + localStorage persistence"
```

---

# Phase 1 — Clarity Session

## Task 8: Build clarity turn prompt

**Files:**
- Create: `src/lib/obstacle/build-clarity-turn-prompt.ts`
- Test: `src/lib/obstacle/__tests__/build-clarity-turn-prompt.test.ts`

Builds the user-message string passed to Anthropic for each turn. Pure function; the system prompt lives in the handler.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/obstacle/__tests__/build-clarity-turn-prompt.test.ts
import { describe, it, expect } from 'vitest';
import { buildClarityTurnPrompt } from '../build-clarity-turn-prompt';

describe('buildClarityTurnPrompt', () => {
  it('opens with the obstacle title when set', () => {
    const out = buildClarityTurnPrompt({
      obstacleTitle: 'the wrestling thing',
      transcript: [
        { role: 'user', content: "I've been wanting to bring up..." },
      ],
    });
    expect(out).toContain('Obstacle: the wrestling thing');
  });

  it('omits obstacle title block when title is empty (fresh obstacle)', () => {
    const out = buildClarityTurnPrompt({
      obstacleTitle: '',
      transcript: [{ role: 'user', content: "I've been thinking..." }],
    });
    expect(out).not.toContain('Obstacle:');
  });

  it('formats transcript as a labeled sequence', () => {
    const out = buildClarityTurnPrompt({
      obstacleTitle: 't',
      transcript: [
        { role: 'user', content: 'A' },
        { role: 'assistant', content: 'B' },
        { role: 'user', content: 'C' },
      ],
    });
    expect(out).toContain('USER: A');
    expect(out).toContain('ASSISTANT: B');
    expect(out).toContain('USER: C');
  });

  it('appends a "respond now" sentinel at the end', () => {
    const out = buildClarityTurnPrompt({
      obstacleTitle: 't',
      transcript: [{ role: 'user', content: 'A' }],
    });
    expect(out.trim().endsWith('Respond as ASSISTANT now.')).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failing**

Run: `npm test -- src/lib/obstacle/__tests__/build-clarity-turn-prompt.test.ts --run`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/obstacle/build-clarity-turn-prompt.ts
export interface TranscriptTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface BuildClarityTurnPromptInput {
  obstacleTitle: string;
  transcript: TranscriptTurn[];
}

/**
 * Builds the user-message string passed to the LLM each turn.
 *
 * The system prompt (voice rules, JSON envelope contract, safety,
 * generalization) lives in the handler. This function just renders
 * the per-turn context: the obstacle title (once set) and the prior
 * transcript.
 */
export function buildClarityTurnPrompt(input: BuildClarityTurnPromptInput): string {
  const parts: string[] = [];
  if (input.obstacleTitle && input.obstacleTitle.trim()) {
    parts.push(`Obstacle: ${input.obstacleTitle.trim()}`);
    parts.push('');
  }
  for (const t of input.transcript) {
    const label = t.role === 'user' ? 'USER' : 'ASSISTANT';
    parts.push(`${label}: ${t.content}`);
  }
  parts.push('');
  parts.push('Respond as ASSISTANT now.');
  return parts.join('\n');
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npm test -- src/lib/obstacle/__tests__/build-clarity-turn-prompt.test.ts --run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/obstacle/build-clarity-turn-prompt.ts src/lib/obstacle/__tests__/build-clarity-turn-prompt.test.ts
git commit -m "feat(obstacle): per-turn prompt builder"
```

---

## Task 9: Parse clarity response (JSON envelope)

**Files:**
- Create: `src/lib/obstacle/parse-clarity-response.ts`
- Test: `src/lib/obstacle/__tests__/parse-clarity-response.test.ts`

The LLM is instructed to respond with JSON: `{ reflection, question, prescriptionDraft? }`. This module parses + validates.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/obstacle/__tests__/parse-clarity-response.test.ts
import { describe, it, expect } from 'vitest';
import { parseClarityResponse } from '../parse-clarity-response';

describe('parseClarityResponse', () => {
  it('parses a simple reflection + question turn', () => {
    const raw = JSON.stringify({
      reflection: 'You sound torn.',
      question: 'Have you said this to her?',
    });
    const parsed = parseClarityResponse(raw);
    expect(parsed.reflection).toBe('You sound torn.');
    expect(parsed.question).toBe('Have you said this to her?');
    expect(parsed.prescriptionDraft).toBeUndefined();
  });

  it('parses a turn that includes a prescription draft', () => {
    const raw = JSON.stringify({
      reflection: 'It sounds clearer now.',
      question: 'Want to try something concrete?',
      prescriptionDraft: {
        shape: 'atomic',
        body: "Ask her: 'is naming it what shifts it?'",
      },
    });
    const parsed = parseClarityResponse(raw);
    expect(parsed.prescriptionDraft?.shape).toBe('atomic');
    expect(parsed.prescriptionDraft?.body).toContain('naming it');
  });

  it('tolerates JSON wrapped in code fences', () => {
    const raw =
      '```json\n' +
      JSON.stringify({ reflection: 'r', question: 'q' }) +
      '\n```';
    const parsed = parseClarityResponse(raw);
    expect(parsed.reflection).toBe('r');
    expect(parsed.question).toBe('q');
  });

  it('throws on missing required fields', () => {
    const raw = JSON.stringify({ reflection: 'only this' });
    expect(() => parseClarityResponse(raw)).toThrow();
  });

  it('throws on non-JSON gibberish', () => {
    expect(() => parseClarityResponse('not json')).toThrow();
  });

  it('rejects prescriptionDraft with invalid shape', () => {
    const raw = JSON.stringify({
      reflection: 'r',
      question: 'q',
      prescriptionDraft: { shape: 'not-a-shape', body: 'x' },
    });
    expect(() => parseClarityResponse(raw)).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify failing**

Run: `npm test -- src/lib/obstacle/__tests__/parse-clarity-response.test.ts --run`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/obstacle/parse-clarity-response.ts
import type { PrescriptionShape, PrescriptionDraft } from '@/types/obstacle';

export interface ClarityResponse {
  reflection: string;
  question: string;
  prescriptionDraft?: PrescriptionDraft;
}

const VALID_SHAPES: PrescriptionShape[] = [
  'atomic',
  'sequence',
  'experiment',
  'illustrated-story',
];

/**
 * Parse + validate the LLM's per-turn JSON envelope.
 *
 * Contract (enforced by the handler's system prompt):
 *   { reflection: string, question: string, prescriptionDraft?: {shape, body} }
 *
 * Tolerates the LLM wrapping the JSON in a ```json code fence.
 */
export function parseClarityResponse(raw: string): ClarityResponse {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim();

  let obj: unknown;
  try {
    obj = JSON.parse(stripped);
  } catch (err) {
    throw new Error(`Failed to parse clarity response as JSON: ${(err as Error).message}`);
  }
  if (!obj || typeof obj !== 'object') {
    throw new Error('Clarity response was not a JSON object');
  }
  const o = obj as Record<string, unknown>;

  if (typeof o.reflection !== 'string' || !o.reflection.trim()) {
    throw new Error('Missing or empty reflection');
  }
  if (typeof o.question !== 'string' || !o.question.trim()) {
    throw new Error('Missing or empty question');
  }

  const out: ClarityResponse = {
    reflection: o.reflection.trim(),
    question: o.question.trim(),
  };

  if (o.prescriptionDraft) {
    const pd = o.prescriptionDraft as Record<string, unknown>;
    if (!VALID_SHAPES.includes(pd.shape as PrescriptionShape)) {
      throw new Error(`Invalid prescription shape: ${String(pd.shape)}`);
    }
    if (typeof pd.body !== 'string' || !pd.body.trim()) {
      throw new Error('Missing prescription body');
    }
    out.prescriptionDraft = {
      shape: pd.shape as PrescriptionShape,
      body: pd.body.trim(),
    };
  }

  return out;
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npm test -- src/lib/obstacle/__tests__/parse-clarity-response.test.ts --run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/obstacle/parse-clarity-response.ts src/lib/obstacle/__tests__/parse-clarity-response.test.ts
git commit -m "feat(obstacle): LLM response parser with JSON envelope validation"
```

---

## Task 10: `claritySessionTurn` Cloud Function handler

**Files:**
- Create: `functions/claritySessionTurn.handler.js`
- Test: `functions/__tests__/claritySessionTurn.test.js`

Extracted-handler pattern. Mirrors `synthesizeWeeklyFocus.handler.js`. The handler:

1. Validates auth + obstacle ownership.
2. Loads recent moves for transcript context.
3. Writes the user move.
4. If obstacle is `fresh`, drafts a working title from the first message.
5. Calls Anthropic with the full system prompt + per-turn user prompt.
6. Parses the response, writes the assistant move (possibly with prescriptionDraft), updates obstacle status.

Tests use a mock anthropic client + an in-memory db fake.

- [ ] **Step 1: Write the failing test**

```js
// functions/__tests__/claritySessionTurn.test.js
const { describe, it, beforeEach } = require("vitest");
const { expect, vi } = require("vitest");
const { runClaritySessionTurn } = require("../claritySessionTurn.handler.js");

// Tiny in-memory firestore fake — only the operations the handler uses.
function makeFakeDb({ obstacle, moves = [], userData }) {
  const written = { obstacleUpdates: [], moves: [] };
  const obstacleRef = {
    get: async () => ({ exists: !!obstacle, data: () => obstacle, id: obstacle?.id }),
    update: async (patch) => {
      written.obstacleUpdates.push(patch);
      Object.assign(obstacle, patch);
    },
    collection: (name) => ({
      add: async (doc) => {
        written.moves.push({ ...doc, _name: name });
        return { id: `move-${written.moves.length}` };
      },
      orderBy: () => ({
        get: async () => ({
          docs: moves.map((m, i) => ({ id: `m${i}`, data: () => m })),
        }),
      }),
    }),
  };
  const userRef = { get: async () => ({ data: () => userData }) };
  return {
    db: {
      collection: (name) => {
        if (name === "obstacles") {
          return {
            doc: () => obstacleRef,
          };
        }
        if (name === "users") {
          return { doc: () => userRef };
        }
        throw new Error("unexpected collection " + name);
      },
    },
    written,
  };
}

function makeMockAnthropic(response) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ text: response }],
        usage: { input_tokens: 10, output_tokens: 20 },
      }),
    },
  };
}

describe("runClaritySessionTurn", () => {
  const baseObstacle = {
    id: "ob1",
    title: "",
    authorId: "uid-1",
    familyId: "fam-1",
    status: "fresh",
    visibility: { mode: "private", sharedWith: ["uid-1"] },
    visibleToUserIds: ["uid-1"],
    sensitive: false,
    allowSpecificsInOutput: false,
  };

  it("throws on missing auth", async () => {
    const { db } = makeFakeDb({ obstacle: baseObstacle });
    const anthropic = makeMockAnthropic("{}");
    await expect(
      runClaritySessionTurn(
        { db, anthropic },
        { uid: null, data: { obstacleId: "ob1", message: "hi" } },
      ),
    ).rejects.toThrow(/Authentication/);
  });

  it("throws when obstacle does not exist", async () => {
    const { db } = makeFakeDb({ obstacle: null });
    const anthropic = makeMockAnthropic("{}");
    await expect(
      runClaritySessionTurn(
        { db, anthropic },
        { uid: "uid-1", data: { obstacleId: "ob1", message: "hi" } },
      ),
    ).rejects.toThrow(/Obstacle not found/);
  });

  it("throws when caller is not the author", async () => {
    const { db } = makeFakeDb({
      obstacle: { ...baseObstacle, authorId: "someone-else" },
      userData: { familyId: "fam-1", role: "parent" },
    });
    const anthropic = makeMockAnthropic("{}");
    await expect(
      runClaritySessionTurn(
        { db, anthropic },
        { uid: "uid-1", data: { obstacleId: "ob1", message: "hi" } },
      ),
    ).rejects.toThrow(/Access denied/);
  });

  it("on fresh obstacle: transitions to clarifying, drafts title, writes both moves", async () => {
    const { db, written } = makeFakeDb({
      obstacle: { ...baseObstacle },
      userData: { familyId: "fam-1", role: "parent" },
    });
    const anthropic = makeMockAnthropic(
      JSON.stringify({ reflection: "That sounds heavy.", question: "Have you said this to her?" }),
    );
    const result = await runClaritySessionTurn(
      { db, anthropic },
      {
        uid: "uid-1",
        data: { obstacleId: "ob1", message: "I want to bring up something hard with Iris." },
      },
    );
    expect(result.assistantTurn.reflection).toContain("heavy");
    expect(written.moves).toHaveLength(2);
    expect(written.moves[0].payload.role).toBe("user");
    expect(written.moves[1].payload.role).toBe("assistant");
    expect(
      written.obstacleUpdates.some((u) => u.status === "clarifying"),
    ).toBe(true);
    expect(
      written.obstacleUpdates.some((u) => typeof u.title === "string" && u.title.length > 0),
    ).toBe(true);
  });

  it("on clarifying obstacle: appends turns without re-drafting title", async () => {
    const { db, written } = makeFakeDb({
      obstacle: { ...baseObstacle, status: "clarifying", title: "the wrestling thing" },
      userData: { familyId: "fam-1", role: "parent" },
      moves: [
        { type: "clarity-session", payload: { role: "user", content: "first" } },
        { type: "clarity-session", payload: { role: "assistant", content: "first reply" } },
      ],
    });
    const anthropic = makeMockAnthropic(
      JSON.stringify({ reflection: "r", question: "q" }),
    );
    await runClaritySessionTurn(
      { db, anthropic },
      { uid: "uid-1", data: { obstacleId: "ob1", message: "more" } },
    );
    // Title was not changed.
    expect(
      written.obstacleUpdates.every((u) => !("title" in u)),
    ).toBe(true);
  });

  it("when LLM emits a prescription draft, returns it on the assistant turn", async () => {
    const { db, written } = makeFakeDb({
      obstacle: { ...baseObstacle, status: "clarifying", title: "x" },
      userData: { familyId: "fam-1", role: "parent" },
      moves: [],
    });
    const anthropic = makeMockAnthropic(
      JSON.stringify({
        reflection: "Clear now.",
        question: "Want to try something concrete?",
        prescriptionDraft: { shape: "atomic", body: "Ask her: '...'" },
      }),
    );
    const result = await runClaritySessionTurn(
      { db, anthropic },
      { uid: "uid-1", data: { obstacleId: "ob1", message: "yes" } },
    );
    expect(result.assistantTurn.prescriptionDraft?.shape).toBe("atomic");
    const assistantMove = written.moves.find((m) => m.payload.role === "assistant");
    expect(assistantMove.payload.prescriptionDraft).toBeDefined();
  });

  it("includes the synthesis-privacy instruction in the system prompt", async () => {
    const { db } = makeFakeDb({
      obstacle: { ...baseObstacle, status: "clarifying", title: "x" },
      userData: { familyId: "fam-1", role: "parent" },
    });
    const anthropic = makeMockAnthropic(
      JSON.stringify({ reflection: "r", question: "q" }),
    );
    await runClaritySessionTurn(
      { db, anthropic },
      { uid: "uid-1", data: { obstacleId: "ob1", message: "x" } },
    );
    const callArgs = anthropic.messages.create.mock.calls[0][0];
    expect(callArgs.system).toContain("PRIVACY");
    expect(callArgs.system).toContain("Synthesize at the level of the dynamic");
  });

  it("uses claude-sonnet-4-6 model", async () => {
    const { db } = makeFakeDb({
      obstacle: { ...baseObstacle, status: "clarifying", title: "x" },
      userData: { familyId: "fam-1", role: "parent" },
    });
    const anthropic = makeMockAnthropic(
      JSON.stringify({ reflection: "r", question: "q" }),
    );
    await runClaritySessionTurn(
      { db, anthropic },
      { uid: "uid-1", data: { obstacleId: "ob1", message: "x" } },
    );
    expect(anthropic.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-sonnet-4-6" }),
    );
  });
});
```

- [ ] **Step 2: Run to verify failing**

Run: `npm run test:functions -- claritySessionTurn`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `functions/claritySessionTurn.handler.js`**

```js
// functions/claritySessionTurn.handler.js
//
// Core logic for one clarity-session turn. Mirrors the extracted
// handler pattern in synthesizeWeeklyFocus.handler.js.
//
// Inputs (deps): { db, anthropic, logger?, logAIUsage? }
// Inputs (payload): { uid, data: { obstacleId, message } }
//
// Behavior:
//   1. Validate auth + obstacle ownership + family scope.
//   2. Load existing moves for transcript.
//   3. Write the user move.
//   4. If obstacle is fresh, draft a working title from the first message.
//   5. Call Anthropic with the full system prompt + per-turn user prompt.
//   6. Parse the response. Write the assistant move (with prescriptionDraft if present).
//   7. Update obstacle status (fresh → clarifying) if needed.

const SYSTEM_PROMPT = [
  "You are a clarity coach for one of the users of an app called Relish.",
  "The user is working through an obstacle in one of their close relationships.",
  "",
  "VOICE:",
  "Warm, specific, slightly dry. Not therapy-speak. Not coach-jargon.",
  "Not performative neutrality. Name what you notice, even when uncomfortable.",
  "",
  "TURN STRUCTURE:",
  "Each of your turns has exactly two parts: a brief reflection (1-2 short",
  "paragraphs) and ONE question at the end. Never more than one question.",
  "Your response should be shorter than the user's.",
  "",
  "WHAT YOU NEVER DO:",
  "- Never ask more than one question per turn.",
  "- Never moralize or instruct.",
  "- Never write the user's exact words for the prescription. Offer a question",
  "  for them to ask, not a script to recite.",
  "- Never advance to prescription without checking ('Want to try something concrete?').",
  "- Never advice-dump mid-session.",
  "",
  "PRESCRIPTION:",
  "When clarity surfaces (the user has named what they want / where the friction",
  "is / what they don't know), propose ONE prescription. Include the",
  "`prescriptionDraft` field in your JSON response when proposing.",
  "Shapes available:",
  "- 'atomic': one specific question or sentence for the user to ask",
  "- 'sequence': 2-4 ordered conditional moves",
  "- 'experiment': a week-long behavior change to try",
  "- 'illustrated-story': only for kid recipients",
  "When the prescription is something to say, phrase as the question the user",
  "should ask, not as a script to read aloud.",
  "",
  "SAFETY:",
  "If the user surfaces self-harm, severe distress, or domestic violence",
  "indicators: break form. Name what you noticed. Suggest real-world resources",
  "(a therapist, a hotline). Do not prescribe a confrontational move.",
  "",
  "PRIVACY: Synthesize at the level of the dynamic, not the specific.",
  "Do not include: sexual acts, third-party names, financial figures,",
  "medical details, or quoted private words.",
  "Apply the uncomfortable test: Would the user be uncomfortable if",
  "this exact sentence were read by someone they share this with? If yes,",
  "generalize further.",
  "",
  "OUTPUT FORMAT (strict):",
  "Respond with a single JSON object, nothing else. No prose, no preamble,",
  "no markdown fences. The schema is:",
  "  { \"reflection\": string, \"question\": string,",
  "    \"prescriptionDraft\"?: { \"shape\": \"atomic\"|\"sequence\"|\"experiment\"|\"illustrated-story\", \"body\": string } }",
].join("\n");

const FieldValue = require("firebase-admin").firestore?.FieldValue || null;

function draftTitleFromFirstMessage(message) {
  // v1: simple truncation. A later phase can have the LLM draft this.
  const cleaned = String(message || "").trim().replace(/\s+/g, " ");
  if (cleaned.length <= 60) return cleaned;
  return cleaned.slice(0, 57).trim() + "…";
}

function buildTranscript(moves) {
  const turns = [];
  for (const m of moves) {
    const data = typeof m.data === "function" ? m.data() : m;
    if (data && data.type === "clarity-session" && data.payload) {
      turns.push({
        role: data.payload.role,
        content: data.payload.content,
      });
    }
  }
  return turns;
}

function buildPerTurnUserMessage(obstacleTitle, transcript) {
  const parts = [];
  if (obstacleTitle && obstacleTitle.trim()) {
    parts.push(`Obstacle: ${obstacleTitle.trim()}`);
    parts.push("");
  }
  for (const t of transcript) {
    const label = t.role === "user" ? "USER" : "ASSISTANT";
    parts.push(`${label}: ${t.content}`);
  }
  parts.push("");
  parts.push("Respond as ASSISTANT now.");
  return parts.join("\n");
}

function parseEnvelope(rawText) {
  const stripped = String(rawText || "")
      .trim()
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();
  const obj = JSON.parse(stripped);
  if (!obj || typeof obj !== "object") throw new Error("Not a JSON object");
  if (typeof obj.reflection !== "string" || !obj.reflection.trim()) {
    throw new Error("Missing reflection");
  }
  if (typeof obj.question !== "string" || !obj.question.trim()) {
    throw new Error("Missing question");
  }
  const out = {
    reflection: obj.reflection.trim(),
    question: obj.question.trim(),
  };
  if (obj.prescriptionDraft) {
    const pd = obj.prescriptionDraft;
    const validShapes = ["atomic", "sequence", "experiment", "illustrated-story"];
    if (!validShapes.includes(pd.shape)) throw new Error("Bad shape");
    if (typeof pd.body !== "string" || !pd.body.trim()) throw new Error("Bad body");
    out.prescriptionDraft = { shape: pd.shape, body: pd.body.trim() };
  }
  return out;
}

async function runClaritySessionTurn(deps, payload) {
  const { db, anthropic, logger = console, logAIUsage } = deps;
  const { uid, data } = payload || {};

  if (!uid) throw new Error("Authentication required");
  const obstacleId = data && data.obstacleId;
  const message = data && typeof data.message === "string" ? data.message.trim() : "";
  if (!obstacleId) throw new Error("obstacleId is required");
  if (!message) throw new Error("message is required");

  const obstacleRef = db.collection("obstacles").doc(obstacleId);
  const obstacleSnap = await obstacleRef.get();
  if (!obstacleSnap.exists) throw new Error("Obstacle not found");
  const obstacle = obstacleSnap.data();

  if (obstacle.authorId !== uid) throw new Error("Access denied");

  // Load user data to enforce family scope.
  const userSnap = await db.collection("users").doc(uid).get();
  const userData = userSnap.data();
  if (!userData || userData.familyId !== obstacle.familyId) {
    throw new Error("Access denied");
  }

  // Load existing moves for transcript.
  const movesSnap = await obstacleRef.collection("moves").orderBy("at", "asc").get();
  const prior = buildTranscript(movesSnap.docs);

  // Append the user turn to the transcript we'll send to the model.
  const transcript = [...prior, { role: "user", content: message }];

  // Write the user move first.
  const userMovePayload = {
    type: "clarity-session",
    at: FieldValue ? FieldValue.serverTimestamp() : new Date(),
    byUserId: uid,
    payload: { role: "user", content: message },
  };
  await obstacleRef.collection("moves").add(userMovePayload);

  // If fresh, draft a working title and transition to clarifying.
  if (obstacle.status === "fresh") {
    await obstacleRef.update({
      status: "clarifying",
      title: draftTitleFromFirstMessage(message),
      updatedAt: FieldValue ? FieldValue.serverTimestamp() : new Date(),
    });
  } else if (obstacle.status !== "clarifying") {
    // Defensive — clients should only call this in fresh/clarifying state.
    throw new Error(`Cannot run clarity turn from status ${obstacle.status}`);
  }

  // Call Anthropic.
  const userMessage = buildPerTurnUserMessage(
      obstacle.title || draftTitleFromFirstMessage(message),
      transcript,
  );

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    temperature: 0.6,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const rawText =
    (response.content && response.content[0] && response.content[0].text) || "";

  let parsed;
  try {
    parsed = parseEnvelope(rawText);
  } catch (e) {
    if (logger && logger.error) logger.error("Bad clarity envelope:", e.message, rawText);
    throw new Error("AI response could not be parsed");
  }

  // Write the assistant move.
  const assistantContent = [parsed.reflection, "", parsed.question].join("\n");
  const assistantMovePayload = {
    type: "clarity-session",
    at: FieldValue ? FieldValue.serverTimestamp() : new Date(),
    byUserId: uid, // attributed to caller for audit; AI authorship implicit by role
    payload: {
      role: "assistant",
      content: assistantContent,
      reflection: parsed.reflection,
      question: parsed.question,
      ...(parsed.prescriptionDraft ? { prescriptionDraft: parsed.prescriptionDraft } : {}),
    },
  };
  await obstacleRef.collection("moves").add(assistantMovePayload);

  // Log usage (best-effort).
  if (typeof logAIUsage === "function") {
    try {
      await logAIUsage(db, {
        familyId: userData.familyId,
        userId: uid,
        functionName: "claritySessionTurn",
        model: "claude-sonnet-4-6",
        usage: response.usage,
      });
    } catch (e) {
      if (logger && logger.warn) logger.warn("logAIUsage failed:", e.message);
    }
  }

  return {
    assistantTurn: {
      reflection: parsed.reflection,
      question: parsed.question,
      prescriptionDraft: parsed.prescriptionDraft,
    },
  };
}

module.exports = {
  runClaritySessionTurn,
  SYSTEM_PROMPT,
  draftTitleFromFirstMessage,
  buildPerTurnUserMessage,
};
```

- [ ] **Step 4: Run to verify passing**

Run: `npm run test:functions -- claritySessionTurn`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add functions/claritySessionTurn.handler.js functions/__tests__/claritySessionTurn.test.js
git commit -m "feat(obstacle): claritySessionTurn handler with voice + privacy + JSON envelope"
```

---

## Task 11: Wire `claritySessionTurn` as an `onCall` in `functions/index.js`

**Files:**
- Modify: `functions/index.js` (add an export right after `synthesizeWeeklyFocus`)

- [ ] **Step 1: Locate the insertion point**

Run: `grep -n "synthesizeWeeklyFocus = onCall" functions/index.js`
Expected: a line number near 1274. Find the closing `);` of that `onCall` block.

- [ ] **Step 2: Add the new `onCall` after `synthesizeWeeklyFocus`**

Add this block to `functions/index.js`, immediately after the `synthesizeWeeklyFocus` onCall closes:

```js
// ================================================================
// claritySessionTurn — one turn of the obstacle clarity loop.
//
// Core logic lives in claritySessionTurn.handler.js so it is unit
// tested without booting Firebase. This onCall wraps the handler
// with the real db + Anthropic client.
// ================================================================
const {
  runClaritySessionTurn,
} = require("./claritySessionTurn.handler.js");

exports.claritySessionTurn = onCall(
    {
      region: "us-central1",
      memory: "512MiB",
      timeoutSeconds: 60,
      secrets: ["ANTHROPIC_API_KEY"],
    },
    async (request) => {
      const logger = require("firebase-functions/logger");
      const Anthropic = require("@anthropic-ai/sdk");
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      const db = admin.firestore();
      try {
        const result = await runClaritySessionTurn(
            { db, anthropic, logger, logAIUsage },
            { uid: request.auth && request.auth.uid, data: request.data },
        );
        return result;
      } catch (err) {
        logger.error("claritySessionTurn failed:", err.message);
        throw new Error(err.message);
      }
    },
);
```

(Note: `logAIUsage`, `onCall`, and `admin` are already imported at the top of `index.js`. Verify before committing with `grep -n "logAIUsage\|onCall\|admin = require" functions/index.js | head -5`.)

- [ ] **Step 3: Verify lint passes**

Run: `cd functions && npm run lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add functions/index.js
git commit -m "feat(obstacle): expose claritySessionTurn as onCall"
```

---

## Task 12: `useObstacle` hook (single-obstacle CRUD + subscribe)

**Files:**
- Create: `src/hooks/useObstacle.ts`
- Test: `src/hooks/__tests__/useObstacle.test.ts`

Provides: create a new obstacle (default private, author-only), subscribe to a single obstacle's doc by id, mark prescription confirmed.

- [ ] **Step 1: Write the failing test**

```ts
// src/hooks/__tests__/useObstacle.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// We'll mock firestore + AuthContext.
vi.mock('@/lib/firebase', () => ({
  firestore: {},
  functions: {},
}));

const mockDocRef = { id: 'new-obstacle-id' };
const mockAddDoc = vi.fn().mockResolvedValue(mockDocRef);
const mockOnSnapshot = vi.fn();
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn().mockReturnValue({}),
  addDoc: (...a: unknown[]) => mockAddDoc(...a),
  onSnapshot: (...a: unknown[]) => mockOnSnapshot(...a),
  updateDoc: (...a: unknown[]) => mockUpdateDoc(...a),
  serverTimestamp: () => 'SERVER_TS',
  Timestamp: { now: () => ({ toMillis: () => 0 }) },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { userId: 'uid-1', familyId: 'fam-1', role: 'parent' },
  }),
}));

import { useObstacle, useCreateObstacle } from '../useObstacle';

beforeEach(() => {
  mockAddDoc.mockClear();
  mockOnSnapshot.mockClear();
  mockUpdateDoc.mockClear();
});

describe('useCreateObstacle', () => {
  it('creates a private obstacle with author in visibleToUserIds', async () => {
    const { result } = renderHook(() => useCreateObstacle());
    let id = '';
    await act(async () => {
      id = await result.current.create();
    });
    expect(id).toBe('new-obstacle-id');
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const docArg = mockAddDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(docArg.authorId).toBe('uid-1');
    expect(docArg.familyId).toBe('fam-1');
    expect(docArg.status).toBe('fresh');
    expect(docArg.visibility).toEqual({ mode: 'private', sharedWith: ['uid-1'] });
    expect(docArg.visibleToUserIds).toEqual(['uid-1']);
    expect(docArg.sensitive).toBe(false);
  });
});

describe('useObstacle', () => {
  it('subscribes when obstacleId is provided', () => {
    renderHook(() => useObstacle('ob1'));
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
  });
  it('does not subscribe when obstacleId is null', () => {
    renderHook(() => useObstacle(null));
    expect(mockOnSnapshot).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failing**

Run: `npm test -- src/hooks/__tests__/useObstacle.test.ts --run`
Expected: FAIL.

- [ ] **Step 3: Implement `src/hooks/useObstacle.ts`**

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { Obstacle, ObstacleOrigin } from '@/types/obstacle';

export interface UseObstacleReturn {
  obstacle: Obstacle | null;
  loading: boolean;
  error: string | null;
}

/** Real-time subscription to a single obstacle by id. */
export function useObstacle(obstacleId: string | null): UseObstacleReturn {
  const [obstacle, setObstacle] = useState<Obstacle | null>(null);
  const [loading, setLoading] = useState<boolean>(!!obstacleId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!obstacleId) {
      setObstacle(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = doc(firestore, 'obstacles', obstacleId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setObstacle(null);
          setError('Obstacle not found');
        } else {
          setObstacle({ id: snap.id, ...(snap.data() as Omit<Obstacle, 'id'>) });
          setError(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [obstacleId]);

  return { obstacle, loading, error };
}

export interface CreateObstacleInput {
  subjectPersonIds?: string[];
  origin?: ObstacleOrigin;
  originRefId?: string | null;
}

export interface UseCreateObstacleReturn {
  create: (input?: CreateObstacleInput) => Promise<string>;
  creating: boolean;
  error: string | null;
}

/**
 * Creates a new private obstacle owned by the current user. Returns
 * the new obstacle id. v1 defaults: private visibility, not sensitive,
 * origin = 'direct'.
 */
export function useCreateObstacle(): UseCreateObstacleReturn {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (input?: CreateObstacleInput): Promise<string> => {
      if (!user) throw new Error('Not authenticated');
      setCreating(true);
      setError(null);
      try {
        const docData = {
          title: '',
          summary: '',
          authorId: user.userId,
          familyId: user.familyId,
          subjectPersonIds: input?.subjectPersonIds ?? [],
          status: 'fresh' as const,
          visibility: { mode: 'private' as const, sharedWith: [user.userId] },
          visibleToUserIds: [user.userId],
          sensitive: false,
          allowSpecificsInOutput: false,
          bringToTherapy: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          clearedAt: null,
          origin: input?.origin ?? 'direct',
          originRefId: input?.originRefId ?? null,
        };
        const ref = await addDoc(collection(firestore, 'obstacles'), docData);
        return ref.id;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        throw e;
      } finally {
        setCreating(false);
      }
    },
    [user],
  );

  return { create, creating, error };
}

/** Update obstacle status (e.g., user confirms prescription). */
export async function updateObstacleStatus(
  obstacleId: string,
  status: Obstacle['status'],
): Promise<void> {
  await updateDoc(doc(firestore, 'obstacles', obstacleId), {
    status,
    updatedAt: serverTimestamp(),
  });
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npm test -- src/hooks/__tests__/useObstacle.test.ts --run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useObstacle.ts src/hooks/__tests__/useObstacle.test.ts
git commit -m "feat(obstacle): useObstacle subscription + useCreateObstacle hook"
```

---

## Task 13: `useClaritySession` hook (subscribe to moves + send turn)

**Files:**
- Create: `src/hooks/useClaritySession.ts`
- Test: `src/hooks/__tests__/useClaritySession.test.ts`

Subscribes to `obstacles/{id}/moves` ordered by `at` ascending. Exposes `sendTurn(message)` which calls the `claritySessionTurn` Cloud Function. Also exposes `confirmPrescription(prescriptionDraft)` that writes a `prescription` Move and updates obstacle status.

- [ ] **Step 1: Write the failing test**

```ts
// src/hooks/__tests__/useClaritySession.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/lib/firebase', () => ({
  firestore: {},
  functions: {},
}));

const mockOnSnapshot = vi.fn();
const mockAddDoc = vi.fn().mockResolvedValue({ id: 'mv1' });
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn().mockReturnValue({}),
  query: (...a: unknown[]) => a,
  orderBy: (...a: unknown[]) => a,
  onSnapshot: (...a: unknown[]) => mockOnSnapshot(...a),
  addDoc: (...a: unknown[]) => mockAddDoc(...a),
  updateDoc: (...a: unknown[]) => mockUpdateDoc(...a),
  serverTimestamp: () => 'SERVER_TS',
}));

const mockHttpsCallable = vi.fn().mockReturnValue(
  vi.fn().mockResolvedValue({ data: { assistantTurn: { reflection: 'r', question: 'q' } } }),
);
vi.mock('firebase/functions', () => ({
  httpsCallable: (...a: unknown[]) => mockHttpsCallable(...a),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { userId: 'uid-1', familyId: 'fam-1', role: 'parent' },
  }),
}));

import { useClaritySession } from '../useClaritySession';

beforeEach(() => {
  mockOnSnapshot.mockClear();
  mockAddDoc.mockClear();
  mockUpdateDoc.mockClear();
  mockHttpsCallable.mockClear();
});

describe('useClaritySession', () => {
  it('subscribes to moves when obstacleId provided', () => {
    renderHook(() => useClaritySession('ob1'));
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
  });

  it('sendTurn calls claritySessionTurn callable', async () => {
    const callable = vi.fn().mockResolvedValue({ data: { assistantTurn: { reflection: 'r', question: 'q' } } });
    mockHttpsCallable.mockReturnValue(callable);

    const { result } = renderHook(() => useClaritySession('ob1'));
    await act(async () => {
      await result.current.sendTurn('hello');
    });
    expect(callable).toHaveBeenCalledWith({ obstacleId: 'ob1', message: 'hello' });
  });

  it('confirmPrescription writes a prescription move and updates status', async () => {
    const { result } = renderHook(() => useClaritySession('ob1'));
    await act(async () => {
      await result.current.confirmPrescription({ shape: 'atomic', body: 'Ask her: ...' });
    });
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const docArg = mockAddDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(docArg.type).toBe('prescription');
    expect(mockUpdateDoc).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failing**

Run: `npm test -- src/hooks/__tests__/useClaritySession.test.ts --run`
Expected: FAIL.

- [ ] **Step 3: Implement `src/hooks/useClaritySession.ts`**

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firestore, functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type {
  ClaritySessionTurnPayload,
  Move,
  PrescriptionDraft,
} from '@/types/obstacle';

export interface UseClaritySessionReturn {
  moves: Move[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  sendTurn: (message: string) => Promise<void>;
  confirmPrescription: (draft: PrescriptionDraft) => Promise<void>;
  /** Most recent assistant move's prescription draft, if any. */
  pendingPrescriptionDraft: PrescriptionDraft | null;
}

export function useClaritySession(obstacleId: string | null): UseClaritySessionReturn {
  const { user } = useAuth();
  const [moves, setMoves] = useState<Move[]>([]);
  const [loading, setLoading] = useState<boolean>(!!obstacleId);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!obstacleId) {
      setMoves([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(firestore, 'obstacles', obstacleId, 'moves'),
      orderBy('at', 'asc'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Move[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Move, 'id'>),
        }));
        setMoves(rows);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [obstacleId]);

  const sendTurn = useCallback(
    async (message: string): Promise<void> => {
      if (!obstacleId) throw new Error('No obstacle');
      if (!message.trim()) return;
      setSending(true);
      setError(null);
      try {
        const callable = httpsCallable(functions, 'claritySessionTurn');
        await callable({ obstacleId, message });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        throw e;
      } finally {
        setSending(false);
      }
    },
    [obstacleId],
  );

  const confirmPrescription = useCallback(
    async (draft: PrescriptionDraft): Promise<void> => {
      if (!obstacleId || !user) throw new Error('Cannot confirm');
      setSending(true);
      setError(null);
      try {
        await addDoc(
          collection(firestore, 'obstacles', obstacleId, 'moves'),
          {
            type: 'prescription',
            at: serverTimestamp(),
            byUserId: user.userId,
            payload: {
              shape: draft.shape,
              body: draft.body,
              executed: false,
            },
          },
        );
        await updateDoc(doc(firestore, 'obstacles', obstacleId), {
          status: 'prescribed',
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        throw e;
      } finally {
        setSending(false);
      }
    },
    [obstacleId, user],
  );

  // Find latest assistant move with a prescription draft that hasn't been confirmed yet.
  // For v1, "not confirmed" = no subsequent prescription Move.
  let pendingPrescriptionDraft: PrescriptionDraft | null = null;
  const hasConfirmedPrescription = moves.some((m) => m.type === 'prescription');
  if (!hasConfirmedPrescription) {
    for (let i = moves.length - 1; i >= 0; i--) {
      const m = moves[i];
      if (m.type !== 'clarity-session') continue;
      const p = m.payload as ClaritySessionTurnPayload;
      if (p.role === 'assistant' && p.prescriptionDraft) {
        pendingPrescriptionDraft = p.prescriptionDraft;
        break;
      }
    }
  }

  return {
    moves,
    loading,
    sending,
    error,
    sendTurn,
    confirmPrescription,
    pendingPrescriptionDraft,
  };
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npm test -- src/hooks/__tests__/useClaritySession.test.ts --run`
Expected: PASS.

- [ ] **Step 5: Commit**

```ts
git add src/hooks/useClaritySession.ts src/hooks/__tests__/useClaritySession.test.ts
git commit -m "feat(obstacle): useClaritySession hook (moves subscription + sendTurn + confirmPrescription)"
```

---

## Task 14: `ObstacleHeader` component

**Files:**
- Create: `src/components/clarity/ObstacleHeader.tsx`
- Test: `src/components/clarity/__tests__/ObstacleHeader.test.tsx`

Shows the obstacle's title (or "A new obstacle" for fresh) + a small status pill.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/clarity/__tests__/ObstacleHeader.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ObstacleHeader } from '../ObstacleHeader';

describe('ObstacleHeader', () => {
  it('renders title when set', () => {
    render(<ObstacleHeader title="the wrestling thing" status="clarifying" />);
    expect(screen.getByRole('heading')).toHaveTextContent('the wrestling thing');
  });

  it('renders placeholder when title is empty', () => {
    render(<ObstacleHeader title="" status="fresh" />);
    expect(screen.getByRole('heading')).toHaveTextContent(/A new obstacle/i);
  });

  it('renders status pill', () => {
    render(<ObstacleHeader title="x" status="clarifying" />);
    expect(screen.getByText(/clarifying/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failing**

Run: `npm test -- src/components/clarity/__tests__/ObstacleHeader.test.tsx --run`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/components/clarity/ObstacleHeader.tsx
'use client';

import type { ObstacleStatus } from '@/types/obstacle';

export interface ObstacleHeaderProps {
  title: string;
  status: ObstacleStatus;
}

const STATUS_LABEL: Record<ObstacleStatus, string> = {
  fresh: 'fresh',
  clarifying: 'clarifying',
  prescribed: 'prescribed',
  executed: 'executed',
  cleared: 'cleared',
  paused: 'paused',
};

export function ObstacleHeader({ title, status }: ObstacleHeaderProps) {
  const displayTitle = title.trim() || 'A new obstacle';
  return (
    <header
      style={{
        padding: '32px 0 16px',
        borderBottom: '1px solid rgba(120,100,70,0.12)',
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <h1
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 'clamp(28px, 4vw, 40px)',
          color: 'var(--r-ink, #2B2620)',
          margin: 0,
          lineHeight: 1.15,
        }}
      >
        {displayTitle}
      </h1>
      <span
        style={{
          fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--r-text-5, #887C68)',
        }}
      >
        {STATUS_LABEL[status]}
      </span>
    </header>
  );
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npm test -- src/components/clarity/__tests__/ObstacleHeader.test.tsx --run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/clarity/ObstacleHeader.tsx src/components/clarity/__tests__/ObstacleHeader.test.tsx
git commit -m "feat(obstacle): ObstacleHeader component"
```

---

## Task 15: `TurnList` component

**Files:**
- Create: `src/components/clarity/TurnList.tsx`
- Test: `src/components/clarity/__tests__/TurnList.test.tsx`

Renders the chronological transcript of clarity-session turns. Hides any move whose type is not `clarity-session` (those don't display as turns).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/clarity/__tests__/TurnList.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TurnList } from '../TurnList';
import type { Move } from '@/types/obstacle';
import { Timestamp } from 'firebase/firestore';

function makeMove(overrides: Partial<Move>): Move {
  return {
    id: 'm',
    type: 'clarity-session',
    at: Timestamp.now(),
    byUserId: 'u',
    payload: { role: 'user', content: 'hi' },
    ...overrides,
  } as Move;
}

describe('TurnList', () => {
  it('renders user and assistant turns', () => {
    const moves: Move[] = [
      makeMove({ id: 'm1', payload: { role: 'user', content: 'I need to talk to her.' } }),
      makeMove({
        id: 'm2',
        payload: { role: 'assistant', content: 'That sounds heavy.\n\nHave you said it out loud?' },
      }),
    ];
    render(<TurnList moves={moves} />);
    expect(screen.getByText(/I need to talk to her/i)).toBeInTheDocument();
    expect(screen.getByText(/Have you said it out loud/i)).toBeInTheDocument();
  });

  it('does not render prescription moves as turns', () => {
    const moves: Move[] = [
      makeMove({
        id: 'p1',
        type: 'prescription',
        payload: { shape: 'atomic', body: 'Ask her...', executed: false },
      }),
    ];
    render(<TurnList moves={moves} />);
    expect(screen.queryByText(/Ask her\.\.\./)).not.toBeInTheDocument();
  });

  it('renders empty state with no moves', () => {
    render(<TurnList moves={[]} />);
    // Empty list is still valid — no assertion needed beyond not crashing.
    expect(document.body).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify failing**

Run: `npm test -- src/components/clarity/__tests__/TurnList.test.tsx --run`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/components/clarity/TurnList.tsx
'use client';

import type { Move, ClaritySessionTurnPayload } from '@/types/obstacle';

export interface TurnListProps {
  moves: Move[];
}

export function TurnList({ moves }: TurnListProps) {
  const turns = moves.filter((m) => m.type === 'clarity-session');
  return (
    <ol
      aria-label="Conversation"
      style={{
        listStyle: 'none',
        padding: 0,
        margin: '24px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}
    >
      {turns.map((m) => {
        const p = m.payload as ClaritySessionTurnPayload;
        const isUser = p.role === 'user';
        return (
          <li key={m.id}>
            <p
              style={{
                fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--r-text-5, #887C68)',
                margin: '0 0 8px 0',
              }}
            >
              {isUser ? 'You' : 'Coach'}
            </p>
            <div
              style={{
                fontFamily: isUser
                  ? 'var(--r-sans, -apple-system, sans-serif)'
                  : "'Cormorant Garamond', Georgia, serif",
                fontStyle: isUser ? 'normal' : 'italic',
                fontSize: isUser ? 16 : 19,
                lineHeight: 1.5,
                color: 'var(--r-ink, #2B2620)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {p.content}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npm test -- src/components/clarity/__tests__/TurnList.test.tsx --run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/clarity/TurnList.tsx src/components/clarity/__tests__/TurnList.test.tsx
git commit -m "feat(obstacle): TurnList component"
```

---

## Task 16: `TurnInput` component

**Files:**
- Create: `src/components/clarity/TurnInput.tsx`
- Test: `src/components/clarity/__tests__/TurnInput.test.tsx`

Textarea + send button. For a fresh obstacle, placeholder = "What's getting in the way?" For ongoing, "Keep going…".

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/clarity/__tests__/TurnInput.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TurnInput } from '../TurnInput';

describe('TurnInput', () => {
  it('shows fresh-obstacle prompt when status=fresh', () => {
    render(<TurnInput status="fresh" sending={false} onSend={() => {}} />);
    const ta = screen.getByPlaceholderText(/What's getting in the way/i);
    expect(ta).toBeInTheDocument();
  });

  it('shows ongoing prompt when status=clarifying', () => {
    render(<TurnInput status="clarifying" sending={false} onSend={() => {}} />);
    expect(screen.getByPlaceholderText(/Keep going/i)).toBeInTheDocument();
  });

  it('calls onSend with the trimmed message when Send is clicked', () => {
    const onSend = vi.fn();
    render(<TurnInput status="clarifying" sending={false} onSend={onSend} />);
    const ta = screen.getByRole('textbox');
    fireEvent.change(ta, { target: { value: '  hello  ' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(onSend).toHaveBeenCalledWith('hello');
  });

  it('disables send button while sending', () => {
    render(<TurnInput status="clarifying" sending={true} onSend={() => {}} />);
    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
  });

  it('does not call onSend when textarea is empty', () => {
    const onSend = vi.fn();
    render(<TurnInput status="clarifying" sending={false} onSend={onSend} />);
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(onSend).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failing**

Run: `npm test -- src/components/clarity/__tests__/TurnInput.test.tsx --run`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/components/clarity/TurnInput.tsx
'use client';

import { useState } from 'react';
import type { ObstacleStatus } from '@/types/obstacle';

export interface TurnInputProps {
  status: ObstacleStatus;
  sending: boolean;
  onSend: (message: string) => void;
}

export function TurnInput({ status, sending, onSend }: TurnInputProps) {
  const [value, setValue] = useState('');
  const placeholder = status === 'fresh' ? "What's getting in the way?" : 'Keep going…';
  const canSend = value.trim().length > 0 && !sending;

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  };

  return (
    <div
      style={{
        marginTop: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={4}
        disabled={sending}
        style={{
          width: '100%',
          padding: 16,
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 19,
          lineHeight: 1.5,
          color: 'var(--r-ink, #2B2620)',
          background: 'var(--r-paper, #FDFBF6)',
          border: '1px solid rgba(120,100,70,0.18)',
          borderRadius: 6,
          resize: 'vertical',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          style={{
            padding: '12px 24px',
            fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#FBF8F2',
            background: canSend ? '#14100C' : 'rgba(20,16,12,0.4)',
            border: '1px solid currentColor',
            borderRadius: 999,
            cursor: canSend ? 'pointer' : 'not-allowed',
          }}
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npm test -- src/components/clarity/__tests__/TurnInput.test.tsx --run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/clarity/TurnInput.tsx src/components/clarity/__tests__/TurnInput.test.tsx
git commit -m "feat(obstacle): TurnInput component"
```

---

## Task 17: `PrescriptionCard` component

**Files:**
- Create: `src/components/clarity/PrescriptionCard.tsx`
- Test: `src/components/clarity/__tests__/PrescriptionCard.test.tsx`

Renders the AI's proposed prescription with three actions: Confirm, Refine, Not yet.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/clarity/__tests__/PrescriptionCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrescriptionCard } from '../PrescriptionCard';

describe('PrescriptionCard', () => {
  const draft = { shape: 'atomic' as const, body: "Ask her: 'is naming it what shifts it?'" };

  it('renders the prescription body', () => {
    render(
      <PrescriptionCard draft={draft} onConfirm={() => {}} onRefine={() => {}} onNotYet={() => {}} />,
    );
    expect(screen.getByText(/naming it what shifts it/i)).toBeInTheDocument();
  });

  it('calls onConfirm when Confirm clicked', () => {
    const onConfirm = vi.fn();
    render(
      <PrescriptionCard draft={draft} onConfirm={onConfirm} onRefine={() => {}} onNotYet={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onRefine when Refine clicked', () => {
    const onRefine = vi.fn();
    render(
      <PrescriptionCard draft={draft} onConfirm={() => {}} onRefine={onRefine} onNotYet={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /refine/i }));
    expect(onRefine).toHaveBeenCalledTimes(1);
  });

  it('calls onNotYet when Not yet clicked', () => {
    const onNotYet = vi.fn();
    render(
      <PrescriptionCard draft={draft} onConfirm={() => {}} onRefine={() => {}} onNotYet={onNotYet} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /not yet/i }));
    expect(onNotYet).toHaveBeenCalledTimes(1);
  });

  it('disables all buttons when busy', () => {
    render(
      <PrescriptionCard
        draft={draft}
        busy
        onConfirm={() => {}}
        onRefine={() => {}}
        onNotYet={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /refine/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /not yet/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run to verify failing**

Run: `npm test -- src/components/clarity/__tests__/PrescriptionCard.test.tsx --run`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/components/clarity/PrescriptionCard.tsx
'use client';

import type { PrescriptionDraft } from '@/types/obstacle';

export interface PrescriptionCardProps {
  draft: PrescriptionDraft;
  busy?: boolean;
  onConfirm: () => void;
  onRefine: () => void;
  onNotYet: () => void;
}

const SHAPE_LABEL: Record<PrescriptionDraft['shape'], string> = {
  atomic: 'A single move',
  sequence: 'A short sequence',
  experiment: 'An experiment to try',
  'illustrated-story': 'A story to share',
};

export function PrescriptionCard({
  draft,
  busy,
  onConfirm,
  onRefine,
  onNotYet,
}: PrescriptionCardProps) {
  return (
    <aside
      role="region"
      aria-label="Proposed move"
      style={{
        marginTop: 32,
        padding: 24,
        border: '1px solid rgba(120,100,70,0.22)',
        borderRadius: 6,
        background: 'var(--r-paper, #FDFBF6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <p
        style={{
          fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--r-text-5, #887C68)',
          margin: 0,
        }}
      >
        {SHAPE_LABEL[draft.shape]}
      </p>
      <p
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic',
          fontSize: 22,
          lineHeight: 1.4,
          color: 'var(--r-ink, #2B2620)',
          margin: 0,
        }}
      >
        {draft.body}
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          style={primaryButton(busy)}
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={onRefine}
          disabled={busy}
          style={secondaryButton(busy)}
        >
          Refine
        </button>
        <button
          type="button"
          onClick={onNotYet}
          disabled={busy}
          style={secondaryButton(busy)}
        >
          Not yet
        </button>
      </div>
    </aside>
  );
}

function primaryButton(disabled?: boolean) {
  return {
    padding: '10px 20px',
    fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    color: '#FBF8F2',
    background: disabled ? 'rgba(20,16,12,0.4)' : '#14100C',
    border: '1px solid currentColor',
    borderRadius: 999,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function secondaryButton(disabled?: boolean) {
  return {
    padding: '10px 20px',
    fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    color: 'var(--r-ink, #2B2620)',
    background: 'transparent',
    border: '1px solid rgba(120,100,70,0.4)',
    borderRadius: 999,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npm test -- src/components/clarity/__tests__/PrescriptionCard.test.tsx --run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/clarity/PrescriptionCard.tsx src/components/clarity/__tests__/PrescriptionCard.test.tsx
git commit -m "feat(obstacle): PrescriptionCard component"
```

---

## Task 18: `/clarity/new` factory route

**Files:**
- Create: `src/app/clarity/new/page.tsx`

Server-side check is unnecessary because we use the same auth-gating pattern as other authed routes. The page creates an obstacle and redirects.

- [ ] **Step 1: Write the page**

```tsx
// src/app/clarity/new/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCreateObstacle } from '@/hooks/useObstacle';

export default function ClarityNewPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { create } = useCreateObstacle();
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    create()
      .then((id) => router.replace(`/clarity/${id}`))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [authLoading, user, create, router]);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontStyle: 'italic',
        fontSize: 19,
        color: 'var(--r-text-4, #6B6254)',
        background: 'var(--r-cream, #F5F0E8)',
      }}
    >
      {error ? <p>Something went wrong: {error}</p> : <p>Opening…</p>}
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/clarity/new/page.tsx
git commit -m "feat(obstacle): /clarity/new factory route"
```

---

## Task 19: `/clarity/[obstacleId]` route shell + ClientPage

**Files:**
- Create: `src/app/clarity/[obstacleId]/page.tsx`
- Create: `src/app/clarity/[obstacleId]/ClientPage.tsx`

The page reads the route param, renders the client orchestrator.

- [ ] **Step 1: Write the route shell**

```tsx
// src/app/clarity/[obstacleId]/page.tsx
import { ClientPage } from './ClientPage';

interface Props {
  params: Promise<{ obstacleId: string }>;
}

export default async function ClarityObstaclePage({ params }: Props) {
  const { obstacleId } = await params;
  return <ClientPage obstacleId={obstacleId} />;
}
```

- [ ] **Step 2: Write the client orchestrator**

```tsx
// src/app/clarity/[obstacleId]/ClientPage.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useObstacle } from '@/hooks/useObstacle';
import { useClaritySession } from '@/hooks/useClaritySession';
import { ObstacleHeader } from '@/components/clarity/ObstacleHeader';
import { TurnList } from '@/components/clarity/TurnList';
import { TurnInput } from '@/components/clarity/TurnInput';
import { PrescriptionCard } from '@/components/clarity/PrescriptionCard';

export interface ClientPageProps {
  obstacleId: string;
}

export function ClientPage({ obstacleId }: ClientPageProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { obstacle, loading: obstacleLoading, error: obstacleError } = useObstacle(obstacleId);
  const {
    moves,
    loading: movesLoading,
    sending,
    error: sessionError,
    sendTurn,
    confirmPrescription,
    pendingPrescriptionDraft,
  } = useClaritySession(obstacleId);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  if (authLoading || obstacleLoading) {
    return <Status>Opening…</Status>;
  }
  if (obstacleError) {
    return <Status>Couldn’t open this obstacle: {obstacleError}</Status>;
  }
  if (!obstacle) return null;

  // Guardrail: only fresh/clarifying obstacles use this surface in v1.
  // Once status moves to 'prescribed', show a thin "what’s next" view.
  const inSession = obstacle.status === 'fresh' || obstacle.status === 'clarifying';

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--r-cream, #F5F0E8)',
        padding: '0 24px 64px',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <ObstacleHeader title={obstacle.title} status={obstacle.status} />

        <TurnList moves={moves} />

        {inSession && pendingPrescriptionDraft && (
          <PrescriptionCard
            draft={pendingPrescriptionDraft}
            busy={sending}
            onConfirm={() => confirmPrescription(pendingPrescriptionDraft)}
            onRefine={() => {
              // Refine = the user types more. The textarea is already there;
              // no special handling needed beyond keeping the card visible
              // until either Confirm or another assistant turn supersedes.
            }}
            onNotYet={() => {
              // Same — keep the card up; user continues with text input.
            }}
          />
        )}

        {inSession && !pendingPrescriptionDraft && (
          <TurnInput status={obstacle.status} sending={sending || movesLoading} onSend={sendTurn} />
        )}

        {!inSession && (
          <section style={{ marginTop: 48 }}>
            <p style={postSessionStyle}>
              You confirmed your move. The rest of the loop — execution,
              reflection, and clearing — comes in a later phase.
            </p>
          </section>
        )}

        {sessionError && (
          <p role="alert" style={errorStyle}>
            {sessionError}
          </p>
        )}
      </div>
    </main>
  );
}

function Status({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontStyle: 'italic',
        fontSize: 19,
        color: 'var(--r-text-4, #6B6254)',
        background: 'var(--r-cream, #F5F0E8)',
      }}
    >
      <p>{children}</p>
    </main>
  );
}

const postSessionStyle = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontStyle: 'italic',
  fontSize: 19,
  color: 'var(--r-text-3, #5F564B)',
  lineHeight: 1.5,
};

const errorStyle = {
  marginTop: 24,
  padding: 12,
  border: '1px solid #b65f3a',
  borderRadius: 4,
  background: 'rgba(182,95,58,0.08)',
  color: '#8C4A3E',
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 13,
};
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds; no TypeScript errors on the new files. (Pre-existing baseline failures elsewhere are acceptable.)

- [ ] **Step 4: Commit**

```bash
git add src/app/clarity/[obstacleId]/page.tsx src/app/clarity/[obstacleId]/ClientPage.tsx
git commit -m "feat(obstacle): /clarity/[obstacleId] page + client orchestrator"
```

---

## Task 20: Manual smoke test + run the full suite

This task is a single human action — no code. Confirms the loop actually works end-to-end.

- [ ] **Step 1: Run the full unit test suite**

Run: `npm run test:run`
Expected: all new tests pass. Pre-existing baseline failures (`EditPersonSheet` ×2, `SurfaceLayout` ×1) acceptable; no new regressions.

- [ ] **Step 2: Run the Cloud Function tests**

Run: `npm run test:functions`
Expected: all pass.

- [ ] **Step 3: Run the rules tests (emulator required)**

Start the emulator: `firebase emulators:start --only firestore`
In another terminal: `npm run test:rules`
Expected: all pass, including the new `obstacles.rules.test.ts`.

- [ ] **Step 4: Deploy the Cloud Function to a dev project (human gate)**

```bash
firebase deploy --only functions:claritySessionTurn,firestore:rules
```

Confirm in Firebase console that:
- `claritySessionTurn` is listed under Functions.
- `firestore.rules` was published.

- [ ] **Step 5: Smoke test in the browser**

1. `npm run dev`
2. Open `http://localhost:3000/clarity/new` while logged in as a parent user.
3. You should be redirected to `/clarity/<some-id>` showing the "What's getting in the way?" prompt.
4. Type a paragraph. Click Send.
5. Confirm:
   - Your message appears in the transcript.
   - After ~5-15 seconds, the assistant's reflection + question appears.
   - The obstacle status pill changes from "fresh" to "clarifying."
   - The obstacle's title in the header is populated.
6. Continue the conversation. After 2-3 exchanges where you've named something concrete, the AI should propose a prescription. The PrescriptionCard appears.
7. Click Confirm. The obstacle status changes to "prescribed." The "later phase" placeholder appears.
8. Refresh the page. The full transcript and final state should persist (real-time subscriptions).

- [ ] **Step 6: Verify Firestore data shape**

In the Firebase console, open the `obstacles` collection. Verify:
- Your new doc has `status: 'prescribed'`, `title: '<some draft>'`, `visibility: { mode: 'private', sharedWith: [<your uid>] }`, `visibleToUserIds: [<your uid>]`.
- The `moves/` subcollection has alternating user/assistant turns plus one `prescription`-type move at the end.

- [ ] **Step 7: Commit the smoke-test notes (optional)**

If anything needed a tweak, fix and commit. If not, no commit needed for Task 20.

---

# Self-review summary

**Spec coverage:** Sections 1-8, 11, 12 of the spec are touched. Section 14 phases 0 + 1 are fully covered by Tasks 1-20. Sections 9, 10, 13 (Dashboard, Composition, Kid v2) explicitly excluded per scope.

**Status transitions in scope:** `fresh → clarifying` (handler), `clarifying → prescribed` (client confirm). Out of scope: executed, cleared, paused, milestone.

**Privacy enforcement layers:**
- Data layer: Firestore rules (Task 5) + denormalized `visibleToUserIds` (Tasks 1, 12).
- Synthesis layer: generalization instruction (Tasks 4, 10) baked into the system prompt.
- UI layer: nothing yet — there are no list views in Phase 1, so no obfuscation needed. Kid Mode hook plumbed (Task 7) but not yet rendered (Phase 2).

**Deferred and explicit:**
- Streaming responses (matches existing chatWithEntry non-streaming pattern).
- Refine and Not-yet actions on PrescriptionCard are no-ops in Phase 1 (the user can type more in the textarea). A later phase will wire them to specific behaviors.
- AI-drafted obstacle title is a simple message truncation; a later phase can have the LLM author it cleanly.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-21-obstacle-clarity-session-mvp.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
