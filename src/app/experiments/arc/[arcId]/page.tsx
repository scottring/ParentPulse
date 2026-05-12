'use client';
/* ================================================================
   /experiments/arc/[arcId] — arc overview page.

   Shows the experiment's hypothesis, current phase, progress, and
   item lists (active + completed). Each item links to the per-item
   workspace at /experiments/[itemId] where the actual action happens.
   ================================================================ */

import { use, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useGrowthFeed } from '@/hooks/useGrowthFeed';
import type { ArcPhase } from '@/types/growth-arc';
import type { GrowthItem } from '@/types/growth';

const PHASE_LABEL: Record<ArcPhase, string> = {
  awareness: 'Awareness',
  practice: 'Practice',
  integration: 'Integration',
};

export default function ArcOverviewPage({ params }: { params: Promise<{ arcId: string }> }) {
  const { arcId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { arcGroups, loading } = useGrowthFeed();

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const group = useMemo(() => arcGroups.find((g) => g.arc.arcId === arcId), [arcGroups, arcId]);

  if (authLoading || loading) {
    return <main style={appStyle}><div style={pageStyle}><p style={mutedStyle}>Opening…</p></div></main>;
  }
  if (!user) return null;
  if (!group) {
    return (
      <main style={appStyle}>
        <div style={pageStyle}>
          <p style={mutedStyle}>This experiment isn&rsquo;t loading. <Link href="/experiments" style={linkInlineStyle}>Back to Experiments ⟶</Link></p>
        </div>
      </main>
    );
  }

  const { arc, activeItems, completedItems, progress } = group;
  const phaseLabel = PHASE_LABEL[arc.currentPhase] || '';
  const phaseDef = arc.phases?.find((p) => p.phase === arc.currentPhase);

  return (
    <main style={appStyle}>
      <div style={pageStyle}>
        <header style={headerStyle}>
          <Link href="/experiments" style={backLinkStyle}>← Experiments</Link>
          <div style={titleRowStyle}>
            {arc.emoji && <span aria-hidden style={emojiStyle}>{arc.emoji}</span>}
            <div>
              <h1 style={titleStyle}>{arc.title}</h1>
              {arc.subtitle && <p style={subtitleStyle}>{arc.subtitle}</p>}
            </div>
          </div>
          <div style={chipRowStyle}>
            <span style={phaseChipStyle}>
              {phaseLabel}
              {typeof arc.currentWeek === 'number' && arc.durationWeeks
                ? ` · Week ${arc.currentWeek} of ${arc.durationWeeks}`
                : ''}
            </span>
          </div>
        </header>

        {arc.outcomeStatement && (
          <section style={hypothesisCardStyle}>
            <p style={hypothesisEyebrowStyle}>When this experiment graduates</p>
            <p style={hypothesisStatementStyle}><em>{arc.outcomeStatement}</em></p>
          </section>
        )}

        {phaseDef?.description && (
          <section style={phaseSectionStyle}>
            <p style={sectionEyebrowStyle}>What this phase is for</p>
            <p style={phaseDescStyle}><em>{phaseDef.description}</em></p>
          </section>
        )}

        <section style={progressSectionStyle}>
          <p style={sectionEyebrowStyle}>Progress</p>
          <div style={progressBarStyle} aria-hidden>
            <div style={{ ...progressFillStyle, width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
          <p style={progressTextStyle}>
            {progress}% — {arc.completedItemCount ?? 0} of {arc.totalItemCount ?? 0} moments completed
          </p>
        </section>

        {activeItems.length > 0 && (
          <section style={listSectionStyle}>
            <p style={sectionEyebrowStyle}>Up next</p>
            <ul style={listStyle}>
              {activeItems.map((it, i) => (
                <ItemRow key={it.growthItemId} item={it} primary={i === 0} />
              ))}
            </ul>
          </section>
        )}

        {completedItems.length > 0 && (
          <section style={listSectionStyle}>
            <p style={sectionEyebrowStyle}>Already done</p>
            <ul style={listStyle}>
              {completedItems.map((it) => (
                <ItemRow key={it.growthItemId} item={it} primary={false} />
              ))}
            </ul>
          </section>
        )}

        {activeItems.length === 0 && completedItems.length === 0 && (
          <p style={emptyStyle}>
            <em>No moments queued for this experiment yet.</em> When one becomes available it&rsquo;ll appear here.
          </p>
        )}
      </div>
    </main>
  );
}

function ItemRow({ item, primary }: { item: GrowthItem; primary: boolean }) {
  const done = item.status === 'completed';
  return (
    <li>
      <Link
        href={`/experiments/${item.growthItemId}`}
        style={itemLinkStyle(primary, done)}
      >
        <div style={itemMetaStyle}>
          {done && <span aria-hidden style={checkStyle}>✓</span>}
          <span style={itemTitleStyle(done)}>{item.title || 'Untitled moment'}</span>
        </div>
        {!done && <span aria-hidden style={arrowStyle}>⟶</span>}
      </Link>
    </li>
  );
}

const appStyle: CSSProperties = { minHeight: '100vh', background: 'var(--r-cream, #F7F5F0)' };
const pageStyle: CSSProperties = { maxWidth: 760, margin: '0 auto', padding: '40px 32px 96px' };
const mutedStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontStyle: 'italic', color: 'var(--r-text-4, #6B6254)' };
const linkInlineStyle: CSSProperties = { color: 'var(--r-ink, #2B2620)', borderBottom: '1px solid var(--r-ink)', textDecoration: 'none', paddingBottom: 1 };

const headerStyle: CSSProperties = { marginBottom: 36 };
const backLinkStyle: CSSProperties = {
  display: 'inline-block',
  marginBottom: 18,
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  textDecoration: 'none',
};
const titleRowStyle: CSSProperties = { display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 12 };
const emojiStyle: CSSProperties = { fontSize: 32, lineHeight: 1 };
const titleStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: 'clamp(32px, 4.5vw, 44px)',
  letterSpacing: '-0.01em',
  color: 'var(--r-ink, #2B2620)',
  margin: 0,
};
const subtitleStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontSize: 17,
  lineHeight: 1.45,
  color: 'var(--r-text-3, #5C5347)',
  margin: '6px 0 0',
};
const chipRowStyle: CSSProperties = { display: 'flex', gap: 8 };
const phaseChipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 12px',
  borderRadius: 999,
  background: 'rgba(120, 100, 70, 0.08)',
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--r-text-3, #5C5347)',
};

