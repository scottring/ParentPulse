/**
 * Firestore Security Rules Tests — obstacles + moves subcollection
 *
 * Obstacle/clarity loop feature. Verifies that obstacles are readable/writable
 * according to visibility rules (private by default, can be shared-with), and that
 * the append-only `obstacles/{obstacleId}/moves` subcollection respects read access
 * and cannot be updated or deleted.
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
