/**
 * Firestore Rules Tests — rituals collection.
 *
 * Covers:
 *  - create: only in-family callers who list themselves as a
 *    participant and set createdByUserId to themselves
 *  - read/update/delete: any participant in the same family
 *  - solo cadence: participant count 1 is allowed (unlike couple_rituals
 *    which required exactly 2)
 *
 * Run with: npm run test:rules
 */

import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import {
  doc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  getDoc,
  collection,
  Timestamp,
} from 'firebase/firestore';

const emulatorAvailable = !!process.env.FIRESTORE_EMULATOR_HOST;

let env: RulesTestEnvironment | undefined;

beforeAll(async () => {
  if (!emulatorAvailable) return;

  const rules = readFileSync('firestore.rules', 'utf8');
  const [host, portStr] = (process.env.FIRESTORE_EMULATOR_HOST || '').split(':');
  const port = parseInt(portStr || '8080', 10);

  env = await initializeTestEnvironment({
    projectId: 'rituals-rules-test',
    firestore: {
      rules,
      host: host || 'localhost',
      port,
    },
  });
});

afterAll(async () => {
  if (env) await env.cleanup();
});

beforeEach(async () => {
  if (!emulatorAvailable || !env) return;
  await env.clearFirestore();
});

async function seedUser(uid: string, familyId: string, role = 'parent') {
  await env!.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), {
      userId: uid,
      familyId,
      role,
    });
  });
}

async function seedRitual(ritualId: string, data: Record<string, unknown>) {
  await env!.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'rituals', ritualId), data);
  });
}

const FAM_A = 'fam-a';
const FAM_B = 'fam-b';
const IRIS = 'iris-uid';
const SCOTT = 'scott-uid';
const STRANGER = 'stranger-uid';

function ritualSeed(overrides: Record<string, unknown> = {}) {
  return {
    familyId: FAM_A,
    kind: 'solo_weekly',
    cadence: 'weekly',
    participantUserIds: [IRIS],
    createdByUserId: IRIS,
    dayOfWeek: 5,
    startTimeLocal: '19:00',
    durationMinutes: 20,
    timezone: 'America/New_York',
    startsOn: Timestamp.now(),
    status: 'active',
    nextRunAt: Timestamp.now(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

describe.skipIf(!emulatorAvailable)('rituals — create gate', () => {
  beforeEach(async () => {
    if (!emulatorAvailable || !env) return;
    await seedUser(IRIS, FAM_A);
    await seedUser(SCOTT, FAM_A);
    await seedUser(STRANGER, FAM_B);
  });

  it('Iris (in fam) can create a solo ritual with herself', async () => {
    const db = env!.authenticatedContext(IRIS).firestore();
    await assertSucceeds(addDoc(collection(db, 'rituals'), ritualSeed()));
  });

  it('Iris can create a partner ritual with both participants', async () => {
    const db = env!.authenticatedContext(IRIS).firestore();
    await assertSucceeds(addDoc(collection(db, 'rituals'), ritualSeed({
      kind: 'partner_biweekly',
      cadence: 'biweekly',
      participantUserIds: [IRIS, SCOTT],
    })));
  });

  it('Stranger (different family) cannot create a ritual in Fam A', async () => {
    const db = env!.authenticatedContext(STRANGER).firestore();
    await assertFails(addDoc(collection(db, 'rituals'), ritualSeed()));
  });

  it('cannot create a ritual excluding yourself from participants', async () => {
    const db = env!.authenticatedContext(IRIS).firestore();
    await assertFails(addDoc(collection(db, 'rituals'), ritualSeed({
      participantUserIds: [SCOTT],
    })));
  });

  it('cannot set createdByUserId to someone else', async () => {
    const db = env!.authenticatedContext(IRIS).firestore();
    await assertFails(addDoc(collection(db, 'rituals'), ritualSeed({
      createdByUserId: SCOTT,
    })));
  });
});

describe.skipIf(!emulatorAvailable)('rituals — read / update / delete', () => {
  beforeEach(async () => {
    if (!emulatorAvailable || !env) return;
    await seedUser(IRIS, FAM_A);
    await seedUser(SCOTT, FAM_A);
    await seedUser(STRANGER, FAM_B);
    await seedRitual('r1', ritualSeed({
      kind: 'partner_biweekly',
      participantUserIds: [IRIS, SCOTT],
    }));
  });

  it('Iris (participant) can read', async () => {
    const db = env!.authenticatedContext(IRIS).firestore();
    await assertSucceeds(getDoc(doc(db, 'rituals', 'r1')));
  });

  it('Scott (participant) can read', async () => {
    const db = env!.authenticatedContext(SCOTT).firestore();
    await assertSucceeds(getDoc(doc(db, 'rituals', 'r1')));
  });

  it('Stranger (different family) cannot read', async () => {
    const db = env!.authenticatedContext(STRANGER).firestore();
    await assertFails(getDoc(doc(db, 'rituals', 'r1')));
  });

  it('Scott (participant) can update lastRunAt', async () => {
    const db = env!.authenticatedContext(SCOTT).firestore();
    await assertSucceeds(updateDoc(doc(db, 'rituals', 'r1'), {
      lastRunAt: Timestamp.now(),
      nextRunAt: Timestamp.now(),
    }));
  });

  it('Iris (participant) can delete', async () => {
    const db = env!.authenticatedContext(IRIS).firestore();
    await assertSucceeds(deleteDoc(doc(db, 'rituals', 'r1')));
  });

  it('Stranger (different family) cannot delete', async () => {
    const db = env!.authenticatedContext(STRANGER).firestore();
    await assertFails(deleteDoc(doc(db, 'rituals', 'r1')));
  });
});
