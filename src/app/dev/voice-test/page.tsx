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
