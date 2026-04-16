import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type { TranscribeRequest, TranscribeResponse, RecordingError } from '@/types/voice';

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
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
