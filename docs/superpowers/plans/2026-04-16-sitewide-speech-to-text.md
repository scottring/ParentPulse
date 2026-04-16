# Sitewide Speech-to-Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a clickable microphone button to every text entry field in the app. Tapping it records audio, sends it to OpenAI Whisper via a Firebase Function, and appends the transcribed text to the field.

**Architecture:** Standalone `<MicButton>` React component dropped next to each existing `<input>`/`<textarea>`. Component owns its state machine (idle / recording / transcribing / error). A `useAudioRecording` hook handles MediaRecorder lifecycle. A new `transcribeAudio` Cloud Function relays audio (base64 in callable payload) to Whisper, enforces a per-user daily rate limit, and logs cost.

**Tech Stack:** React 19 + TypeScript + Tailwind v4 (client). Firebase Functions v2 (CommonJS .js). OpenAI Whisper API (`whisper-1`). Vitest + happy-dom (client tests). Mocha + chai + sinon (function tests).

**Spec:** `docs/superpowers/specs/2026-04-16-sitewide-speech-to-text-design.md`

---

## File Structure

**New files (Wave 1):**
- `src/types/voice.ts` — shared TypeScript types
- `src/hooks/useAudioRecording.ts` — MediaRecorder wrapper hook
- `src/components/voice/MicButton.tsx` — the button + state machine
- `src/lib/transcribeClient.ts` — client-side wrapper for the callable function
- `src/app/dev/voice-test/page.tsx` — dev-only playground (deleted in Wave 5)
- `__tests__/hooks/useAudioRecording.test.ts`
- `__tests__/components/voice/MicButton.test.tsx`
- `__tests__/lib/transcribeClient.test.ts`
- `functions/__tests__/transcribeAudio.test.js`

**Modified files (Wave 1):**
- `functions/index.js` — append `exports.transcribeAudio = onCall(...)`
- `firestore.rules` — add `rate_limits/{uid}` and `transcription_logs/{id}` rules
- `firestore.indexes.json` — index for `transcription_logs` by uid + timestamp (only if you add a per-user log query later; not required for v1)

**Modified files (Waves 2–5):** see Wave headings.

---

## Wave 1 — Foundations

### Task 1.1: Voice types

**Files:**
- Create: `src/types/voice.ts`

- [ ] **Step 1: Write the file**

```ts
// src/types/voice.ts

export type MicSize = 'sm' | 'md';

export type RecordingState =
  | 'idle'
  | 'requesting-permission'
  | 'recording'
  | 'transcribing'
  | 'error';

export type RecordingErrorKind =
  | 'permission-denied'
  | 'no-mic'
  | 'network'
  | 'rate-limited'
  | 'empty'
  | 'unknown';

export interface RecordingError {
  kind: RecordingErrorKind;
  message: string;
}

export interface TranscribeRequest {
  /** base64-encoded audio bytes (no data URL prefix) */
  audioBase64: string;
  /** mime type the client recorded with, e.g. "audio/webm;codecs=opus" or "audio/mp4" */
  mimeType: string;
  /** approximate duration in seconds, used for rate-limit accounting */
  durationSec: number;
}

export interface TranscribeResponse {
  text: string;
}

/** Hard caps enforced on both client and server. */
export const VOICE_LIMITS = {
  MAX_RECORDING_SECONDS: 90,
  SILENCE_AUTO_STOP_SECONDS: 30,
  SILENCE_RMS_THRESHOLD: 0.01,
  MAX_DAILY_MINUTES_PER_USER: 30,
} as const;
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors related to `src/types/voice.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/types/voice.ts
git commit -m "feat(voice): add shared voice types and limits"
```

---

### Task 1.2: `useAudioRecording` hook (TDD)

**Files:**
- Create: `src/hooks/useAudioRecording.ts`
- Test: `__tests__/hooks/useAudioRecording.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/hooks/useAudioRecording.test.ts
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

    // Advance past the 90-second hard cap. The 250ms tick should fire the self-stop.
    await act(async () => { vi.advanceTimersByTime(91_000); });

    expect(result.current.state).toBe('idle');
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `npx vitest run __tests__/hooks/useAudioRecording.test.ts`
Expected: FAIL — `Cannot find module '@/hooks/useAudioRecording'`.

- [ ] **Step 3: Write the hook**

