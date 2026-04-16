# Therapy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Therapy book — a PIN-gated third publication at `/therapy` that clusters activity since the last session into themes, tracks discussed vs. carried-forward threads across sessions, and imports self-authored session notes / transcripts.

**Architecture:** Four new Firestore collections (`therapists`, `therapy_windows`, `therapy_themes`, `therapy_notes`), all owner-scoped (not family-scoped). Two Cloud Functions: `regenerateTherapyWindow` (callable + daily cron) synthesizes 2–4 themes via Claude Sonnet; `closeTherapyWindow` (callable) atomically performs the session-close transition — carry-forward, new-window creation, and synchronous regen. Client stack is Next.js App Router under `/therapy` with existing `usePrivacyLock` gating and new hooks for therapist, window, and actions.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Firebase Firestore · Firebase Cloud Functions (v2, `onCall` + `onSchedule`) · Claude Sonnet via `@anthropic-ai/sdk` · Vitest · Mocha (functions) · `@firebase/rules-unit-testing`.

**Spec reference:** [`docs/superpowers/specs/2026-04-16-therapy-prep-design.md`](../specs/2026-04-16-therapy-prep-design.md).

---

## File Map

**Types**
- Create: `src/types/therapy.ts`

**Firestore config**
- Modify: `firestore.rules` (add therapy block before closing `}`)
- Modify: `firestore.indexes.json` (append 3 composite indexes)

**Cloud Functions** — appended to `functions/index.js` to match existing style (one big file).
- Modify: `functions/index.js` — add shared `performTherapyRegen`, `performTherapyClose`, and callable/scheduled exports
- Create: `functions/__tests__/therapy.test.js`

**Client hooks**
- Create: `src/hooks/useTherapist.ts`
- Create: `src/hooks/useTherapyWindow.ts`
- Create: `src/hooks/useTherapyActions.ts`
- Create: `src/hooks/useTherapyAggregate.ts`

**Client routes**
- Create: `src/app/therapy/layout.tsx`
- Create: `src/app/therapy/page.tsx`
- Create: `src/app/therapy/sessions/[windowId]/page.tsx`

**Client components** (all under `src/components/therapy/`)
- Create: `TherapyBookShell.tsx`, `TherapistSetupForm.tsx`, `WindowHeader.tsx`, `CarryForwardBanner.tsx`, `ThemeCard.tsx`, `ThemeList.tsx`, `ImportNotesModal.tsx`, `SessionCloseSheet.tsx`, `PastSessionsList.tsx`, `ClosedSessionView.tsx`
- Create co-located CSS: `src/components/therapy/therapy.module.css`

**Surface & nav**
- Create: `src/components/surface/SurfaceTherapyCard.tsx`
- Modify: `src/components/surface/SurfaceHome.tsx` (mount the card)
- Modify: `src/components/spread-home/SpreadHome.tsx` (add third cross-nav link)

**Rules tests**
- Modify: `firestore-rules/rules.test.ts` (append therapy describe block)

---

## TDD Cadence

Each task follows: failing test → minimal impl → passing test → commit. Commit message conventions follow existing repo style (`feat(therapy): …`, `fix(therapy): …`, `test(therapy): …`).

Shell PATH header for every Bash step: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:$PATH"`.

Run unit tests with `npm run test:run`. Run rules tests with `npm run test:rules` (emulator must be running). Run functions tests with `npm run test:functions`.

---

### Task 1: Therapy types

**Files:**
- Create: `src/types/therapy.ts`

- [ ] **Step 1: Create the types file**

```ts
// src/types/therapy.ts
import type { Timestamp } from 'firebase/firestore';

export type TherapistKind = 'individual' | 'couples' | 'family';

export interface Therapist {
  id: string;
  ownerUserId: string;
  displayName: string;
  kind: TherapistKind;
  createdAt: Timestamp;
}

export type TherapyWindowStatus = 'open' | 'closed';

export interface TherapyWindow {
  id: string;
  therapistId: string;
  ownerUserId: string;
  status: TherapyWindowStatus;
  openedAt: Timestamp;
  closedAt?: Timestamp;
  themeIds: string[];
  noteIds: string[];
  carriedForwardFromWindowId?: string;
  lastRegeneratedAt?: Timestamp;
}

export type TherapySourceKind =
  | 'entry'
  | 'marginalia'
  | 'synthesis'
  | 'growth_item'
  | 'therapy_note';

export interface TherapySourceRef {
  kind: TherapySourceKind;
  id: string;
  snippet: string;
}

export interface TherapyThemeUserState {
  starred: boolean;
  dismissed: boolean;
  note?: string;
}

export interface TherapyThemeLifecycle {
  firstSeenWindowId: string;
  carriedForwardCount: number;
  discussedAt?: Timestamp;
}

export interface TherapyTheme {
  id: string;
  windowId: string;
  therapistId: string;
  ownerUserId: string;
  title: string;
  summary: string;
  sourceRefs: TherapySourceRef[];
  userState: TherapyThemeUserState;
  lifecycle: TherapyThemeLifecycle;
  generatedAt: Timestamp;
  model: string;
}

export interface TherapyNote {
  id: string;
  windowId: string;
  therapistId: string;
  ownerUserId: string;
  content: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// Upper bound on a single note/transcript. Firestore doc limit is 1MB;
// UTF-8 worst case is 4 bytes/char. 200_000 leaves headroom for other fields.
export const THERAPY_NOTE_MAX_LENGTH = 200_000;

// Paste box visibly warns user once they cross this threshold.
export const THERAPY_NOTE_WARN_LENGTH = 180_000;
```

- [ ] **Step 2: Typecheck**

Run: `npm run lint`
Expected: no errors on the new file.

- [ ] **Step 3: Commit**

```bash
git add src/types/therapy.ts
git commit -m "feat(therapy): add therapy type definitions"
```

---

### Task 2: Firestore security rules for therapy collections

**Files:**
- Modify: `firestore.rules` — append new rules block BEFORE the final closing `}` of `match /databases/...`
- Modify: `firestore-rules/rules.test.ts` — append a `describe('Therapy collections', ...)` block

- [ ] **Step 1: Add failing rules tests**

Append this `describe` block at the end of `firestore-rules/rules.test.ts`, inside the outer `describe.skipIf(!emulatorAvailable, ...)` if present (otherwise as a top-level block following the file's existing pattern):

```ts
describe('Therapy collections', () => {
  const ownerId = 'therapy-owner-id';
  const strangerId = 'stranger-id';

  beforeEach(async () => {
    if (!testEnv) return;
    await testEnv.clearFirestore();

    // Seed user docs so rule helpers (getUserData) don't fail if invoked.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'users', ownerId), {
        userId: ownerId, familyId: 'f1', role: 'parent',
      });
      await setDoc(doc(db, 'users', strangerId), {
        userId: strangerId, familyId: 'f2', role: 'parent',
      });
    });
  });

  const therapistDoc = (owner: string) => ({
    ownerUserId: owner,
    displayName: 'Dr. Test',
    kind: 'individual',
    createdAt: new Date(),
  });

  it('owner can create and read their therapist', async () => {
    const db = getAuthContext(ownerId).firestore();
    await assertSucceeds(
      addDoc(collection(db, 'therapists'), therapistDoc(ownerId))
    );
  });

  it('non-owner cannot read therapist', async () => {
    await testEnv!.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), 'therapists', 't1'),
        therapistDoc(ownerId)
      );
    });
    const db = getAuthContext(strangerId).firestore();
    await assertFails(getDoc(doc(db, 'therapists', 't1')));
  });

  it('cannot create therapist with someone else as owner', async () => {
    const db = getAuthContext(strangerId).firestore();
    await assertFails(
      addDoc(collection(db, 'therapists'), therapistDoc(ownerId))
    );
  });

  it('owner can write userState on therapy_theme but not lifecycle', async () => {
    await testEnv!.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'therapy_themes', 'th1'), {
        windowId: 'w1',
        therapistId: 't1',
        ownerUserId: ownerId,
        title: 'T', summary: 'S', sourceRefs: [],
        userState: { starred: false, dismissed: false },
        lifecycle: { firstSeenWindowId: 'w1', carriedForwardCount: 0 },
        generatedAt: new Date(),
        model: 'test',
      });
    });
    const db = getAuthContext(ownerId).firestore();

    await assertSucceeds(
      updateDoc(doc(db, 'therapy_themes', 'th1'), {
        'userState.starred': true,
      })
    );

    await assertFails(
      updateDoc(doc(db, 'therapy_themes', 'th1'), {
        'lifecycle.carriedForwardCount': 99,
      })
    );

    await assertFails(
      updateDoc(doc(db, 'therapy_themes', 'th1'), { summary: 'hacked' })
    );
  });

  it('therapy_window status cannot transition closed -> open', async () => {
    await testEnv!.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'therapy_windows', 'w1'), {
        therapistId: 't1',
        ownerUserId: ownerId,
        status: 'closed',
        openedAt: new Date(),
        closedAt: new Date(),
        themeIds: [],
        noteIds: [],
      });
    });
    const db = getAuthContext(ownerId).firestore();
    await assertFails(
      updateDoc(doc(db, 'therapy_windows', 'w1'), { status: 'open' })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `firebase emulators:exec --only firestore "npm run test:rules"`
Expected: tests fail with rule denials or missing collection matches.

- [ ] **Step 3: Add the rules block**

Open `firestore.rules`. Find the final closing `}` of the outer `match /databases/{database}/documents { … }` block. Append this immediately before it:

```
    // ==================== Therapy (owner-scoped, PIN-gated UI) ====================
    // Therapy collections are strictly personal — no family sharing,
    // no observer reads. Surface promotions read only count-aggregates.

    match /therapists/{therapistId} {
      allow read, delete: if isSignedIn()
        && request.auth.uid == resource.data.ownerUserId;
      allow create: if isSignedIn()
        && request.auth.uid == request.resource.data.ownerUserId
        && request.resource.data.kind in ['individual', 'couples', 'family'];
      allow update: if isSignedIn()
        && request.auth.uid == resource.data.ownerUserId
        && request.resource.data.ownerUserId == resource.data.ownerUserId
        && request.resource.data.kind == resource.data.kind;
    }

    match /therapy_windows/{windowId} {
      allow read, delete: if isSignedIn()
        && request.auth.uid == resource.data.ownerUserId;
      allow create: if isSignedIn()
        && request.auth.uid == request.resource.data.ownerUserId;
      // Clients may not transition closed -> open, and may not change
      // ownerUserId or therapistId. Cloud Functions perform the real
      // mutations via admin SDK (bypasses rules).
      allow update: if isSignedIn()
        && request.auth.uid == resource.data.ownerUserId
        && request.resource.data.ownerUserId == resource.data.ownerUserId
        && request.resource.data.therapistId == resource.data.therapistId
        && !(resource.data.status == 'closed'
             && request.resource.data.status == 'open');
    }

    match /therapy_themes/{themeId} {
      allow read, delete: if isSignedIn()
        && request.auth.uid == resource.data.ownerUserId;
      // Clients create is disallowed — only Cloud Functions create themes.
      allow create: if false;
      // Clients may only mutate userState. Everything else
      // (title/summary/sourceRefs/lifecycle/windowId/...) is function-only.
      allow update: if isSignedIn()
        && request.auth.uid == resource.data.ownerUserId
        && request.resource.data.ownerUserId == resource.data.ownerUserId
        && request.resource.data.windowId == resource.data.windowId
        && request.resource.data.therapistId == resource.data.therapistId
        && request.resource.data.title == resource.data.title
        && request.resource.data.summary == resource.data.summary
        && request.resource.data.sourceRefs == resource.data.sourceRefs
        && request.resource.data.lifecycle == resource.data.lifecycle
        && request.resource.data.generatedAt == resource.data.generatedAt
        && request.resource.data.model == resource.data.model;
    }

    match /therapy_notes/{noteId} {
      allow read, delete: if isSignedIn()
        && request.auth.uid == resource.data.ownerUserId;
      allow create: if isSignedIn()
        && request.auth.uid == request.resource.data.ownerUserId;
      allow update: if isSignedIn()
        && request.auth.uid == resource.data.ownerUserId
        && request.resource.data.ownerUserId == resource.data.ownerUserId
        && request.resource.data.windowId == resource.data.windowId
        && request.resource.data.therapistId == resource.data.therapistId;
    }
```

- [ ] **Step 4: Run rules tests until they pass**

Run: `firebase emulators:exec --only firestore "npm run test:rules"`
Expected: all Therapy rule tests pass, existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add firestore.rules firestore-rules/rules.test.ts
git commit -m "feat(therapy): owner-scoped security rules for therapy collections"
```

---

### Task 3: Firestore indexes

**Files:**
- Modify: `firestore.indexes.json`

- [ ] **Step 1: Add composite indexes**

Open `firestore.indexes.json`. Inside the top-level `"indexes": [ ... ]` array, append three new entries (alphabetical by collectionGroup fits the existing convention; insert after the last existing `therapy`-prefixed entry or at the end):

```json
    {
      "collectionGroup": "therapy_windows",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "therapistId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "therapy_windows",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "therapistId", "order": "ASCENDING" },
        { "fieldPath": "closedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "therapy_themes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "windowId", "order": "ASCENDING" },
        { "fieldPath": "userState.dismissed", "order": "ASCENDING" },
        { "fieldPath": "userState.starred", "order": "DESCENDING" }
      ]
    }
```

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('firestore.indexes.json', 'utf8'))"`
Expected: no output (valid JSON).

- [ ] **Step 3: Commit**

```bash
git add firestore.indexes.json
git commit -m "feat(therapy): add composite indexes for therapy_windows and therapy_themes"
```

Note: Indexes are deployed separately with `firebase deploy --only firestore:indexes`. Do not deploy in this task — leave deploys to a later batch.

---

### Task 4: Cloud Function — `regenerateTherapyWindow` core + exports

**Files:**
- Modify: `functions/index.js` — append at the end of the file
- Create: `functions/__tests__/therapy.test.js`

- [ ] **Step 1: Add failing test**

Create `functions/__tests__/therapy.test.js`:

