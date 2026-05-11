'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useGrowthFeed } from '@/hooks/useGrowthFeed';

export function ExperimentsColumn() {
  const { arcGroups, loading } = useGrowthFeed();
  if (loading) return <aside style={colStyle}><p style={mutedStyle}>Loading…</p></aside>;

  const active = arcGroups[0];
  if (!active) {
    return (
      <aside style={colStyle}>
        <p style={eyebrowStyle}>Experiments</p>
        <p style={emptyStyle}>No active experiments yet.</p>
      </aside>
    );
  }

  const arc = active.arc;
  const next = active.activeItems[0];

  return (
    <aside style={colStyle}>
      <p style={eyebrowStyle}>Experiments</p>
      <p style={subEyebrowStyle}>Iterative living</p>
      <article style={hypothesisCardStyle}>
        <p style={hypothesisEyebrowStyle}>Active Hypothesis</p>
        <p style={hypothesisStatementStyle}>{arc.outcomeStatement ?? arc.title}</p>
        <div style={progressBarStyle} aria-hidden>
          <div style={{ ...progressFillStyle, width: `${Math.min(100, Math.max(0, active.progress))}%` }} />
        </div>
        <p style={progressTextStyle}>
          Day {arc.currentWeek ?? '?'} of {arc.durationWeeks ?? '?'}
        </p>
        {next && (
          <Link href={`/experiments/${next.growthItemId}`} style={recordCtaStyle}>
            Record Observation
          </Link>
        )}
      </article>

      <p style={discoveryEyebrowStyle}>Recent Discovery</p>
      <Link href={`/experiments/arc/${arc.arcId}`} style={discoveryRowStyle}>
        {next?.title ?? arc.title}
        <span aria-hidden style={{ marginLeft: 8 }}>›</span>
      </Link>
    </aside>
  );
}

const colStyle: CSSProperties = {};
const eyebrowStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--r-text-4, #6B6254)', margin: '0 0 4px' };
const subEyebrowStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--r-text-4, #6B6254)', margin: '0 0 16px' };
const hypothesisCardStyle: CSSProperties = { background: 'rgba(120, 100, 70, 0.06)', border: '1px solid rgba(120, 100, 70, 0.18)', borderRadius: 8, padding: '22px 24px', marginBottom: 28 };
const hypothesisEyebrowStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--r-text-4, #6B6254)', margin: '0 0 10px' };
const hypothesisStatementStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontSize: 17, lineHeight: 1.5, color: 'var(--r-ink, #2B2620)', margin: '0 0 18px' };
const progressBarStyle: CSSProperties = { height: 4, background: 'rgba(60, 48, 28, 0.08)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 };
const progressFillStyle: CSSProperties = { height: '100%', background: 'var(--r-sage, #7C9082)', transition: 'width 420ms ease' };
const progressTextStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 11, letterSpacing: '0.12em', color: 'var(--r-text-5, #8A7B5F)', margin: '0 0 16px' };
const recordCtaStyle: CSSProperties = { display: 'inline-block', padding: '10px 16px', background: 'var(--r-ink, #2B2620)', color: 'var(--r-cream, #FAF8F3)', borderRadius: 4, fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' };
const discoveryEyebrowStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--r-text-4, #6B6254)', margin: '0 0 10px' };
const discoveryRowStyle: CSSProperties = { display: 'block', padding: '14px 16px', background: 'var(--r-paper, #FDFBF6)', border: '1px solid rgba(120, 100, 70, 0.18)', borderRadius: 6, fontFamily: 'var(--r-serif, Georgia, serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--r-ink, #2B2620)', textDecoration: 'none' };
const mutedStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontStyle: 'italic', color: 'var(--r-text-4, #6B6254)' };
const emptyStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontStyle: 'italic', color: 'var(--r-text-4, #6B6254)' };
