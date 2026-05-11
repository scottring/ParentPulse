'use client';

import type { CSSProperties } from 'react';

export type PerspectiveTint = 'rose' | 'sage' | 'azure' | 'neutral';

export interface Perspective {
  id: string;
  label: string;
  pullQuote: string;
  tint: PerspectiveTint;
}

const TINT_BG: Record<PerspectiveTint, string> = {
  rose:    'rgba(212, 168, 168, 0.18)',
  sage:    'rgba(124, 144, 130, 0.18)',
  azure:   'rgba(146, 168, 192, 0.18)',
  neutral: 'rgba(120, 100, 70, 0.08)',
};

const TINT_BORDER: Record<PerspectiveTint, string> = {
  rose:    'rgba(212, 168, 168, 0.34)',
  sage:    'rgba(124, 144, 130, 0.34)',
  azure:   'rgba(146, 168, 192, 0.34)',
  neutral: 'rgba(120, 100, 70, 0.18)',
};

export function PerspectiveLayers({ perspectives }: { perspectives: Perspective[] }) {
  if (!perspectives.length) return null;
  return (
    <section style={sectionStyle} aria-label="Perspective layers">
      <p style={eyebrowStyle}>Perspective Layers</p>
      <div style={stackStyle}>
        {perspectives.map((p) => (
          <article key={p.id} style={cardStyle(p.tint)}>
            <p style={labelStyle}>{p.label}</p>
            <blockquote style={quoteStyle}>{p.pullQuote}</blockquote>
          </article>
        ))}
      </div>
    </section>
  );
}

const sectionStyle: CSSProperties = { padding: '32px 0', maxWidth: 720, margin: '0 auto' };
const eyebrowStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 18px',
};
const stackStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14 };
function cardStyle(tint: PerspectiveTint): CSSProperties {
  return {
    background: TINT_BG[tint],
    border: `1px solid ${TINT_BORDER[tint]}`,
    borderRadius: 8,
    padding: '20px 22px',
  };
}
const labelStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 8px',
};
const quoteStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontSize: 17,
  lineHeight: 1.55,
  color: 'var(--r-ink, #2B2620)',
  margin: 0,
  maxWidth: '54ch',
};
