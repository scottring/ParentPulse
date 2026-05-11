'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';

export interface JournalSuggestion {
  /** Excerpt from a recent journal entry that triggered the suggestion. */
  excerpt: string;
  /** Date label for the entry (e.g., "Tuesday"). */
  excerptDate: string;
  /** AI-derived suggestion text. */
  suggestion: string;
  /** Action label, e.g., "Refine Ritual". */
  ctaLabel: string;
  /** Action target. */
  ctaHref: string;
}

export function InspiredByJournalCard({ suggestion }: { suggestion: JournalSuggestion | null }) {
  if (!suggestion) return null;
  return (
    <section aria-label="Inspired by your journal" style={sectionStyle}>
      <article style={cardStyle}>
        <p style={eyebrowStyle}>Inspired by your Journal</p>
        <p style={bodyStyle}>
          Your entry from <em style={{ fontStyle: 'italic' }}>{suggestion.excerptDate}</em> mentioned <em style={{ fontStyle: 'italic' }}>&ldquo;{suggestion.excerpt}&rdquo;</em>. {suggestion.suggestion}
        </p>
        <Link href={suggestion.ctaHref} style={ctaStyle}>{suggestion.ctaLabel}</Link>
      </article>
    </section>
  );
}

const sectionStyle: CSSProperties = { maxWidth: 1080, margin: '32px auto 0' };
const cardStyle: CSSProperties = { background: 'var(--r-paper, #FDFBF6)', border: '1px solid rgba(120, 100, 70, 0.18)', borderRadius: 8, padding: '22px 26px' };
const eyebrowStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--r-text-4, #6B6254)', margin: '0 0 12px' };
const bodyStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontSize: 16, lineHeight: 1.6, color: 'var(--r-text-2, #3A3530)', margin: '0 0 16px' };
const ctaStyle: CSSProperties = { display: 'inline-block', padding: '10px 16px', background: 'transparent', border: '1px solid var(--r-ink, #2B2620)', borderRadius: 4, color: 'var(--r-ink, #2B2620)', fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' };
