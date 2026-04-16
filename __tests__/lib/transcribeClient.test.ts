import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ functions: {} }));

const httpsCallableMock = vi.fn();
vi.mock('firebase/functions', () => ({
  httpsCallable: (...args: unknown[]) => httpsCallableMock(...args),
}));

import { transcribeBlob } from '@/lib/transcribeClient';

describe('transcribeBlob', () => {
  it('base64-encodes the blob and calls transcribeAudio with mimeType + duration', async () => {
    const callMock = vi.fn().mockResolvedValue({ data: { text: 'hello world' } });
    httpsCallableMock.mockReturnValue(callMock);

    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/webm' });
    const text = await transcribeBlob(blob, 5);

    expect(callMock).toHaveBeenCalledTimes(1);
    const arg = callMock.mock.calls[0][0];
    expect(arg.mimeType).toBe('audio/webm');
    expect(arg.durationSec).toBe(5);
    expect(typeof arg.audioBase64).toBe('string');
    expect(arg.audioBase64.length).toBeGreaterThan(0);
    expect(text).toBe('hello world');
  });

  it('maps a resource-exhausted error to rate-limited', async () => {
    httpsCallableMock.mockReturnValue(
      vi.fn().mockRejectedValue(Object.assign(new Error('rate'), { code: 'functions/resource-exhausted' })),
    );
    const blob = new Blob(['a'], { type: 'audio/webm' });
    await expect(transcribeBlob(blob, 1)).rejects.toMatchObject({ kind: 'rate-limited' });
  });
});
