/**
 * Firestore Security Rules Tests — dyads.currentFocus + focuses subcollection
 *
 * Weekly Focus feature. Verifies the dyad's currentFocus is writable by
 * a parent in the family (existing dyad rule) and that the append-only
 * `dyads/{dyadKey}/focuses` history subcollection is family-scoped and
 * cannot be updated or deleted.
 *
 * Run with: npm run test:rules (requires Firebase emulator)
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
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
} from 'firebase/firestore';
import { readFileSync, existsSync } from 'fs';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';

const PROJECT_ID = 'weekly-focus-rules-test';
const FAMILY_ID = 'test-family';
const OTHER_FAMILY_ID = 'other-family';

let testEnv: RulesTestEnvironment | undefined;

const emulatorAvailable = !!process.env.FIRESTORE_EMULATOR_HOST;

const getAuthContext = (uid: string) => testEnv!.authenticatedContext(uid);
const getUnauthContext = () => testEnv!.unauthenticatedContext();

const PARENT_UID = 'parent-uid';
const OTHER_PARENT_UID = 'other-parent';
const DYAD_KEY = 'iris__scott';

beforeAll(async () => {
  if (!emulatorAvailable) return;
  if (!existsSync('firestore.rules')) {
    throw new Error('firestore.rules not found — cannot run rules tests');
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
    await setDoc(doc(db, 'users', PARENT_UID), {
      role: 'parent',
      familyId: FAMILY_ID,
    });
    await setDoc(doc(db, 'users', OTHER_PARENT_UID), {
      role: 'parent',
      familyId: OTHER_FAMILY_ID,
    });
    // Seed the dyad doc the focus history hangs off of.
    await setDoc(doc(db, 'dyads', DYAD_KEY), {
      dyadKey: DYAD_KEY,
      familyId: FAMILY_ID,
      participantIds: ['iris', 'scott'],
    });
  });
});

describe.skipIf(!emulatorAvailable)('weekly focus rules', () => {
  it('parent in family can write currentFocus onto the dyad', async () => {
    const db = getAuthContext(PARENT_UID).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'dyads', DYAD_KEY), {
        currentFocus: {
          text: 'Trade the Tuesday handoff.',
          source: 'ai',
          ritualSessionId: 's1',
          status: 'active',
        },
      }),
    );
  });

  it('parent in family can append a focuses history doc', async () => {
    const db = getAuthContext(PARENT_UID).firestore();
    await assertSucceeds(
      addDoc(collection(db, 'dyads', DYAD_KEY, 'focuses'), {
        text: 'Trade the Tuesday handoff.',
        source: 'ai',
        ritualSessionId: 's1',
        familyId: FAMILY_ID,
        status: 'active',
      }),
    );
  });

  it('a parent from another family cannot read a focuses doc', async () => {
    let focusId = '';
    await testEnv!.withSecurityRulesDisabled(async (context) => {
      const ref = await addDoc(
        collection(context.firestore(), 'dyads', DYAD_KEY, 'focuses'),
        {
          text: 'x',
          familyId: FAMILY_ID,
          status: 'active',
        },
      );
      focusId = ref.id;
    });
    const db = getAuthContext(OTHER_PARENT_UID).firestore();
    await assertFails(
      getDoc(doc(db, 'dyads', DYAD_KEY, 'focuses', focusId)),
    );
  });

  it('unauthenticated context cannot append a focuses doc', async () => {
    const db = getUnauthContext().firestore();
    await assertFails(
      addDoc(collection(db, 'dyads', DYAD_KEY, 'focuses'), {
        text: 'x',
        familyId: FAMILY_ID,
        status: 'active',
      }),
    );
  });

  it('focuses docs cannot be updated or deleted (append-only)', async () => {
    let focusId = '';
    await testEnv!.withSecurityRulesDisabled(async (context) => {
      const ref = await addDoc(
        collection(context.firestore(), 'dyads', DYAD_KEY, 'focuses'),
        { text: 'x', familyId: FAMILY_ID, status: 'active' },
      );
      focusId = ref.id;
    });
    const db = getAuthContext(PARENT_UID).firestore();
    await assertFails(
      updateDoc(doc(db, 'dyads', DYAD_KEY, 'focuses', focusId), {
        text: 'tampered',
      }),
    );
    await assertFails(
      deleteDoc(doc(db, 'dyads', DYAD_KEY, 'focuses', focusId)),
    );
  });
});