```ts
// src/hooks/useAudioRecording.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RecordingState,
  RecordingError,
  RecordingErrorKind,
  VOICE_LIMITS,
} from '@/types/voice';

const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
];

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  for (const mime of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return 'audio/webm';
}

function classifyError(err: unknown): RecordingErrorKind {
  if (err && typeof err === 'object' && 'name' in err) {
    const name = (err as { name: string }).name;
    if (name === 'NotAllowedError' || name === 'SecurityError') return 'permission-denied';
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'no-mic';
  }
  return 'unknown';
}

export interface UseAudioRecordingApi {
  state: RecordingState;
  error: RecordingError | null;
  /** seconds elapsed in the current recording (0 when not recording) */
  elapsedSec: number;
  start: () => Promise<void>;
  /** Resolves with the recorded Blob, or null on cancel/error. */
  stop: () => Promise<Blob | null>;
  /** Clears any error state and returns to idle. */
  reset: () => void;
}

export function useAudioRecording(): UseAudioRecordingApi {
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState<RecordingError | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTsRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolveStopRef = useRef<((b: Blob | null) => void) | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceStartRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    silenceStartRef.current = null;
    setElapsedSec(0);
  }, []);

  function computeRms(analyser: AnalyserNode): number {
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    let sumSq = 0;
    for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
    return Math.sqrt(sumSq / buf.length);
  }

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    setState('requesting-permission');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMimeType();
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        const resolve = resolveStopRef.current;
        resolveStopRef.current = null;
        cleanup();
        setState('idle');
        resolve?.(blob);
      };

      // AnalyserNode for silence detection. AudioContext requires a user gesture on
      // some browsers; the click that triggered start() satisfies that.
      try {
        const AudioCtx =
          (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 1024;
          source.connect(analyser);
          audioCtxRef.current = ctx;
          analyserRef.current = analyser;
        }
      } catch {
        // If AudioContext is unavailable, silence auto-stop is skipped; hard cap still applies.
      }

      recorder.start();
      startTsRef.current = Date.now();
      setState('recording');

      tickRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTsRef.current) / 1000);
        setElapsedSec(elapsed);

        if (elapsed >= VOICE_LIMITS.MAX_RECORDING_SECONDS) {
          if (recorderRef.current?.state === 'recording') {
            recorderRef.current.stop();
          }
          return;
        }

        const analyser = analyserRef.current;
        if (analyser) {
          const rms = computeRms(analyser);
          if (rms < VOICE_LIMITS.SILENCE_RMS_THRESHOLD) {
            if (silenceStartRef.current == null) silenceStartRef.current = now;
            const silentFor = (now - silenceStartRef.current) / 1000;
            if (silentFor >= VOICE_LIMITS.SILENCE_AUTO_STOP_SECONDS) {
              if (recorderRef.current?.state === 'recording') {
                recorderRef.current.stop();
              }
            }
          } else {
            silenceStartRef.current = null;
          }
        }
      }, 250);
    } catch (err) {
      const kind = classifyError(err);
      setError({ kind, message: kind === 'permission-denied'
        ? 'Microphone access denied'
        : 'Could not access microphone' });
      setState('error');
      cleanup();
    }
  }, [cleanup]);

  const stop = useCallback(() => {
    return new Promise<Blob | null>((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state !== 'recording') {
        resolve(null);
        return;
      }
      resolveStopRef.current = resolve;
      recorder.stop();
    });
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setState('idle');
  }, []);

  return { state, error, elapsedSec, start, stop, reset };
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `npx vitest run __tests__/hooks/useAudioRecording.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAudioRecording.ts __tests__/hooks/useAudioRecording.test.ts
git commit -m "feat(voice): useAudioRecording hook with state machine + safety cap"
```

---

### Task 1.3: Client-side `transcribeAudio` callable wrapper (TDD)

**Files:**
- Create: `src/lib/transcribeClient.ts`
- Test: `__tests__/lib/transcribeClient.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lib/transcribeClient.test.ts
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
```

- [ ] **Step 2: Run test, expect fail**

Run: `npx vitest run __tests__/lib/transcribeClient.test.ts`
Expected: FAIL — `Cannot find module '@/lib/transcribeClient'`.

- [ ] **Step 3: Write the client wrapper**

```ts
// src/lib/transcribeClient.ts
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type { TranscribeRequest, TranscribeResponse, RecordingError } from '@/types/voice';

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  // btoa works on binary strings; chunk to avoid call stack overflow on large blobs
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function transcribeBlob(blob: Blob, durationSec: number): Promise<string> {
  const audioBase64 = await blobToBase64(blob);
  const callable = httpsCallable<TranscribeRequest, TranscribeResponse>(functions, 'transcribeAudio');
  try {
    const result = await callable({ audioBase64, mimeType: blob.type, durationSec });
    return result.data.text;
  } catch (err) {
    throw mapToRecordingError(err);
  }
}

function mapToRecordingError(err: unknown): RecordingError {
  const code = (err as { code?: string })?.code;
  if (code === 'functions/resource-exhausted') {
    return { kind: 'rate-limited', message: 'Too many recordings. Try again in a minute.' };
  }
  if (code === 'functions/unauthenticated') {
    return { kind: 'unknown', message: 'Please sign in to use voice input.' };
  }
  return { kind: 'network', message: "Couldn't transcribe. Tap again to retry." };
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `npx vitest run __tests__/lib/transcribeClient.test.ts`
Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/transcribeClient.ts __tests__/lib/transcribeClient.test.ts
git commit -m "feat(voice): client wrapper for transcribeAudio callable"
```

---

### Task 1.4: `MicButton` component (TDD)

**Files:**
- Create: `src/components/voice/MicButton.tsx`
- Test: `__tests__/components/voice/MicButton.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/components/voice/MicButton.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/lib/transcribeClient', () => ({
  transcribeBlob: vi.fn(),
}));

