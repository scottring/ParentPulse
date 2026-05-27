import { describe, it, expect, vi, beforeEach } from 'vitest';

const setDocMock = vi.fn().mockResolvedValue(undefined);
const updateDocMock = vi.fn().mockResolvedValue(undefined);
const addDocMock = vi.fn().mockResolvedValue({ id: 'focus-1' });
const getDocMock = vi.fn();
const docMock = vi.fn((...args: unknown[]) => ({ path: args.slice(1).join('/') }));
const collectionMock = vi.fn((...args: unknown[]) => ({ path: args.slice(1).join('/') }));

vi.mock('@/lib/firebase', () => ({ firestore: {} }));
vi.mock('firebase/firestore', () => ({
  doc: (...a: unknown[]) => docMock(...a),
  collection: (...a: unknown[]) => collectionMock(...a),
  setDoc: (...a: unknown[]) => setDocMock(...a),
  updateDoc: (...a: unknown[]) => updateDocMock(...a),
  addDoc: (...a: unknown[]) => addDocMock(...a),
  getDoc: (...a: unknown[]) => getDocMock(...a),
  serverTimestamp: () => 'TS',
}));
vi.mock('@/lib/ritual-focus/synthesizeWeeklyFocusClient', () => ({
  synthesizeWeeklyFocus: vi
    .fn()
    .mockResolvedValue('Trade the Tuesday handoff for one week.'),
}));

import {
  saveWeeklyFocus,
  recordFocusOutcome,
  requestWeeklyFocus,
  getActiveDyadFocus,
} from '../useWeeklyFocus';

describe('requestWeeklyFocus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the AI proposal from the Cloud Function', async () => {
    const proposal = await requestWeeklyFocus({
      wentWell: 'we laughed',
      wasHard: 'the handoff',
      smallJoys: 'coffee',
      intentions: ['be kinder'],
    });
    expect(proposal).toBe('Trade the Tuesday handoff for one week.');
  });
});

describe('saveWeeklyFocus', () => {
  beforeEach(() => vi.clearAllMocks());

  const params = {
    familyId: 'fam1',
    participantIds: ['iris', 'scott'],
    ritualSessionId: 'sess-9',
    text: '  Trade the Tuesday handoff for one week.  ',
    source: 'ai' as const,
  };

  it('upserts currentFocus on the dyad and appends an active history doc', async () => {
    const res = await saveWeeklyFocus(params);

    expect(res.dyadKey).toBe('iris__scott');
    expect(docMock).toHaveBeenCalledWith({}, 'dyads', 'iris__scott');
    expect(setDocMock).toHaveBeenCalledTimes(1);
    const [, payload, opts] = setDocMock.mock.calls[0];
    expect(opts).toEqual({ merge: true });
    expect(payload).toMatchObject({
      dyadKey: 'iris__scott',
      familyId: 'fam1',
      participantIds: ['iris', 'scott'],
    });
    expect(payload.currentFocus).toMatchObject({
      text: 'Trade the Tuesday handoff for one week.',
      source: 'ai',
      ritualSessionId: 'sess-9',
      status: 'active',
    });

    expect(collectionMock).toHaveBeenCalledWith({}, 'dyads', 'iris__scott', 'focuses');
    expect(addDocMock).toHaveBeenCalledTimes(1);
    expect(addDocMock.mock.calls[0][1]).toMatchObject({
      text: 'Trade the Tuesday handoff for one week.',
      source: 'ai',
      ritualSessionId: 'sess-9',
      familyId: 'fam1',
      status: 'active',
    });
  });

  it('throws and writes nothing when the text is empty', async () => {
    await expect(
      saveWeeklyFocus({ ...params, text: '   ' }),
    ).rejects.toThrow(/text/i);
    expect(setDocMock).not.toHaveBeenCalled();
    expect(addDocMock).not.toHaveBeenCalled();
  });
});

describe('getActiveDyadFocus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the focus when status is active', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        currentFocus: { text: 'Trade the handoff.', status: 'active', source: 'ai' },
      }),
    });
    const res = await getActiveDyadFocus(['scott', 'iris']);
    expect(docMock).toHaveBeenCalledWith({}, 'dyads', 'iris__scott');
    expect(res).toMatchObject({ text: 'Trade the handoff.', status: 'active' });
  });

  it('returns null when the focus was already revisited', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({ currentFocus: { text: 'old', status: 'revisited' } }),
    });
    expect(await getActiveDyadFocus(['scott', 'iris'])).toBe(null);
  });

  it('returns null when the dyad has no focus yet', async () => {
    getDocMock.mockResolvedValue({ exists: () => true, data: () => ({}) });
    expect(await getActiveDyadFocus(['scott', 'iris'])).toBe(null);
  });

  it('returns null when the dyad doc does not exist', async () => {
    getDocMock.mockResolvedValue({ exists: () => false, data: () => undefined });
    expect(await getActiveDyadFocus(['scott', 'iris'])).toBe(null);
  });
});

describe('recordFocusOutcome', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks the dyad focus revisited and appends a closed history doc', async () => {
    await recordFocusOutcome({
      familyId: 'fam1',
      participantIds: ['scott', 'iris'],
      focusText: 'Trade the Tuesday handoff for one week.',
      wentWell: 'partly',
      reflection: 'We managed it twice.',
    });

    expect(docMock).toHaveBeenCalledWith({}, 'dyads', 'iris__scott');
    expect(updateDocMock).toHaveBeenCalledTimes(1);
    const updatePayload = updateDocMock.mock.calls[0][1];
    expect(updatePayload['currentFocus.status']).toBe('revisited');
    expect(updatePayload['currentFocus.outcome']).toMatchObject({
      wentWell: 'partly',
      reflection: 'We managed it twice.',
    });

    expect(collectionMock).toHaveBeenCalledWith({}, 'dyads', 'iris__scott', 'focuses');
    expect(addDocMock.mock.calls[0][1]).toMatchObject({
      text: 'Trade the Tuesday handoff for one week.',
      status: 'revisited',
      familyId: 'fam1',
    });
    expect(addDocMock.mock.calls[0][1].outcome).toMatchObject({
      wentWell: 'partly',
      reflection: 'We managed it twice.',
    });
  });
});
