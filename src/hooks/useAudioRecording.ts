import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RecordingState,
  RecordingError,
  RecordingErrorKind,
  VOICE_LIMITS,
  RECORDING_TUNING,
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

export interface UseAudioRecordingOptions {
  /** If set, requests audio from this specific device. Otherwise uses the browser default. */
  deviceId?: string;
}

export function useAudioRecording(options: UseAudioRecordingOptions = {}): UseAudioRecordingApi {
  const { deviceId } = options;
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState<RecordingError | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTsRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolveStopRef = useRef<((b: Blob | null) => void) | null>(null);
  const lastBlobRef = useRef<Blob | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rmsBufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);
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
    rmsBufferRef.current = null;
    silenceStartRef.current = null;
    setElapsedSec(0);
  }, []);

  function computeRms(analyser: AnalyserNode, buf: Float32Array<ArrayBuffer>): number {
    analyser.getFloatTimeDomainData(buf);
    let sumSq = 0;
    for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
    return Math.sqrt(sumSq / buf.length);
  }

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    lastBlobRef.current = null;
    setError(null);
    setState('requesting-permission');
    try {
      const audioConstraints: MediaTrackConstraints = deviceId
        ? { deviceId: { exact: deviceId } }
        : {};
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
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
        lastBlobRef.current = blob;
        const resolve = resolveStopRef.current;
        resolveStopRef.current = null;
        cleanup();
        setState('idle');
        if (resolve) {
          lastBlobRef.current = null;
          resolve(blob);
        }
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
          rmsBufferRef.current = new Float32Array(new ArrayBuffer(analyser.fftSize * 4));
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
        const rmsBuf = rmsBufferRef.current;
        if (analyser && rmsBuf) {
          const rms = computeRms(analyser, rmsBuf);
          if (rms < RECORDING_TUNING.SILENCE_RMS_THRESHOLD) {
            if (silenceStartRef.current == null) silenceStartRef.current = now;
            const silentFor = (now - silenceStartRef.current) / 1000;
            if (silentFor >= RECORDING_TUNING.SILENCE_AUTO_STOP_SECONDS) {
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
        const blob = lastBlobRef.current;
        lastBlobRef.current = null;
        resolve(blob);
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
