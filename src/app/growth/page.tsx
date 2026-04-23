'use client';

/* ================================================================
   Relish · /growth — the Growth Hub front door.
   Lists active growth arcs (grouped by domain), shows phase +
   progress, and links into the existing /growth/[itemId] detail
   route. Empty state invites the user to start an arc from their
   next assessment.
   ================================================================ */

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useGrowthFeed } from '@/hooks/useGrowthFeed';
import type { GrowthArc, ArcPhase } from '@/types/growth-arc';
import type { GrowthItem } from '@/types/growth';

/* Domain labels — read from the first arc in each domain bucket. */
const DOMAIN_LABELS: Record<string, string> = {
  connection: 'Connection',
  communication: 'Communication',
  values_meaning: 'Values & meaning',
  household_logistics: 'Household',
  play_joy: 'Play & joy',
  growth_self: 'Growth of self',
  intimacy: 'Intimacy',
};

const PHASE_LABEL: Record<ArcPhase, string> = {
  awareness: 'Awareness',
  practice: 'Practice',
  integration: 'Integration',
};

export default function Page() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { arcGroups, loading: feedLoading } = useGrowthFeed();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  const byDomain = useMemo(() => {
    const m = new Map<string, typeof arcGroups>();
    for (const g of arcGroups) {
      const dom = g.arc.domain || 'other';
      if (!m.has(dom)) m.set(dom, []);
      m.get(dom)!.push(g);
    }
    return Array.from(m.entries());
  }, [arcGroups]);

  if (loading || !user) {
    return (
      <main className="growth-app">
        <div className="growth-page" aria-busy="true" />
        <style jsx global>{styles}</style>
      </main>
    );
  }

  return (
    <main className="growth-app">
      <div className="growth-page">
        <header className="growth-head">
          <h1 className="growth-title">
            <em>Growth.</em>
          </h1>
          <p className="growth-lede">
            A <em>growth arc</em> is a short, structured stretch of work — a
            handful of weeks aimed at one part of your relationship, informed
            by what you and your family have already written.
          </p>
        </header>

        {feedLoading ? (
          <p className="growth-muted">Loading…</p>
        ) : arcGroups.length === 0 ? (
          <section className="growth-empty">
            <p className="growth-empty-title">
              <em>Nothing active yet.</em>
            </p>
            <p className="growth-empty-body">
              Arcs are born from assessments — the 20 relationship
              dimensions Relish tracks quietly in the background. When one
              dimension has enough signal to work on, a new arc will appear
              here. In the meantime, keep writing.
            </p>
            <div className="growth-empty-ctas">
              <Link href="/workbook" className="growth-cta">
                Back to the Workbook <span aria-hidden>⟶</span>
              </Link>
            </div>
          </section>
        ) : (
          <section className="arc-sections">
            {byDomain.map(([domain, groups]) => (
              <div key={domain} className="arc-section">
                <h2 className="arc-section-title">
                  {DOMAIN_LABELS[domain] || domain}
                </h2>
                <ul className="arc-list">
                  {groups.map((g) => (
                    <ArcCard
                      key={g.arc.arcId}
                      arc={g.arc}
                      progress={g.progress}
                      activeItems={g.activeItems}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}
      </div>
      <style jsx global>{styles}</style>
    </main>
  );
}

function ArcCard({
  arc,
  progress,
  activeItems,
}: {
  arc: GrowthArc;
  progress: number;
  activeItems: GrowthItem[];
}) {
  const next = activeItems[0];
  const phaseLabel = PHASE_LABEL[arc.currentPhase] || '';
  const phaseDef = arc.phases?.find((p) => p.phase === arc.currentPhase);
  return (
    <li className="arc-card">
      <div className="arc-card-head">
        <div className="arc-card-head-left">
          {arc.emoji && <span className="arc-emoji" aria-hidden>{arc.emoji}</span>}
          <div>
            <h3 className="arc-title">{arc.title}</h3>
            {arc.subtitle && <p className="arc-subtitle">{arc.subtitle}</p>}
          </div>
        </div>
        <span className="arc-phase-chip">
          {phaseLabel}
          {typeof arc.currentWeek === 'number' && arc.durationWeeks
            ? ` · week ${arc.currentWeek} of ${arc.durationWeeks}`
            : ''}
        </span>
      </div>

      <div className="arc-progress" aria-hidden="true">
        <div
          className="arc-progress-fill"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <p className="arc-progress-text">
        {progress}% — {arc.completedItemCount || 0} of{' '}
        {arc.totalItemCount || 0} moments completed
      </p>

      {phaseDef?.description && (
        <p className="arc-phase-desc">
          <em>{phaseDef.description}</em>
        </p>
      )}

      {next && (
        <div className="arc-next">
          <span className="arc-next-eyebrow">Next</span>
          <Link
            href={`/growth/${next.growthItemId}`}
            className="arc-next-link"
          >
            {next.title || 'Continue the arc'}{' '}
            <span aria-hidden>⟶</span>
          </Link>
        </div>
      )}

      {arc.outcomeStatement && (
        <p className="arc-outcome">
          When this arc graduates: <em>{arc.outcomeStatement}</em>
        </p>
      )}
    </li>
  );
}

const styles = `
  .growth-app {
    min-height: 100vh;
    background: var(--r-cream, #F7F5F0);
  }
  .growth-page {
    max-width: 1080px;
    margin: 0 auto;
    padding: 104px 40px 80px;
  }
  .growth-head {
    margin: 0 0 48px;
    padding: 0 0 24px;
    border-bottom: 1px solid var(--r-rule-5, rgba(60,48,28,0.08));
  }
  .growth-title {
    font-family: var(--r-serif);
    font-weight: 400;
    font-size: 72px;
    line-height: 1.02;
    letter-spacing: -0.025em;
    color: var(--r-ink);
    margin: 0 0 12px;
  }
  .growth-title em { font-style: italic; }
  .growth-lede {
    font-family: var(--r-serif);
    font-size: 19px;
    line-height: 1.55;
    color: var(--r-text-3, #4a4139);
    max-width: 58ch;
    margin: 0;
  }
  .growth-lede em { font-style: italic; color: var(--r-ink); }

  .growth-muted {
    font-family: var(--r-serif);
    font-style: italic;
    color: var(--r-text-4, #6B6254);
  }

  .growth-empty {
    background: var(--r-paper, #FDFBF6);
    border: 1px solid var(--r-rule-4, rgba(60,48,28,0.12));
    border-radius: 2px;
    padding: 40px 36px;
    max-width: 640px;
  }
  .growth-empty-title {
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 28px;
    color: var(--r-ink);
    margin: 0 0 12px;
  }
  .growth-empty-body {
    font-family: var(--r-serif);
    font-size: 17px;
    line-height: 1.6;
    color: var(--r-text-3, #4a4139);
    max-width: 54ch;
    margin: 0 0 20px;
  }
  .growth-empty-ctas { display: flex; gap: 16px; flex-wrap: wrap; }
  .growth-cta {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    font-family: var(--r-sans);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--r-ink);
    text-decoration: none;
    padding: 10px 18px;
    border: 1px solid var(--r-ink);
    border-radius: 2px;
    transition: background 160ms ease, color 160ms ease;
  }
  .growth-cta:hover {
    background: var(--r-ink);
    color: var(--r-cream, #F7F5F0);
  }

  .arc-sections {
    display: flex;
    flex-direction: column;
    gap: 56px;
  }
  .arc-section-title {
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--r-text-5, #8A7B5F);
    margin: 0 0 18px;
  }
  .arc-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 18px;
  }

  .arc-card {
    background: var(--r-paper);
    border: 1px solid var(--r-rule-4);
    border-radius: 2px;
    padding: 26px 28px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .arc-card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    flex-wrap: wrap;
  }
  .arc-card-head-left {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    min-width: 0;
  }
  .arc-emoji {
    font-size: 28px;
    line-height: 1;
    flex: none;
  }
  .arc-title {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 26px;
    line-height: 1.2;
    color: var(--r-ink);
    margin: 0;
    letter-spacing: -0.01em;
  }
  .arc-subtitle {
    font-family: var(--r-serif);
    font-size: 16px;
    color: var(--r-text-3, #4a4139);
    margin: 4px 0 0;
    line-height: 1.5;
  }
  .arc-phase-chip {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-4);
    background: rgba(124,144,130,0.08);
    padding: 6px 10px;
    border-radius: 2px;
    flex: none;
  }

  .arc-progress {
    height: 4px;
    background: rgba(60,48,28,0.08);
    border-radius: 2px;
    overflow: hidden;
    margin-top: 4px;
  }
  .arc-progress-fill {
    height: 100%;
    background: #7C9082;
    transition: width 420ms ease;
  }
  .arc-progress-text {
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--r-text-5);
    margin: 0;
  }
  .arc-phase-desc {
    font-family: var(--r-serif);
    font-size: 16px;
    line-height: 1.5;
    color: var(--r-text-3, #4a4139);
    margin: 0;
    max-width: 62ch;
  }
  .arc-phase-desc em { font-style: italic; }

  .arc-next {
    display: flex;
    align-items: baseline;
    gap: 16px;
    padding: 12px 0 2px;
    border-top: 1px solid var(--r-rule-5);
    margin-top: 4px;
  }
  .arc-next-eyebrow {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-5);
    flex: none;
  }
  .arc-next-link {
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 19px;
    color: var(--r-ink);
    text-decoration: none;
    border-bottom: 1px solid var(--r-rule-4);
    padding-bottom: 1px;
    transition: border-color 160ms ease;
  }
  .arc-next-link:hover { border-bottom-color: var(--r-ink); }

  .arc-outcome {
    font-family: var(--r-serif);
    font-size: 15px;
    color: var(--r-text-4);
    margin: 0;
    line-height: 1.5;
  }
  .arc-outcome em { font-style: italic; color: var(--r-text-3); }

  @media (max-width: 720px) {
    .growth-page { padding: 88px 20px 60px; }
    .growth-title { font-size: 48px; }
    .arc-card { padding: 22px 20px; }
    .arc-title { font-size: 22px; }
  }
`;
