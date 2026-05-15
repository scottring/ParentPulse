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

import { runMirror } from '../useMirror';

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
    expect(docMock).toHaveBeenCalledWith({}, 'dyads', 'kaleb__scott');
    expect(setDocMock).toHaveBeenCalledTimes(1);
    const setArgs = setDocMock.mock.calls[0];
    expect(setArgs[2]).toEqual({ merge: true });
    expect(setArgs[1]).toMatchObject({
      dyadKey: 'kaleb__scott',
      familyId: 'fam1',
      participantIds: ['kaleb', 'scott'],
    });
    expect(collectionMock).toHaveBeenCalledWith({}, 'mirror_entries');
    expect(addDocMock).toHaveBeenCalledTimes(1);
    expect(addDocMock.mock.calls[0][1]).toMatchObject({
      dyadKey: 'kaleb__scott',
      familyId: 'fam1',
      stewardUserId: 'scott',
      mirrorLine: 'A puppy and a porcupine, same second.',
    });
    const entryPayload = addDocMock.mock.calls[0][1] as {
      prompt: string;
      answers: { participantId: string; label: string; text: string }[];
    };
    expect(entryPayload.prompt).toBe('If today between you and X was an animal...');
    expect(entryPayload.answers).toEqual([
      { participantId: 'scott', label: 'Dad', text: 'A porcupine' },
      { participantId: 'kaleb', label: 'Kaleb', text: 'A puppy' },
    ]);
  });

  it('throws if a chair is blank (does not write)', async () => {
    await expect(
      runMirror({ ...params, answers: [params.answers[0], { ...params.answers[1], text: ' ' }] }),
    ).rejects.toThrow(/both/i);
    expect(setDocMock).not.toHaveBeenCalled();
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('trims answer text in the saved entry', async () => {
    await runMirror({
      ...params,
      answers: [
        { ...params.answers[0], text: '  A porcupine  ' },
        { ...params.answers[1], text: '  A puppy  ' },
      ],
    });
    const entryPayload = addDocMock.mock.calls[0][1] as {
      answers: { text: string }[];
    };
    expect(entryPayload.answers[0].text).toBe('A porcupine');
    expect(entryPayload.answers[1].text).toBe('A puppy');
  });
});
