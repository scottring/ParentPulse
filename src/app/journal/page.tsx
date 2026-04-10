'use client';

import { useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useGrowthFeed, type ArcGroup } from '@/hooks/useGrowthFeed';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';
import Link from 'next/link';
import type { GrowthItem } from '@/types/growth';

// ================================================================
// THE JOURNAL — table of contents
//
// Real hierarchy:
//   1. A FEATURED focus article (chef's recommendation). Large
//      typography, full body, framed CTA. Not just a mark in the
//      margin.
//   2. CHAPTERS IN PROGRESS in a side column with arc spines.
//   3. ALSO IN THIS ISSUE — a multi-column grid of practice
//      cards, compact, filling the width.
//   4. THINGS TO READ — a distinct grid of reading cards,
//      materially different from the practice cards.
//   5. BACK ISSUES footer.
//
// Uses the full width of the 1440px container. No wasted margins.
// ================================================================

// ----------------------------------------------------------------
// Entry classification
// ----------------------------------------------------------------
const READING_TYPES = new Set(['illustrated_story', 'progress_snapshot']);

function isReading(item: GrowthItem): boolean {
  return READING_TYPES.has(item.type);
}

const TYPE_LABELS: Record<string, string> = {
  reflection_prompt: 'A reflection',
  micro_activity: 'A small thing',
  conversation_guide: 'A conversation',
  partner_exercise: 'A partner exercise',
  solo_deep_dive: 'A longer sit',
  repair_ritual: 'A repair',
  gratitude_practice: 'A gratitude',
  illustrated_story: 'A story to read',
  weekly_arc: 'A weekly arc',
  progress_snapshot: 'A progress note',
};

function pickTodayFocus(items: GrowthItem[]): GrowthItem | null {
  if (items.length === 0) return null;
  // Prefer practices for the focus slot — readings are better as
  // a separate section. If nothing but readings exist, fall back.
  const practices = items.filter((i) => !isReading(i));
  const pool = practices.length > 0 ? practices : items;
  const ranked = [...pool].sort((a, b) => {
    const aGap = a.sourceInsightType === 'gap' ? 1 : 0;
    const bGap = b.sourceInsightType === 'gap' ? 1 : 0;
    if (aGap !== bGap) return bGap - aGap;
    const aExp = a.expiresAt?.toDate?.()?.getTime() || Number.MAX_SAFE_INTEGER;
    const bExp = b.expiresAt?.toDate?.()?.getTime() || Number.MAX_SAFE_INTEGER;
    if (aExp !== bExp) return aExp - bExp;
    return (a.estimatedMinutes || 999) - (b.estimatedMinutes || 999);
  });
  return ranked[0];
}

// ----------------------------------------------------------------
// Masthead helpers
// ----------------------------------------------------------------
function yearToRoman(n: number): string {
  if (n < 1) return '';
  const map: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let result = '';
  let num = n;
  for (const [value, numeral] of map) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
}

function formatPressDate(d: Date): string {
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  return `${weekday}, ${month} ${d.getDate()}`;
}

function formatIssueNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = (d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return Math.ceil((diff + start.getDay() + 1) / 7);
}

const PHASE_LABELS: Record<string, string> = {
  awareness: 'Awareness',
  practice: 'Practice',
  integration: 'Integration',
};

function spellNumber(n: number): string {
  const names = [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
    'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
  ];
  return n >= 0 && n <= 20 ? names[n] : String(n);
}

