'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, AlertCircle } from 'lucide-react';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { transcribeBlob } from '@/lib/transcribeClient';
import type { MicSize, RecordingError } from '@/types/voice';

interface Props {
  onTranscript: (text: string) => void;
  size?: MicSize;
  disabled?: boolean;
  className?: string;
  /** Optional audio input device ID. Falls back to browser default. */
  deviceId?: string;
}

const GLYPH_PX: Record<MicSize, number> = { sm: 14, md: 18 };
const HIT_AREA_PX = 44; // WCAG touch-target minimum (transparent padding)

export function MicButton({ onTranscript, size = 'md', disabled, className, deviceId }: Props) {
  const rec = useAudioRecording({ deviceId });
  const [postError, setPostError] = useState<RecordingError | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

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
    // eslint-disable-next-line no-console
    console.log('[voice] blob', { sizeBytes: blob.size, type: blob.type, elapsedSec: elapsed });
    // eslint-disable-next-line no-console
    console.log('[voice] playback url (copy/paste to hear):', URL.createObjectURL(blob));
    setIsTranscribing(true);
    try {
      const text = await transcribeBlob(blob, elapsed);
      // eslint-disable-next-line no-console
      console.log('[voice] transcript', JSON.stringify(text));
      if (!mountedRef.current) return;
      const trimmed = text.trim();
      if (!trimmed) {
        setPostError({ kind: 'empty', message: 'No speech detected — try again.' });
        return;
      }
      onTranscript(trimmed);
    } catch (err) {
      if (!mountedRef.current) return;
      setPostError(err as RecordingError);
    } finally {
      if (mountedRef.current) setIsTranscribing(false);
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
