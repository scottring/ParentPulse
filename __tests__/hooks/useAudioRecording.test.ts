import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioRecording } from '@/hooks/useAudioRecording';

class MockMediaRecorder {
  static isTypeSupported = (mime: string) => mime === 'audio/webm;codecs=opus';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  constructor(public stream: MediaStream, public opts: { mimeType: string }) {}
  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['fake'], { type: this.opts.mimeType }) });
    this.onstop?.();
  }
}

beforeEach(() => {
  // @ts-expect-error - test global
  globalThis.MediaRecorder = MockMediaRecorder;
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      } as unknown as MediaStream),
    },
  });
});

describe('useAudioRecording', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useAudioRecording());
    expect(result.current.state).toBe('idle');
  });

  it('transitions idle → recording → idle and returns a blob', async () => {
    const { result } = renderHook(() => useAudioRecording());
    let blob: Blob | null = null;

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.state).toBe('recording');

    await act(async () => {
      blob = await result.current.stop();
    });
    expect(result.current.state).toBe('idle');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob!.size).toBeGreaterThan(0);
  });

  it('sets error state when permission denied', async () => {
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
    const { result } = renderHook(() => useAudioRecording());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error?.kind).toBe('permission-denied');
  });

  it('auto-stops when hard duration cap is reached', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAudioRecording());
    await act(async () => { await result.current.start(); });
    expect(result.current.state).toBe('recording');

    await act(async () => { vi.advanceTimersByTime(91_000); });

    expect(result.current.state).toBe('idle');
    vi.useRealTimers();
  });
});
