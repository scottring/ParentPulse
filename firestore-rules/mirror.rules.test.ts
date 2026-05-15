/**
 * Firestore Security Rules Tests — dyads + mirror_entries
 *
 * Dyadic mirror feature (Task 6). Verifies the family-scoped,
 * append-only rules for the `dyads` and `mirror_entries` collections
 * written by src/hooks/useMirror.ts.
 *
 * Run with: npm run test:rules (requires Firebase emulator)
 *
 * NOTE: These tests require the Firebase emulator to be running.
 * Start the emulator with: firebase emulators:start --only firestore
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
} from 'firebase/firestore';
import { readFileSync, existsSync } from 'fs';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';

// Unique per-file projectId so the emulator namespaces this file's
// data separately — otherwise this file's clearFirestore()/seed in
// beforeEach collides with rules.test.ts (which also uses the
// emulator) when vitest runs the suite across multiple files.
const PROJECT_ID = 'mirror-rules-test';
const FAMILY_ID = 'test-family';
const OTHER_FAMILY_ID = 'other-family';

let testEnv: RulesTestEnvironment | undefined;

// `describe.skipIf` evaluates its argument when the describe block is
// registered, which is *before* any beforeAll runs. So we can't flip
// a flag from inside beforeAll and expect the describe to pick it up —
// we need a condition we can read synchronously at module load time.
//
// `firebase emulators:exec` sets FIRESTORE_EMULATOR_HOST on the child
// process that runs the tests, so we use that as the availability
// signal. When running `npm run test:run` standalone (no emulator),
// the env var is unset and the whole describe block is skipped.
const emulatorAvailable = !!process.env.FIRESTORE_EMULATOR_HOST;

// Helper to create authenticated context
const getAuthContext = (uid: string) => testEnv!.authenticatedContext(uid);
const getUnauthContext = () => testEnv!.unauthenticatedContext();

const PARENT_UID = 'parent-uid';
const OTHER_PARENT_UID = 'other-parent';

beforeAll(async () => {
  if (!emulatorAvailable) return;

  // Check if firestore.rules exists
  if (!existsSync('firestore.rules')) {
    throw new Error('firestore.rules not found — cannot run rules tests');
  }

  const rules = readFileSync('firestore.rules', 'utf8');

  // FIRESTORE_EMULATOR_HOST is "host:port" — split it so we can feed
  // the rules-unit-testing SDK the exact connection info the emulator
  // process is listening on.
  const [host, portStr] = (process.env.FIRESTORE_EMULATOR_HOST || '').split(':');
  const port = parseInt(portStr || '8080', 10);

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: host || 'localhost',
      port,
    },
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  if (!emulatorAvailable || !testEnv) return;

  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    // Parent in the test family.
    await setDoc(doc(db, 'users', PARENT_UID), {
      role: 'parent',
      familyId: FAMILY_ID,
    });

    // Parent in a different family — used for cross-family denial.
    await setDoc(doc(db, 'users', OTHER_PARENT_UID), {
      role: 'parent',
      familyId: OTHER_FAMILY_ID,
    });
  });
});

describe.skipIf(!emulatorAvailable)('dyads + mirror_entries rules', () => {
  it('parent in family can create and read a dyad', async () => {
    const db = getAuthContext(PARENT_UID).firestore();

    await assertSucceeds(
      setDoc(doc(db, 'dyads', 'kaleb__scott'), {
        dyadKey: 'kaleb__scott',
        familyId: FAMILY_ID,
        participantIds: ['kaleb', 'scott'],
      })
    );

    await assertSucceeds(getDoc(doc(db, 'dyads', 'kaleb__scott')));
  });

  it('a parent from another family cannot read a dyad', async () => {
    await testEnv!.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'dyads', 'kaleb__scott'), {
        dyadKey: 'kaleb__scott',
        familyId: FAMILY_ID,
        participantIds: ['kaleb', 'scott'],
      });
    });

    const db = getAuthContext(OTHER_PARENT_UID).firestore();
    await assertFails(getDoc(doc(db, 'dyads', 'kaleb__scott')));
  });

  it('parent in family can add a mirror_entries doc', async () => {
    const db = getAuthContext(PARENT_UID).firestore();
    await assertSucceeds(
      addDoc(collection(db, 'mirror_entries'), {
        dyadKey: 'kaleb__scott',
        familyId: FAMILY_ID,
        stewardUserId: PARENT_UID,
        prompt: 'p',
        answers: [],
        mirrorLine: 'x',
      })
    );
  });

  it('unauthenticated context cannot add a mirror_entries doc', async () => {
    const db = getUnauthContext().firestore();
    await assertFails(
      addDoc(collection(db, 'mirror_entries'), {
        dyadKey: 'kaleb__scott',
        familyId: FAMILY_ID,
        stewardUserId: PARENT_UID,
        prompt: 'p',
        answers: [],
        mirrorLine: 'x',
      })
    );
  });
});
