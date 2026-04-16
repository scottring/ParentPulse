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
