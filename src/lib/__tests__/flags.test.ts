import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock firestore module BEFORE importing flags
const addDocMock = vi.fn();
const serverTimestampMock = vi.fn(() => ({ __server: true }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, name) => ({ __collection: name })),
  addDoc: (...args: unknown[]) => addDocMock(...args),
  serverTimestamp: () => serverTimestampMock(),
  Timestamp: { now: () => ({ __ts: true }) },
}));
vi.mock('@/lib/firebase', () => ({ firestore: { __firestore: true } }));

import { createFlag } from '../flags';

describe('createFlag', () => {
  beforeEach(() => {
    addDocMock.mockReset();
    addDocMock.mockResolvedValue({ id: 'flag-abc' });
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
});