```js
/**
 * Therapy Cloud Function unit tests
 * Run: npm run test:functions
 *
 * Uses firebase-functions-test with firestore mock. We exercise the
 * shared core functions (performTherapyRegen, performTherapyClose)
 * directly; callable wrappers are thin and verified only via call-shape.
 */
const assert = require('assert');
const sinon = require('sinon');

// firebase-admin is initialized by index.js; re-require cleared to avoid
// double-init across tests.
delete require.cache[require.resolve('firebase-admin')];

const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'test-therapy' });
}

// Load the function module. The test focuses on exported helpers.
const mod = require('../index.js');

describe('therapy — regen', () => {
  let db;
  let anthropicStub;

  beforeEach(() => {
    db = admin.firestore();
    // Stub the Anthropic client. The real call hangs against a mock DB
    // so we intercept at the boundary.
    anthropicStub = sinon
      .stub(mod.__therapyInternals, 'callClaudeForThemes')
      .resolves({
        themes: [
          {
            title: 'First theme',
            summary: 'Summary one',
            sourceRefs: [
              { kind: 'entry', id: 'e1', snippet: 'Hello' },
            ],
            identity: null,
          },
        ],
      });
  });

  afterEach(async () => {
    anthropicStub.restore();
    // Clear collections used
    for (const c of [
      'therapists', 'therapy_windows', 'therapy_themes',
      'therapy_notes', 'journal_entries', 'margin_notes',
    ]) {
      const snap = await db.collection(c).get();
      const batch = db.batch();
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  });

  async function seedOpenWindow({ ownerUserId = 'u1' } = {}) {
    const therapist = await db.collection('therapists').add({
      ownerUserId,
      displayName: 'Dr. Seed',
      kind: 'individual',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const win = await db.collection('therapy_windows').add({
      therapistId: therapist.id,
      ownerUserId,
      status: 'open',
      openedAt: admin.firestore.Timestamp.fromMillis(Date.now() - 7 * 86400_000),
      themeIds: [],
      noteIds: [],
    });
    return { therapistId: therapist.id, windowId: win.id, ownerUserId };
  }

  it('creates new theme docs and populates window.themeIds', async () => {
    const { windowId, ownerUserId } = await seedOpenWindow();

    await mod.__therapyInternals.performTherapyRegen(db, { windowId });

    const winDoc = await db.collection('therapy_windows').doc(windowId).get();
    assert.strictEqual(winDoc.data().themeIds.length, 1);
    const themes = await db
      .collection('therapy_themes')
      .where('windowId', '==', windowId)
      .get();
    assert.strictEqual(themes.size, 1);
    const theme = themes.docs[0].data();
    assert.strictEqual(theme.title, 'First theme');
    assert.strictEqual(theme.ownerUserId, ownerUserId);
    assert.strictEqual(theme.userState.starred, false);
    assert.strictEqual(theme.lifecycle.carriedForwardCount, 0);
    assert.strictEqual(theme.lifecycle.firstSeenWindowId, windowId);
  });

  it('preserves userState when LLM matches existing theme by identity', async () => {
    const { windowId } = await seedOpenWindow();

    // Seed an existing theme with user state the user cares about.
    const themeRef = await db.collection('therapy_themes').add({
      windowId,
      therapistId: 't-seed',
      ownerUserId: 'u1',
      title: 'Old title',
      summary: 'Old summary',
      sourceRefs: [],
      userState: { starred: true, dismissed: false, note: 'Keep this' },
      lifecycle: { firstSeenWindowId: windowId, carriedForwardCount: 0 },
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      model: 'test',
    });
    await db.collection('therapy_windows').doc(windowId).update({
      themeIds: [themeRef.id],
    });

    // LLM returns a theme that references the existing id.
    anthropicStub.resolves({
      themes: [
        {
          title: 'New title',
          summary: 'New summary',
          sourceRefs: [{ kind: 'entry', id: 'e2', snippet: 'hi' }],
          identity: themeRef.id,
        },
      ],
    });

    await mod.__therapyInternals.performTherapyRegen(db, { windowId });

    const updated = await themeRef.get();
    const data = updated.data();
    assert.strictEqual(data.title, 'New title');
    assert.strictEqual(data.userState.starred, true);
    assert.strictEqual(data.userState.note, 'Keep this');
    assert.strictEqual(data.lifecycle.carriedForwardCount, 0);
  });

  it('soft-retires existing themes not returned by the LLM', async () => {
    const { windowId } = await seedOpenWindow();

    const themeRef = await db.collection('therapy_themes').add({
      windowId,
      therapistId: 't-seed',
      ownerUserId: 'u1',
      title: 'Obsolete',
      summary: 'x',
      sourceRefs: [],
      userState: { starred: false, dismissed: false },
      lifecycle: { firstSeenWindowId: windowId, carriedForwardCount: 0 },
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      model: 'test',
    });
    await db.collection('therapy_windows').doc(windowId).update({
      themeIds: [themeRef.id],
    });

    // LLM returns only a brand new theme, ignoring the existing one.
    anthropicStub.resolves({
      themes: [{ title: 'Fresh', summary: 's', sourceRefs: [], identity: null }],
    });

    await mod.__therapyInternals.performTherapyRegen(db, { windowId });

    const winDoc = await db.collection('therapy_windows').doc(windowId).get();
    assert.ok(!winDoc.data().themeIds.includes(themeRef.id));
    // Doc itself still exists (soft-retired, kept for debug).
    const obsolete = await themeRef.get();
    assert.ok(obsolete.exists);
  });

  it('leaves state untouched when LLM call throws', async () => {
    const { windowId } = await seedOpenWindow();
    anthropicStub.rejects(new Error('boom'));

    try {
      await mod.__therapyInternals.performTherapyRegen(db, { windowId });
    } catch (e) {
      // Expected to rethrow to the caller.
    }

    const winDoc = await db.collection('therapy_windows').doc(windowId).get();
    assert.deepStrictEqual(winDoc.data().themeIds, []);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:functions`
