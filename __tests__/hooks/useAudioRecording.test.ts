import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioRecording } from '@/hooks/useAudioRecording';

// Mocks for the AudioContext pipeline the hook drives. Tests capture
// a ref to the latest ScriptProcessorNode so they can simulate
// `onaudioprocess` firing with fake samples.

class MockScriptProcessorNode {
  onaudioprocess: ((e: { inputBuffer: { getChannelData: (ch: number) => Float32Array } }) => void) | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockMediaStreamAudioSourceNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockGainNode {
  gain = { value: 1 };
  connect = vi.fn();
}

let latestProcessor: MockScriptProcessorNode | null = null;

class MockAudioContext {
  sampleRate = 48000;
  destination = {};
  createMediaStreamSource = vi.fn(() => new MockMediaStreamAudioSourceNode());
  createScriptProcessor = vi.fn(() => {
    const proc = new MockScriptProcessorNode();
    latestProcessor = proc;
    return proc;
  });
  createGain = vi.fn(() => new MockGainNode());
  close = vi.fn().mockResolvedValue(undefined);
}

function mockStream(): MediaStream {
  return {
    getTracks: () => [{ stop: vi.fn(), readyState: 'live' as const }],
    getAudioTracks: () => [{ stop: vi.fn(), readyState: 'live' as const }],
  } as unknown as MediaStream;
}

function pushFakeSpeechSamples(processor: MockScriptProcessorNode, count: number): void {
  for (let i = 0; i < count; i++) {
    const buf = new Float32Array(4096);
    for (let j = 0; j < buf.length; j++) buf[j] = 0.1;
    processor.onaudioprocess?.({
      inputBuffer: { getChannelData: () => buf },
    });
  }
}

beforeEach(() => {
  // The hook uses a module-level MediaStream cache (to reduce OS mic
  // notifications). `pagehide` is its documented release hook — fire it
  // so each test starts with no cached stream.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('pagehide'));
  }
  latestProcessor = null;
  // @ts-expect-error - test global
  globalThis.AudioContext = MockAudioContext;
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue(mockStream()),
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useAudioRecording', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useAudioRecording());
    expect(result.current.state).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('transitions idle → recording when start() resolves', async () => {
    const { result } = renderHook(() => useAudioRecording());
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.state).toBe('recording');
    expect(latestProcessor).not.toBeNull();
  });

  it('stop() returns a WAV blob with the captured samples', async () => {
    const { result } = renderHook(() => useAudioRecording());
    await act(async () => {
      await result.current.start();
    });

    act(() => {
      if (latestProcessor) pushFakeSpeechSamples(latestProcessor, 6);
    });

    let blob: Blob | null = null;
    await act(async () => {
      blob = await result.current.stop();
    });

    expect(result.current.state).toBe('idle');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob!.type).toBe('audio/wav');
    // 44-byte WAV header; non-empty payload means > 44.
    expect(blob!.size).toBeGreaterThan(44);
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

  it('sets error state with kind=no-mic when device is missing', async () => {
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(Object.assign(new Error('no device'), { name: 'NotFoundError' }));
    const { result } = renderHook(() => useAudioRecording());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error?.kind).toBe('no-mic');
  });

  it('auto-stops when the hard 90 s cap is reached', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAudioRecording());
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.state).toBe('recording');

    await act(async () => {
      vi.advanceTimersByTime(91_000);
    });

    expect(result.current.state).toBe('idle');
    vi.useRealTimers();
  });

  it('stop() called after auto-stop still returns the blob', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAudioRecording());
    await act(async () => {
      await result.current.start();
    });

    act(() => {
      if (latestProcessor) pushFakeSpeechSamples(latestProcessor, 2);
    });

    await act(async () => {
      vi.advanceTimersByTime(91_000);
    });
    expect(result.current.state).toBe('idle');

    let blob: Blob | null = null;
    await act(async () => {
      blob = await result.current.stop();
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob!.size).toBeGreaterThan(44);
    vi.useRealTimers();
  });

  it('reset() clears the error state', async () => {
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
    const { result } = renderHook(() => useAudioRecording());

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.state).toBe('error');

    act(() => {
      result.current.reset();
    });
    expect(result.current.state).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('passes deviceId constraint to getUserMedia when provided', async () => {
    const { result } = renderHook(() => useAudioRecording({ deviceId: 'mic-abc' }));
    await act(async () => {
      await result.current.start();
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: { deviceId: { exact: 'mic-abc' } },
    });
  });
});
