/**
 * Firestore Rules Tests — moments collection + journal_entries.momentId gate.
 *
 * Covers:
 *  - moments create: family gate, createdByUserId must equal caller.
 *  - moments read: any parent in the same family.
 *  - moments update: metadata fields editable; synthesis cache and
 *    counters are admin-SDK-only.
 *  - moments delete: creator only.
 *  - journal_entries.momentId: must reference a same-family moment;
 *    immutable after create.
 *
 * Run with: npm run test:rules
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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
    projectId: 'moments-rules-test',
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

async function seedUser(uid: string, familyId: string) {
  await env!.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), {
      userId: uid,
      familyId,
      role: 'parent',
    });
  });
}

async function seedMoment(momentId: string, data: Record<string, unknown>) {
  await env!.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'moments', momentId), data);
  });
}

const FAM_A = 'fam-a';
const FAM_B = 'fam-b';
const IRIS = 'iris-uid';     // Fam A, creator
const SCOTT = 'scott-uid';   // Fam A, in-family non-creator
const STRANGER = 'stranger-uid'; // Fam B

function momentSeed(overrides: Record<string, unknown> = {}) {
  return {
    familyId: FAM_A,
    createdByUserId: IRIS,
    title: null,
    dimensions: [],
    tags: [],
    participantUserIds: [IRIS],
    viewCount: 1,
    createdAt: Timestamp.now(),
    ...overrides,
  };
}

describe.skipIf(!emulatorAvailable)('moments — create / read / delete', () => {
  beforeEach(async () => {
    if (!emulatorAvailable || !env) return;
    await seedUser(IRIS, FAM_A);
    await seedUser(SCOTT, FAM_A);
    await seedUser(STRANGER, FAM_B);
  });

  it('Iris (in family) can create a moment with herself as creator', async () => {
    const db = env!.authenticatedContext(IRIS).firestore();
    await assertSucceeds(
      addDoc(collection(db, 'moments'), momentSeed()),
    );
  });

  it('Iris cannot create a moment with Scott as creator', async () => {
    const db = env!.authenticatedContext(IRIS).firestore();
    await assertFails(
      addDoc(collection(db, 'moments'), momentSeed({ createdByUserId: SCOTT })),
    );
  });

  it('Stranger (different family) cannot create a moment in Fam A', async () => {
    const db = env!.authenticatedContext(STRANGER).firestore();
    await assertFails(
      addDoc(collection(db, 'moments'), momentSeed()),
    );
  });

  it('Scott (in family, non-creator) can read a moment created by Iris', async () => {
    await seedMoment('m1', momentSeed());
    const db = env!.authenticatedContext(SCOTT).firestore();
    await assertSucceeds(getDoc(doc(db, 'moments', 'm1')));
  });

  it('Stranger (different family) cannot read a Fam A moment', async () => {
    await seedMoment('m1', momentSeed());
    const db = env!.authenticatedContext(STRANGER).firestore();
    await assertFails(getDoc(doc(db, 'moments', 'm1')));
  });

  it('Iris (creator) can delete a moment she created', async () => {
    await seedMoment('m1', momentSeed());
    const db = env!.authenticatedContext(IRIS).firestore();
    await assertSucceeds(deleteDoc(doc(db, 'moments', 'm1')));
  });

  it('Scott (non-creator, in family) cannot delete Iris\'s moment', async () => {
    await seedMoment('m1', momentSeed());
    const db = env!.authenticatedContext(SCOTT).firestore();
    await assertFails(deleteDoc(doc(db, 'moments', 'm1')));
  });
});

describe.skipIf(!emulatorAvailable)('moments — update gating', () => {
  beforeEach(async () => {
    if (!emulatorAvailable || !env) return;
    await seedUser(IRIS, FAM_A);
    await seedUser(SCOTT, FAM_A);
    await seedMoment('m1', momentSeed());
  });

  it('can edit title, dimensions, tags', async () => {
    const db = env!.authenticatedContext(IRIS).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'moments', 'm1'), {
        title: 'Bedtime standoff',
        dimensions: ['discipline_approach'],
        tags: ['bedtime'],
      }),
    );
  });

  it('cannot write synthesis cache from client', async () => {
    const db = env!.authenticatedContext(IRIS).firestore();
    await assertFails(
      updateDoc(doc(db, 'moments', 'm1'), {
        synthesis: { agreementLine: 'x', divergenceLine: null, emergentLine: null, model: 'fake', generatedAt: Timestamp.now() },
      }),
    );
  });

  it('cannot write viewCount from client', async () => {
    const db = env!.authenticatedContext(IRIS).firestore();
    await assertFails(
      updateDoc(doc(db, 'moments', 'm1'), { viewCount: 99 }),
    );
  });

  it('cannot write participantUserIds from client', async () => {
    const db = env!.authenticatedContext(IRIS).firestore();
    await assertFails(
      updateDoc(doc(db, 'moments', 'm1'), { participantUserIds: [IRIS, SCOTT] }),
    );
  });

  it('cannot write familyId from client', async () => {
    const db = env!.authenticatedContext(IRIS).firestore();
    await assertFails(
      updateDoc(doc(db, 'moments', 'm1'), { familyId: FAM_B }),
    );
  });
});

describe.skipIf(!emulatorAvailable)('journal_entries.momentId foreign key', () => {
  beforeEach(async () => {
    if (!emulatorAvailable || !env) return;
    await seedUser(IRIS, FAM_A);
    await seedUser(SCOTT, FAM_A);
    await seedUser(STRANGER, FAM_B);
    await seedMoment('m-fam-a', momentSeed());
    await seedMoment('m-fam-b', momentSeed({ familyId: FAM_B, createdByUserId: STRANGER, participantUserIds: [STRANGER] }));
  });

  function entrySeed(authorId: string, familyId: string, momentId?: string) {
    const data: Record<string, unknown> = {
      familyId,
      authorId,
      text: 'a view',
      category: 'moment',
      visibleToUserIds: [authorId],
      sharedWithUserIds: [],
      personMentions: [],
      tags: [],
      createdAt: Timestamp.now(),
    };
    if (momentId) data.momentId = momentId;
    return data;
  }

  it('entry with momentId pointing at same-family moment: allowed', async () => {
    const db = env!.authenticatedContext(IRIS).firestore();
    await assertSucceeds(
      addDoc(collection(db, 'journal_entries'), entrySeed(IRIS, FAM_A, 'm-fam-a')),
    );
  });

  it('entry with momentId pointing at different-family moment: denied', async () => {
    const db = env!.authenticatedContext(IRIS).firestore();
    await assertFails(
      addDoc(collection(db, 'journal_entries'), entrySeed(IRIS, FAM_A, 'm-fam-b')),
    );
  });

  it('entry with momentId pointing at non-existent moment: denied', async () => {
    const db = env!.authenticatedContext(IRIS).firestore();
    await assertFails(
      addDoc(collection(db, 'journal_entries'), entrySeed(IRIS, FAM_A, 'no-such-moment')),
    );
  });

  it('entry with no momentId: allowed (stand-alone unchanged)', async () => {
    const db = env!.authenticatedContext(IRIS).firestore();
    await assertSucceeds(
      addDoc(collection(db, 'journal_entries'), entrySeed(IRIS, FAM_A)),
    );
  });

  it('cannot change momentId after create', async () => {
    const db = env!.authenticatedContext(IRIS).firestore();
    const ref = await addDoc(
      collection(db, 'journal_entries'),
      entrySeed(IRIS, FAM_A, 'm-fam-a'),
    );
    // Seed a second same-family moment to move to.
    await seedMoment('m-fam-a-2', momentSeed());
    await assertFails(updateDoc(ref, { momentId: 'm-fam-a-2' }));
  });

  it('cannot add momentId to an existing stand-alone entry', async () => {
    const db = env!.authenticatedContext(IRIS).firestore();
    const ref = await addDoc(
      collection(db, 'journal_entries'),
      entrySeed(IRIS, FAM_A),
    );
    await assertFails(updateDoc(ref, { momentId: 'm-fam-a' }));
  });
});
