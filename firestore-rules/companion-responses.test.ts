/**
 * Firestore Rules Tests — companion entry responses
 *
 * Tests that:
 *  1. A user who can read the parent entry can create a response entry.
 *  2. A user who cannot read the parent entry cannot create a response.
 *  3. respondsToEntryId is immutable after create.
 *  4. Stand-alone entries (no respondsToEntryId) still work.
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
import { doc, setDoc, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore';

const emulatorAvailable = !!process.env.FIRESTORE_EMULATOR_HOST;

let env: RulesTestEnvironment | undefined;

beforeAll(async () => {
  if (!emulatorAvailable) return;

  const rules = readFileSync('firestore.rules', 'utf8');
  const [host, portStr] = (process.env.FIRESTORE_EMULATOR_HOST || '').split(':');
  const port = parseInt(portStr || '8080', 10);

  env = await initializeTestEnvironment({
    projectId: 'relish-rules-test',
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

async function seedEntry(entryId: string, data: Record<string, unknown>) {
  await env!.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'journal_entries', entryId), data);
  });
}

describe.skipIf(!emulatorAvailable)('journal_entries — respondsToEntryId', () => {
  const FAM = 'fam-1';
  const IRIS = 'iris-uid';
  const SCOTT = 'scott-uid';
  const STRANGER = 'stranger-uid';

  beforeEach(async () => {
    if (!emulatorAvailable || !env) return;

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
    const db = env!.authenticatedContext(SCOTT).firestore();
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
    const db = env!.authenticatedContext(STRANGER).firestore();
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
    const db = env!.authenticatedContext(SCOTT).firestore();
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
    const db = env!.authenticatedContext(SCOTT).firestore();
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
