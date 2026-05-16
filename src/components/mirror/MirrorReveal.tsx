'use client';

import type { MirrorAnswer } from '@/types/mirror';

export function MirrorReveal({
  answers,
  mirrorLine,
  onDone,
}: {
  answers: MirrorAnswer[];
  mirrorLine: string;
  onDone: () => void;
}) {
  return (
    <div style={{ padding: 24, maxWidth: 620, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {answers.map((a) => (
          <div
            key={a.participantId}
            style={{
              flex: '1 1 240px',
              border: '1px solid var(--parent-border)',
              borderRadius: 14,
              padding: 16,
            }}
          >
            <div style={{ color: 'var(--parent-text-light)', fontSize: 13 }}>{a.label}</div>
            <div
              style={{
                fontFamily: 'var(--font-parent-display)',
                fontStyle: 'italic',
                fontSize: 19,
                marginTop: 6,
              }}
            >
              {a.text}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 24,
          padding: 20,
          borderRadius: 14,
          background: 'var(--parent-accent)',
          color: '#fff',
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.85 }}>What it looks like together</div>
        <p style={{ fontFamily: 'var(--font-parent-display)', fontSize: 21, marginTop: 8 }}>
          {mirrorLine}
        </p>
      </div>

      <button
        onClick={onDone}
        style={{
          marginTop: 24,
          padding: '12px 20px',
          borderRadius: 12,
          border: '1px solid var(--parent-border)',
          background: 'transparent',
          color: 'var(--parent-text)',
          fontSize: 16,
        }}
      >
        Goodnight
      </button>
    </div>
  );
}
