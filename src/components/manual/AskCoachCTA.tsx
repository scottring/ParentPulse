'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';

export interface AskCoachCTAProps {
  personId: string;
  firstName: string;
  entryCount: number;
  contributionCount: number;
  sampleQuestions?: [string, string];
}

export function AskCoachCTA({
  personId,
  firstName,
  entryCount,
  contributionCount,
  sampleQuestions = [
    `What might ${firstName} be holding back?`,
    `What's the next conversation worth having?`,
  ],
}: AskCoachCTAProps) {
  return (
    <section style={sectionStyle} aria-label={`Ask the Coach about ${firstName}`}>
      <article style={cardStyle}>
        <p style={eyebrowStyle}>Ask the Coach about {firstName}</p>
        <p style={statStyle}>
          The Coach has synthesized {entryCount} {entryCount === 1 ? 'entry' : 'entries'} and {contributionCount} {contributionCount === 1 ? 'contribution' : 'contributions'} to help you navigate your relationship with {firstName}.
        </p>
        <ul style={qListStyle}>
          {sampleQuestions.map((q, i) => (
            <li key={i} style={qLiStyle}>&ldquo;{q}&rdquo;</li>
          ))}
        </ul>
        <Link
          href={`/coach?personId=${personId}&name=${encodeURIComponent(firstName)}`}
          style={ctaStyle}
        >
          Start Reflection <span aria-hidden style={{ marginLeft: 6 }}>⟶</span>
        </Link>
      </article>
    </section>
  );
}

const sectionStyle: CSSProperties = { padding: '32px 0', maxWidth: 720, margin: '0 auto' };
const cardStyle: CSSProperties = {
  background: 'var(--r-leather, #14100C)',
  color: 'var(--r-cream, #FAF8F3)',
  borderRadius: 8,
  padding: '28px 30px',
};
const eyebrowStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontSize: 22,
  color: 'var(--r-cream, #FAF8F3)',
  margin: '0 0 14px',
};
const statStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 14,
  lineHeight: 1.55,
  color: 'rgba(250, 248, 243, 0.78)',
  margin: '0 0 18px',
  maxWidth: '52ch',
};
const qListStyle: CSSProperties = { margin: '0 0 22px', padding: 0, listStyle: 'none' };
const qLiStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontSize: 16,
  color: 'rgba(250, 248, 243, 0.88)',
  marginBottom: 6,
};
const ctaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: 6,
  padding: '12px 22px',
  background: 'var(--r-cream, #FAF8F3)',
  color: 'var(--r-ink, #14100C)',
  borderRadius: 999,
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  textDecoration: 'none',
};
