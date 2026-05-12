'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';

export interface CurrentFocus {
  title: string;
  body: string;
  experimentLabel: string;
  actionHref: string;
}

export function CurrentFocusCard({ focus }: { focus: CurrentFocus | null }) {
  if (!focus) return null;
  return (
    <section aria-label="Current focus" style={sectionStyle}>
      <p style={eyebrowStyle}>Current Focus</p>
      <article style={cardStyle}>
        <h3 style={titleStyle}>{focus.title}</h3>
        <p style={bodyStyle}>{focus.body}</p>
        <p style={metaStyle}>
          This micro-action stems from your <em style={{ fontStyle: 'italic' }}>{focus.experimentLabel}</em>.
        </p>
        <Link href={focus.actionHref} style={ctaStyle}>Complete Action</Link>
      </article>
    </section>
  );
}

const sectionStyle: CSSProperties = { maxWidth: 1080, margin: '0 auto 24px' };
const eyebrowStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 10px',
};
const cardStyle: CSSProperties = {
  background: 'rgba(124, 144, 130, 0.10)',
  border: '1px solid rgba(124, 144, 130, 0.24)',
  borderRadius: 8,
  padding: '22px 26px',
};
const titleStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontSize: 22,
  color: 'var(--r-ink, #2B2620)',
  margin: '0 0 8px',
};
const bodyStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 15,
  lineHeight: 1.55,
  color: 'var(--r-text-2, #3A3530)',
  margin: '0 0 8px',
};
const metaStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontSize: 14,
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 16px',
};
const ctaStyle: CSSProperties = {
  display: 'inline-block',
  padding: '10px 16px',
  background: 'transparent',
  border: '1px solid var(--r-ink, #2B2620)',
  borderRadius: 4,
  color: 'var(--r-ink, #2B2620)',
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  textDecoration: 'none',
};
