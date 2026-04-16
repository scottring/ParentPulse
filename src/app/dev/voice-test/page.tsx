'use client';

import { useEffect, useState } from 'react';
import { MicButton } from '@/components/voice/MicButton';

const STORAGE_KEY = 'voice:deviceId';

export default function VoiceTestPage() {
  const [text, setText] = useState('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setDeviceId(saved);
  }, []);

  const loadDevices = async () => {
    try {
      // getUserMedia once so labels are populated (browsers hide labels until permission is granted)
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
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <main style={{ padding: 32, fontFamily: 'Georgia, serif', maxWidth: 600 }}>
      <h1>Voice input playground</h1>
      <p>Click the mic, speak, click again to stop. Transcription appends below.</p>

      <div style={{ margin: '16px 0', fontSize: 14 }}>
        <label style={{ display: 'block', marginBottom: 4, color: '#555' }}>
          Input device
        </label>
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
        <p style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
          Click &quot;Load devices&quot; first — browsers only expose mic labels after permission is granted.
        </p>
      </div>

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
    </main>
  );
}
