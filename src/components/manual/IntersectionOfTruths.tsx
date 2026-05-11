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
      <div style={calloutStyle}>
        <h3 style={calloutHeadlineStyle}>{insight.headline}</h3>
        <p style={calloutNarrativeStyle}>{insight.narrative}</p>
      </div>
      <div style={columnsStyle}>
        <Column heading="Alignments" items={insight.alignments} tone="alignment" />
        <Column heading="Divergences" items={insight.divergences} tone="divergence" />
      </div>
    </section>
  );
}

function Column({ heading, items, tone }: { heading: string; items: string[]; tone: 'alignment' | 'divergence' }) {
  if (!items.length) return null;
  return (
    <div>
      <p style={colHeadingStyle}>
        <span aria-hidden style={iconWrapStyle}>
          {tone === 'alignment' ? <AlignmentIcon /> : <DivergenceIcon />}
        </span>
        {heading}
      </p>
      <ul style={listStyle}>
        {items.map((it, i) => <li key={i} style={liStyle}>{it}</li>)}
      </ul>
    </div>
  );
}

function AlignmentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3.5 9.5 L6 12 L10.5 5.5" stroke="#7C9082" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function DivergenceIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3.5 3.5 L10.5 10.5 M10.5 3.5 L3.5 10.5" stroke="#C97A6B" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
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
const calloutStyle: CSSProperties = {
  background: 'rgba(212, 168, 168, 0.10)',
  border: '1px solid rgba(212, 168, 168, 0.28)',
  borderRadius: 8,
  padding: '24px 28px',
  margin: '0 auto 36px',
  maxWidth: 520,
  textAlign: 'center',
};
const calloutHeadlineStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: 22,
  color: 'var(--r-ink, #2B2620)',
  margin: '0 0 10px',
};
const calloutNarrativeStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontSize: 15,
  lineHeight: 1.55,
  color: 'var(--r-text-3, #5C5347)',
  margin: 0,
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
const iconWrapStyle: CSSProperties = {
  display: 'inline-flex',
  marginRight: 6,
  verticalAlign: 'middle',
};
const listStyle: CSSProperties = { margin: 0, padding: 0, listStyle: 'none' };
const liStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontSize: 15,
  lineHeight: 1.55,
  color: 'var(--r-text-2, #3A3530)',
  marginBottom: 10,
};