// ================================================================
// Page component
// ================================================================
// Start-of-week (Monday 00:00 local time). Used to filter "kept this
// week" items so the retired list matches the current journal issue.
function weekStart(d: Date = new Date()): Date {
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export default function JournalPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { arcGroups, activeItems, completedItems, loading } = useGrowthFeed();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const focusItem = useMemo(() => pickTodayFocus(activeItems), [activeItems]);

  const otherPractices = useMemo(
    () =>
      activeItems.filter(
        (i) => !isReading(i) && i.growthItemId !== focusItem?.growthItemId,
      ),
    [activeItems, focusItem],
  );

  const readings = useMemo(
    () =>
      activeItems.filter(
        (i) => isReading(i) && i.growthItemId !== focusItem?.growthItemId,
      ),
    [activeItems, focusItem],
  );

  // Items kept since the start of this week (Monday 00:00). These
  // don't disappear — they retire into the "Kept this week" section
  // below, so the user can see the ink accumulate.
  const keptThisWeek = useMemo(() => {
    const start = weekStart().getTime();
    return (completedItems || [])
      .filter((i) => {
        if (i.status !== 'completed') return false;
        const ts = i.statusUpdatedAt?.toDate?.()?.getTime() || 0;
        return ts >= start;
      })
      .sort((a, b) => {
        const aTs = a.statusUpdatedAt?.toDate?.()?.getTime() || 0;
        const bTs = b.statusUpdatedAt?.toDate?.()?.getTime() || 0;
        return bTs - aTs; // most recently kept first
      });
  }, [completedItems]);

  // "All kept" means: no active items waiting, but at least one was
  // kept this week. Triggers the ceremonial acknowledgement in place
  // of the featured focus.
  const allKept = activeItems.length === 0 && keptThisWeek.length > 0;

  if (authLoading || loading) {
    return (
      <div className="relish-page">
        <Navigation />
        <SideNav />
        <div className="pt-[64px]">
          <div className="press-loading">Opening the Journal&hellip;</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const today = new Date();
  const firstName = (user.name || 'Reader').split(' ')[0];
  const hasContent =
    activeItems.length > 0 || arcGroups.length > 0 || keptThisWeek.length > 0;

  return (
    <div className="relish-page">
      <Navigation />
      <SideNav />

      <div className="pt-[64px] pb-24">
        <div className="relish-container">
          <div className="press-volume mt-6 relative overflow-hidden">
            {/* ═══ Masthead ═══ */}
            <header className="press-masthead">
              <div className="press-masthead-rule" aria-hidden="true" />
              <h1 className="press-masthead-title">
                {firstName}&rsquo;s Journal
              </h1>
              <div className="press-masthead-fleuron" aria-hidden="true">
                ❦
              </div>
              <p className="press-masthead-meta">
                <span>Volume {yearToRoman(today.getFullYear())}</span>
                <span className="sep">·</span>
                <span>Issue {formatIssueNumber(today)}</span>
                <span className="sep">·</span>
                <span>{formatPressDate(today)}</span>
              </p>
              <div className="press-masthead-rule" aria-hidden="true" />
            </header>

            {!hasContent ? (
              <EmptyJournal />
            ) : (
              <article className="journal-toc">
                {/* ═══════════════════════════════════════════
                    PRIMARY ROW — Today's focus + Ongoing chapters
                    ═══════════════════════════════════════════ */}
                <div className="toc-primary">
                  {/* Featured focus article (or All Kept) */}
                  <div className="toc-featured-col">
                    {focusItem ? (
                      <FeaturedFocus item={focusItem} />
                    ) : allKept ? (
                      <AllKeptAcknowledgement keptCount={keptThisWeek.length} />
                    ) : (
                      <div className="toc-featured-empty">
                        <p className="press-body-italic">
                          No practice waiting today. Open an arc on
                          the right, or capture a thought.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Ongoing arcs sidebar */}
                  {arcGroups.length > 0 && (
                    <aside className="toc-chapters-col">
                      <div className="toc-section-header">
                        <span className="toc-section-eyebrow">
                          Ongoing
                        </span>
                        <h2 className="toc-section-title">Arcs</h2>
                      </div>
                      <div className="toc-chapters-list">
                        {arcGroups.map((group, idx) => (
                          <ArcEntry
                            key={group.arc.arcId}
                            group={group}
                            index={idx + 1}
                          />
                        ))}
                      </div>
                    </aside>
                  )}
                </div>

                {/* ═══════════════════════════════════════════
                    THIS WEEK — other practices grid
                    ═══════════════════════════════════════════ */}
                {otherPractices.length > 0 && (
                  <section className="toc-section toc-section-divided">
                    <div className="toc-section-header">
                      <span className="toc-section-eyebrow">
                        This week
                      </span>
                      <h2 className="toc-section-title">
                        Other practices waiting
                      </h2>
                    </div>
                    <div className="toc-practice-grid">
                      {otherPractices.map((item) => (
                        <PracticeCard
                          key={item.growthItemId}
                          item={item}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* ═══════════════════════════════════════════
                    ALSO — readings (stories and notes to read)
                    ═══════════════════════════════════════════ */}
                {readings.length > 0 && (
                  <section className="toc-section toc-section-divided toc-section-readings">
                    <div className="toc-section-header">
                      <span className="toc-section-eyebrow">
                        Also
                      </span>
                      <h2 className="toc-section-title">Things to read</h2>
                    </div>
                    <div className="toc-reading-grid">
                      {readings.map((item) => (
                        <ReadingCard
                          key={item.growthItemId}
                          item={item}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* ═══════════════════════════════════════════
                    KEPT THIS WEEK — the retired items. This is
                    the ink accumulating behind you. Not a
                    gamification counter, just the felt weight
                    of what's been done.
                    ═══════════════════════════════════════════ */}
                {keptThisWeek.length > 0 && (
                  <section className="toc-section toc-section-divided toc-section-kept">
                    <div className="toc-section-header">
                      <span className="toc-section-eyebrow">
                        Kept this week
                      </span>
                      <h2 className="toc-section-title">
                        What you&rsquo;ve set down
                      </h2>
                    </div>
                    <div className="toc-kept-list">
                      {keptThisWeek.map((item) => (
                        <KeptEntry key={item.growthItemId} item={item} />
                      ))}
                    </div>
                  </section>
                )}

                {/* ═══════════════════════════════════════════
                    Footer colophon
                    ═══════════════════════════════════════════ */}
                <div className="toc-footer">
                  <span className="toc-footer-fleuron" aria-hidden="true">
                    ❦
                  </span>
                  <p className="toc-footer-line">
                    Back issues are bound in the archive.
                  </p>
                </div>
              </article>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          STYLES
          ═══════════════════════════════════════════════════════ */}
      <style jsx>{`
        .journal-toc {
          padding: 32px 40px 48px;
        }

        /* ─── PRIMARY ROW: Featured focus + Chapters ───────── */
        .toc-primary {
          display: grid;
          grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
          gap: 56px;
          align-items: start;
        }

        .toc-featured-col {
          min-width: 0;
        }
        .toc-featured-empty {
          padding: 40px;
          text-align: center;
          border: 1px dashed rgba(200, 190, 172, 0.6);
          border-radius: 2px;
        }

        .toc-chapters-col {
          min-width: 0;
          padding-left: 40px;
          border-left: 1px solid rgba(200, 190, 172, 0.45);
        }

        /* ─── Section headers ────────────────────────────── */
        .toc-section-header {
          margin-bottom: 22px;
        }
        .toc-section-eyebrow {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8a7b5f;
          display: block;
          margin-bottom: 6px;
        }
        .toc-section-title {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: clamp(26px, 3vw, 32px);
          color: #3a3530;
          margin: 0;
          line-height: 1.15;
          letter-spacing: -0.008em;
        }

        .toc-section {
          margin-top: 0;
        }
        .toc-section-divided {
          margin-top: 56px;
          padding-top: 40px;
          border-top: 1px solid rgba(200, 190, 172, 0.45);
        }

        /* ─── Chapters list (sidebar) ──────────────────── */
        .toc-chapters-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        /* ─── Practice grid (3 columns) ─────────────────── */
        .toc-practice-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0;
          border-top: 1px solid rgba(200, 190, 172, 0.35);
        }

        /* ─── Reading grid (2 columns) ───────────────────── */
        .toc-reading-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 32px;
        }

        /* ─── Kept list — retired items, single column ───── */
        .toc-kept-list {
          display: flex;
          flex-direction: column;
          max-width: 720px;
        }
        .toc-section-kept .toc-section-title {
          color: #6b6254;
        }

        /* ─── Footer ────────────────────────────────────── */
        .toc-footer {
          margin-top: 64px;
          padding-top: 28px;
          text-align: center;
          border-top: 1px solid rgba(200, 190, 172, 0.45);
        }
        .toc-footer-fleuron {
          display: block;
          font-family: var(--font-parent-display);
          font-size: 22px;
          color: #8a7b5f;
          margin-bottom: 12px;
          line-height: 1;
        }
        .toc-footer-line {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 15px;
          color: #7c6e54;
          margin: 0;
        }

        /* ─── Tablet (1024 and below) ─────────────────── */
        @media (max-width: 1024px) {
          .toc-primary {
            grid-template-columns: 1fr;
            gap: 48px;
          }
          .toc-chapters-col {
            padding-left: 0;
            padding-top: 40px;
            border-left: 0;
            border-top: 1px solid rgba(200, 190, 172, 0.45);
          }
          .toc-practice-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        /* ─── Mobile ──────────────────────────────────── */
        @media (max-width: 720px) {
          .journal-toc {
            padding: 24px 20px 36px;
          }
          .toc-primary {
            gap: 36px;
          }
          .toc-chapters-col {
            padding-top: 32px;
          }
          .toc-practice-grid {
            grid-template-columns: 1fr;
          }
          .toc-reading-grid {
            grid-template-columns: 1fr;
            gap: 28px;
          }
          .toc-section-divided {
            margin-top: 40px;
            padding-top: 32px;
          }
          .toc-footer {
            margin-top: 48px;
          }
        }
      `}</style>
    </div>
  );
}

// ================================================================
// FEATURED FOCUS — the big one. Large typography, body text,
// framed CTA. This is what "today's practice" should feel like.
// ================================================================
function FeaturedFocus({ item }: { item: GrowthItem }) {
  const typeLabel = TYPE_LABELS[item.type] || 'A practice';
  const minutes = item.estimatedMinutes || 0;
  const forWhom = item.assignedToUserName?.split(' ')[0] || 'you';
  const about = item.targetPersonNames?.join(' & ');
  const reading = isReading(item);
  const glyph = reading ? '❦' : '◆';
  const glyphColor = reading ? '#B88E5A' : '#5C8064';
  const fromChat = Boolean(
    (item as unknown as { sourceChatSessionId?: string }).sourceChatSessionId,
  );

  // Trim body for featured display
  const bodyExcerpt =
    item.body && item.body.length > 340
      ? item.body.slice(0, 340).trim() + '…'
      : item.body || '';

  return (
    <div className="featured">
      <div className="featured-eyebrow">
        <span className="featured-eyebrow-small">Today in the Journal</span>
      </div>

      <div className="featured-kind">
        <span className="featured-glyph" aria-hidden="true" style={{ color: glyphColor }}>
          {glyph}
        </span>
        <span className="featured-kind-label">
          {typeLabel} · {minutes} {reading ? 'min read' : 'min'}
        </span>
      </div>

      <h2 className="featured-title">{item.title}</h2>

      {bodyExcerpt && (
        <p className="featured-body">{bodyExcerpt}</p>
      )}

      <p className="featured-meta">
        {about && (
          <>
            about <span className="press-sc">{about}</span>
            <span className="sep">·</span>
          </>
        )}
        for <span className="press-sc">{forWhom}</span>
        {fromChat && (
          <>
            <span className="sep">·</span>
            drawn from a conversation
          </>
        )}
      </p>

      <div className="featured-cta-frame" aria-hidden="true">
        <span className="featured-cta-rule" />
        <span className="featured-cta-ornament">❦</span>
        <span className="featured-cta-rule" />
      </div>

      <div className="featured-cta">
        <Link href={`/growth/${item.growthItemId}`} className="press-link featured-cta-link">
          {reading ? 'Open the story' : 'Begin this practice'}
          <span className="arrow">⟶</span>
        </Link>
      </div>

      <style jsx>{`
        .featured {
          position: relative;
          padding: 4px 0 8px;
        }
        .featured-eyebrow {
          margin-bottom: 16px;
        }
        .featured-eyebrow-small {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8a7b5f;
        }
        .featured-kind {
          display: inline-flex;
          align-items: baseline;
          gap: 12px;
          padding: 6px 0;
          margin-bottom: 14px;
          border-top: 1px solid rgba(200, 190, 172, 0.6);
          border-bottom: 1px solid rgba(200, 190, 172, 0.6);
          padding-left: 2px;
          padding-right: 16px;
        }
        .featured-glyph {
          font-size: 15px;
          line-height: 1;
          transform: translateY(1px);
          display: inline-block;
        }
        .featured-kind-label {
          font-family: var(--font-parent-body);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #5a4f3b;
        }
        .featured-title {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: clamp(36px, 4.6vw, 54px);
          color: #3a3530;
          margin: 12px 0 20px;
          line-height: 1.08;
          letter-spacing: -0.012em;
          max-width: 720px;
        }
        .featured-body {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 19px;
          line-height: 1.55;
          color: #4a4238;
          margin: 0 0 22px;
          max-width: 640px;
        }
        .featured-meta {
          font-family: var(--font-parent-body);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #7c6e54;
          line-height: 1.55;
          margin: 0 0 36px;
        }
        .featured-meta .sep {
          display: inline-block;
          margin: 0 8px;
          color: #a8997d;
        }
        .featured-cta-frame {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-bottom: 24px;
          max-width: 480px;
        }
        .featured-cta-rule {
          flex: 1;
          height: 1px;
          background: rgba(200, 190, 172, 0.6);
        }
        .featured-cta-ornament {
          font-family: var(--font-parent-display);
          font-size: 20px;
          color: #8a7b5f;
          line-height: 1;
        }
        .featured-cta {
          padding-left: 4px;
        }
        :global(.featured-cta-link) {
          font-size: 28px !important;
          border-bottom-width: 2px !important;
          padding-bottom: 4px !important;
        }

        @media (max-width: 720px) {
          .featured-title {
            font-size: 34px;
          }
          .featured-body {
            font-size: 17px;
          }
          :global(.featured-cta-link) {
            font-size: 22px !important;
          }
        }
      `}</style>
    </div>
  );
}

// ================================================================
// ARC ENTRY (in the sidebar) — with arc spine. Links to the
// next-up practice inside this arc, not to the arc doc itself
// (which lives in a different Firestore collection). Clicking
// "Sibling Fairness · Day 3 of 10" takes you straight to day 3.
// ================================================================
function ArcEntry({ group, index }: { group: ArcGroup; index: number }) {
  const { arc, activeItems, completedItems } = group;
  const phase = PHASE_LABELS[arc.currentPhase] || arc.currentPhase;
  const completed = arc.completedItemCount || completedItems.length || 0;
  const total = arc.totalItemCount || (activeItems.length + completedItems.length) || 0;
  const participants = (arc.participantNames || []).join(' & ');
  const romanIndex = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][
    index - 1
  ] || String(index);

  // Link target: the next-up active practice (sorted by arcSequence
  // in useGrowthFeed), or the most recently kept one if everything
  // in this arc is done. Arcs themselves live in a separate Firestore
  // collection so we can't link to them directly — we route through
  // the practice detail page.
  const nextItem = activeItems[0] || completedItems[0] || null;
  const href = nextItem ? `/growth/${nextItem.growthItemId}` : null;

  const content = (
    <>
      <div className="chapter-head">
        <span className="chapter-roman">Arc {romanIndex}</span>
      </div>
      <h3 className="chapter-title">{arc.title}</h3>
      {participants && (
        <p className="chapter-sub">
          with <span className="press-sc">{participants}</span>
        </p>
      )}

      {total > 0 && (
        <div
          className="chapter-spine"
          role="img"
          aria-label={`${completed} of ${total} days kept`}
        >
          <span className="chapter-spine-rule" aria-hidden="true" />
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`chapter-spine-dot${
                i < completed ? ' chapter-spine-dot--filled' : ''
              }`}
              aria-hidden="true"
            >
              {i < completed ? '●' : '○'}
            </span>
          ))}
          <span className="chapter-spine-rule" aria-hidden="true" />
        </div>
      )}

      <p className="chapter-meta">
        {total > 0 ? (
          <>
            Day {spellNumber(Math.min(completed + 1, total))} of {spellNumber(total)}
            <span className="sep">·</span>
            <em>{phase}</em>
          </>
        ) : (
          <>
            <em>{phase}</em>
            <span className="sep">·</span>
            Practices being prepared
          </>
        )}
      </p>
    </>
  );

  return (
    <>
      {href ? (
        <Link href={href} className="chapter">
          {content}
        </Link>
      ) : (
        <div className="chapter chapter--disabled">{content}</div>
      )}

      <style jsx>{`
        :global(.chapter) {
          display: block;
          padding: 20px 0;
          text-decoration: none;
          color: inherit;
          border-bottom: 1px solid rgba(200, 190, 172, 0.38);
          transition: opacity 0.2s ease;
        }
        :global(.chapter:last-child) {
          border-bottom: 0;
        }
        :global(.chapter:hover) {
          opacity: 0.8;
        }
        :global(.chapter--disabled) {
          cursor: default;
        }
        :global(.chapter--disabled:hover) {
          opacity: 1;
        }
        :global(.chapter-head) {
          margin-bottom: 4px;
        }
        :global(.chapter-roman) {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #8a7b5f;
        }
        :global(.chapter-title) {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: 22px;
          color: #3a3530;
          margin: 0 0 4px;
          line-height: 1.22;
          letter-spacing: -0.005em;
        }
        :global(.chapter-sub) {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 14px;
          color: #6b6254;
          margin: 0 0 10px;
        }
        :global(.chapter-sub .press-sc) {
          font-style: normal;
        }
        :global(.chapter-spine) {
          display: flex;
          align-items: center;
          gap: 2px;
          margin: 8px 0 6px;
          flex-wrap: wrap;
        }
        :global(.chapter-spine-rule) {
          display: inline-block;
          width: 14px;
          border-top: 1px solid #a8997d;
          margin: 0 3px;
        }
        :global(.chapter-spine-dot) {
          display: inline-block;
          font-size: 12px;
          color: #c5b799;
          line-height: 1;
        }
        :global(.chapter-spine-dot--filled) {
          color: #5c8064;
          font-size: 14px;
        }
        :global(.chapter-meta) {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #7c6e54;
          margin: 8px 0 0;
          line-height: 1.55;
        }
        :global(.chapter-meta .sep) {
          display: inline-block;
          margin: 0 8px;
          color: #a8997d;
        }
      `}</style>
    </>
  );
}

// ================================================================
// PRACTICE CARD — one of the "also in this issue" grid cells.
// Compact, left-aligned, activity-energy treatment. Notice the
// sage accent rule at the top that tells you it's a practice at
// a glance.
// ================================================================
function PracticeCard({ item }: { item: GrowthItem }) {
  const typeLabel = TYPE_LABELS[item.type] || 'A practice';
  const minutes = item.estimatedMinutes || 0;
  const forWhom = item.assignedToUserName?.split(' ')[0] || 'you';
  const about = item.targetPersonNames?.join(' & ');

  return (
    <Link href={`/growth/${item.growthItemId}`} className="practice-card">
      <div className="practice-card-rail" aria-hidden="true" />
      <div className="practice-card-body">
        <div className="practice-card-kind">
          <span className="practice-card-glyph" aria-hidden="true">◆</span>
          <span>{typeLabel} · {minutes} min</span>
        </div>
        <h3 className="practice-card-title">{item.title}</h3>
        <p className="practice-card-meta">
          {about && (
            <>
              about <span className="press-sc">{about}</span>
              <span className="sep">·</span>
            </>
          )}
          for <span className="press-sc">{forWhom}</span>
        </p>
      </div>

      <style jsx>{`
        .practice-card {
          display: flex;
          gap: 16px;
          padding: 24px 22px 26px;
          text-decoration: none;
          color: inherit;
          border-right: 1px solid rgba(200, 190, 172, 0.35);
          border-bottom: 1px solid rgba(200, 190, 172, 0.35);
          transition: background 0.25s ease;
          min-height: 160px;
        }
        .practice-card:hover {
          background: rgba(92, 128, 100, 0.035);
        }
        .practice-card-rail {
          flex: 0 0 3px;
          background: #5c8064;
          border-radius: 1px;
          align-self: stretch;
        }
        .practice-card-body {
          flex: 1;
          min-width: 0;
        }
        .practice-card-kind {
          display: flex;
          align-items: baseline;
          gap: 8px;
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #5a6e54;
          margin-bottom: 10px;
        }
        .practice-card-glyph {
          color: #5c8064;
          font-size: 12px;
          line-height: 1;
          transform: translateY(1px);
        }
        .practice-card-title {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: 22px;
          color: #3a3530;
          margin: 0 0 12px;
          line-height: 1.25;
          letter-spacing: -0.004em;
        }
        .practice-card-meta {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #7c6e54;
          line-height: 1.55;
          margin: 0;
        }
        .practice-card-meta .sep {
          display: inline-block;
          margin: 0 6px;
          color: #a8997d;
        }
      `}</style>
    </Link>
  );
}

// ================================================================
// READING CARD — materially different from PracticeCard.
// Bookplate-style: ochre rule on top, centered layout, generous
// padding, body excerpt, less action energy. Reads as "a thing to
// open and read" not "a thing to do."
// ================================================================
function ReadingCard({ item }: { item: GrowthItem }) {
  const typeLabel = TYPE_LABELS[item.type] || 'A reading';
  const minutes = item.estimatedMinutes || 0;
  const forWhom = item.assignedToUserName?.split(' ')[0] || 'you';
  const about = item.targetPersonNames?.join(' & ');

  const bodyExcerpt =
    item.body && item.body.length > 140
      ? item.body.slice(0, 140).trim() + '…'
      : item.body || '';

  return (
    <Link href={`/growth/${item.growthItemId}`} className="reading-card">
      <div className="reading-card-top" aria-hidden="true">
        <span className="reading-card-rule" />
        <span className="reading-card-fleuron">❦</span>
        <span className="reading-card-rule" />
      </div>

      <div className="reading-card-kind">
        {typeLabel} · {minutes} min read
      </div>

      <h3 className="reading-card-title">{item.title}</h3>

      {bodyExcerpt && (
        <p className="reading-card-excerpt">{bodyExcerpt}</p>
      )}

      <p className="reading-card-meta">
        {about ? (
          <>about <span className="press-sc">{about}</span></>
        ) : (
          <>for <span className="press-sc">{forWhom}</span></>
        )}
      </p>

      <style jsx>{`
        .reading-card {
          display: block;
          text-decoration: none;
          color: inherit;
          padding: 26px 32px 32px;
          background: rgba(184, 142, 90, 0.04);
          border: 1px solid rgba(184, 142, 90, 0.22);
          border-radius: 2px;
          text-align: center;
          transition: background 0.25s ease;
        }
        .reading-card:hover {
          background: rgba(184, 142, 90, 0.08);
        }
        .reading-card-top {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          margin-bottom: 14px;
        }
        .reading-card-rule {
          flex: 0 1 60px;
          height: 1px;
          background: rgba(184, 142, 90, 0.5);
        }
        .reading-card-fleuron {
          font-family: var(--font-parent-display);
          font-size: 16px;
          color: #b88e5a;
          line-height: 1;
        }
        .reading-card-kind {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #7c5a2e;
          margin-bottom: 12px;
        }
        .reading-card-title {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: 26px;
          color: #3a3530;
          margin: 0 0 14px;
          line-height: 1.2;
          letter-spacing: -0.008em;
        }
        .reading-card-excerpt {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 16px;
          line-height: 1.55;
          color: #5a4f3b;
          margin: 0 auto 16px;
          max-width: 360px;
        }
        .reading-card-meta {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #8a6f42;
          margin: 0;
        }
      `}</style>
    </Link>
  );
}

// ================================================================
// ALL KEPT — the ceremonial "everything is done" state.
// Replaces the featured focus when activeItems is empty but
// keptThisWeek has entries. The user sees that the week is
// behind them, in the voice of the press.
// ================================================================
function AllKeptAcknowledgement({ keptCount }: { keptCount: number }) {
  const keptWord =
    keptCount === 1 ? 'one practice' : `${spellNumber(keptCount)} practices`;
  return (
    <div className="all-kept">
      <span className="all-kept-eyebrow">This week</span>
      <div className="all-kept-ornament" aria-hidden="true">
        ❦
      </div>
      <h2 className="all-kept-title">All kept.</h2>
      <p className="all-kept-body">
        The week&rsquo;s practices are behind you. {keptWord} set down,
        each with its own weight. Rest, or open an ongoing arc on
        the right.
      </p>
      <div className="all-kept-ornament all-kept-ornament-bottom" aria-hidden="true">
        ❦
      </div>

      <style jsx>{`
        .all-kept {
          padding: 24px 0 16px;
          max-width: 620px;
        }
        .all-kept-eyebrow {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8a7b5f;
          display: block;
          margin-bottom: 20px;
        }
        .all-kept-ornament {
          font-family: var(--font-parent-display);
          font-size: 26px;
          color: #8a7b5f;
          line-height: 1;
          margin-bottom: 18px;
        }
        .all-kept-ornament-bottom {
          margin-top: 32px;
          margin-bottom: 0;
        }
        .all-kept-title {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: clamp(40px, 5vw, 58px);
          color: #3a3530;
          margin: 0 0 22px;
          line-height: 1.05;
          letter-spacing: -0.012em;
        }
        .all-kept-body {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 20px;
          line-height: 1.55;
          color: #4a4238;
          margin: 0;
          max-width: 540px;
        }
      `}</style>
    </div>
  );
}

// ================================================================
// KEPT ENTRY — a retired item in the "kept this week" list.
// Dimmed, small fleuron prefix, shows title + kept date. Clickable
// so the user can go back and see the reflection they wrote.
// ================================================================
function KeptEntry({ item }: { item: GrowthItem }) {
  const keptDate = item.statusUpdatedAt?.toDate?.();
  const keptDay = keptDate
    ? keptDate.toLocaleDateString('en-US', { weekday: 'long' })
    : '';
  const forWhom = item.assignedToUserName?.split(' ')[0] || 'you';
  const about = item.targetPersonNames?.join(' & ');
  const reading = isReading(item);

  return (
    <Link href={`/growth/${item.growthItemId}`} className="kept-entry">
      <span className="kept-fleuron" aria-hidden="true">
        ❦
      </span>
      <div className="kept-body">
        <h4 className="kept-title">{item.title}</h4>
        <p className="kept-meta">
          {keptDay && <>Kept {keptDay}</>}
          {about && (
            <>
              <span className="sep">·</span>
              about <span className="press-sc">{about}</span>
            </>
          )}
          <span className="sep">·</span>
          for <span className="press-sc">{forWhom}</span>
        </p>
      </div>

      <style jsx>{`
        .kept-entry {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 14px 4px 14px;
          text-decoration: none;
          color: inherit;
          border-bottom: 1px solid rgba(200, 190, 172, 0.3);
          transition: opacity 0.2s ease;
        }
        .kept-entry:last-child {
          border-bottom: 0;
        }
        .kept-entry:hover {
          opacity: 1;
        }
        .kept-fleuron {
          font-family: var(--font-parent-display);
          font-size: 18px;
          line-height: 1;
          color: ${reading ? '#B88E5A' : '#5C8064'};
          opacity: 0.55;
          padding-top: 4px;
          flex-shrink: 0;
        }
        .kept-body {
          flex: 1;
          min-width: 0;
        }
        .kept-title {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: 18px;
          color: #6b6254;
          margin: 0 0 4px;
          line-height: 1.3;
          letter-spacing: -0.003em;
        }
        .kept-entry:hover .kept-title {
          color: #3a3530;
        }
        .kept-meta {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #8a7b5f;
          margin: 0;
          line-height: 1.55;
        }
        .kept-meta .sep {
          display: inline-block;
          margin: 0 7px;
          color: #b2a487;
        }
      `}</style>
    </Link>
  );
}

// ================================================================
// Empty state
// ================================================================
function EmptyJournal() {
  return (
    <div className="press-empty" style={{ padding: '80px 40px' }}>
      <p className="press-empty-title">
        These pages are still waiting to be written.
      </p>
      <p className="press-empty-body">
        Open a manual for someone you love, or capture a thought
        with the pen. The Journal fills itself as you go.
      </p>
      <Link href="/family-manual" className="press-link">
        Open the Family Manual
        <span className="arrow">⟶</span>
      </Link>
      <div className="press-fleuron mt-8">❦</div>
    </div>
  );
}
