'use client';

import { useState } from 'react';
import { MicButton } from '@/components/voice/MicButton';
import { renderMirrorPrompt } from '@/lib/mirror/prompt';

export function MirrorTurn({
  answererLabel,
  otherLabel,
  onSubmit,
}: {
  answererLabel: string;
  otherLabel: string;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const prompt = renderMirrorPrompt(otherLabel);

  return (
    <div style={{ padding: 24, maxWidth: 560, margin: '0 auto' }}>
      <p style={{ color: 'var(--parent-text-light)', fontSize: 14 }}>
        {answererLabel}, just you. {otherLabel} won’t see this until you both finish.
      </p>
      <h2 style={{ fontFamily: 'var(--font-parent-display)', fontSize: 24, margin: '12px 0 20px' }}>
        {prompt}
      </h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        autoFocus
        style={{
          width: '100%',
          fontFamily: 'var(--font-parent-display)',
          fontStyle: 'italic',
          fontSize: 18,
          padding: 12,
          borderRadius: 12,
          border: '1px solid var(--parent-border)',
        }}
        placeholder="An animal, and what it’s doing…"
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <MicButton onTranscript={(t) => setText((prev) => (prev ? `${prev} ${t}` : t))} />
        <button
          disabled={!text.trim()}
          onClick={() => onSubmit(text.trim())}
          style={{
            padding: '12px 20px',
            borderRadius: 12,
            border: 'none',
            background: text.trim() ? 'var(--parent-accent)' : 'var(--parent-border)',
            color: '#fff',
            fontSize: 16,
          }}
        >
          Done — hide it
        </button>
      </div>
    </div>
  );
}
