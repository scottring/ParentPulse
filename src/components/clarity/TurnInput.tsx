'use client';

import { useState } from 'react';
import type { ObstacleStatus } from '@/types/obstacle';

export interface TurnInputProps {
  status: ObstacleStatus;
  sending: boolean;
  onSend: (message: string) => void;
}

export function TurnInput({ status, sending, onSend }: TurnInputProps) {
  const [value, setValue] = useState('');
  const placeholder = status === 'fresh' ? "What's getting in the way?" : 'Keep going…';
  const canSend = value.trim().length > 0 && !sending;

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  };

  return (
    <div
      style={{
        marginTop: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={4}
        disabled={sending}
        style={{
          width: '100%',
          padding: 16,
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 19,
          lineHeight: 1.5,
          color: 'var(--r-ink, #2B2620)',
          background: 'var(--r-paper, #FDFBF6)',
          border: '1px solid rgba(120,100,70,0.18)',
          borderRadius: 6,
          resize: 'vertical',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          style={{
            padding: '12px 24px',
            fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#FBF8F2',
            background: canSend ? '#14100C' : 'rgba(20,16,12,0.4)',
            border: '1px solid currentColor',
            borderRadius: 999,
            cursor: canSend ? 'pointer' : 'not-allowed',
          }}
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
