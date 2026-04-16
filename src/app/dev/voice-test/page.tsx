'use client';

import { useEffect, useRef, useState } from 'react';
import { MicButton } from '@/components/voice/MicButton';
import { useAudioRecording } from '@/hooks/useAudioRecording';

const STORAGE_KEY = 'voice:deviceId';

export default function VoiceTestPage() {
  const [text, setText] = useState('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');

  // Raw recorder state — bypasses our hook entirely for diagnostics
  const [rawRecording, setRawRecording] = useState(false);
  const [rawBlobUrl, setRawBlobUrl] = useState<string | null>(null);
  const [rawBlobSize, setRawBlobSize] = useState<number | null>(null);
  const rawRecorderRef = useRef<MediaRecorder | null>(null);
  const rawChunksRef = useRef<Blob[]>([]);
  const rawStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setDeviceId(saved);
  }, []);

  const loadDevices = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === 'audioinput'));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[voice] could not enumerate devices', err);
    }
  };

  const onPick = (id: string) => {
    setDeviceId(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  };

  const startRaw = async () => {
    setRawBlobUrl(null);
    setRawBlobSize(null);
    const audioConstraints: MediaTrackConstraints = deviceId
      ? { deviceId: { exact: deviceId } }
      : {};
    const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    rawStreamRef.current = stream;
    const recorder = new MediaRecorder(stream);
    rawChunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) rawChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(rawChunksRef.current, { type: recorder.mimeType });
      setRawBlobUrl(URL.createObjectURL(blob));
      setRawBlobSize(blob.size);
      rawStreamRef.current?.getTracks().forEach((t) => t.stop());
      rawStreamRef.current = null;
      setRawRecording(false);
    };
    rawRecorderRef.current = recorder;
    recorder.start();
    setRawRecording(true);
  };

  const stopRaw = () => {
    rawRecorderRef.current?.stop();
  };

  return (
    <main style={{ padding: 32, fontFamily: 'Georgia, serif', maxWidth: 700 }}>
      <h1>Voice input playground</h1>

      <div style={{ margin: '16px 0', fontSize: 14 }}>
        <label style={{ display: 'block', marginBottom: 4, color: '#555' }}>Input device</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={deviceId}
            onChange={(e) => onPick(e.target.value)}
            style={{ flex: 1, padding: 6, fontSize: 14 }}
          >
            <option value="">Browser default</option>
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Mic ${d.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={loadDevices}
            style={{ padding: '6px 10px', fontSize: 13, cursor: 'pointer' }}
          >
            {devices.length ? 'Refresh' : 'Load devices'}
          </button>
        </div>
      </div>

      <section style={{ border: '1px solid #d0c7b8', padding: 16, borderRadius: 8, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Diagnostic: raw recorder</h2>
        <p style={{ fontSize: 13, color: '#666' }}>
          This bypasses the MicButton and our hook. Record 5 seconds, then play it back.
          If you hear silence, the mic isn&apos;t actually capturing (system issue).
          If you hear yourself clearly, our pipeline is the problem.
        </p>
        <button
          type="button"
          onClick={rawRecording ? stopRaw : startRaw}
          style={{
            padding: '8px 16px',
            background: rawRecording ? '#C97B63' : '#8a6f4a',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          {rawRecording ? 'Stop' : 'Record'}
        </button>
        {rawBlobUrl && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
              Blob: {rawBlobSize} bytes
            </div>
            <audio src={rawBlobUrl} controls style={{ width: '100%' }} />
          </div>
        )}
      </section>

      <HookDiagnostic deviceId={deviceId || undefined} />

      <section>
        <h2 style={{ fontSize: 18 }}>Real feature: MicButton + Whisper</h2>
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
            deviceId={deviceId || undefined}
            onTranscript={(t) => setText((prev) => (prev ? `${prev} ${t}` : t))}
          />
        </div>
      </section>
    </main>
  );
}

function HookDiagnostic({ deviceId }: { deviceId?: string }) {
  const rec = useAudioRecording({ deviceId });
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobSize, setBlobSize] = useState<number | null>(null);

  const toggle = async () => {
    if (rec.state === 'recording') {
      const blob = await rec.stop();
      if (blob) {
        setBlobUrl(URL.createObjectURL(blob));
        setBlobSize(blob.size);
      }
      return;
    }
    setBlobUrl(null);
    setBlobSize(null);
    await rec.start();
  };

  return (
    <section style={{ border: '1px solid #d0c7b8', padding: 16, borderRadius: 8, marginBottom: 24 }}>
      <h2 style={{ fontSize: 18, marginTop: 0 }}>Diagnostic: hook recorder</h2>
      <p style={{ fontSize: 13, color: '#666' }}>
        Uses <code>useAudioRecording</code> (our hook) directly, bypassing MicButton + Whisper.
        Record → Stop → play it back. If this sounds silent but Raw recorder works, the hook is the bug.
      </p>
      <button
        type="button"
        onClick={toggle}
        style={{
          padding: '8px 16px',
          background: rec.state === 'recording' ? '#C97B63' : '#8a6f4a',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        {rec.state === 'recording' ? 'Stop' : 'Record'}
      </button>
      {rec.state === 'recording' && (
        <span style={{ marginLeft: 12, color: '#C97B63' }}>recording… {rec.elapsedSec}s</span>
      )}
      {blobUrl && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Blob: {blobSize} bytes</div>
          <audio src={blobUrl} controls style={{ width: '100%' }} />
        </div>
      )}
    </section>
  );
}
