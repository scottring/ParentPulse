'use client';

import type { ObstacleStatus } from '@/types/obstacle';

export interface ObstacleHeaderProps {
  title: string;
  status: ObstacleStatus;
}

const STATUS_LABEL: Record<ObstacleStatus, string> = {
  fresh: 'fresh',
  clarifying: 'clarifying',
  prescribed: 'prescribed',
  executed: 'executed',
  cleared: 'cleared',
  paused: 'paused',
};

export function ObstacleHeader({ title, status }: ObstacleHeaderProps) {
  const displayTitle = title.trim() || 'A new obstacle';
  return (
    <header
      style={{
        padding: '32px 0 16px',
        borderBottom: '1px solid rgba(120,100,70,0.12)',
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <h1
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 'clamp(28px, 4vw, 40px)',
          color: 'var(--r-ink, #2B2620)',
          margin: 0,
          lineHeight: 1.15,
        }}
      >
        {displayTitle}
      </h1>
      <span
        style={{
          fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--r-text-5, #887C68)',
        }}
      >
        {STATUS_LABEL[status]}
      </span>
    </header>
  );
}