Expected: fails with "cannot read property __therapyInternals of undefined" or similar (module doesn't export what we need yet).

- [ ] **Step 3: Append the implementation to `functions/index.js`**

Append this block at the end of `functions/index.js`:

```js
// ================================================================
// Therapy — regen core + callable/scheduled exports
// Spec: docs/superpowers/specs/2026-04-16-therapy-prep-design.md
// ================================================================

const THERAPY_MODEL = 'claude-sonnet-4-5';
const THERAPY_REGEN_STALE_MS = 20 * 60 * 60 * 1000; // 20h

async function gatherTherapySources(db, win) {
  const owner = win.ownerUserId;
  const openedMs = win.openedAt.toMillis();
  const openedTs = admin.firestore.Timestamp.fromMillis(openedMs);

  const [entriesSnap, synthesisSnap, growthSnap] = await Promise.all([
    db.collection('journal_entries')
      .where('authorId', '==', owner)
      .where('createdAt', '>=', openedTs)
      .get()
      .catch(() => ({ forEach: () => {}, docs: [] })),
    db.collection('person_manuals')
      .where('ownerUserId', '==', owner)
      .where('updatedAt', '>=', openedTs)
      .get()
      .catch(() => ({ forEach: () => {}, docs: [] })),
    db.collection('growth_items')
      .where('ownerUserId', '==', owner)
      .where('createdAt', '>=', openedTs)
      .get()
      .catch(() => ({ forEach: () => {}, docs: [] })),
  ]);

  const entryIds = [];
  const entries = [];
  entriesSnap.forEach((d) => {
    entryIds.push(d.id);
    const data = d.data();
    entries.push({
      id: d.id,
      body: data.body ?? data.content ?? '',
      createdAt: data.createdAt,
    });
  });

  // Marginalia on those entries
  let marginNotes = [];
  if (entryIds.length > 0) {
    // Firestore 'in' caps at 30; split if needed.
    const chunks = [];
    for (let i = 0; i < entryIds.length; i += 30) {
      chunks.push(entryIds.slice(i, i + 30));
    }
    const marginSnaps = await Promise.all(chunks.map((c) =>
      db.collection('margin_notes')
        .where('journalEntryId', 'in', c)
        .get()
    ));
    for (const snap of marginSnaps) {
      snap.forEach((d) => {
        marginNotes.push({ id: d.id, ...d.data() });
      });
    }
  }

  const synthesis = [];
  synthesisSnap.forEach((d) => synthesis.push({ id: d.id, ...d.data() }));
  const growthItems = [];
  growthSnap.forEach((d) => growthItems.push({ id: d.id, ...d.data() }));

  // Previous window's notes, for "already discussed" context.
  let priorNotes = [];
  if (win.carriedForwardFromWindowId) {
    const priorSnap = await db.collection('therapy_notes')
      .where('windowId', '==', win.carriedForwardFromWindowId)
      .where('ownerUserId', '==', owner)
      .get();
    priorSnap.forEach((d) => priorNotes.push({ id: d.id, ...d.data() }));
  }

  return { entries, marginNotes, synthesis, growthItems, priorNotes };
}

function buildTherapyPrompt({
  sources, existingThemes, priorNotes,
}) {
  let p = 'You are helping a user prepare talking points for their next individual therapy session.\n\n';
  p += 'You will receive: journal entries, margin notes on those entries, manual synthesis updates, growth items, and (if available) transcripts of the previous session.\n\n';
  p += 'Your job: return 2–4 themes that would be most worth raising with a therapist. Each theme:\n';
  p += '- title: 8 words or fewer, specific, not generic\n';
  p += '- summary: 2–3 sentences naming the pattern and why it matters\n';
  p += '- sourceRefs: 1–3 items, each { kind, id, snippet }\n';
  p += '- identity: either the id of an EXISTING theme this replaces/continues, or null for a new theme\n\n';
  if (existingThemes.length > 0) {
    p += 'EXISTING THEMES (preserve their lifecycle — match with identity when you continue them):\n';
    for (const t of existingThemes) {
      p += `- id=${t.id} · starred=${t.userState.starred} · dismissed=${t.userState.dismissed} · carriedForwardCount=${t.lifecycle.carriedForwardCount}\n`;
      p += `  title: ${t.title}\n  summary: ${t.summary}\n`;
      if (t.userState.dismissed) {
        p += `  NOTE: user dismissed — do NOT resurface the same angle.\n`;
      }
      if (t.userState.starred) {
        p += `  NOTE: user starred — preserve if still supported by sources.\n`;
      }
      if (t.lifecycle.carriedForwardCount > 0) {
        p += `  NOTE: carried forward ${t.lifecycle.carriedForwardCount}× without discussion.\n`;
      }
    }
    p += '\n';
  }
  if (priorNotes.length > 0) {
    p += 'LAST SESSION TRANSCRIPTS (already discussed — reference only to show evolution):\n';
    for (const n of priorNotes) {
      p += `---\n${n.content.slice(0, 4000)}\n---\n`;
    }
    p += '\n';
  }
  p += 'SOURCE MATERIAL:\n';
  for (const e of sources.entries) {
    p += `ENTRY id=${e.id}\n${(e.body || '').slice(0, 800)}\n\n`;
  }
  for (const m of sources.marginNotes) {
    p += `MARGINALIA on entry ${m.journalEntryId}: ${m.content}\n`;
  }
  if (sources.marginNotes.length > 0) p += '\n';
  for (const s of sources.synthesis) {
    p += `SYNTHESIS id=${s.id}\n${JSON.stringify(s.synthesizedContent || {}).slice(0, 800)}\n\n`;
  }
  for (const g of sources.growthItems) {
    p += `GROWTH_ITEM id=${g.id}: ${g.title || ''}\n`;
  }
  p += '\nReturn strict JSON: {"themes":[{title, summary, sourceRefs, identity}]}';
  return p;
}

async function callClaudeForThemes(prompt) {
  // Defer require until first call so module load is cheap for tests.
  const Anthropic = require('@anthropic-ai/sdk').default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const resp = await client.messages.create({
    model: THERAPY_MODEL,
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = resp.content?.[0]?.text ?? '';
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < 0) {
    throw new Error('therapy regen: LLM returned no JSON');
  }
  return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
}

async function performTherapyRegen(db, { windowId }) {
  const logger = require('firebase-functions/logger');
  const winRef = db.collection('therapy_windows').doc(windowId);
  const winSnap = await winRef.get();
  if (!winSnap.exists) throw new Error(`window ${windowId} not found`);
  const win = winSnap.data();
  if (win.status !== 'open') {
    logger.info(`therapy regen: window ${windowId} is closed; skipping`);
    return;
  }

  // Load existing themes in this window
  const existingSnap = await db.collection('therapy_themes')
    .where('windowId', '==', windowId)
    .get();
  const existingThemes = [];
  existingSnap.forEach((d) => existingThemes.push({ id: d.id, ...d.data() }));

  const sources = await gatherTherapySources(db, win);

  let parsed;
  try {
    const prompt = buildTherapyPrompt({
      sources,
      existingThemes,
      priorNotes: sources.priorNotes,
    });
    parsed = await module.exports.__therapyInternals.callClaudeForThemes(prompt);
  } catch (err) {
    logger.error('therapy regen LLM failure — leaving window untouched', err);
    throw err;
  }

  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const returnedIds = new Set();
  const newThemeIds = [];

  for (const t of parsed.themes ?? []) {
    const identity = t.identity;
    if (identity && existingThemes.some((e) => e.id === identity)) {
      returnedIds.add(identity);
      const ref = db.collection('therapy_themes').doc(identity);
      batch.update(ref, {
        title: t.title,
        summary: t.summary,
        sourceRefs: t.sourceRefs ?? [],
        generatedAt: now,
        model: THERAPY_MODEL,
      });
      newThemeIds.push(identity);
    } else {
      const ref = db.collection('therapy_themes').doc();
      batch.set(ref, {
        windowId,
        therapistId: win.therapistId,
        ownerUserId: win.ownerUserId,
        title: t.title,
        summary: t.summary,
        sourceRefs: t.sourceRefs ?? [],
        userState: { starred: false, dismissed: false },
        lifecycle: { firstSeenWindowId: windowId, carriedForwardCount: 0 },
        generatedAt: now,
        model: THERAPY_MODEL,
      });
      newThemeIds.push(ref.id);
    }
  }

  // Carry over starred/dismissed existing themes that the LLM didn't
  // return — we keep them in the list so the user can still see them.
  // Note: we do NOT re-add untouched ones. Soft-retire = drop from
  // themeIds. The doc itself stays for debug.
  batch.update(winRef, {
    themeIds: newThemeIds,
    lastRegeneratedAt: now,
  });

  await batch.commit();
}

// -------- Export internals for unit tests --------
module.exports.__therapyInternals = {
  performTherapyRegen,
  callClaudeForThemes,
  buildTherapyPrompt,
  gatherTherapySources,
};

// -------- Callable exports --------

exports.regenerateTherapyWindow = onCall(
  { cors: true, secrets: ['ANTHROPIC_API_KEY'] },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in required');
    const { windowId } = req.data || {};
    if (!windowId) throw new HttpsError('invalid-argument', 'windowId required');

    const db = admin.firestore();
    const winSnap = await db.collection('therapy_windows').doc(windowId).get();
    if (!winSnap.exists) throw new HttpsError('not-found', 'window not found');
    if (winSnap.data().ownerUserId !== req.auth.uid) {
      throw new HttpsError('permission-denied', 'Not your window');
    }

    await performTherapyRegen(db, { windowId });
    return { ok: true };
  }
);

exports.autoRegenerateTherapyWindows = onSchedule(
  { schedule: 'every 24 hours', secrets: ['ANTHROPIC_API_KEY'] },
  async () => {
    const logger = require('firebase-functions/logger');
    const db = admin.firestore();
    const cutoff = admin.firestore.Timestamp.fromMillis(
      Date.now() - THERAPY_REGEN_STALE_MS
    );

    const snap = await db.collection('therapy_windows')
      .where('status', '==', 'open')
      .get();

    const stale = [];
    snap.forEach((d) => {
      const data = d.data();
      if (!data.lastRegeneratedAt || data.lastRegeneratedAt.toMillis() < cutoff.toMillis()) {
        stale.push(d.id);
      }
    });
    logger.info(`therapy cron: regenerating ${stale.length} stale windows`);
    for (const id of stale) {
      try {
        await performTherapyRegen(db, { windowId: id });
      } catch (err) {
        logger.error(`therapy cron: regen failed for ${id}`, err);
      }
    }
  }
);
```

If `HttpsError` is not already imported at the top of `functions/index.js`, add `const {HttpsError} = require("firebase-functions/v2/https");` near the existing `onCall` import.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:functions`
Expected: all therapy tests pass. Existing functions tests unaffected.

- [ ] **Step 5: Commit**

```bash
git add functions/index.js functions/__tests__/therapy.test.js
git commit -m "feat(therapy): regenerateTherapyWindow callable + daily cron"
```

---

### Task 5: Cloud Function — `closeTherapyWindow`

**Files:**
- Modify: `functions/index.js` (append after Task 4's block)
- Modify: `functions/__tests__/therapy.test.js` (append `describe('therapy — close', ...)`)

- [ ] **Step 1: Add failing tests**

Append to `functions/__tests__/therapy.test.js`:

```js
describe('therapy — close', () => {
  let db;
  let regenStub;

  beforeEach(() => {
    db = admin.firestore();
    // Stub regen so we don't need an LLM to test close.
    regenStub = sinon
      .stub(mod.__therapyInternals, 'performTherapyRegen')
      .resolves();
  });

  afterEach(async () => {
    regenStub.restore();
    for (const c of [
      'therapists', 'therapy_windows', 'therapy_themes', 'therapy_notes',
    ]) {
      const snap = await db.collection(c).get();
      const batch = db.batch();
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  });

  async function seed({ ownerUserId = 'u1' } = {}) {
    const therapist = await db.collection('therapists').add({
      ownerUserId, displayName: 'D', kind: 'individual',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const win = await db.collection('therapy_windows').add({
      therapistId: therapist.id,
      ownerUserId,
      status: 'open',
      openedAt: admin.firestore.Timestamp.fromMillis(Date.now() - 7 * 86400_000),
      themeIds: [],
      noteIds: [],
    });
    const mkTheme = async (extras = {}) => {
      const ref = await db.collection('therapy_themes').add({
        windowId: win.id, therapistId: therapist.id, ownerUserId,
        title: 'T', summary: 'S', sourceRefs: [],
        userState: { starred: false, dismissed: false },
        lifecycle: { firstSeenWindowId: win.id, carriedForwardCount: 0 },
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        model: 'test',
        ...extras,
      });
      return ref.id;
    };
    const t1 = await mkTheme();
    const t2 = await mkTheme();
    await db.collection('therapy_windows').doc(win.id).update({
      themeIds: [t1, t2],
    });
    return { therapistId: therapist.id, windowId: win.id, t1, t2 };
  }

  it('marks discussed, closes window, creates new open window with carry-forward', async () => {
    const { therapistId, windowId, t1, t2 } = await seed();

    const result = await mod.__therapyInternals.performTherapyClose(db, {
      windowId,
      sessionDateMillis: Date.now(),
      discussedThemeIds: [t1],
      transcript: null,
    });

    const closed = await db.collection('therapy_windows').doc(windowId).get();
    assert.strictEqual(closed.data().status, 'closed');
    assert.ok(closed.data().closedAt);

    const t1Doc = await db.collection('therapy_themes').doc(t1).get();
    assert.ok(t1Doc.data().lifecycle.discussedAt);

    const t2Doc = await db.collection('therapy_themes').doc(t2).get();
    assert.notStrictEqual(t2Doc.data().windowId, windowId);
    assert.strictEqual(t2Doc.data().lifecycle.carriedForwardCount, 1);

    const newWin = await db.collection('therapy_windows').doc(result.newWindowId).get();
    assert.strictEqual(newWin.data().status, 'open');
    assert.strictEqual(newWin.data().carriedForwardFromWindowId, windowId);
    assert.deepStrictEqual(newWin.data().themeIds, [t2]);

    assert.ok(regenStub.calledOnce);
  });

  it('rejects double-close', async () => {
    const { windowId } = await seed();
    await mod.__therapyInternals.performTherapyClose(db, {
      windowId, sessionDateMillis: Date.now(),
      discussedThemeIds: [], transcript: null,
    });
    try {
      await mod.__therapyInternals.performTherapyClose(db, {
        windowId, sessionDateMillis: Date.now(),
        discussedThemeIds: [], transcript: null,
      });
      assert.fail('should have thrown');
    } catch (e) {
      assert.ok(/not open/.test(e.message));
    }
  });

  it('writes transcript as therapy_note on closing window', async () => {
    const { windowId } = await seed();
    await mod.__therapyInternals.performTherapyClose(db, {
      windowId,
      sessionDateMillis: Date.now(),
      discussedThemeIds: [],
      transcript: 'Patient: hello',
    });
    const notes = await db.collection('therapy_notes')
      .where('windowId', '==', windowId).get();
    assert.strictEqual(notes.size, 1);
    const n = notes.docs[0].data();
    assert.strictEqual(n.content, 'Patient: hello');
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

Run: `npm run test:functions`
Expected: fails — `performTherapyClose` not defined.

- [ ] **Step 3: Append implementation to `functions/index.js`**

Append after Task 4's block:

```js
async function performTherapyClose(db, {
  windowId, sessionDateMillis, discussedThemeIds, transcript,
}) {
  const winRef = db.collection('therapy_windows').doc(windowId);
  const winSnap = await winRef.get();
  if (!winSnap.exists) throw new Error('window not found');
  const win = winSnap.data();
  if (win.status !== 'open') throw new Error('window is not open');

  const sessionTs = admin.firestore.Timestamp.fromMillis(sessionDateMillis);
  const discussedSet = new Set(discussedThemeIds || []);

  // Fetch current theme set on the window
  const currentThemeIds = win.themeIds || [];
  const undiscussed = currentThemeIds.filter((id) => !discussedSet.has(id));

  // Create new window doc up front so we have its id for reassignment.
  const newWinRef = db.collection('therapy_windows').doc();

  const batch = db.batch();

  // Discussed themes: set lifecycle.discussedAt
  for (const id of currentThemeIds) {
    if (discussedSet.has(id)) {
      const ref = db.collection('therapy_themes').doc(id);
      batch.update(ref, { 'lifecycle.discussedAt': sessionTs });
    }
  }

  // Undiscussed themes: reassign windowId + increment carriedForwardCount
  for (const id of undiscussed) {
    const ref = db.collection('therapy_themes').doc(id);
    batch.update(ref, {
      windowId: newWinRef.id,
      'lifecycle.carriedForwardCount':
        admin.firestore.FieldValue.increment(1),
    });
  }

  // Transcript -> therapy_note on closing window
  let noteIds = win.noteIds || [];
  if (transcript && transcript.trim().length > 0) {
    const noteRef = db.collection('therapy_notes').doc();
    batch.set(noteRef, {
      windowId,
      therapistId: win.therapistId,
      ownerUserId: win.ownerUserId,
      content: transcript.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    noteIds = [...noteIds, noteRef.id];
  }

  // Close current window
  batch.update(winRef, {
    status: 'closed',
    closedAt: sessionTs,
    noteIds,
  });

  // Create new open window
  batch.set(newWinRef, {
    therapistId: win.therapistId,
    ownerUserId: win.ownerUserId,
    status: 'open',
    openedAt: sessionTs,
    themeIds: undiscussed,
    noteIds: [],
    carriedForwardFromWindowId: windowId,
  });

  await batch.commit();

  // Synchronously regenerate so the client returns to a fresh workspace.
  try {
    await module.exports.__therapyInternals.performTherapyRegen(db, {
      windowId: newWinRef.id,
    });
  } catch (err) {
    const logger = require('firebase-functions/logger');
    logger.error(`therapy close: post-close regen failed for ${newWinRef.id}`, err);
    // Do not fail the close — regen is best-effort.
  }

  return { newWindowId: newWinRef.id };
}

// Register in internals for tests and for the regen function's self-call.
module.exports.__therapyInternals.performTherapyClose = performTherapyClose;

exports.closeTherapyWindow = onCall(
  { cors: true, secrets: ['ANTHROPIC_API_KEY'] },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in required');
    const { windowId, sessionDateMillis, discussedThemeIds, transcript } =
      req.data || {};
    if (!windowId) throw new HttpsError('invalid-argument', 'windowId required');
    if (typeof sessionDateMillis !== 'number') {
      throw new HttpsError('invalid-argument', 'sessionDateMillis required');
    }

    const db = admin.firestore();
    const winSnap = await db.collection('therapy_windows').doc(windowId).get();
    if (!winSnap.exists) throw new HttpsError('not-found', 'window not found');
    if (winSnap.data().ownerUserId !== req.auth.uid) {
      throw new HttpsError('permission-denied', 'Not your window');
    }

    const result = await performTherapyClose(db, {
      windowId,
      sessionDateMillis,
      discussedThemeIds: Array.isArray(discussedThemeIds) ? discussedThemeIds : [],
      transcript: typeof transcript === 'string' ? transcript : null,
    });
    return result;
  }
);
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npm run test:functions`
Expected: all therapy tests pass.

- [ ] **Step 5: Commit**

```bash
git add functions/index.js functions/__tests__/therapy.test.js
git commit -m "feat(therapy): closeTherapyWindow callable with atomic carry-forward"
```

---

### Task 6: Hooks — `useTherapist` and `useTherapyWindow`

**Files:**
- Create: `src/hooks/useTherapist.ts`
- Create: `src/hooks/useTherapyWindow.ts`
- Create: `__tests__/hooks/useTherapist.test.ts`
- Create: `__tests__/hooks/useTherapyWindow.test.ts`

- [ ] **Step 1: Add failing tests**

Create `__tests__/hooks/useTherapist.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('@/lib/firebase', () => ({
  firestore: { __isMockFirestore: true },
}));

const authMock = vi.fn();
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => authMock(),
}));

// Firestore mocks
let snapshotCallback: ((snap: any) => void) | null = null;
const mockOnSnapshot = vi.fn((q, cb) => {
  snapshotCallback = cb;
  return () => { snapshotCallback = null; };
});
const mockAddDoc = vi.fn(async () => ({ id: 'new-therapist-id' }));

vi.mock('firebase/firestore', () => ({
  collection: (..._a: any[]) => ({}),
  query: (..._a: any[]) => ({}),
  where: (..._a: any[]) => ({}),
  onSnapshot: (q: any, cb: any) => mockOnSnapshot(q, cb),
  addDoc: (...a: any[]) => mockAddDoc(...a),
  serverTimestamp: () => ({ __serverTimestamp: true }),
  Timestamp: { now: () => ({ toMillis: () => Date.now() }) },
}));

import { useTherapist } from '@/hooks/useTherapist';

describe('useTherapist', () => {
  beforeEach(() => {
    authMock.mockReturnValue({ user: { userId: 'u1' } });
    mockAddDoc.mockClear();
  });

  it('exposes loading, therapist, and createTherapist', async () => {
    const { result } = renderHook(() => useTherapist());
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(snapshotCallback).not.toBeNull();
    });
    // Simulate an empty snapshot
    act(() => {
      snapshotCallback!({ docs: [], forEach: (_f: any) => {} });
    });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.therapist).toBeNull();
    });
  });

  it('createTherapist writes displayName and owner', async () => {
    const { result } = renderHook(() => useTherapist());
    await waitFor(() => expect(snapshotCallback).not.toBeNull());
    act(() => {
      snapshotCallback!({ docs: [], forEach: () => {} });
    });

    await act(async () => {
      await result.current.createTherapist('Dr. Cohen');
    });

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const [, payload] = mockAddDoc.mock.calls[0];
    expect(payload.displayName).toBe('Dr. Cohen');
    expect(payload.ownerUserId).toBe('u1');
    expect(payload.kind).toBe('individual');
  });
});
```

Create `__tests__/hooks/useTherapyWindow.test.ts` — similar shape, covers:
- Idles when no therapistId is provided
- Subscribes to the open window, the themes, and the notes separately
- Returns `{ loading, openWindow, themes, notes, error }`

(Pattern identical to `useTherapist.test.ts`; model three separate `onSnapshot` mocks in a registry keyed by collection name.)

- [ ] **Step 2: Run tests — expect fail**

Run: `npm run test:run -- __tests__/hooks/useTherapist.test.ts`
Expected: fails (hook doesn't exist yet).

- [ ] **Step 3: Implement `useTherapist.ts`**

```ts
// src/hooks/useTherapist.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { Therapist } from '@/types/therapy';

export interface UseTherapistResult {
  loading: boolean;
  therapist: Therapist | null;
  error: Error | null;
  createTherapist: (displayName: string) => Promise<string>;
}

/**
 * Subscribes to the current user's therapist (v1: exactly one).
 * Returns `null` until the user has created one.
 */
export function useTherapist(): UseTherapistResult {
  const { user } = useAuth();
  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user?.userId) {
      setLoading(false);
      setTherapist(null);
      return;
    }
    const q = query(
      collection(firestore, 'therapists'),
      where('ownerUserId', '==', user.userId)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.docs.length === 0) {
          setTherapist(null);
        } else {
          const d = snap.docs[0];
          setTherapist({ id: d.id, ...(d.data() as Omit<Therapist, 'id'>) });
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user?.userId]);

  const createTherapist = useCallback(
    async (displayName: string): Promise<string> => {
      if (!user?.userId) throw new Error('Not signed in');
      const ref = await addDoc(collection(firestore, 'therapists'), {
        ownerUserId: user.userId,
        displayName: displayName.trim(),
        kind: 'individual',
        createdAt: serverTimestamp(),
      });
      // Immediately create the first open window so UI has something.
      await addDoc(collection(firestore, 'therapy_windows'), {
        therapistId: ref.id,
        ownerUserId: user.userId,
        status: 'open',
        openedAt: serverTimestamp(),
        themeIds: [],
        noteIds: [],
      });
      return ref.id;
    },
    [user?.userId]
  );

  return { loading, therapist, error, createTherapist };
}
```

- [ ] **Step 4: Implement `useTherapyWindow.ts`**

```ts
// src/hooks/useTherapyWindow.ts
'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type {
  TherapyWindow,
  TherapyTheme,
  TherapyNote,
} from '@/types/therapy';

export interface UseTherapyWindowResult {
  loading: boolean;
  openWindow: TherapyWindow | null;
  themes: TherapyTheme[];
  notes: TherapyNote[];
  error: Error | null;
}

/**
 * Subscribes to the open window for a therapist + its themes + its notes.
 * Three separate subscriptions; loading is true until all three have
 * settled (or errored).
 */
export function useTherapyWindow(
  therapistId: string | null
): UseTherapyWindowResult {
  const { user } = useAuth();
  const [openWindow, setOpenWindow] = useState<TherapyWindow | null>(null);
  const [themes, setThemes] = useState<TherapyTheme[]>([]);
  const [notes, setNotes] = useState<TherapyNote[]>([]);
  const [windowLoaded, setWindowLoaded] = useState(false);
  const [themesLoaded, setThemesLoaded] = useState(false);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user?.userId || !therapistId) {
      setOpenWindow(null);
      setThemes([]);
      setNotes([]);
      setWindowLoaded(true);
      setThemesLoaded(true);
      setNotesLoaded(true);
      return;
    }
    setWindowLoaded(false);
    setThemesLoaded(false);
    setNotesLoaded(false);

    const unsubWin = onSnapshot(
      query(
        collection(firestore, 'therapy_windows'),
        where('therapistId', '==', therapistId),
        where('status', '==', 'open')
      ),
      (snap) => {
        if (snap.docs.length === 0) {
          setOpenWindow(null);
        } else {
          const d = snap.docs[0];
          setOpenWindow({
            id: d.id,
            ...(d.data() as Omit<TherapyWindow, 'id'>),
          });
        }
        setWindowLoaded(true);
      },
      (err) => {
        setError(err);
        setWindowLoaded(true);
      }
    );

    return () => unsubWin();
  }, [user?.userId, therapistId]);

  // Subscribe to themes/notes once we know the open window id.
  useEffect(() => {
    if (!openWindow?.id) {
      setThemes([]);
      setNotes([]);
      setThemesLoaded(true);
      setNotesLoaded(true);
      return;
    }
    setThemesLoaded(false);
    setNotesLoaded(false);

    const unsubThemes = onSnapshot(
      query(
        collection(firestore, 'therapy_themes'),
        where('windowId', '==', openWindow.id)
      ),
      (snap) => {
        const out: TherapyTheme[] = [];
        snap.forEach((d) =>
          out.push({ id: d.id, ...(d.data() as Omit<TherapyTheme, 'id'>) })
        );
        setThemes(out);
        setThemesLoaded(true);
      },
      (err) => {
        setError(err);
        setThemesLoaded(true);
      }
    );

    const unsubNotes = onSnapshot(
      query(
        collection(firestore, 'therapy_notes'),
        where('windowId', '==', openWindow.id),
        orderBy('createdAt', 'desc')
      ),
      (snap) => {
        const out: TherapyNote[] = [];
        snap.forEach((d) =>
          out.push({ id: d.id, ...(d.data() as Omit<TherapyNote, 'id'>) })
        );
        setNotes(out);
        setNotesLoaded(true);
      },
      (err) => {
        setError(err);
        setNotesLoaded(true);
      }
    );

    return () => {
      unsubThemes();
      unsubNotes();
    };
  }, [openWindow?.id]);

  const loading = !(windowLoaded && themesLoaded && notesLoaded);
  return { loading, openWindow, themes, notes, error };
}
```

- [ ] **Step 5: Run tests — expect pass**

Run: `npm run test:run -- __tests__/hooks/useTherapist.test.ts __tests__/hooks/useTherapyWindow.test.ts`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useTherapist.ts src/hooks/useTherapyWindow.ts __tests__/hooks/useTherapist.test.ts __tests__/hooks/useTherapyWindow.test.ts
git commit -m "feat(therapy): useTherapist and useTherapyWindow hooks"
```

---

### Task 7: Hook — `useTherapyActions`

**Files:**
- Create: `src/hooks/useTherapyActions.ts`
- Create: `__tests__/hooks/useTherapyActions.test.ts`

Responsibilities:
- `toggleStar(themeId, currentValue)` — client-side `updateDoc` on `userState.starred`
- `toggleDismiss(themeId, currentValue)` — client-side update on `userState.dismissed`
- `setNote(themeId, note)` — client-side update on `userState.note`
- `importNote(windowId, therapistId, content)` — client-side add to `therapy_notes` + `arrayUnion` on the window's `noteIds`
- `refresh(windowId)` — calls `httpsCallable('regenerateTherapyWindow')({ windowId })`
- `closeSession({ windowId, sessionDate, discussedThemeIds, transcript })` — calls `httpsCallable('closeTherapyWindow')(...)`
- `saving: boolean`, `error: Error | null`

- [ ] **Step 1: Add failing tests**

Create `__tests__/hooks/useTherapyActions.test.ts` with tests for each method. Mock `firebase/firestore` (as in Task 6) and `firebase/functions` (see snippet below).

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const authMock = vi.fn(() => ({ user: { userId: 'u1' } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => authMock() }));
vi.mock('@/lib/firebase', () => ({
  firestore: {},
  functions: {},
}));

const mockUpdateDoc = vi.fn(async () => {});
const mockAddDoc = vi.fn(async () => ({ id: 'note-1' }));
vi.mock('firebase/firestore', () => ({
  doc: (..._a: any[]) => ({ __kind: 'doc' }),
  collection: (..._a: any[]) => ({ __kind: 'coll' }),
  updateDoc: (...a: any[]) => mockUpdateDoc(...a),
  addDoc: (...a: any[]) => mockAddDoc(...a),
  arrayUnion: (...v: any[]) => ({ __arrayUnion: v }),
  serverTimestamp: () => ({ __serverTimestamp: true }),
}));

const mockCallable = vi.fn(() => async (_: any) => ({ data: { ok: true } }));
vi.mock('firebase/functions', () => ({
  httpsCallable: (fns: any, name: string) => mockCallable(name),
}));

import { useTherapyActions } from '@/hooks/useTherapyActions';

describe('useTherapyActions', () => {
  beforeEach(() => {
    mockUpdateDoc.mockClear();
    mockAddDoc.mockClear();
    mockCallable.mockClear();
  });

  it('toggleStar flips userState.starred', async () => {
    const { result } = renderHook(() => useTherapyActions());
    await act(async () => {
      await result.current.toggleStar('theme-1', false);
    });
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, payload] = mockUpdateDoc.mock.calls[0];
    expect(payload['userState.starred']).toBe(true);
  });

  it('refresh invokes regenerateTherapyWindow callable', async () => {
    const { result } = renderHook(() => useTherapyActions());
    await act(async () => {
      await result.current.refresh('w-1');
    });
    expect(mockCallable).toHaveBeenCalledWith('regenerateTherapyWindow');
  });

  it('closeSession invokes closeTherapyWindow callable with normalized payload', async () => {
    const { result } = renderHook(() => useTherapyActions());
    await act(async () => {
      await result.current.closeSession({
        windowId: 'w-1',
        sessionDate: new Date(1_700_000_000_000),
        discussedThemeIds: ['t1', 't2'],
        transcript: 'hi',
      });
    });
    expect(mockCallable).toHaveBeenCalledWith('closeTherapyWindow');
  });

  it('importNote writes therapy_note doc and updates window.noteIds', async () => {
    const { result } = renderHook(() => useTherapyActions());
    await act(async () => {
      await result.current.importNote({
        windowId: 'w-1',
        therapistId: 't-1',
        content: '  transcript body  ',
      });
    });
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const [, payload] = mockAddDoc.mock.calls[0];
    expect(payload.content).toBe('transcript body');
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

Run: `npm run test:run -- __tests__/hooks/useTherapyActions.test.ts`
Expected: fail — hook missing.

- [ ] **Step 3: Implement the hook**

```ts
// src/hooks/useTherapyActions.ts
'use client';

import { useCallback, useState } from 'react';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firestore, functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  THERAPY_NOTE_MAX_LENGTH,
} from '@/types/therapy';

export interface CloseSessionInput {
  windowId: string;
  sessionDate: Date;
  discussedThemeIds: string[];
  transcript?: string | null;
}

export interface ImportNoteInput {
  windowId: string;
  therapistId: string;
  content: string;
}

export interface UseTherapyActionsResult {
  saving: boolean;
  error: Error | null;
  toggleStar: (themeId: string, currentValue: boolean) => Promise<void>;
  toggleDismiss: (themeId: string, currentValue: boolean) => Promise<void>;
  setNote: (themeId: string, note: string) => Promise<void>;
  importNote: (input: ImportNoteInput) => Promise<string>;
  refresh: (windowId: string) => Promise<void>;
  closeSession: (input: CloseSessionInput) => Promise<{ newWindowId: string }>;
}

export function useTherapyActions(): UseTherapyActionsResult {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const wrap = <T,>(fn: () => Promise<T>) => async (): Promise<T> => {
    setSaving(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const toggleStar = useCallback(
    async (themeId: string, currentValue: boolean) =>
      wrap(async () => {
        await updateDoc(doc(firestore, 'therapy_themes', themeId), {
          'userState.starred': !currentValue,
        });
      })(),
    []
  );

  const toggleDismiss = useCallback(
    async (themeId: string, currentValue: boolean) =>
      wrap(async () => {
        await updateDoc(doc(firestore, 'therapy_themes', themeId), {
          'userState.dismissed': !currentValue,
        });
      })(),
    []
  );

  const setNote = useCallback(
    async (themeId: string, note: string) =>
      wrap(async () => {
        const trimmed = note.trim();
        await updateDoc(doc(firestore, 'therapy_themes', themeId), {
          'userState.note': trimmed.length > 0 ? trimmed : null,
        });
      })(),
    []
  );

  const importNote = useCallback(
    async ({ windowId, therapistId, content }: ImportNoteInput): Promise<string> =>
      wrap(async () => {
        if (!user?.userId) throw new Error('Not signed in');
        const trimmed = content.trim();
        if (trimmed.length === 0) throw new Error('Note is empty');
        if (trimmed.length > THERAPY_NOTE_MAX_LENGTH) {
          throw new Error(
            `Note exceeds ${THERAPY_NOTE_MAX_LENGTH.toLocaleString()} characters`
          );
        }
        const ref = await addDoc(collection(firestore, 'therapy_notes'), {
          windowId,
          therapistId,
          ownerUserId: user.userId,
          content: trimmed,
          createdAt: serverTimestamp(),
        });
        await updateDoc(doc(firestore, 'therapy_windows', windowId), {
          noteIds: arrayUnion(ref.id),
        });
        return ref.id;
      })(),
    [user?.userId]
  );

  const refresh = useCallback(
    async (windowId: string) =>
      wrap(async () => {
        const call = httpsCallable<
          { windowId: string },
          { ok: boolean }
        >(functions, 'regenerateTherapyWindow');
        await call({ windowId });
      })(),
    []
  );

  const closeSession = useCallback(
    async ({
      windowId, sessionDate, discussedThemeIds, transcript,
    }: CloseSessionInput) =>
      wrap(async () => {
        const call = httpsCallable<
          {
            windowId: string;
            sessionDateMillis: number;
            discussedThemeIds: string[];
            transcript?: string | null;
          },
          { newWindowId: string }
        >(functions, 'closeTherapyWindow');
        const r = await call({
          windowId,
          sessionDateMillis: sessionDate.getTime(),
          discussedThemeIds,
          transcript: transcript ?? null,
        });
        return r.data;
      })(),
    []
  );

  return {
    saving, error,
    toggleStar, toggleDismiss, setNote,
    importNote, refresh, closeSession,
  };
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npm run test:run -- __tests__/hooks/useTherapyActions.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTherapyActions.ts __tests__/hooks/useTherapyActions.test.ts
git commit -m "feat(therapy): useTherapyActions hook for mutations and callables"
```

---

### Task 8: PIN-gated `/therapy` route shell + therapist setup

**Files:**
- Create: `src/app/therapy/layout.tsx`
- Create: `src/app/therapy/page.tsx`
- Create: `src/components/therapy/TherapyBookShell.tsx`
- Create: `src/components/therapy/TherapistSetupForm.tsx`
- Create: `src/components/therapy/therapy.module.css`
- Create: `__tests__/components/therapy/TherapistSetupForm.test.tsx`

- [ ] **Step 1: Setup form test (failing)**

Create `__tests__/components/therapy/TherapistSetupForm.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TherapistSetupForm } from '@/components/therapy/TherapistSetupForm';

describe('TherapistSetupForm', () => {
  it('submit calls onCreate with trimmed name and disables while saving', async () => {
    const onCreate = vi.fn(async () => 'therapist-id');
    render(<TherapistSetupForm onCreate={onCreate} />);

    const input = screen.getByLabelText(/therapist/i);
    fireEvent.change(input, { target: { value: '  Dr. Cohen  ' } });
    fireEvent.click(screen.getByRole('button', { name: /set up/i }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith('Dr. Cohen');
    });
  });

  it('disables submit for empty input', () => {
    const onCreate = vi.fn();
    render(<TherapistSetupForm onCreate={onCreate} />);
    expect(screen.getByRole('button', { name: /set up/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test — expect fail**

Run: `npm run test:run -- __tests__/components/therapy/TherapistSetupForm.test.tsx`

- [ ] **Step 3: Implement `TherapistSetupForm.tsx`**

```tsx
// src/components/therapy/TherapistSetupForm.tsx
'use client';

import { useState } from 'react';
import styles from './therapy.module.css';

export interface TherapistSetupFormProps {
  onCreate: (displayName: string) => Promise<string>;
}

export function TherapistSetupForm({ onCreate }: TherapistSetupFormProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && !saving;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles.setupForm} onSubmit={submit}>
      <h2 className={styles.setupHeading}>Set up your therapist</h2>
      <p className={styles.setupHelp}>
        This is for your personal therapy prep. It stays on your device behind
        your private PIN.
      </p>
      <label className={styles.setupLabel}>
        Therapist
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Dr. Cohen"
          autoFocus
          className={styles.setupInput}
        />
      </label>
      {error && <div className={styles.setupError}>{error}</div>}
      <button
        type="submit"
        className={styles.setupSubmit}
        disabled={!canSubmit}
      >
        {saving ? 'Setting up…' : 'Set up therapy'}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Create `therapy.module.css`** with shell + setup styles

```css
/* src/components/therapy/therapy.module.css */
.shell { max-width: 760px; margin: 0 auto; padding: 96px 28px 120px; }
.shellHeader { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 36px; color: #2a1f14; }
.shellTitle { font-family: var(--font-parent-display), Georgia, serif; font-size: 32px; letter-spacing: -0.01em; font-weight: 400; }
.shellSubtitle { font-size: 13px; color: #8a6f4a; letter-spacing: 0.02em; }

.setupForm { max-width: 420px; margin: 120px auto; display: flex; flex-direction: column; gap: 16px; }
.setupHeading { font-family: var(--font-parent-display), Georgia, serif; font-size: 24px; font-weight: 400; color: #2a1f14; margin: 0; }
.setupHelp { font-size: 14px; color: #6d5a3f; margin: 0; }
.setupLabel { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #6d5a3f; }
.setupInput { border: 1px solid #d9c9a8; border-radius: 6px; padding: 10px 12px; font-size: 15px; font-family: inherit; background: #fefaf0; }
.setupInput:focus { outline: 2px solid #8a6f4a; outline-offset: 1px; }
.setupSubmit { align-self: flex-start; background: #2a1f14; color: #fefaf0; padding: 10px 20px; border: 0; border-radius: 6px; font-family: inherit; cursor: pointer; }
.setupSubmit:disabled { opacity: 0.4; cursor: not-allowed; }
.setupError { color: #a14646; font-size: 13px; }

.lockGate { max-width: 360px; margin: 120px auto; text-align: center; color: #2a1f14; }
.lockHeading { font-family: var(--font-parent-display), Georgia, serif; font-size: 24px; font-weight: 400; margin: 0 0 12px; }
.lockHelp { font-size: 14px; color: #6d5a3f; margin: 0 0 24px; }
```

(Remaining styles — theme cards, window header, session close sheet, etc. — get appended in later tasks.)

- [ ] **Step 5: Run component test — expect pass**

Run: `npm run test:run -- __tests__/components/therapy/TherapistSetupForm.test.tsx`

- [ ] **Step 6: Create `TherapyBookShell.tsx`**

```tsx
// src/components/therapy/TherapyBookShell.tsx
'use client';

import { usePrivacyLock } from '@/hooks/usePrivacyLock';
import { useTherapist } from '@/hooks/useTherapist';
import { useTherapyWindow } from '@/hooks/useTherapyWindow';
import { PinKeypad } from '@/components/privacy/PinKeypad';
import { PinSetupModal } from '@/components/privacy/PinSetupModal';
import { TherapistSetupForm } from './TherapistSetupForm';
import styles from './therapy.module.css';

export function TherapyBookShell() {
  const lock = usePrivacyLock();
  const { therapist, loading: tLoading, createTherapist } = useTherapist();
  const { openWindow, themes, notes, loading: wLoading } = useTherapyWindow(
    therapist?.id ?? null
  );

  if (lock.loading) {
    return <div className={styles.shell}>Loading…</div>;
  }

  if (!lock.pinIsSet) {
    // Send user through the standard PIN setup (PinSetupModal) before
    // we expose anything in this book.
    return (
      <div className={styles.lockGate}>
        <h2 className={styles.lockHeading}>Set a private PIN</h2>
        <p className={styles.lockHelp}>
          Therapy stays behind your personal PIN.
        </p>
        <PinSetupModal
          open
          onClose={() => {}}
          onSetupPin={async (pin) => {
            await lock.setupPin(pin);
          }}
        />
      </div>
    );
  }

  if (!lock.unlocked) {
    return (
      <div className={styles.lockGate}>
        <h2 className={styles.lockHeading}>Enter your PIN</h2>
        <p className={styles.lockHelp}>Therapy is locked.</p>
        <PinKeypad
          onSubmit={async (pin) => lock.verify(pin)}
          error={lock.error}
        />
      </div>
    );
  }

  if (tLoading) {
    return <div className={styles.shell}>Loading…</div>;
  }

  if (!therapist) {
    return (
      <TherapistSetupForm onCreate={createTherapist} />
    );
  }

  // Task 11 replaces this placeholder with the full workspace.
  if (wLoading) return <div className={styles.shell}>Loading workspace…</div>;

  return (
    <div className={styles.shell}>
      <div className={styles.shellHeader}>
        <h1 className={styles.shellTitle}>Therapy</h1>
        <span className={styles.shellSubtitle}>
          {therapist.displayName} · {themes.length} themes
        </span>
      </div>
      {/* Workspace mounts here in Task 11 */}
      <pre style={{ fontSize: 11, color: '#8a6f4a' }}>
        {JSON.stringify({ openWindowId: openWindow?.id, themeCount: themes.length, noteCount: notes.length }, null, 2)}
      </pre>
    </div>
  );
}
```

Note: the exact props on `PinKeypad` and `PinSetupModal` may differ — read `src/components/privacy/PinKeypad.tsx` and `src/components/privacy/PinSetupModal.tsx` and adapt the above to their actual APIs. The shape (a callback that verifies/sets a PIN) is stable.

- [ ] **Step 7: Create the route files**

```tsx
// src/app/therapy/layout.tsx
export default function TherapyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

```tsx
// src/app/therapy/page.tsx
import { TherapyBookShell } from '@/components/therapy/TherapyBookShell';

export default function TherapyPage() {
  return <TherapyBookShell />;
}
```

- [ ] **Step 8: Manual verification**

Start the dev server (`npm run dev`), sign in, visit `http://localhost:3000/therapy`, confirm:
- If no PIN: setup flow appears
- Once PIN set and verified: setup-therapist form appears
- After submit: placeholder workspace renders with "0 themes"

- [ ] **Step 9: Commit**

```bash
git add src/app/therapy/ src/components/therapy/ __tests__/components/therapy/
git commit -m "feat(therapy): PIN-gated /therapy shell with therapist setup"
```

---

### Task 9: `ThemeCard` component

**Files:**
- Create: `src/components/therapy/ThemeCard.tsx`
- Modify: `src/components/therapy/therapy.module.css` (append theme card styles)
- Create: `__tests__/components/therapy/ThemeCard.test.tsx`

- [ ] **Step 1: Failing tests**

```tsx
// __tests__/components/therapy/ThemeCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeCard } from '@/components/therapy/ThemeCard';
import type { TherapyTheme } from '@/types/therapy';
import { Timestamp } from 'firebase/firestore';

const baseTheme: TherapyTheme = {
  id: 't1',
  windowId: 'w1',
  therapistId: 'th1',
  ownerUserId: 'u1',
  title: 'A theme',
  summary: 'Why it matters',
  sourceRefs: [
    { kind: 'entry', id: 'e1', snippet: 'something written' },
  ],
  userState: { starred: false, dismissed: false },
  lifecycle: { firstSeenWindowId: 'w1', carriedForwardCount: 0 },
  generatedAt: Timestamp.fromMillis(0),
  model: 'test',
};

describe('ThemeCard', () => {
  it('renders title, summary, and source row', () => {
    render(
      <ThemeCard
        theme={baseTheme}
        onToggleStar={vi.fn()}
        onToggleDismiss={vi.fn()}
        onSetNote={vi.fn()}
      />
    );
    expect(screen.getByText('A theme')).toBeTruthy();
    expect(screen.getByText('Why it matters')).toBeTruthy();
    expect(screen.getByText(/from 1 moment/i)).toBeTruthy();
  });

  it('renders carried-forward pip when lifecycle count > 0', () => {
    const theme = { ...baseTheme, lifecycle: { ...baseTheme.lifecycle, carriedForwardCount: 2 } };
    render(
      <ThemeCard
        theme={theme}
        onToggleStar={vi.fn()}
        onToggleDismiss={vi.fn()}
        onSetNote={vi.fn()}
      />
    );
    expect(screen.getByText(/carried/i)).toBeTruthy();
  });

  it('toggle star calls handler with current value', () => {
    const onToggleStar = vi.fn();
    render(
      <ThemeCard
        theme={baseTheme}
        onToggleStar={onToggleStar}
        onToggleDismiss={vi.fn()}
        onSetNote={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /star/i }));
    expect(onToggleStar).toHaveBeenCalledWith('t1', false);
  });

  it('editing the note calls onSetNote on blur', () => {
    const onSetNote = vi.fn();
    render(
      <ThemeCard
        theme={baseTheme}
        onToggleStar={vi.fn()}
        onToggleDismiss={vi.fn()}
        onSetNote={onSetNote}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /add note/i }));
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'want to raise' } });
    fireEvent.blur(textarea);
    expect(onSetNote).toHaveBeenCalledWith('t1', 'want to raise');
  });
});
```

- [ ] **Step 2: Implement `ThemeCard.tsx`**

```tsx
// src/components/therapy/ThemeCard.tsx
'use client';

import { useState } from 'react';
import type { TherapyTheme } from '@/types/therapy';
import styles from './therapy.module.css';

export interface ThemeCardProps {
  theme: TherapyTheme;
  onToggleStar: (themeId: string, currentValue: boolean) => Promise<void> | void;
  onToggleDismiss: (themeId: string, currentValue: boolean) => Promise<void> | void;
  onSetNote: (themeId: string, note: string) => Promise<void> | void;
}

export function ThemeCard({
  theme, onToggleStar, onToggleDismiss, onSetNote,
}: ThemeCardProps) {
  const [showSources, setShowSources] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(theme.userState.note ?? '');

  const carried = theme.lifecycle.carriedForwardCount > 0;
  const nSources = theme.sourceRefs.length;

  return (
    <article className={styles.themeCard} data-starred={theme.userState.starred} data-dismissed={theme.userState.dismissed}>
      <header className={styles.themeHeader}>
        <h3 className={styles.themeTitle}>{theme.title}</h3>
        {carried && (
          <span className={styles.themeCarriedPip}>
            carried · {theme.lifecycle.carriedForwardCount}
          </span>
        )}
      </header>
      <p className={styles.themeSummary}>{theme.summary}</p>

      <div className={styles.themeActions}>
        <button
          type="button"
          aria-label={theme.userState.starred ? 'Unstar' : 'Star'}
          onClick={() => onToggleStar(theme.id, theme.userState.starred)}
          className={styles.themeIconBtn}
          data-active={theme.userState.starred}
        >
          ★
        </button>
        <button
          type="button"
          aria-label={theme.userState.dismissed ? 'Undismiss' : 'Dismiss'}
          onClick={() => onToggleDismiss(theme.id, theme.userState.dismissed)}
          className={styles.themeIconBtn}
        >
          ✕
        </button>
        <button
          type="button"
          aria-label={theme.userState.note ? 'Edit note' : 'Add note'}
          onClick={() => setEditingNote(true)}
          className={styles.themeIconBtn}
        >
          ✎
        </button>
      </div>

      {theme.userState.note && !editingNote && (
        <p className={styles.themeNotePreview}>{theme.userState.note}</p>
      )}

      {editingNote && (
        <textarea
          className={styles.themeNoteEditor}
          value={noteDraft}
          autoFocus
          onChange={(e) => setNoteDraft(e.target.value)}
          onBlur={async () => {
            setEditingNote(false);
            if (noteDraft !== (theme.userState.note ?? '')) {
              await onSetNote(theme.id, noteDraft);
            }
          }}
          placeholder="What do you want to say about this?"
        />
      )}

      {nSources > 0 && (
        <button
          type="button"
          onClick={() => setShowSources((v) => !v)}
          className={styles.themeSourcesToggle}
        >
          From {nSources} {nSources === 1 ? 'moment' : 'moments'}
        </button>
      )}
      {showSources && (
        <ul className={styles.themeSourcesList}>
          {theme.sourceRefs.map((ref) => (
            <li key={`${ref.kind}:${ref.id}`}>
              <span className={styles.themeSourceKind}>{ref.kind}</span>
              <span className={styles.themeSourceSnippet}>{ref.snippet}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
```

- [ ] **Step 3: Append card styles to `therapy.module.css`**

```css
.themeCard { border-top: 1px solid #e8dcc3; padding: 24px 0; }
.themeCard[data-dismissed="true"] { opacity: 0.35; }
.themeHeader { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.themeTitle { font-family: var(--font-parent-display), Georgia, serif; font-size: 20px; font-weight: 400; color: #2a1f14; margin: 0; }
.themeCarriedPip { font-size: 11px; letter-spacing: 0.06em; color: #a14646; text-transform: uppercase; }
.themeSummary { font-size: 15px; line-height: 1.5; color: #3d2f1f; margin: 8px 0 12px; }
.themeActions { display: flex; gap: 8px; }
.themeIconBtn { background: transparent; border: 1px solid #d9c9a8; border-radius: 4px; width: 28px; height: 28px; cursor: pointer; color: #6d5a3f; font-size: 14px; }
.themeIconBtn[data-active="true"] { background: #f7e9c6; color: #2a1f14; border-color: #c1a36a; }
.themeNotePreview { font-style: italic; color: #6d5a3f; font-size: 13px; margin: 8px 0 0; padding-left: 12px; border-left: 2px solid #d9c9a8; }
.themeNoteEditor { width: 100%; min-height: 60px; margin-top: 8px; border: 1px solid #d9c9a8; border-radius: 4px; padding: 8px; font-family: inherit; font-size: 14px; resize: vertical; background: #fefaf0; }
.themeSourcesToggle { background: transparent; border: 0; color: #8a6f4a; font-size: 12px; margin-top: 10px; padding: 0; cursor: pointer; text-decoration: underline dotted; }
.themeSourcesList { margin-top: 8px; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.themeSourceKind { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #a08257; margin-right: 8px; }
.themeSourceSnippet { font-size: 13px; color: #3d2f1f; }
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npm run test:run -- __tests__/components/therapy/ThemeCard.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add src/components/therapy/ThemeCard.tsx src/components/therapy/therapy.module.css __tests__/components/therapy/ThemeCard.test.tsx
git commit -m "feat(therapy): ThemeCard with star/dismiss/note + source expansion"
```

---

### Task 10: `ThemeList` + `CarryForwardBanner`

**Files:**
- Create: `src/components/therapy/ThemeList.tsx`
- Create: `src/components/therapy/CarryForwardBanner.tsx`
- Modify: `src/components/therapy/therapy.module.css` (append)
- Create: `__tests__/components/therapy/ThemeList.test.tsx`

Responsibilities:
- `ThemeList` orders themes: non-dismissed starred first → non-dismissed non-starred → dismissed (hidden behind "Show N dismissed" toggle).
- `CarryForwardBanner` renders when any theme has `carriedForwardCount > 0`, showing "N threads carried forward from your last session."

- [ ] **Step 1: Failing `ThemeList` test**

```tsx
// __tests__/components/therapy/ThemeList.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeList } from '@/components/therapy/ThemeList';
import type { TherapyTheme } from '@/types/therapy';
import { Timestamp } from 'firebase/firestore';

function make(id: string, opts: Partial<TherapyTheme['userState']> = {}): TherapyTheme {
  return {
    id,
    windowId: 'w1',
    therapistId: 'th1',
    ownerUserId: 'u1',
    title: `T${id}`,
    summary: 's',
    sourceRefs: [],
    userState: { starred: false, dismissed: false, ...opts },
    lifecycle: { firstSeenWindowId: 'w1', carriedForwardCount: 0 },
    generatedAt: Timestamp.fromMillis(0),
    model: 'test',
  };
}

describe('ThemeList', () => {
  const handlers = {
    onToggleStar: vi.fn(),
    onToggleDismiss: vi.fn(),
    onSetNote: vi.fn(),
  };

  it('places starred themes above unstarred', () => {
    const themes = [make('1'), make('2', { starred: true })];
    render(<ThemeList themes={themes} {...handlers} />);
    const titles = screen.getAllByRole('heading', { level: 3 });
    expect(titles[0].textContent).toBe('T2');
    expect(titles[1].textContent).toBe('T1');
  });

  it('hides dismissed themes by default, reveals via toggle', () => {
    const themes = [make('1'), make('2', { dismissed: true })];
    render(<ThemeList themes={themes} {...handlers} />);
    expect(screen.queryByText('T2')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /1 dismissed/i }));
    expect(screen.getByText('T2')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Implement `ThemeList.tsx`**

```tsx
// src/components/therapy/ThemeList.tsx
'use client';

import { useMemo, useState } from 'react';
import type { TherapyTheme } from '@/types/therapy';
import { ThemeCard } from './ThemeCard';
import styles from './therapy.module.css';

export interface ThemeListProps {
  themes: TherapyTheme[];
  onToggleStar: (id: string, v: boolean) => Promise<void> | void;
  onToggleDismiss: (id: string, v: boolean) => Promise<void> | void;
  onSetNote: (id: string, note: string) => Promise<void> | void;
}

export function ThemeList({
  themes, onToggleStar, onToggleDismiss, onSetNote,
}: ThemeListProps) {
  const [showDismissed, setShowDismissed] = useState(false);

  const { active, dismissed } = useMemo(() => {
    const active: TherapyTheme[] = [];
    const dismissed: TherapyTheme[] = [];
    for (const t of themes) {
      if (t.userState.dismissed) dismissed.push(t);
      else active.push(t);
    }
    active.sort((a, b) => {
      if (a.userState.starred !== b.userState.starred) {
        return a.userState.starred ? -1 : 1;
      }
      return 0; // preserve LLM order otherwise
    });
    return { active, dismissed };
  }, [themes]);

  return (
    <div className={styles.themeList}>
      {active.map((t) => (
        <ThemeCard
          key={t.id}
          theme={t}
          onToggleStar={onToggleStar}
          onToggleDismiss={onToggleDismiss}
          onSetNote={onSetNote}
        />
      ))}
      {dismissed.length > 0 && (
        <>
          <button
            type="button"
            className={styles.showDismissedBtn}
            onClick={() => setShowDismissed((v) => !v)}
          >
            {showDismissed ? 'Hide' : 'Show'} {dismissed.length} dismissed
          </button>
          {showDismissed && dismissed.map((t) => (
            <ThemeCard
              key={t.id}
              theme={t}
              onToggleStar={onToggleStar}
              onToggleDismiss={onToggleDismiss}
              onSetNote={onSetNote}
            />
          ))}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Implement `CarryForwardBanner.tsx`**

```tsx
// src/components/therapy/CarryForwardBanner.tsx
'use client';
import type { TherapyTheme } from '@/types/therapy';
import styles from './therapy.module.css';

export function CarryForwardBanner({ themes }: { themes: TherapyTheme[] }) {
  const count = themes.filter((t) => t.lifecycle.carriedForwardCount > 0).length;
  if (count === 0) return null;
  return (
    <div className={styles.carryBanner} role="note">
      {count === 1
        ? '1 thread carried forward from your last session.'
        : `${count} threads carried forward from your last session.`}
    </div>
  );
}
```

- [ ] **Step 4: Append styles**

Append to `therapy.module.css`:

```css
.themeList { display: flex; flex-direction: column; }
.showDismissedBtn { margin-top: 16px; background: transparent; border: 0; color: #8a6f4a; font-size: 12px; text-decoration: underline dotted; cursor: pointer; align-self: flex-start; }
.carryBanner { border: 1px solid #e8dcc3; background: #fbf5e7; color: #6d5a3f; padding: 10px 14px; font-size: 13px; border-radius: 6px; margin-bottom: 24px; }
```

- [ ] **Step 5: Run tests + commit**

Run: `npm run test:run -- __tests__/components/therapy/ThemeList.test.tsx`

```bash
git add src/components/therapy/ThemeList.tsx src/components/therapy/CarryForwardBanner.tsx src/components/therapy/therapy.module.css __tests__/components/therapy/ThemeList.test.tsx
git commit -m "feat(therapy): ThemeList with starred-first ordering + CarryForwardBanner"
```

---

### Task 11: `WindowHeader` + wire up the full workspace

**Files:**
- Create: `src/components/therapy/WindowHeader.tsx`
- Modify: `src/components/therapy/TherapyBookShell.tsx` (replace the placeholder with real layout)
- Modify: `src/components/therapy/therapy.module.css` (append)

- [ ] **Step 1: Implement `WindowHeader.tsx`**

```tsx
// src/components/therapy/WindowHeader.tsx
'use client';

import type { TherapyWindow } from '@/types/therapy';
import styles from './therapy.module.css';

export interface WindowHeaderProps {
  window: TherapyWindow;
  saving: boolean;
  onRefresh: () => void;
  onImportNotes: () => void;
  onCloseSession: () => void;
}

function formatOpenedAt(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function daysBetween(a: Date, b: Date): number {
  const diff = b.getTime() - a.getTime();
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
}

export function WindowHeader({
  window, saving, onRefresh, onImportNotes, onCloseSession,
}: WindowHeaderProps) {
  const opened = window.openedAt.toDate();
  const days = daysBetween(opened, new Date());

  return (
    <header className={styles.windowHeader}>
      <div className={styles.windowMeta}>
        This session&apos;s prep · opened {formatOpenedAt(opened)} · {days} day{days === 1 ? '' : 's'} in
      </div>
      <div className={styles.windowActions}>
        <button type="button" onClick={onRefresh} disabled={saving} className={styles.windowActionBtn}>
          Refresh
        </button>
        <button type="button" onClick={onImportNotes} disabled={saving} className={styles.windowActionBtn}>
          Import notes
        </button>
        <button type="button" onClick={onCloseSession} disabled={saving} className={styles.windowActionPrimary}>
          I had a session
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Replace placeholder in `TherapyBookShell.tsx`**

Update the return block where themes were rendered as JSON. The new return structure:

```tsx
// Inside TherapyBookShell (replace the placeholder JSX block):
const actions = useTherapyActions();
const [showImport, setShowImport] = useState(false);
const [showClose, setShowClose] = useState(false);

// ...
if (!openWindow) {
  return <div className={styles.shell}>No active window. Create a new one…</div>;
}
return (
  <div className={styles.shell}>
    <WindowHeader
      window={openWindow}
      saving={actions.saving}
      onRefresh={() => actions.refresh(openWindow.id)}
      onImportNotes={() => setShowImport(true)}
      onCloseSession={() => setShowClose(true)}
    />
    <CarryForwardBanner themes={themes} />
    <ThemeList
      themes={themes}
      onToggleStar={actions.toggleStar}
      onToggleDismiss={actions.toggleDismiss}
      onSetNote={actions.setNote}
    />
    <PastSessionsList therapistId={therapist.id} />
    {showImport && (
      <ImportNotesModal
        therapistId={therapist.id}
        openWindow={openWindow}
        onClose={() => setShowImport(false)}
        onSubmit={async ({ windowId, content }) => {
          await actions.importNote({ windowId, therapistId: therapist.id, content });
          setShowImport(false);
        }}
      />
    )}
    {showClose && (
      <SessionCloseSheet
        openWindow={openWindow}
        themes={themes.filter((t) => !t.userState.dismissed)}
        onCancel={() => setShowClose(false)}
        onConfirm={async (input) => {
          await actions.closeSession({ ...input, windowId: openWindow.id });
          setShowClose(false);
        }}
      />
    )}
  </div>
);
```

Add the necessary imports at the top of `TherapyBookShell.tsx`:

```tsx
import { useState } from 'react';
import { WindowHeader } from './WindowHeader';
import { CarryForwardBanner } from './CarryForwardBanner';
import { ThemeList } from './ThemeList';
import { ImportNotesModal } from './ImportNotesModal';
import { SessionCloseSheet } from './SessionCloseSheet';
import { PastSessionsList } from './PastSessionsList';
import { useTherapyActions } from '@/hooks/useTherapyActions';
```

The `ImportNotesModal`, `SessionCloseSheet`, and `PastSessionsList` components are built in the next three tasks. Until those tasks land, create stub files that export components rendering `null` so the shell compiles:

```tsx
// src/components/therapy/ImportNotesModal.tsx (stub)
export function ImportNotesModal(_: any) { return null; }
// src/components/therapy/SessionCloseSheet.tsx (stub)
export function SessionCloseSheet(_: any) { return null; }
// src/components/therapy/PastSessionsList.tsx (stub)
export function PastSessionsList(_: any) { return null; }
```

- [ ] **Step 3: Append window-header styles**

```css
.windowHeader { display: flex; justify-content: space-between; align-items: baseline; gap: 20px; margin-bottom: 24px; flex-wrap: wrap; }
.windowMeta { font-size: 13px; color: #8a6f4a; letter-spacing: 0.02em; }
.windowActions { display: flex; gap: 8px; }
.windowActionBtn { background: transparent; border: 1px solid #d9c9a8; padding: 6px 12px; border-radius: 4px; font-family: inherit; font-size: 13px; color: #3d2f1f; cursor: pointer; }
.windowActionBtn:hover { background: #f7ecd0; }
.windowActionPrimary { background: #2a1f14; color: #fefaf0; border: 0; padding: 6px 14px; border-radius: 4px; font-family: inherit; font-size: 13px; cursor: pointer; }
.windowActionPrimary:disabled { opacity: 0.4; cursor: not-allowed; }
```

- [ ] **Step 4: Run the dev server + verify**

Sign in, visit `/therapy`, confirm the header renders and the three buttons call their handlers (at minimum `Refresh` can fire the callable).

- [ ] **Step 5: Commit**

```bash
git add src/components/therapy/
git commit -m "feat(therapy): WindowHeader + workspace composition in shell"
```

---

### Task 12: `ImportNotesModal`

**Files:**
- Modify: `src/components/therapy/ImportNotesModal.tsx` (replace stub)
- Modify: `src/components/therapy/therapy.module.css` (append)
- Create: `__tests__/components/therapy/ImportNotesModal.test.tsx`

- [ ] **Step 1: Tests**

```tsx
// __tests__/components/therapy/ImportNotesModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImportNotesModal } from '@/components/therapy/ImportNotesModal';
import type { TherapyWindow } from '@/types/therapy';
import { Timestamp } from 'firebase/firestore';

const openWindow: TherapyWindow = {
  id: 'w-open', therapistId: 't', ownerUserId: 'u',
  status: 'open', openedAt: Timestamp.fromMillis(Date.now() - 86400_000),
  themeIds: [], noteIds: [],
};

describe('ImportNotesModal', () => {
  it('calls onSubmit with the open window id by default', async () => {
    const onSubmit = vi.fn(async () => {});
    render(
      <ImportNotesModal
        therapistId="t"
        openWindow={openWindow}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Patient: hello' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        windowId: 'w-open',
        content: 'Patient: hello',
      });
    });
  });

  it('save disabled when content is empty', () => {
    render(
      <ImportNotesModal
        therapistId="t"
        openWindow={openWindow}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// src/components/therapy/ImportNotesModal.tsx
'use client';

import { useState } from 'react';
import type { TherapyWindow } from '@/types/therapy';
import { THERAPY_NOTE_WARN_LENGTH, THERAPY_NOTE_MAX_LENGTH } from '@/types/therapy';
import styles from './therapy.module.css';

export interface ImportNotesModalProps {
  therapistId: string;
  openWindow: TherapyWindow;
  onClose: () => void;
  onSubmit: (input: { windowId: string; content: string }) => Promise<void> | void;
}

export function ImportNotesModal({
  openWindow, onClose, onSubmit,
}: ImportNotesModalProps) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = content.trim();
  const tooLong = content.length > THERAPY_NOTE_MAX_LENGTH;
  const warn = content.length > THERAPY_NOTE_WARN_LENGTH && !tooLong;
  const canSave = trimmed.length > 0 && !tooLong && !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ windowId: openWindow.id, content: trimmed });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
      <div className={styles.modalBody}>
        <header className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Import session notes</h2>
          <button type="button" onClick={onClose} className={styles.modalClose} aria-label="Close">✕</button>
        </header>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste your notes or a full transcript…"
          className={styles.modalTextarea}
          rows={12}
        />
        <div className={styles.modalMeta}>
          {warn && <span className={styles.modalWarn}>{content.length.toLocaleString()} chars — approaching the max.</span>}
          {tooLong && <span className={styles.modalError}>Too long (max {THERAPY_NOTE_MAX_LENGTH.toLocaleString()} chars).</span>}
          {error && <span className={styles.modalError}>{error}</span>}
        </div>
        <div className={styles.modalActions}>
          <button type="button" onClick={onClose} className={styles.windowActionBtn}>Cancel</button>
          <button type="button" onClick={submit} disabled={!canSave} className={styles.windowActionPrimary}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Append modal styles**

```css
.modalBackdrop { position: fixed; inset: 0; background: rgba(20, 15, 8, 0.45); display: flex; align-items: center; justify-content: center; z-index: 40; padding: 28px; }
.modalBody { background: #fefaf0; border-radius: 10px; max-width: 720px; width: 100%; padding: 28px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
.modalHeader { display: flex; align-items: center; justify-content: space-between; }
.modalTitle { font-family: var(--font-parent-display), Georgia, serif; font-size: 22px; font-weight: 400; margin: 0; color: #2a1f14; }
.modalClose { background: transparent; border: 0; color: #6d5a3f; font-size: 18px; cursor: pointer; }
.modalTextarea { width: 100%; border: 1px solid #d9c9a8; border-radius: 6px; padding: 10px; font-family: inherit; font-size: 14px; resize: vertical; background: #fffdf6; }
.modalMeta { min-height: 20px; font-size: 12px; }
.modalWarn { color: #a97d2f; }
.modalError { color: #a14646; }
.modalActions { display: flex; justify-content: flex-end; gap: 10px; }
```

- [ ] **Step 4: Test + commit**

Run: `npm run test:run -- __tests__/components/therapy/ImportNotesModal.test.tsx`

```bash
git add src/components/therapy/ImportNotesModal.tsx src/components/therapy/therapy.module.css __tests__/components/therapy/ImportNotesModal.test.tsx
git commit -m "feat(therapy): ImportNotesModal paste-in for notes and transcripts"
```

---

### Task 13: `SessionCloseSheet`

**Files:**
- Modify: `src/components/therapy/SessionCloseSheet.tsx` (replace stub)
- Modify: `src/components/therapy/therapy.module.css` (append)
- Create: `__tests__/components/therapy/SessionCloseSheet.test.tsx`

- [ ] **Step 1: Tests**

```tsx
// __tests__/components/therapy/SessionCloseSheet.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionCloseSheet } from '@/components/therapy/SessionCloseSheet';
import type { TherapyTheme, TherapyWindow } from '@/types/therapy';
import { Timestamp } from 'firebase/firestore';

const mkTheme = (id: string, starred = false): TherapyTheme => ({
  id, windowId: 'w1', therapistId: 'th1', ownerUserId: 'u1',
  title: `T${id}`, summary: 's', sourceRefs: [],
  userState: { starred, dismissed: false },
  lifecycle: { firstSeenWindowId: 'w1', carriedForwardCount: 0 },
  generatedAt: Timestamp.fromMillis(0), model: 'test',
});

const openWin: TherapyWindow = {
  id: 'w1', therapistId: 'th1', ownerUserId: 'u1', status: 'open',
  openedAt: Timestamp.fromMillis(Date.now() - 7 * 86400_000),
  themeIds: ['a','b'], noteIds: [],
};

describe('SessionCloseSheet', () => {
  it('starts with nothing checked and confirm enabled', () => {
    render(
      <SessionCloseSheet
        openWindow={openWin}
        themes={[mkTheme('a'), mkTheme('b')]}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    const confirm = screen.getByRole('button', { name: /confirm/i });
    expect(confirm).not.toBeDisabled();
  });

  it('passes checked ids to onConfirm', async () => {
    const onConfirm = vi.fn(async () => {});
    render(
      <SessionCloseSheet
        openWindow={openWin}
        themes={[mkTheme('a'), mkTheme('b')]}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );
    fireEvent.click(screen.getByLabelText(/Ta/));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
      const arg = onConfirm.mock.calls[0][0];
      expect(arg.discussedThemeIds).toEqual(['a']);
    });
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// src/components/therapy/SessionCloseSheet.tsx
'use client';

import { useState } from 'react';
import type { TherapyTheme, TherapyWindow } from '@/types/therapy';
import styles from './therapy.module.css';

export interface SessionCloseInput {
  sessionDate: Date;
  discussedThemeIds: string[];
  transcript: string | null;
}

export interface SessionCloseSheetProps {
  openWindow: TherapyWindow;
  themes: TherapyTheme[];
  onCancel: () => void;
  onConfirm: (input: SessionCloseInput) => Promise<void> | void;
}

function todayIso(): string {
  const d = new Date();
  const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString().slice(0, 10);
  return iso;
}

export function SessionCloseSheet({
  themes, onCancel, onConfirm,
}: SessionCloseSheetProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [date, setDate] = useState<string>(todayIso());
  const [transcript, setTranscript] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const sessionDate = new Date(`${date}T12:00:00`);
      await onConfirm({
        sessionDate,
        discussedThemeIds: Array.from(checked),
        transcript: transcript.trim().length > 0 ? transcript.trim() : null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Close failed');
    } finally {
      setSaving(false);
    }
  };

  const nothingChecked = checked.size === 0;

  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
      <div className={styles.modalBody}>
        <header className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>I had a session</h2>
          <button type="button" onClick={onCancel} className={styles.modalClose} aria-label="Close">✕</button>
        </header>
        <p className={styles.modalHint}>
          Check what you discussed. Unchecked threads carry forward.
        </p>

        <div className={styles.closeControls}>
          <button type="button" onClick={() => setChecked(new Set(themes.map((t) => t.id)))} className={styles.miniBtn}>Select all</button>
          <button type="button" onClick={() => setChecked(new Set())} className={styles.miniBtn}>Select none</button>
        </div>

        <ul className={styles.closeThemeList}>
          {themes.map((t) => (
            <li key={t.id}>
              <label className={styles.closeThemeItem}>
                <input
                  type="checkbox"
                  checked={checked.has(t.id)}
                  onChange={() => toggle(t.id)}
                  aria-label={t.title}
                />
                <span className={styles.closeThemeTitle}>{t.title}</span>
                {t.userState.starred && <span className={styles.closeStarPip}>★</span>}
              </label>
            </li>
          ))}
        </ul>

        <label className={styles.closeField}>
          Session date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <label className={styles.closeField}>
          Notes or transcript (optional)
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste the transcript or your notes… you can always import them later."
            rows={6}
          />
        </label>

        {nothingChecked && (
          <p className={styles.modalHint}>
            Nothing discussed? That&apos;s fine — everything carries forward.
          </p>
        )}
        {error && <div className={styles.modalError}>{error}</div>}

        <div className={styles.modalActions}>
          <button type="button" onClick={onCancel} className={styles.windowActionBtn}>Cancel</button>
          <button type="button" onClick={submit} disabled={saving} className={styles.windowActionPrimary}>
            {saving ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Append styles**

```css
.modalHint { font-size: 13px; color: #6d5a3f; margin: 0; }
.closeControls { display: flex; gap: 8px; }
.miniBtn { background: transparent; border: 1px solid #d9c9a8; border-radius: 4px; padding: 4px 10px; font-size: 12px; color: #3d2f1f; cursor: pointer; }
.closeThemeList { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; max-height: 280px; overflow-y: auto; border-top: 1px solid #e8dcc3; border-bottom: 1px solid #e8dcc3; padding: 10px 0; }
.closeThemeItem { display: flex; align-items: center; gap: 10px; font-size: 14px; cursor: pointer; color: #2a1f14; }
.closeThemeTitle { flex: 1; }
.closeStarPip { color: #c1a36a; }
.closeField { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #6d5a3f; }
.closeField input[type="date"], .closeField textarea { border: 1px solid #d9c9a8; border-radius: 4px; padding: 6px 8px; font-family: inherit; background: #fffdf6; }
```

- [ ] **Step 4: Test + commit**

Run: `npm run test:run -- __tests__/components/therapy/SessionCloseSheet.test.tsx`

```bash
git add src/components/therapy/SessionCloseSheet.tsx src/components/therapy/therapy.module.css __tests__/components/therapy/SessionCloseSheet.test.tsx
git commit -m "feat(therapy): SessionCloseSheet with carry-forward + transcript paste"
```

---

### Task 14: `PastSessionsList` + `ClosedSessionView` + closed-session route

**Files:**
- Modify: `src/components/therapy/PastSessionsList.tsx` (replace stub)
- Create: `src/components/therapy/ClosedSessionView.tsx`
- Create: `src/app/therapy/sessions/[windowId]/page.tsx`
- Modify: `src/components/therapy/therapy.module.css` (append)

- [ ] **Step 1: `PastSessionsList.tsx`**

```tsx
// src/components/therapy/PastSessionsList.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  collection, onSnapshot, orderBy, query, where,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { TherapyWindow } from '@/types/therapy';
import styles from './therapy.module.css';

export function PastSessionsList({ therapistId }: { therapistId: string }) {
  const [windows, setWindows] = useState<TherapyWindow[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(
        collection(firestore, 'therapy_windows'),
        where('therapistId', '==', therapistId),
        where('status', '==', 'closed'),
        orderBy('closedAt', 'desc')
      ),
      (snap) => {
        const out: TherapyWindow[] = [];
        snap.forEach((d) => out.push({ id: d.id, ...(d.data() as Omit<TherapyWindow, 'id'>) }));
        setWindows(out);
      }
    );
    return () => unsub();
  }, [therapistId]);

  if (windows.length === 0) return null;

  return (
    <section className={styles.pastSessions}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={styles.pastToggle}
      >
        Past sessions · {windows.length} {expanded ? '▾' : '▸'}
      </button>
      {expanded && (
        <ul className={styles.pastList}>
          {windows.map((w) => (
            <li key={w.id}>
              <Link href={`/therapy/sessions/${w.id}`} className={styles.pastLink}>
                <span>
                  {w.closedAt
                    ? w.closedAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'}
                </span>
                {(w.noteIds || []).length > 0 && (
                  <span className={styles.pastPip}>has transcript</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 2: `ClosedSessionView.tsx`**

```tsx
// src/components/therapy/ClosedSessionView.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  collection, doc, onSnapshot, query, where,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { TherapyTheme, TherapyNote, TherapyWindow } from '@/types/therapy';
import { usePrivacyLock } from '@/hooks/usePrivacyLock';
import { PinKeypad } from '@/components/privacy/PinKeypad';
import styles from './therapy.module.css';

export function ClosedSessionView({ windowId }: { windowId: string }) {
  const lock = usePrivacyLock();
  const [win, setWin] = useState<TherapyWindow | null>(null);
  const [themes, setThemes] = useState<TherapyTheme[]>([]);
  const [notes, setNotes] = useState<TherapyNote[]>([]);

  useEffect(() => {
    if (!lock.unlocked) return;
    const unsubWin = onSnapshot(doc(firestore, 'therapy_windows', windowId), (d) => {
      if (!d.exists()) return setWin(null);
      setWin({ id: d.id, ...(d.data() as Omit<TherapyWindow, 'id'>) });
    });
    const unsubThemes = onSnapshot(
      query(collection(firestore, 'therapy_themes'), where('windowId', '==', windowId)),
      (snap) => {
        const out: TherapyTheme[] = [];
        snap.forEach((d) => out.push({ id: d.id, ...(d.data() as Omit<TherapyTheme, 'id'>) }));
        setThemes(out);
      }
    );
    const unsubNotes = onSnapshot(
      query(collection(firestore, 'therapy_notes'), where('windowId', '==', windowId)),
      (snap) => {
        const out: TherapyNote[] = [];
        snap.forEach((d) => out.push({ id: d.id, ...(d.data() as Omit<TherapyNote, 'id'>) }));
        setNotes(out);
      }
    );
    return () => { unsubWin(); unsubThemes(); unsubNotes(); };
  }, [windowId, lock.unlocked]);

  if (lock.loading) return <div className={styles.shell}>Loading…</div>;
  if (!lock.unlocked) {
    return (
      <div className={styles.lockGate}>
        <PinKeypad onSubmit={async (pin) => lock.verify(pin)} error={lock.error} />
      </div>
    );
  }
  if (!win) return <div className={styles.shell}>Session not found.</div>;

  const discussed = themes.filter((t) => t.lifecycle.discussedAt);
  const notDiscussed = themes.filter((t) => !t.lifecycle.discussedAt);

  return (
    <div className={styles.shell}>
      <Link href="/therapy" className={styles.backLink}>← Therapy</Link>
      <h1 className={styles.shellTitle}>
        Session · {win.closedAt?.toDate().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
      </h1>

      <section>
        <h2 className={styles.closedSectionHead}>Discussed ({discussed.length})</h2>
        {discussed.map((t) => (
          <article key={t.id} className={styles.themeCard}>
            <h3 className={styles.themeTitle}>{t.title}</h3>
            <p className={styles.themeSummary}>{t.summary}</p>
          </article>
        ))}
        {discussed.length === 0 && <p className={styles.modalHint}>Nothing marked as discussed.</p>}
      </section>

      <section>
        <h2 className={styles.closedSectionHead}>Not discussed (carried forward) ({notDiscussed.length})</h2>
        {notDiscussed.map((t) => (
          <article key={t.id} className={styles.themeCard}>
            <h3 className={styles.themeTitle}>{t.title}</h3>
            <p className={styles.themeSummary}>{t.summary}</p>
          </article>
        ))}
      </section>

      {notes.length > 0 && (
        <section>
          <h2 className={styles.closedSectionHead}>Transcript</h2>
          {notes.map((n) => (
            <pre key={n.id} className={styles.noteBody}>{n.content}</pre>
          ))}
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Route file**

```tsx
// src/app/therapy/sessions/[windowId]/page.tsx
import { ClosedSessionView } from '@/components/therapy/ClosedSessionView';

export default function ClosedSessionPage({
  params,
}: {
  params: Promise<{ windowId: string }>;
}) {
  // Next 16 async params pattern — if the project uses the older
  // synchronous form, match it instead.
  const { windowId } = params instanceof Promise ? (null as any) : params;
  if (!windowId) {
    // Fallback sync branch intentionally unreachable in Next 16.
    return null;
  }
  return <ClosedSessionView windowId={windowId} />;
}
```

If Next 16's async params are in use in this project (look at a sibling page like `src/app/journal/[entryId]/page.tsx`), match that exact pattern — the above is a safety net.

- [ ] **Step 4: Append styles**

```css
.pastSessions { margin-top: 64px; border-top: 1px solid #e8dcc3; padding-top: 24px; }
.pastToggle { background: transparent; border: 0; font-size: 13px; color: #6d5a3f; cursor: pointer; padding: 0; letter-spacing: 0.02em; }
.pastList { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.pastLink { display: flex; justify-content: space-between; padding: 8px 0; color: #3d2f1f; text-decoration: none; font-size: 14px; border-bottom: 1px dotted #e8dcc3; }
.pastPip { font-size: 11px; color: #8a6f4a; text-transform: uppercase; letter-spacing: 0.06em; }
.backLink { font-size: 12px; color: #8a6f4a; text-decoration: none; display: inline-block; margin-bottom: 16px; }
.closedSectionHead { font-family: var(--font-parent-display), Georgia, serif; font-size: 16px; font-weight: 400; color: #2a1f14; letter-spacing: 0.02em; margin: 28px 0 12px; text-transform: uppercase; }
.noteBody { white-space: pre-wrap; font-family: Menlo, Consolas, monospace; font-size: 12px; color: #3d2f1f; background: #fbf5e7; padding: 16px; border-radius: 6px; max-width: 100%; overflow-wrap: break-word; }
```

- [ ] **Step 5: Manual verify + commit**

Visit `/therapy/sessions/<windowId>` after closing one, confirm the discussed/not-discussed split renders and transcripts appear.

```bash
git add src/components/therapy/ src/app/therapy/ src/components/therapy/therapy.module.css
git commit -m "feat(therapy): past sessions list + closed-session view at /therapy/sessions/[id]"
```

---

### Task 15: Surface card + hook

**Files:**
- Create: `src/hooks/useTherapyAggregate.ts`
- Create: `src/components/surface/SurfaceTherapyCard.tsx`
- Modify: `src/components/surface/SurfaceHome.tsx` (mount the card)

The Surface card shows counts ONLY, never theme content. It is hidden while PIN-locked.

- [ ] **Step 1: Implement `useTherapyAggregate.ts`**

```ts
// src/hooks/useTherapyAggregate.ts
'use client';

import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, query, where,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export type TherapyAggregateState =
  | { ready: false }
  | {
      ready: true;
      hasTherapist: boolean;
      openWindowId: string | null;
      themeCount: number;
      starredCarriedTwicePlus: boolean;
      openedAtMillis: number | null;
      typicalCadenceDays: number;
    };

const DEFAULT_CADENCE_DAYS = 7;

export function useTherapyAggregate(): TherapyAggregateState {
  const { user } = useAuth();
  const [state, setState] = useState<TherapyAggregateState>({ ready: false });

  useEffect(() => {
    if (!user?.userId) {
      setState({
        ready: true, hasTherapist: false, openWindowId: null, themeCount: 0,
        starredCarriedTwicePlus: false, openedAtMillis: null,
        typicalCadenceDays: DEFAULT_CADENCE_DAYS,
      });
      return;
    }

    const unsub = onSnapshot(
      query(collection(firestore, 'therapists'), where('ownerUserId', '==', user.userId)),
      (snap) => {
        if (snap.docs.length === 0) {
          setState({
            ready: true, hasTherapist: false, openWindowId: null, themeCount: 0,
            starredCarriedTwicePlus: false, openedAtMillis: null,
            typicalCadenceDays: DEFAULT_CADENCE_DAYS,
          });
        } else {
          const therapistId = snap.docs[0].id;
          setState((s) => s.ready && s.hasTherapist
            ? s
            : { ready: true, hasTherapist: true, openWindowId: null, themeCount: 0,
                starredCarriedTwicePlus: false, openedAtMillis: null,
                typicalCadenceDays: DEFAULT_CADENCE_DAYS }
          );
          subscribeToWindow(therapistId, setState);
        }
      }
    );
    return () => unsub();
  }, [user?.userId]);

  return state;
}

function subscribeToWindow(
  therapistId: string,
  setState: React.Dispatch<React.SetStateAction<TherapyAggregateState>>
) {
  const winUnsub = onSnapshot(
    query(
      collection(firestore, 'therapy_windows'),
      where('therapistId', '==', therapistId),
      where('status', '==', 'open')
    ),
    (snap) => {
      if (snap.docs.length === 0) {
        setState({
          ready: true, hasTherapist: true, openWindowId: null, themeCount: 0,
          starredCarriedTwicePlus: false, openedAtMillis: null,
          typicalCadenceDays: DEFAULT_CADENCE_DAYS,
        });
        return;
      }
      const w = snap.docs[0];
      const data = w.data();
      const openedAtMillis = data.openedAt?.toMillis?.() ?? null;
      const windowId = w.id;

      // Subscribe to themes for counts + starred-carried signal
      onSnapshot(
        query(collection(firestore, 'therapy_themes'), where('windowId', '==', windowId)),
        (themeSnap) => {
          let themeCount = 0;
          let starredCarriedTwicePlus = false;
          themeSnap.forEach((d) => {
            const t = d.data();
            if (!t.userState?.dismissed) themeCount++;
            if (t.userState?.starred && (t.lifecycle?.carriedForwardCount ?? 0) >= 2) {
              starredCarriedTwicePlus = true;
            }
          });
          setState({
            ready: true, hasTherapist: true, openWindowId: windowId,
            themeCount, starredCarriedTwicePlus,
            openedAtMillis,
            typicalCadenceDays: DEFAULT_CADENCE_DAYS,
          });
        }
      );
    }
  );
  return winUnsub;
}
```

Note: the `typicalCadenceDays` learning loop (median of last ~4 closed-window durations) is deferred — the default 7 is sufficient for v1.

- [ ] **Step 2: Implement `SurfaceTherapyCard.tsx`**

```tsx
// src/components/surface/SurfaceTherapyCard.tsx
'use client';

import Link from 'next/link';
import { usePrivacyLock } from '@/hooks/usePrivacyLock';
import { useTherapyAggregate } from '@/hooks/useTherapyAggregate';

export function SurfaceTherapyCard() {
  const lock = usePrivacyLock();
  const agg = useTherapyAggregate();

  if (!agg.ready) return null;
  // Hard rule: PIN-locked ⇒ render nothing. No content, not even a label.
  if (lock.pinIsSet && !lock.unlocked) return null;

  if (!agg.hasTherapist) {
    return (
      <Link
        href="/therapy"
        style={{ display: 'block', padding: 16, border: '1px solid #e8dcc3', borderRadius: 8, color: '#3d2f1f', textDecoration: 'none', fontSize: 14 }}
      >
        Therapy · set up your therapy book
      </Link>
    );
  }

  const openedAge = agg.openedAtMillis
    ? Math.floor((Date.now() - agg.openedAtMillis) / (24 * 60 * 60 * 1000))
    : 0;
  const pastCadence = openedAge > agg.typicalCadenceDays;

  let copy: string;
  if (agg.themeCount === 0) {
    copy = 'Therapy prep — ready to start building.';
  } else if (agg.starredCarriedTwicePlus) {
    copy = `A few threads keep carrying forward · ${agg.themeCount} themes.`;
  } else if (pastCadence) {
    copy = `Your next session is probably coming up · ${agg.themeCount} themes.`;
  } else {
    copy = `Therapy prep · ${agg.themeCount} themes.`;
  }

  return (
    <Link
      href="/therapy"
      style={{
        display: 'block', padding: 16,
        border: pastCadence || agg.starredCarriedTwicePlus ? '1px solid #c1a36a' : '1px solid #e8dcc3',
        borderRadius: 8, color: '#3d2f1f', textDecoration: 'none', fontSize: 14,
      }}
    >
      {copy}
    </Link>
  );
}
```

- [ ] **Step 3: Mount in `SurfaceHome.tsx`**

Read `src/components/surface/SurfaceHome.tsx` and find where dock/cards are composed (look for `<RecentCaptures>`, `<CalmStateCard>`, etc.). Add `<SurfaceTherapyCard />` in a sensible position (recommended: near the bottom, under existing cards; with `starredCarriedTwicePlus`/pastCadence state it naturally draws the eye via its thicker border).

```tsx
import { SurfaceTherapyCard } from './SurfaceTherapyCard';
// ... somewhere in the JSX:
<SurfaceTherapyCard />
```

- [ ] **Step 4: Manual verify**

- PIN-locked: no therapy card visible on `/`.
- After PIN unlocks: card appears with count-only copy.
- Confirm no theme titles ever appear on `/`.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTherapyAggregate.ts src/components/surface/
git commit -m "feat(therapy): Surface card with PIN-aware counts-only promotion"
```

---

### Task 16: Nav — third book link in `SpreadHome`

**Files:**
- Modify: `src/components/spread-home/SpreadHome.tsx`

The existing top bar has the Relish wordmark (links to `/journal`) on the left and a "The Family Manual →" link on the right. Add a third cross-nav link for Therapy.

- [ ] **Step 1: Read the current header**

Open `src/components/spread-home/SpreadHome.tsx`, find the `.journal-top-right` block (~line 127).

- [ ] **Step 2: Add the link**

Replace:

```tsx
<div className="journal-top-right">
  <a href="/manual" className="cross-nav" aria-label="Open The Family Manual">
    The Family Manual →
  </a>
</div>
```

with:

```tsx
<div className="journal-top-right">
  <a href="/therapy" className="cross-nav" aria-label="Open Therapy">
    Therapy →
  </a>
  <a href="/manual" className="cross-nav" aria-label="Open The Family Manual">
    The Family Manual →
  </a>
</div>
```

And within the `<style jsx>` block further down, ensure `.journal-top-right` uses `gap` so the two links space out; if the existing style doesn't already: add `gap: 20px;` to the `.journal-top-right` rule.

- [ ] **Step 3: Add matching cross-nav on `/manual` and `/therapy`**

The Journal → Manual → Therapy triangle: each book's top bar should list the other two. Find equivalent top bars for `/manual` (search the code for `cross-nav`) and add the Therapy link. For `/therapy`, the top bar gets added as part of the `TherapyBookShell` if not already present — reusing the same `.journal-top-bar` class for visual continuity.

For `TherapyBookShell.tsx`, wrap its return inside:

```tsx
<>
  <header className="journal-top-bar">
    <a href="/journal" className="journal-wordmark">Relish</a>
    <div className="journal-top-right">
      <a href="/journal" className="cross-nav">Journal →</a>
      <a href="/manual" className="cross-nav">The Family Manual →</a>
    </div>
  </header>
  {/* existing content */}
</>
```

(Styles are global, so no additional CSS is needed — they're declared in `SpreadHome.tsx`'s `<style jsx global>` where they already live in the repo; verify by searching for `.journal-top-bar` definitions.)

- [ ] **Step 4: Manual verify**

Navigate between `/`, `/journal`, `/manual`, `/therapy`. Each top bar should offer links to the other two.

- [ ] **Step 5: Commit**

```bash
git add src/components/spread-home/SpreadHome.tsx src/components/therapy/TherapyBookShell.tsx
# plus any manual-side file edited for cross-nav
git commit -m "feat(therapy): third-book nav link across Journal/Manual/Therapy"
```

---

### Task 17: Deploy rules + indexes; smoke the full flow

**Files:** none (deploy + manual verification)

- [ ] **Step 1: Deploy Firestore rules and indexes**

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

Wait for indexes to build (can take minutes). The Firebase console shows build progress.

- [ ] **Step 2: Deploy Cloud Functions**

```bash
firebase deploy --only functions:regenerateTherapyWindow,functions:closeTherapyWindow,functions:autoRegenerateTherapyWindows
```

- [ ] **Step 3: Full-flow smoke**

1. Ensure a journal entry exists within the last 7 days.
2. Visit `/therapy` — set up therapist named "Dr. Test".
3. Verify the first window is created with `themeIds: []`.
4. Tap Refresh — the `regenerateTherapyWindow` callable fires, and within seconds themes appear.
5. Star a theme; reload — star persists.
6. Dismiss a theme; it disappears (reveal via "Show N dismissed").
7. Add a note on a theme; reload — note persists.
8. Tap Import notes → paste a short transcript → Save → check Firestore `therapy_notes` for the doc.
9. Tap I had a session → check one theme → paste a transcript → Confirm.
10. Verify: old window is `status: 'closed'`, new window is `status: 'open'` with the unchecked theme's id in `themeIds`, old theme has `lifecycle.discussedAt`, carried-forward theme has `lifecycle.carriedForwardCount: 1`.
11. Regen fires automatically on the new window; once complete, the workspace should show fresh themes including the carried-forward one (with its `carried · 1` pip).
12. Visit `/therapy/sessions/<closed-window-id>` — discussed/not-discussed sections and transcript render.
13. Visit `/` — PIN-lock the view (wait for 3 min inactivity or force-lock in dev tools) — Surface therapy card disappears entirely.

- [ ] **Step 4: Fix any issues found**

For each bug, create one commit per fix.

- [ ] **Step 5: Final commit + push**

```bash
git push -u origin therapy-prep
```

Create a PR when ready.

---

## Self-Review

**Coverage check against spec:**

| Spec requirement | Task |
|---|---|
| Four collections + types | Task 1 |
| Security rules + immutable fields | Task 2 |
| Indexes | Task 3 |
| `regenerateTherapyWindow` callable + cron | Task 4 |
| `closeTherapyWindow` callable | Task 5 |
| `useTherapist` + `useTherapyWindow` | Task 6 |
| `useTherapyActions` (star/dismiss/note/refresh/close/import) | Task 7 |
| PIN gate + therapist setup | Task 8 |
| Theme card UX | Task 9 |
| Theme ordering + carry banner | Task 10 |
| Window header | Task 11 |
| Import notes modal | Task 12 |
| Session close sheet with carry-forward | Task 13 |
| Past sessions + closed session page | Task 14 |
| Surface card (counts-only, PIN-aware) | Task 15 |
| Third book nav link | Task 16 |
| Rules/indexes/functions deploy + smoke | Task 17 |

**Placeholder scan:** No TBDs, no "implement later." `typicalCadenceDays` learning loop is explicitly deferred with a named constant default (7 days) — this is a scoped deferral, not a placeholder.

**Consistency check:**
- Types `TherapyTheme`, `TherapyWindow`, `TherapySourceRef` are used consistently across tasks.
- Hook method names (`toggleStar`, `toggleDismiss`, `setNote`, `importNote`, `refresh`, `closeSession`) match between definition (Task 7) and consumption (Task 11).
- Cloud Function names (`regenerateTherapyWindow`, `closeTherapyWindow`, `autoRegenerateTherapyWindows`) match between definition (Tasks 4–5) and deploy (Task 17).
- `module.exports.__therapyInternals` pattern consistent between Tasks 4 and 5 (Task 5 appends to the existing object).

**Ambiguity check:**
- "Match Next 16 async params pattern" in Task 14 says to follow sibling route files — that's the one place the plan defers to existing code style rather than picking one form. Acceptable; the sibling is authoritative.
- `PinKeypad`/`PinSetupModal` exact prop shapes are left to the engineer to adapt to (Task 8 step 6 notes this) — we don't have the component source in front of us; the engineer should read the file and adjust. This is explicitly flagged, not silent.

**Scope check:** Single feature, single book. No cross-cutting refactors. Couples/family therapy is out of scope and the data model is shaped to accept it later without migration (Task 1 `kind` field).
