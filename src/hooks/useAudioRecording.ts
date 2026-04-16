import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RecordingState,
  RecordingError,
  RecordingErrorKind,
  VOICE_LIMITS,
} from '@/types/voice';

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
  elapsedSec: number;
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
  reset: () => void;
}

export interface UseAudioRecordingOptions {
  deviceId?: string;
}

// Whisper runs internally at 16 kHz. Capturing at 44.1 kHz and resampling
// here cuts the blob size to ~1/3 without accuracy loss.
const TARGET_SAMPLE_RATE = 16000;

// ──────────────────────────────────────────────────────────────
// Module-level MediaStream cache
//
// Each getUserMedia() call triggers an OS-level mic-in-use notification
// (meeting-transcription apps like Granola, Krisp, etc. fire on every
// acquisition). Caching the stream across consecutive recordings means
// one notification per session instead of one per click. The stream is
// released after CACHE_IDLE_MS of no recording activity, at which point
// the browser's red "mic in use" indicator goes away.
// ──────────────────────────────────────────────────────────────

const CACHE_IDLE_MS = 60_000;

let cachedStream: MediaStream | null = null;
let cachedDeviceId: string | undefined;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;

function streamIsLive(s: MediaStream | null): s is MediaStream {
  if (!s) return false;
  return s.getAudioTracks().some((t) => t.readyState === 'live');
}

function releaseStream(): void {
  if (releaseTimer) { clearTimeout(releaseTimer); releaseTimer = null; }
  if (cachedStream) {
    cachedStream.getTracks().forEach((t) => t.stop());
    cachedStream = null;
    cachedDeviceId = undefined;
  }
}

function scheduleRelease(): void {
  if (releaseTimer) clearTimeout(releaseTimer);
  releaseTimer = setTimeout(releaseStream, CACHE_IDLE_MS);
}

function cancelRelease(): void {
  if (releaseTimer) { clearTimeout(releaseTimer); releaseTimer = null; }
}

async function acquireStream(deviceId?: string): Promise<MediaStream> {
  cancelRelease();
  if (cachedStream && cachedDeviceId === deviceId && streamIsLive(cachedStream)) {
    return cachedStream;
  }
  if (cachedStream) releaseStream();
  const constraints: MediaTrackConstraints = deviceId
    ? { deviceId: { exact: deviceId } }
    : {};
  cachedStream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
  cachedDeviceId = deviceId;
  return cachedStream;
}

// Ensure the stream is released when the tab closes — stops the persistent
// browser "mic in use" indicator and releases the device for other apps.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', releaseStream);
}

function downsample(samples: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (outputRate >= inputRate) return samples;
  const ratio = inputRate / outputRate;
  const outLen = Math.round(samples.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const srcStart = i * ratio;
    const srcEnd = Math.min(samples.length, Math.round((i + 1) * ratio));
    let sum = 0;
    let count = 0;
    for (let j = Math.round(srcStart); j < srcEnd; j++) { sum += samples[j]; count++; }
    out[i] = count > 0 ? sum / count : 0;
  }
  return out;
}

// Encode an array of mono Float32 PCM samples as a 16-bit PCM WAV blob.
// Whisper accepts WAV natively via the filename extension / mime type.
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);          // fmt chunk size
  view.setUint16(20, 1, true);           // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);          // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export function useAudioRecording(options: UseAudioRecordingOptions = {}): UseAudioRecordingApi {
  const { deviceId } = options;
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState<RecordingError | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const samplesRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef<number>(44100);
  const startTsRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolveStopRef = useRef<((b: Blob | null) => void) | null>(null);
  const lastBlobRef = useRef<Blob | null>(null);

  const teardown = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    try { processorRef.current?.disconnect(); } catch { /* noop */ }
    try { sourceRef.current?.disconnect(); } catch { /* noop */ }
    processorRef.current = null;
    sourceRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    // Don't stop the stream tracks — they're shared across MicButtons. Schedule
    // a release for CACHE_IDLE_MS from now; if another recording starts before
    // then, the scheduled release is cancelled and the stream is reused.
    streamRef.current = null;
    scheduleRelease();
    samplesRef.current = [];
    setElapsedSec(0);
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  const finalize = useCallback(() => {
    const chunks = samplesRef.current;
    const total = chunks.reduce((s, c) => s + c.length, 0);
    const flat = new Float32Array(total);
    let offset = 0;
    for (const c of chunks) { flat.set(c, offset); offset += c.length; }
    const downsampled = downsample(flat, sampleRateRef.current, TARGET_SAMPLE_RATE);
    const blob = encodeWav(downsampled, TARGET_SAMPLE_RATE);
    lastBlobRef.current = blob;
    const resolve = resolveStopRef.current;
    resolveStopRef.current = null;
    teardown();
    setState('idle');
    if (resolve) { lastBlobRef.current = null; resolve(blob); }
  }, [teardown]);

  const start = useCallback(async () => {
    setError(null);
    setState('requesting-permission');
    try {
      const stream = await acquireStream(deviceId);
      streamRef.current = stream;

      const AudioCtx =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) throw new Error('AudioContext not supported');

      const ctx = new AudioCtx();
      ctxRef.current = ctx;
      sampleRateRef.current = ctx.sampleRate;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // ScriptProcessorNode is deprecated but still universally available.
      // Buffer size 4096 gives ~93ms chunks at 44.1 kHz — responsive enough.
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      samplesRef.current = [];

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        // Copy — the input buffer is reused by the browser.
        samplesRef.current.push(new Float32Array(input));
      };

      source.connect(processor);
      // ScriptProcessor only produces events when connected to a destination.
      // Route to a muted gain to avoid echoing audio to the user.
      const sink = ctx.createGain();
      sink.gain.value = 0;
      processor.connect(sink);
      sink.connect(ctx.destination);

      startTsRef.current = Date.now();
      lastBlobRef.current = null;
      setState('recording');

      tickRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTsRef.current) / 1000);
        setElapsedSec(elapsed);
        if (elapsed >= VOICE_LIMITS.MAX_RECORDING_SECONDS && processorRef.current) {
          finalize();
        }
      }, 250);
    } catch (err) {
      const kind = classifyError(err);
      setError({
        kind,
        message:
          kind === 'permission-denied'
            ? 'Microphone access denied'
            : 'Could not access microphone',
      });
      setState('error');
      teardown();
    }
  }, [deviceId, finalize, teardown]);

  const stop = useCallback(() => {
    return new Promise<Blob | null>((resolve) => {
      if (!processorRef.current) {
        const blob = lastBlobRef.current;
        lastBlobRef.current = null;
        resolve(blob);
        return;
      }
      resolveStopRef.current = resolve;
      finalize();
    });
  }, [finalize]);

  const reset = useCallback(() => {
    setError(null);
    setState('idle');
  }, []);

  return { state, error, elapsedSec, start, stop, reset };
}
