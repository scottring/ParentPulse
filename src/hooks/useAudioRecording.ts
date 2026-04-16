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

// MINIMAL VERSION — stripped of cleanup effect, ticker, silence detection,
// safety caps. Matches the raw recorder in the playground exactly so we can
// isolate what was causing the hook's captures to be silent.
export function useAudioRecording(options: UseAudioRecordingOptions = {}): UseAudioRecordingApi {
  const { deviceId } = options;
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState<RecordingError | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const resolveStopRef = useRef<((b: Blob | null) => void) | null>(null);
  const startTsRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBlobRef = useRef<Blob | null>(null);

  // Release mic + clear timer if the component unmounts mid-recording.
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setState('requesting-permission');
    try {
      const audioConstraints: MediaTrackConstraints = deviceId
        ? { deviceId: { exact: deviceId } }
        : {};
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        lastBlobRef.current = blob;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
        chunksRef.current = [];
        if (tickRef.current) {
          clearInterval(tickRef.current);
          tickRef.current = null;
        }
        setElapsedSec(0);
        const resolve = resolveStopRef.current;
        resolveStopRef.current = null;
        setState('idle');
        if (resolve) {
          lastBlobRef.current = null;
          resolve(blob);
        }
      };

      recorder.start();
      startTsRef.current = Date.now();
      lastBlobRef.current = null;
      setState('recording');
      tickRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTsRef.current) / 1000);
        setElapsedSec(elapsed);
        if (elapsed >= VOICE_LIMITS.MAX_RECORDING_SECONDS && recorderRef.current?.state === 'recording') {
          recorderRef.current.stop();
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
    }
  }, [deviceId]);

  const stop = useCallback(() => {
    return new Promise<Blob | null>((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state !== 'recording') {
        // Auto-stop (hard cap) may have already fired. Return that blob if present.
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
