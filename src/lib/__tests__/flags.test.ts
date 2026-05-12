import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock firestore module BEFORE importing flags
const addDocMock = vi.fn();
const updateDocMock = vi.fn();
const getDocsMock = vi.fn();
const serverTimestampMock = vi.fn(() => ({ __server: true }));
vi.mock('firebase/firestore', async () => {
  const mod = await vi.importActual<typeof import('firebase/firestore')>(
    'firebase/firestore',
  );
  return {
    ...mod,
    collection: vi.fn((_db, name) => ({ __collection: name })),
    addDoc: (...args: unknown[]) => addDocMock(...args),
    doc: vi.fn((_db, coll, id) => ({ __doc: `${coll}/${id}` })),
    updateDoc: (...args: unknown[]) => updateDocMock(...args),
    getDocs: (...args: unknown[]) => getDocsMock(...args),
    query: vi.fn((..._args: unknown[]) => ({ __query: true })),
    where: vi.fn((field, op, value) => ({ __where: { field, op, value } })),
    limit: vi.fn((n) => ({ __limit: n })),
    serverTimestamp: () => serverTimestampMock(),
    Timestamp: { now: () => ({ __ts: true }) },
  };
});
vi.mock('@/lib/firebase', () => ({ firestore: { __firestore: true } }));

import { createFlag, markFlagSeen, respondToFlag } from '../flags';

describe('createFlag', () => {
  beforeEach(() => {
    addDocMock.mockReset();
    addDocMock.mockResolvedValue({ id: 'flag-abc' });
    getDocsMock.mockReset();
    // Default: no pre-existing open flag for the same (fromUser, toUser, chat, message).
    getDocsMock.mockResolvedValue({ empty: true, docs: [] });
  });

  it('writes a flag doc with status=open, truncated quote, and a server timestamp', async () => {
    const id = await createFlag({
      fromUserId: 'u1',
      toUserId: 'u2',
      chatKind: 'coach',
      chatId: 'conv-1',
      messageId: 'msg-1',
      senderRole: 'assistant',
      quoteText: 'a very long message ' + 'x'.repeat(500),
      note: 'look at this',
      needsRealReply: true,
    });
    expect(id).toBe('flag-abc');
    expect(addDocMock).toHaveBeenCalledTimes(1);
    const [coll, payload] = addDocMock.mock.calls[0];
    expect(coll).toEqual({ __collection: 'message_flags' });
    expect(payload.status).toBe('open');
    expect(payload.fromUserId).toBe('u1');
    expect(payload.toUserId).toBe('u2');
    expect(payload.needsRealReply).toBe(true);
    expect(payload.quoteText.length).toBeLessThanOrEqual(280);
    expect(payload.quoteText.endsWith('…')).toBe(true);
    expect(payload.createdAt).toEqual({ __server: true });
  });

  it('omits note when empty', async () => {
    await createFlag({
      fromUserId: 'u1',
      toUserId: 'u2',
      chatKind: 'coach',
      chatId: 'c',
      messageId: 'm',
      senderRole: 'user',
      quoteText: 'short',
      note: '',
      needsRealReply: false,
    });
    const [, payload] = addDocMock.mock.calls[0];
    expect('note' in payload).toBe(false);
  });

  it('throws when an open flag already exists for the same (chatId, messageId, toUserId)', async () => {
    getDocsMock.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 'existing-flag' }],
    });
    await expect(
      createFlag({
        fromUserId: 'u1',
        toUserId: 'u2',
        chatKind: 'coach',
        chatId: 'conv-1',
        messageId: 'msg-1',
        senderRole: 'assistant',
        quoteText: 'duplicate attempt',
        needsRealReply: false,
      }),
    ).rejects.toThrow(/Already flagged/);
    expect(addDocMock).not.toHaveBeenCalled();
  });
});

describe('markFlagSeen', () => {
  beforeEach(() => {
    updateDocMock.mockReset();
  });

  it('sets status=seen and seenAt only when status is currently open (idempotent)', async () => {
    await markFlagSeen('flag-1', { currentStatus: 'open' });
    expect(updateDocMock).toHaveBeenCalledWith(
      { __doc: 'message_flags/flag-1' },
      expect.objectContaining({ status: 'seen', seenAt: { __server: true } }),
    );
  });

  it('no-ops if already seen or closed', async () => {
    await markFlagSeen('flag-1', { currentStatus: 'seen' });
    await markFlagSeen('flag-1', { currentStatus: 'closed' });
    expect(updateDocMock).not.toHaveBeenCalled();
  });
});

describe('respondToFlag', () => {
  beforeEach(() => {
    updateDocMock.mockReset();
  });

  it('writes response + status=closed for an emoji reply', async () => {
    await respondToFlag('flag-1', { kind: 'emoji', value: '🫶' });
    expect(updateDocMock).toHaveBeenCalledWith(
      { __doc: 'message_flags/flag-1' },
      expect.objectContaining({
        status: 'closed',
        response: expect.objectContaining({ kind: 'emoji', value: '🫶' }),
        closedAt: { __server: true },
      }),
    );
  });

  it('rejects empty text for a "reply" closure', async () => {
    await expect(
      respondToFlag('flag-1', { kind: 'reply', value: '   ' }),
    ).rejects.toThrow(/non-empty/);
  });
});
