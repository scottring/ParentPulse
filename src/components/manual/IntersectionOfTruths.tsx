'use client';

import type { CSSProperties } from 'react';

export interface SynthesisInsight {
  headline: string;
  narrative: string;
  alignments: string[];
  divergences: string[];
}

export function IntersectionOfTruths({ insight }: { insight: SynthesisInsight | null }) {
  if (!insight) return null;
  return (
    <section style={sectionStyle} aria-label="Intersection of truths">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
        <span style={badgeStyle}>✦ Relish AI Synthesis</span>
      </div>
      <h2 style={titleStyle}>The Intersection of Truths</h2>
      <h3 style={headlineStyle}>{insight.headline}</h3>
      <p style={narrativeStyle}>{insight.narrative}</p>
      <div style={columnsStyle}>
        <Column heading="Alignments" items={insight.alignments} />
        <Column heading="Divergences" items={insight.divergences} />
      </div>
    </section>
  );
}

function Column({ heading, items }: { heading: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p style={colHeadingStyle}>{heading}</p>
      <ul style={listStyle}>
        {items.map((it, i) => <li key={i} style={liStyle}>{it}</li>)}
      </ul>
    </div>
  );
}

const sectionStyle: CSSProperties = { padding: '32px 0', maxWidth: 720, margin: '0 auto' };
const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '5px 12px',
  border: '1px solid rgba(120, 100, 70, 0.24)',
  borderRadius: 999,
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  background: 'transparent',
};
const titleStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: 30,
  letterSpacing: '-0.01em',
  color: 'var(--r-ink, #2B2620)',
  margin: '0 0 28px',
  textAlign: 'center',
};
const headlineStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: 26,
  letterSpacing: '-0.01em',
  color: 'var(--r-ink, #2B2620)',
  margin: '0 0 10px',
};
const narrativeStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontSize: 16,
  lineHeight: 1.6,
  color: 'var(--r-text-3, #5C5347)',
  margin: '0 0 24px',
  maxWidth: '60ch',
};
const columnsStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 28,
};
const colHeadingStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 10px',
};
const listStyle: CSSProperties = { margin: 0, padding: 0, listStyle: 'none' };
const liStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontSize: 15,
  lineHeight: 1.55,
  color: 'var(--r-text-2, #3A3530)',
  marginBottom: 10,
};