const startMock = vi.fn();
const stopMock = vi.fn();
const resetMock = vi.fn();
const hookState = {
  state: 'idle' as 'idle' | 'recording' | 'transcribing' | 'error' | 'requesting-permission',
  error: null as null | { kind: string; message: string },
  elapsedSec: 0,
  start: startMock,
  stop: stopMock,
  reset: resetMock,
};

vi.mock('@/hooks/useAudioRecording', () => ({
  useAudioRecording: () => hookState,
}));

import { MicButton } from '@/components/voice/MicButton';
import { transcribeBlob } from '@/lib/transcribeClient';

beforeEach(() => {
  vi.clearAllMocks();
  hookState.state = 'idle';
  hookState.error = null;
  hookState.elapsedSec = 0;
});

describe('MicButton', () => {
  it('renders an idle mic button with aria-label', () => {
    render(<MicButton onTranscript={() => {}} />);
    expect(screen.getByRole('button', { name: /start voice input/i })).toBeInTheDocument();
  });

  it('starts recording on click', () => {
    render(<MicButton onTranscript={() => {}} />);
    fireEvent.click(screen.getByRole('button'));
    expect(startMock).toHaveBeenCalled();
  });

  it('on stop, transcribes the blob and calls onTranscript with the text', async () => {
    const blob = new Blob(['x'], { type: 'audio/webm' });
    stopMock.mockResolvedValue(blob);
    (transcribeBlob as ReturnType<typeof vi.fn>).mockResolvedValue('hi there');
    hookState.state = 'recording';
    hookState.elapsedSec = 4;

    const onTranscript = vi.fn();
    render(<MicButton onTranscript={onTranscript} />);
    fireEvent.click(screen.getByRole('button', { name: /recording/i }));

    await waitFor(() => expect(onTranscript).toHaveBeenCalledWith('hi there'));
    expect(transcribeBlob).toHaveBeenCalledWith(blob, 4);
  });

  it('shows error message when transcription returns empty', async () => {
    stopMock.mockResolvedValue(new Blob(['x'], { type: 'audio/webm' }));
    (transcribeBlob as ReturnType<typeof vi.fn>).mockResolvedValue('   ');
    hookState.state = 'recording';

    render(<MicButton onTranscript={() => {}} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(screen.getByText(/no speech detected/i)).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `npx vitest run __tests__/components/voice/MicButton.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

```tsx
// src/components/voice/MicButton.tsx
'use client';

import { useState } from 'react';
import { Mic, AlertCircle } from 'lucide-react';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { transcribeBlob } from '@/lib/transcribeClient';
import type { MicSize, RecordingError } from '@/types/voice';

interface Props {
  onTranscript: (text: string) => void;
  size?: MicSize;
  disabled?: boolean;
  className?: string;
}

const GLYPH_PX: Record<MicSize, number> = { sm: 14, md: 18 };
const HIT_AREA_PX = 44; // WCAG touch-target minimum (transparent padding)

export function MicButton({ onTranscript, size = 'md', disabled, className }: Props) {
  const rec = useAudioRecording();
  const [postError, setPostError] = useState<RecordingError | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const error = postError ?? rec.error;
  const isRecording = rec.state === 'recording';
  const isPending = rec.state === 'requesting-permission' || isTranscribing;

  const ariaLabel = isRecording
    ? 'Recording — tap to stop'
    : isTranscribing
      ? 'Transcribing'
      : error
        ? 'Voice input failed — tap to retry'
        : 'Start voice input';

  const handleClick = async () => {
    if (disabled || isPending) return;
    if (error) {
      setPostError(null);
      rec.reset();
      return;
    }
    if (!isRecording) {
      await rec.start();
      return;
    }
    const elapsed = rec.elapsedSec;
    const blob = await rec.stop();
    if (!blob || blob.size === 0) return;
    setIsTranscribing(true);
    try {
      const text = await transcribeBlob(blob, elapsed);
      const trimmed = text.trim();
      if (!trimmed) {
        setPostError({ kind: 'empty', message: 'No speech detected — try again.' });
        return;
      }
      onTranscript(trimmed);
    } catch (err) {
      setPostError(err as RecordingError);
    } finally {
      setIsTranscribing(false);
    }
  };

  const glyph = GLYPH_PX[size];
  const color = isRecording ? '#C97B63' : error ? '#9A9A9A' : '#8a6f4a';

  return (
    <span className={`mic-button-wrap ${className ?? ''}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-live="polite"
        disabled={disabled}
        onClick={handleClick}
        className="mic-button"
        data-state={rec.state}
        data-transcribing={isTranscribing || undefined}
      >
        <Mic size={glyph} color={color} aria-hidden="true" />
        {error && <AlertCircle size={10} color="#C97B63" className="mic-error-badge" aria-hidden="true" />}
      </button>
      {isRecording && (
        <span className="mic-timer" aria-live="polite">
          {formatElapsed(rec.elapsedSec)}
        </span>
      )}
      {error && <span className="mic-error-msg">{error.message}</span>}
      <style jsx>{`
        .mic-button-wrap {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: Georgia, serif;
        }
        .mic-button {
          width: ${HIT_AREA_PX}px;
          height: ${HIT_AREA_PX}px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 999px;
          cursor: pointer;
          padding: 0;
          position: relative;
          transition: transform 0.2s ease;
        }
        .mic-button:hover { background: rgba(138, 111, 74, 0.08); }
        .mic-button:disabled { cursor: not-allowed; opacity: 0.5; }
        .mic-button[data-state="recording"] {
          animation: mic-pulse 1.2s ease-in-out infinite;
        }
        .mic-button[data-transcribing="true"] {
          animation: mic-shimmer 0.8s ease-in-out infinite;
        }
        .mic-error-badge {
          position: absolute;
          top: 8px;
          right: 8px;
        }
        .mic-timer {
          font-size: 12px;
          color: #C97B63;
          font-variant-numeric: tabular-nums;
        }
        .mic-error-msg {
          font-size: 12px;
          color: #9A6655;
        }
        @keyframes mic-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes mic-shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </span>
  );
}

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `npx vitest run __tests__/components/voice/MicButton.test.tsx`
Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/voice/MicButton.tsx __tests__/components/voice/MicButton.test.tsx
git commit -m "feat(voice): MicButton component with idle/recording/error visuals"
```

---

### Task 1.5: `transcribeAudio` Cloud Function (TDD)

**Files:**
- Modify: `functions/index.js` — append new export
- Test: `functions/__tests__/transcribeAudio.test.js`

- [ ] **Step 1: Write the failing test**

```js
// functions/__tests__/transcribeAudio.test.js
const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('transcribeAudio', () => {
  let openaiStub;
  let firestoreStub;
  let rateLimitDoc;
  let logsCollection;

  beforeEach(() => {
    openaiStub = {
      audio: { transcriptions: { create: sinon.stub().resolves('hello world') } },
    };

    rateLimitDoc = {
      get: sinon.stub().resolves({ exists: false, data: () => null }),
      set: sinon.stub().resolves(),
    };
    logsCollection = { add: sinon.stub().resolves() };

    firestoreStub = {
      collection: sinon.stub().callsFake((name) => {
        if (name === 'rate_limits') return { doc: () => rateLimitDoc };
        if (name === 'transcription_logs') return logsCollection;
        throw new Error('unexpected collection: ' + name);
      }),
    };
  });

  function loadHandler() {
    // Load only the handler in isolation to avoid initializing the whole index.js.
    // The handler is exported as `_transcribeAudioHandler` for testing.
    delete require.cache[require.resolve('../transcribeAudio.handler.js')];
    return proxyquire('../transcribeAudio.handler.js', {
      'firebase-admin': { firestore: () => firestoreStub },
      './openaiClient.js': { getOpenAI: () => openaiStub },
    }).transcribeAudioHandler;
  }

  it('rejects unauthenticated requests', async () => {
    const handler = loadHandler();
    try {
      await handler({ auth: null, data: {} });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err.message).to.match(/auth/i);
    }
  });

  it('rejects when audioBase64 is missing', async () => {
    const handler = loadHandler();
    try {
      await handler({ auth: { uid: 'u1' }, data: { mimeType: 'audio/webm', durationSec: 3 } });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err.message).to.match(/audio/i);
    }
  });

  it('returns transcribed text for a valid request', async () => {
    const handler = loadHandler();
    const result = await handler({
      auth: { uid: 'u1' },
      data: {
        audioBase64: Buffer.from('fake').toString('base64'),
        mimeType: 'audio/webm',
        durationSec: 3,
      },
    });
    expect(result).to.deep.equal({ text: 'hello world' });
    expect(openaiStub.audio.transcriptions.create.calledOnce).to.be.true;
    expect(logsCollection.add.calledOnce).to.be.true;
  });

  it('rejects when user has exceeded daily limit', async () => {
    rateLimitDoc.get.resolves({
      exists: true,
      data: () => ({
        windowStartMs: Date.now() - 60_000,
        secondsUsed: 30 * 60, // already at cap
      }),
    });
    const handler = loadHandler();
    try {
      await handler({
        auth: { uid: 'u1' },
        data: {
          audioBase64: Buffer.from('fake').toString('base64'),
          mimeType: 'audio/webm',
          durationSec: 3,
        },
      });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err.code).to.equal('resource-exhausted');
    }
  });
});
```

Add `proxyquire` to dev deps if not present:

```bash
cd functions && npm install --save-dev proxyquire
```

- [ ] **Step 2: Run test, expect fail**

Run: `cd functions && npx mocha --reporter spec __tests__/transcribeAudio.test.js`
Expected: FAIL — `Cannot find module '../transcribeAudio.handler.js'`.

- [ ] **Step 3: Create the handler module**

```js
// functions/transcribeAudio.handler.js
// Pure handler extracted for testability. Wired into onCall in index.js.

const admin = require("firebase-admin");
const {HttpsError} = require("firebase-functions/v2/https");
const {getOpenAI} = require("./openaiClient.js");
const {toFile} = require("openai");

const MAX_DAILY_SECONDS = 30 * 60;
const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000;
const PRICE_PER_MINUTE_CENTS = 0.6; // $0.006/min

async function transcribeAudioHandler(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const uid = request.auth.uid;
  const {audioBase64, mimeType, durationSec} = request.data || {};

  if (!audioBase64 || typeof audioBase64 !== "string") {
    throw new HttpsError("invalid-argument", "audioBase64 is required");
  }
  if (!mimeType || typeof mimeType !== "string") {
    throw new HttpsError("invalid-argument", "mimeType is required");
  }
  const dur = Number(durationSec) || 0;
  if (dur < 0 || dur > 95) {
    throw new HttpsError("invalid-argument", "durationSec out of range");
  }

  const db = admin.firestore();
  const rateRef = db.collection("rate_limits").doc(uid);
  const rateSnap = await rateRef.get();
  const now = Date.now();
  let windowStartMs = now;
  let secondsUsed = 0;
  if (rateSnap.exists) {
    const data = rateSnap.data();
    if (now - data.windowStartMs < ROLLING_WINDOW_MS) {
      windowStartMs = data.windowStartMs;
      secondsUsed = data.secondsUsed || 0;
    }
  }
  if (secondsUsed + dur > MAX_DAILY_SECONDS) {
    throw new HttpsError(
        "resource-exhausted",
        "Too many recordings. Try again in a minute.",
    );
  }

  const buffer = Buffer.from(audioBase64, "base64");
  const ext = mimeType.includes("mp4") ? "mp4" : "webm";
  const file = await toFile(buffer, `audio.${ext}`, {type: mimeType});

  const openai = getOpenAI();
  const text = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    response_format: "text",
    language: "en",
  });

  await rateRef.set({
    windowStartMs,
    secondsUsed: secondsUsed + dur,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection("transcription_logs").add({
    uid,
    durationSec: dur,
    costCents: (dur / 60) * PRICE_PER_MINUTE_CENTS,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {text: typeof text === "string" ? text : (text?.text || "")};
}

module.exports = {transcribeAudioHandler};
```

- [ ] **Step 4: Create OpenAI client helper**

```js
// functions/openaiClient.js
const OpenAI = require("openai");

let client;
function getOpenAI() {
  if (!client) {
    client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
  }
  return client;
}

module.exports = {getOpenAI};
```

- [ ] **Step 5: Run test, expect pass**

Run: `cd functions && npx mocha --reporter spec __tests__/transcribeAudio.test.js`
Expected: 4 passing.

- [ ] **Step 6: Wire the handler into `onCall` in `functions/index.js`**

Append to the bottom of `functions/index.js` (just before any final exports if any):

```js
// ================================================================
// SPEECH-TO-TEXT — voice input transcription via Whisper
// ================================================================
const {transcribeAudioHandler} = require("./transcribeAudio.handler.js");
const {defineSecret} = require("firebase-functions/params");

const openaiKey = defineSecret("OPENAI_API_KEY");

exports.transcribeAudio = onCall(
    {
      region: "us-central1",
      secrets: [openaiKey],
      memory: "512MiB",
      timeoutSeconds: 60,
    },
    transcribeAudioHandler,
);
```

- [ ] **Step 7: Lint the function**

Run: `cd functions && npm run lint`
Expected: no errors in `transcribeAudio.handler.js`, `openaiClient.js`, or the new index.js block. Fix any spacing/indent issues google-style demands.

- [ ] **Step 8: Commit**

```bash
git add functions/transcribeAudio.handler.js functions/openaiClient.js \
        functions/__tests__/transcribeAudio.test.js functions/index.js \
        functions/package.json functions/package-lock.json
git commit -m "feat(voice): transcribeAudio Cloud Function (Whisper + rate limit + cost log)"
```

---

### Task 1.6: Firestore rules for new collections

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Add rules at the bottom of `firestore.rules` (just before the final closing brace of `match /databases/{database}/documents`)**

```
    // Rate-limit counters per user (written only by transcribeAudio Cloud
    // Function via Admin SDK, which bypasses these rules). Clients may
    // never read or write directly.
    match /rate_limits/{uid} {
      allow read, write: if false;
    }

    // Transcription cost log (written only by transcribeAudio Cloud
    // Function). Clients may never read or write directly.
    match /transcription_logs/{logId} {
      allow read, write: if false;
    }
```

- [ ] **Step 2: Verify rules deploy locally**

Run: `firebase emulators:start --only firestore`
Expected: emulator boots cleanly, no rule syntax errors. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat(voice): firestore rules locking rate_limits + transcription_logs to admin"
```

---

### Task 1.7: Configure OpenAI secret + deploy function

**Files:** none (operational task)

- [ ] **Step 1: Set the secret**

Run: `firebase functions:secrets:set OPENAI_API_KEY`
Paste the OpenAI API key when prompted. (The user must obtain this from platform.openai.com if not already.)

- [ ] **Step 2: Deploy the new function and rules**

Run: `firebase deploy --only functions:transcribeAudio,firestore:rules`
Expected: deployment succeeds; `transcribeAudio` appears in the Firebase console.

- [ ] **Step 3: No commit needed (operational only)**

---

### Task 1.8: Dev playground page

**Files:**
- Create: `src/app/dev/voice-test/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
// src/app/dev/voice-test/page.tsx
'use client';

import { useState } from 'react';
import { MicButton } from '@/components/voice/MicButton';

export default function VoiceTestPage() {
  const [text, setText] = useState('');
  return (
    <main style={{ padding: 32, fontFamily: 'Georgia, serif', maxWidth: 600 }}>
      <h1>Voice input playground</h1>
      <p>Click the mic, speak, click again to stop. Transcription appends below.</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 16 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          style={{ flex: 1, padding: 12, fontSize: 16, fontFamily: 'Georgia, serif' }}
          placeholder="Voice transcription will appear here…"
        />
        <MicButton
          size="md"
          onTranscript={(t) => setText((prev) => (prev ? `${prev} ${t}` : t))}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Manual smoke test**

Run: `npm run dev`
Visit: `http://localhost:3000/dev/voice-test`
Verify:
- Mic button renders.
- Click → permission prompt → recording state with pulse + timer.
- Click again → shimmer → text appears in textarea.
- Click again → second transcript appends with a leading space.

- [ ] **Step 3: Commit**

```bash
git add src/app/dev/voice-test/page.tsx
git commit -m "feat(voice): dev playground at /dev/voice-test"
```

---

## Wave 2 — Capture sheet

### Task 2.1: Add MicButton to CaptureSheet main textarea

**Files:**
- Modify: `src/components/capture/CaptureSheet.tsx`

- [ ] **Step 1: Identify the main textarea**

Run: `grep -n "<textarea" src/components/capture/CaptureSheet.tsx`
Note the line number of the main entry textarea (per Explore report, around line 508). Confirm it is the freeform composition field, not the chat input.

- [ ] **Step 2: Add the import at the top of the file**

```tsx
import { MicButton } from '@/components/voice/MicButton';
```

- [ ] **Step 3: Wrap the textarea with a positioning container and add MicButton**

Wherever the main textarea is rendered, replace:

```tsx
<textarea
  value={text}
  onChange={(e) => setText(e.target.value)}
  // …existing props…
/>
```

with:

```tsx
<div style={{ position: 'relative' }}>
  <textarea
    value={text}
    onChange={(e) => setText(e.target.value)}
    // …existing props…
  />
  <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
    <MicButton
      size="md"
      onTranscript={(t) => setText((prev) => (prev ? `${prev} ${t}` : t))}
    />
  </div>
</div>
```

(Substitute the actual state-setter name — `setText`, `setEntry`, etc. — by reading the surrounding code.)

- [ ] **Step 4: Manually test in dev**

Run: `npm run dev`
Open the capture sheet (on `/journal` or wherever it surfaces).
Verify: mic button appears bottom-right of the main textarea; recording → transcribing → text appended works.

- [ ] **Step 5: Commit**

```bash
git add src/components/capture/CaptureSheet.tsx
git commit -m "feat(voice): MicButton in CaptureSheet main textarea"
```

---

### Task 2.2: Add MicButton to CaptureSheet follow-up chat input

**Files:**
- Modify: `src/components/capture/CaptureSheet.tsx`

- [ ] **Step 1: Identify the chat input**

Run: `grep -n "<input" src/components/capture/CaptureSheet.tsx`
Per Explore report, the follow-up chat lives around line 775. Confirm by reading the surrounding 10 lines — it should be the AI follow-up "Ask about this" input.

- [ ] **Step 2: Wrap and add MicButton with size `sm`**

```tsx
<div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}>
  <input
    type="text"
    value={chatInput}
    onChange={(e) => setChatInput(e.target.value)}
    // …existing props…
  />
  <MicButton
    size="sm"
    onTranscript={(t) => setChatInput((prev) => (prev ? `${prev} ${t}` : t))}
  />
</div>
```

(Substitute the actual state-setter — likely `setChatInput`, `setMessage`, etc.)

- [ ] **Step 3: Manually test**

Verify the follow-up chat accepts voice and the transcript appends to whatever was typed.

- [ ] **Step 4: Commit**

```bash
git add src/components/capture/CaptureSheet.tsx
git commit -m "feat(voice): MicButton in CaptureSheet follow-up chat input"
```

---

## Wave 3 — Margin notes + journal-adjacent surfaces

### Task 3.1: MarginNoteComposer

**Files:**
- Modify: `src/components/journal-spread/MarginNoteComposer.tsx`

- [ ] **Step 1: Add import**

```tsx
import { MicButton } from '@/components/voice/MicButton';
```

- [ ] **Step 2: Render MicButton inline next to the input**

Find the existing `<input>` (per memory, the 80-char composer with italic serif styling). Wrap with a flex container and append the mic:

```tsx
<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
  <input
    type="text"
    value={value}
    onChange={(e) => setValue(e.target.value.slice(0, 80))}
    maxLength={80}
    // …existing props…
  />
  <MicButton
    size="sm"
    onTranscript={(t) => setValue((prev) => {
      const combined = prev ? `${prev} ${t}` : t;
      return combined.slice(0, 80);
    })}
  />
</span>
```

(Substitute `setValue` with the actual local state setter.)

- [ ] **Step 3: Manually test**

Open a journal spread, click in the margin to start a note, click mic, dictate a short note, confirm it appends and the 80-char cap still applies (transcript longer than the remaining space gets truncated).

- [ ] **Step 4: Commit**

```bash
git add src/components/journal-spread/MarginNoteComposer.tsx
git commit -m "feat(voice): MicButton in MarginNoteComposer (80-char cap preserved)"
```

---

### Task 3.2: AskAboutEntrySheet follow-up chat

**Files:**
- Modify: `src/components/journal-spread/AskAboutEntrySheet.tsx` (path may vary — locate via `grep -rn "AskAboutEntrySheet" src/`)

- [ ] **Step 1: Add import + MicButton next to the chat input**

Same pattern as Task 2.2: identify the input, wrap in a flex container, add `<MicButton size="sm" onTranscript={...} />` that appends to the chat input state.

- [ ] **Step 2: Manually test**

Open an entry → "Ask about this" → dictate a question → confirm transcript appears.

- [ ] **Step 3: Commit**

```bash
git add src/components/journal-spread/AskAboutEntrySheet.tsx
git commit -m "feat(voice): MicButton in AskAboutEntrySheet chat input"
```

---

### Task 3.3: ManualChat

**Files:**
- Modify: `src/components/manual/ManualChat.tsx`

- [ ] **Step 1: Same pattern — add import + MicButton next to the chat textarea**

```tsx
<div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
  <textarea
    value={message}
    onChange={(e) => setMessage(e.target.value)}
    // …existing props…
  />
  <MicButton
    size="sm"
    onTranscript={(t) => setMessage((prev) => (prev ? `${prev} ${t}` : t))}
  />
</div>
```

(Substitute the actual state-setter.)

- [ ] **Step 2: Manually test**

Open a person manual → chat → dictate → confirm.

- [ ] **Step 3: Commit**

```bash
git add src/components/manual/ManualChat.tsx
git commit -m "feat(voice): MicButton in ManualChat input"
```

---

## Wave 4 — Modal forms

### Task 4.1: AddTriggerModal

**Files:**
- Modify: `src/components/manual/AddTriggerModal.tsx` (locate via `grep -rn "AddTriggerModal" src/`)

- [ ] **Step 1: Add import once at the top**

```tsx
import { MicButton } from '@/components/voice/MicButton';
```

- [ ] **Step 2: For each of the 4 textareas (description, context, response, strategy), wrap with a flex container and append MicButton**

```tsx
<div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
  <textarea
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    // …existing props…
  />
  <MicButton
    size="sm"
    onTranscript={(t) => setDescription((prev) => (prev ? `${prev} ${t}` : t))}
  />
</div>
```

Repeat for `context`, `response`, `strategy` (or whatever the actual field names are — confirm by reading the file).

- [ ] **Step 3: Manually test**

Open the modal, dictate into each field, confirm.

- [ ] **Step 4: Commit**

```bash
git add src/components/manual/AddTriggerModal.tsx
git commit -m "feat(voice): MicButton in AddTriggerModal (4 textareas)"
```

---

### Task 4.2: AddStrategyModal

**Files:**
- Modify: `src/components/manual/AddStrategyModal.tsx`

- [ ] **Step 1: Add import**

```tsx
import { MicButton } from '@/components/voice/MicButton';
```

- [ ] **Step 2: For each textarea in the form, wrap with a flex container and add MicButton**

```tsx
<div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
  <textarea
    value={fieldValue}
    onChange={(e) => setFieldValue(e.target.value)}
    // …existing props…
  />
  <MicButton
    size="sm"
    onTranscript={(t) => setFieldValue((prev) => (prev ? `${prev} ${t}` : t))}
  />
</div>
```

Substitute `fieldValue` / `setFieldValue` with the real state names for each field (confirm by reading the file).

- [ ] **Step 3: Manually test**

Open the modal, dictate into each field, confirm.

- [ ] **Step 4: Commit**

```bash
git add src/components/manual/AddStrategyModal.tsx
git commit -m "feat(voice): MicButton in AddStrategyModal"
```

---

### Task 4.3: AddBoundaryModal

**Files:**
- Modify: `src/components/manual/AddBoundaryModal.tsx`

- [ ] **Step 1: Add import**

```tsx
import { MicButton } from '@/components/voice/MicButton';
```

- [ ] **Step 2: For each textarea in the form, wrap with a flex container and add MicButton**

```tsx
<div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
  <textarea
    value={fieldValue}
    onChange={(e) => setFieldValue(e.target.value)}
    // …existing props…
  />
  <MicButton
    size="sm"
    onTranscript={(t) => setFieldValue((prev) => (prev ? `${prev} ${t}` : t))}
  />
</div>
```

Substitute `fieldValue` / `setFieldValue` with the real state names for each field.

- [ ] **Step 3: Manually test**

Open the modal, dictate into each field, confirm.

- [ ] **Step 4: Commit**

```bash
git add src/components/manual/AddBoundaryModal.tsx
git commit -m "feat(voice): MicButton in AddBoundaryModal"
```

---

### Task 4.4: QuestionRenderer (onboarding open-response)

**Files:**
- Modify: `src/components/onboarding/QuestionRenderer.tsx`

- [ ] **Step 1: Add MicButton next to the open-response textarea**

Locate the branch that renders a textarea (the open-response question type) and wrap with the standard flex container + MicButton pattern. Use `size="sm"`.

- [ ] **Step 2: Manually test**

Walk through onboarding, hit an open-response question, dictate, confirm.

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/QuestionRenderer.tsx
git commit -m "feat(voice): MicButton in onboarding open-response questions"
```

---

### Task 4.5: QualitativeComment

**Files:**
- Modify: `src/components/onboarding/QualitativeComment.tsx`

- [ ] **Step 1: Same pattern — add MicButton next to the optional comment textarea**

- [ ] **Step 2: Manually test, commit**

```bash
git add src/components/onboarding/QualitativeComment.tsx
git commit -m "feat(voice): MicButton in QualitativeComment textarea"
```

---

## Wave 5 — Sweep + cleanup

### Task 5.1: Identify remaining inputs

- [ ] **Step 1: List all remaining text-entry sites**

Run:
```bash
grep -rn "<textarea" src/ --include="*.tsx" | grep -v "MicButton\|test\|node_modules"
grep -rn "<input type=\"text\"" src/ --include="*.tsx" | grep -v "MicButton\|test\|node_modules"
grep -rn "<input$" src/ --include="*.tsx" | grep -v "MicButton\|test\|node_modules"
```

- [ ] **Step 2: Build an exclusion list**

For each remaining hit, decide: voice-friendly OR explicit-skip. Record skips in a comment block at the top of the migration commit message. Standard skips:
- PIN inputs (`type="password"` or PIN keypads)
- Search bars (typing is faster; voice search isn't user expectation)
- File name / URL fields
- Hidden inputs
- Email / phone / numeric inputs
- Authentication forms (login email, password)

### Task 5.2: Apply MicButton to each remaining voice-friendly input

- [ ] **Step 1: Per file, repeat the standard pattern**

Import + flex-wrap + `<MicButton size="sm" onTranscript={...} />`. Use `size="md"` only for prominent multi-line composers.

- [ ] **Step 2: Group the sweep into logical commits**

Don't make 20 single-file commits. Group by area, e.g.:
- `feat(voice): MicButton across remaining people-page inputs`
- `feat(voice): MicButton across remaining settings inputs`

### Task 5.3: Remove the dev playground

**Files:**
- Delete: `src/app/dev/voice-test/page.tsx`

- [ ] **Step 1: Delete the file**

```bash
rm src/app/dev/voice-test/page.tsx
```

- [ ] **Step 2: Confirm no references remain**

Run: `grep -rn "voice-test" src/`
Expected: no results.

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "chore(voice): remove /dev/voice-test playground after rollout"
```

### Task 5.4: Documentation note

**Files:**
- Modify: `docs/superpowers/specs/2026-04-16-sitewide-speech-to-text-design.md`

- [ ] **Step 1: Add a final section listing the explicit skips applied during the sweep**

Append:

```markdown
## Sweep exclusions (applied in Wave 5)

The following input categories were intentionally left without MicButton:
- PIN entry (security-sensitive, slow voice doesn't help)
- Search bars (typing is faster, voice search isn't user expectation)
- Authentication forms (email, password, login)
- Email / phone / URL / file name inputs
- Numeric-only fields

If you add a new text input, default to including MicButton unless the field falls into one of these categories.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-04-16-sitewide-speech-to-text-design.md
git commit -m "docs(voice): document MicButton sweep exclusions"
```

---

## Final verification

- [ ] **All client tests pass**

Run: `npx vitest run`
Expected: full test suite green.

- [ ] **All function tests pass**

Run: `cd functions && npm test`
Expected: green.

- [ ] **TypeScript clean**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **End-to-end smoke**

Manually exercise:
- Capture sheet on desktop Chrome → main textarea voice + chat voice work.
- Capture sheet on mobile Safari → permission prompts cleanly, voice works.
- Margin notes → 80-char cap still enforced after voice.
- Modal forms → all four textareas accept voice.
- Onboarding → open-response questions accept voice.
- Permission denied flow → error state shown, retry on next click.
- Hard 90 s cap → recording auto-stops with toast.
- Empty audio (silent recording) → "No speech detected" error.