const hypothesisCardStyle: CSSProperties = {
  background: 'rgba(124, 144, 130, 0.10)',
  border: '1px solid rgba(124, 144, 130, 0.22)',
  borderRadius: 8,
  padding: '22px 26px',
  marginBottom: 32,
};
const hypothesisEyebrowStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 10px',
};
const hypothesisStatementStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontSize: 18,
  lineHeight: 1.5,
  color: 'var(--r-ink, #2B2620)',
  margin: 0,
};

const phaseSectionStyle: CSSProperties = { marginBottom: 32 };
const phaseDescStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontSize: 16,
  lineHeight: 1.55,
  color: 'var(--r-text-3, #5C5347)',
  margin: 0,
  maxWidth: '62ch',
};

const progressSectionStyle: CSSProperties = { marginBottom: 40 };
const progressBarStyle: CSSProperties = {
  height: 4,
  background: 'rgba(60, 48, 28, 0.08)',
  borderRadius: 2,
  overflow: 'hidden',
  margin: '0 0 8px',
};
const progressFillStyle: CSSProperties = {
  height: '100%',
  background: 'var(--r-sage, #7C9082)',
  transition: 'width 420ms ease',
};
const progressTextStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 11,
  letterSpacing: '0.12em',
  color: 'var(--r-text-5, #8A7B5F)',
  margin: 0,
};

const listSectionStyle: CSSProperties = { marginBottom: 32 };
const sectionEyebrowStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 14px',
};
const listStyle: CSSProperties = { listStyle: 'none', margin: 0, padding: 0 };
function itemLinkStyle(primary: boolean, done: boolean): CSSProperties {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    background: primary && !done ? 'var(--r-paper, #FDFBF6)' : 'transparent',
    border: primary && !done ? '1px solid rgba(120, 100, 70, 0.18)' : '1px solid transparent',
    borderBottom: '1px solid rgba(120, 100, 70, 0.10)',
    borderRadius: primary && !done ? 6 : 0,
    textDecoration: 'none',
    color: 'inherit',
    opacity: done ? 0.7 : 1,
    marginBottom: primary && !done ? 8 : 0,
  };
}
const itemMetaStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 };
const checkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 18,
  height: 18,
  borderRadius: '50%',
  background: 'var(--r-sage, #7C9082)',
  color: 'white',
  fontSize: 11,
};
function itemTitleStyle(done: boolean): CSSProperties {
  return {
    fontFamily: 'var(--r-serif, Georgia, serif)',
    fontSize: 17,
    color: done ? 'var(--r-text-4, #6B6254)' : 'var(--r-ink, #2B2620)',
    textDecoration: done ? 'line-through' : 'none',
  };
}
const arrowStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 14, color: 'var(--r-text-4, #6B6254)' };
const emptyStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontSize: 16,
  lineHeight: 1.6,
  color: 'var(--r-text-3, #5C5347)',
  marginTop: 24,
};
