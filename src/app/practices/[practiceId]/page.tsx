'use client';
/* ================================================================
   Relish · /practices/[practiceId] — the editorial practice page.
   Rebuilt from the 2026-04-20 redesign: breadcrumbs → hero (title
   + lede + cadence plate + CTAs | streak grid) → ritual body
   (prompts in i/ii/iii + side cards) → sit-down log (textarea +
   attachments + submit) → past sit-downs → colophon.
   ================================================================ */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePractice } from '@/hooks/usePractice';
import { AttachmentRow } from '@/components/capture/AttachmentRow';
import { EntryMedia } from '@/components/journal-spread/EntryMedia';
import type { JournalMedia } from '@/types/journal';
import type { PracticeSession } from '@/types/practice';
import { weekOfSunday } from '@/types/practice';

export default function PracticeDetailPage() {
  const params = useParams<{ practiceId: string }>();
  const router = useRouter();
  const practiceId = params?.practiceId ?? null;
  const { user, loading: authLoading } = useAuth();
  const {
    practice,
    sessions,
    loading,
    error,
    logSession,
    markDoneThisWeek,
    isDoneThisWeek,
  } = usePractice(practiceId);

  const [body, setBody] = useState('');
  const [media, setMedia] = useState<JournalMedia[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const streak = useMemo(() => buildStreak(sessions), [sessions]);

  if (authLoading || loading) {
    return (
      <main className="pr-app">
        <p className="pr-empty">Opening the practice…</p>
        <style jsx global>{pageStyles}</style>
      </main>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  if (error || !practice) {
    return (
      <main className="pr-app">
        <p className="pr-empty">{error ?? "That practice isn't here."}</p>
        <p className="pr-back">
          <Link href="/workbook">← back to the Workbook</Link>
        </p>
        <style jsx global>{pageStyles}</style>
      </main>
    );
  }

  const cadenceLabel = cadenceLabelFor(practice.cadence);
  const lastKeptLabel = practice.lastCompletedAt
    ? practice.lastCompletedAt.toDate().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      })
    : '—';
  const nextLabel = isDoneThisWeek ? 'Next week' : 'This week';
  const keptCount = sessions.filter((s) => !s.body.match(/^skipped/i)).length;
  const lateCount = 0; // placeholder until caught-up flag is modeled

  async function submit() {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    try {
      await logSession(body, media.length > 0 ? media : undefined);
      setJustSaved(true);
      setBody('');
      setMedia([]);
      setTimeout(() => setJustSaved(false), 1200);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="pr-app">
      <div className="pr-page">
        {/* ═══ BREADCRUMBS ═══ */}
        <div className="crumbs">
          <Link href="/workbook">The Workbook</Link>
          <span className="sep">/</span>
          <Link href="/workbook">Practices</Link>
          <span className="sep">/</span>
          <span>{shortName(practice.name)}</span>
        </div>

        {/* ═══ HERO ═══ */}
        <section className="pr-hero">
          <div className="pr-hero-text">
            <p className="pr-kicker">A practice · {cadenceLabel}</p>
            <h1 className="pr-h1">{practice.name}</h1>
            <p className="pr-lede">
              <em>{practice.description}</em>
            </p>

            <div className="cadence-plate">
              <div className="cell">
                <span className="lbl">Cadence</span>
                <span className="val">{cadenceLabel}</span>
              </div>
              <div className="div" />
              <div className="cell">
                <span className="lbl">Last kept</span>
                <span className="val">{lastKeptLabel}</span>
              </div>
              <div className="div" />
              <div className="cell">
                <span className="lbl">Due</span>
                <span className="val">{nextLabel}</span>
              </div>
            </div>

            <div className="pr-ctas">
              <button
                type="button"
                style={pillDarkStyle}
                onClick={() => {
                  document
                    .getElementById('sit-down-log')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                Start the {shortName(practice.name)} now
              </button>
              <button
                type="button"
                style={isDoneThisWeek ? pillDoneStyle : pillStyle}
                onClick={() => {
                  if (!isDoneThisWeek) void markDoneThisWeek();
                }}
                disabled={isDoneThisWeek}
              >
                {isDoneThisWeek ? 'Done this week' : 'Mark this week done'}
              </button>
            </div>
          </div>

          <div className="pr-hero-rule" aria-hidden="true" />

          <div className="streak">
            <div className="streak-head">
              <span className="lbl">Last 12 cycles</span>
              <span className="meta">
                {keptCount} kept{lateCount ? ` · ${lateCount} late` : ''}
              </span>
            </div>
            <div className="streak-grid">
              {streak.map((cell, i) => (
                <div key={i} className={`cell ${cell}`} />
              ))}
            </div>
            <div className="streak-legend">
              <span><span className="sw strong" />Kept · well</span>
              <span><span className="sw kept" />Kept</span>
              <span><span className="sw now" />This cycle</span>
              <span><span className="sw upcoming" />Upcoming</span>
              <span><span className="sw skipped" />Skipped</span>
            </div>
            {sessions[0] && (
              <div className="streak-note">
                <em>
                  {keptCount}
                  {keptCount === 1 ? ' cycle' : ' cycles'} on the couch so far.
                </em>{' '}
                The book keeps what the sit-down produces.
              </div>
            )}
          </div>
        </section>

        {/* ═══ RITUAL BODY — prompts with numerals + side cards ═══ */}
        <section className="ritual-body">
          <div className="rb">
            <h2 className="h2-serif">What it is.</h2>
            <p className="rb-lede">
              <em>{practice.prompts.length} questions. A few minutes.</em>{' '}
              Walk through them in turn; write down the line worth carrying.
            </p>
            {practice.prompts.map((p, i) => (
              <div key={i} className="step">
                <span className="n">{numeral(i + 1)}.</span>
                <div>
                  <h3>{p}</h3>
                </div>
              </div>
            ))}
          </div>

          <aside className="side">
            <div className="side-card">
              <span className="eyebrow">When</span>
              <h3>{whenTitleFor(practice.cadence)}</h3>
              <p>Short is fine. Long is better when it wants to be.</p>
              <dl className="when-grid">
                <dt>Reminder</dt>
                <dd>A quiet chime on the day</dd>
                <dt>If missed</dt>
                <dd>Catch up within 48 hours, or skip clean</dd>
                <dt>Pair with</dt>
                <dd>Nothing · this is the thing</dd>
              </dl>
            </div>
            <div className="side-card">
              <span className="eyebrow">Who keeps it</span>
              <h3>The household.</h3>
              <p>
                Whoever&rsquo;s at the table. Takes turns writing the keeper
                line.
              </p>
            </div>
          </aside>
        </section>

        {/* ═══ SIT-DOWN LOG ═══ */}
        <section id="sit-down-log" className="sit-down">
          <div className="sd-head">
            <h2 className="h2-serif">This cycle&rsquo;s sit-down.</h2>
            <span className="sd-sub">Week of {weekOfSunday()}</span>
          </div>
          <div className="sd-card">
            {justSaved ? (
              <p className="saved">
                <em>In the book.</em>
              </p>
            ) : (
              <>
                <textarea
                  className="sd-textarea"
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write down what came up. What you noticed. What you want to keep."
                />
                {user.familyId && (
                  <div style={{ marginTop: 8 }}>
                    <AttachmentRow
                      familyId={user.familyId}
                      media={media}
                      onChange={setMedia}
                      compact
                    />
                  </div>
                )}
                <div className="sd-actions">
                  <button
                    type="button"
                    style={pillDarkStyle}
                    onClick={submit}
                    disabled={!body.trim() || submitting}
                  >
                    {submitting ? 'Keeping…' : 'IN THE BOOK.'}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ═══ PAST SIT-DOWNS ═══ */}
        {sessions.length > 0 && (
          <section className="log-section">
            <div className="log-head">
              <h2 className="h2-serif">
                What you&rsquo;ve <em>kept so far.</em>
              </h2>
              <span className="sub">
                {sessions.length} {sessions.length === 1 ? 'sit-down' : 'sit-downs'} · newest first
              </span>
            </div>
            {sessions.map((s) => (
              <LogEntry
                key={s.sessionId}
                session={s}
                expanded={expandedId === s.sessionId}
                onToggle={() =>
                  setExpandedId(expandedId === s.sessionId ? null : s.sessionId)
                }
              />
            ))}
          </section>
        )}

        {/* ═══ COLOPHON ═══ */}
        <footer className="colophon">
          <span className="fleuron" aria-hidden="true">❦</span>
          <span>
            <em>{practice.name}</em>
            {keptCount > 0 && ` — ${keptCount} kept`}
            {keptCount > 0 && lateCount > 0 && `, ${lateCount} caught up`}
            .
          </span>
        </footer>
      </div>

      <style jsx global>{pageStyles}</style>
    </main>
  );
}

/* ════════════════════════════════════════════════════════════════
   Sub-components
   ════════════════════════════════════════════════════════════════ */

function LogEntry({
  session,
  expanded,
  onToggle,
}: {
  session: PracticeSession;
  expanded: boolean;
  onToggle: () => void;
}) {
  const date = session.createdAt?.toDate?.();
  const label = date
    ? date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : session.weekOf;
  const week = date ? isoWeek(date) : null;
  const excerpt =
    session.body.length > 160 ? session.body.slice(0, 160) + '…' : session.body;
  const hasMedia = (session.media?.length ?? 0) > 0;

  return (
    <article className="log-entry">
      <div className="log-date">
        {label}
        {week && <span className="sm">Week {week}</span>}
      </div>
      <div className="log-body">
        {expanded ? (
          <>
            <p>{session.body}</p>
            <EntryMedia media={session.media} />
            <button type="button" className="log-toggle" onClick={onToggle}>
              close
            </button>
          </>
        ) : (
          <>
            <p>{excerpt}</p>
            <button type="button" className="log-toggle" onClick={onToggle}>
              read more
            </button>
          </>
        )}
      </div>
      <span className={`log-status ${hasMedia ? 'with-media' : ''}`}>
        Kept
      </span>
    </article>
  );
}

/* ════════════════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════════════════ */

type StreakCell = '' | 'kept' | 'kept strong' | 'now' | 'skipped';

function buildStreak(sessions: PracticeSession[]): StreakCell[] {
  const cells: StreakCell[] = new Array(12).fill('') as StreakCell[];
  // Fill past 12 cycles. Oldest cell at index 0; "this cycle" at
  // index 10; upcoming at index 11.
  const sorted = [...sessions].sort((a, b) => {
    const am = a.createdAt?.toMillis?.() ?? 0;
    const bm = b.createdAt?.toMillis?.() ?? 0;
    return am - bm; // oldest first
  });
  // Most recent N sessions fill the newer cells. Mark the newest
  // 2 as "kept strong" if we have enough history.
  const maxKept = Math.min(sorted.length, 10);
  for (let i = 0; i < maxKept; i++) {
    const idx = 9 - i; // fills from right to left in the kept range
    if (idx < 0) break;
    cells[idx] = i < 2 ? 'kept strong' : 'kept';
  }
  cells[10] = 'now';
  cells[11] = '';
  return cells;
}

function cadenceLabelFor(c: string): string {
  switch (c) {
    case 'weekly':
      return 'Weekly';
    case 'biweekly':
      return 'Biweekly';
    case 'monthly':
      return 'Monthly';
    case 'ad_hoc':
      return 'Ad hoc';
    default:
      return c;
  }
}

function whenTitleFor(c: string): string {
  switch (c) {
    case 'weekly':
      return 'Once a week.';
    case 'biweekly':
      return 'Every other week.';
    case 'monthly':
      return 'Once a month.';
    default:
      return 'When it wants.';
  }
}

function numeral(n: number): string {
  const romans = [
    '', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x',
  ];
  return romans[n] ?? String(n);
}

function shortName(full: string): string {
  return full.replace(/^Our /i, '').replace(/\.$/, '').trim();
}

function isoWeek(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 86400000));
}

/* ════════════════════════════════════════════════════════════════
   Pill styles
   ════════════════════════════════════════════════════════════════ */

const pillDarkStyle: React.CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 18px',
  borderRadius: 999,
  fontFamily: 'var(--r-sans)',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--r-paper)',
  background: 'var(--r-leather)',
  border: '1px solid var(--r-leather)',
};

const pillStyle: React.CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 18px',
  borderRadius: 999,
  fontFamily: 'var(--r-sans)',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--r-ink)',
  background: 'var(--r-paper)',
  border: '1px solid var(--r-rule-3)',
};

const pillDoneStyle: React.CSSProperties = {
  ...pillStyle,
  cursor: 'default',
  color: 'var(--r-sage-deep)',
  borderColor: 'var(--r-sage)',
  background: 'var(--r-tint-sage)',
};

/* ════════════════════════════════════════════════════════════════
   Styles
   ════════════════════════════════════════════════════════════════ */

const pageStyles = `
  .pr-app { min-height: 100vh; background: var(--r-cream); }
  .pr-page { max-width: 1440px; margin: 0 auto; padding: 104px 40px 40px; }

  .pr-empty {
    max-width: 640px;
    margin: 48px auto 0;
    font-family: var(--r-serif);
    font-style: italic;
    color: var(--r-text-4);
    text-align: center;
  }
  .pr-back { text-align: center; font-family: var(--r-serif); margin-top: 12px; }
  .pr-back a { color: var(--r-ink); text-decoration: underline; }

  .crumbs {
    margin: 0 0 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--r-text-5);
  }
  .crumbs a {
    color: var(--r-text-4);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: border-color 120ms var(--r-ease-ink);
  }
  .crumbs a:hover { border-color: var(--r-text-4); }
  .crumbs .sep { opacity: 0.5; }

  /* HERO */
  .pr-hero {
    display: grid;
    grid-template-columns: 1.15fr 1px 1fr;
    gap: 48px;
    padding-bottom: 56px;
  }
  .pr-hero-rule { background: var(--r-rule-5); align-self: stretch; }
  .pr-hero-text { display: flex; flex-direction: column; gap: 24px; }
  .pr-kicker {
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-3);
    margin: 0;
  }
  .pr-h1 {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 300;
    font-size: clamp(52px, 6vw, 88px);
    line-height: 0.98;
    letter-spacing: -0.025em;
    color: var(--r-ink);
    margin: 0;
  }
  .pr-lede {
    font-family: var(--r-serif);
    font-weight: 400;
    font-size: 21px;
    line-height: 1.5;
    color: var(--r-text-2);
    margin: 0;
    max-width: 40ch;
  }
  .pr-lede em { font-style: italic; color: var(--r-ink); }

  .cadence-plate {
    display: grid;
    grid-template-columns: 1fr auto 1fr auto 1fr;
    gap: 0;
    align-items: center;
    padding: 18px 0;
    border-top: 1px solid var(--r-rule-5);
    border-bottom: 1px solid var(--r-rule-5);
  }
  .cadence-plate .cell { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .cadence-plate .cell:nth-child(3) { align-items: center; text-align: center; }
  .cadence-plate .cell:nth-child(5) { align-items: flex-end; text-align: right; }
  .cadence-plate .div { width: 1px; height: 24px; background: var(--r-rule-5); }
  .cadence-plate .lbl {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--r-text-5);
  }
  .cadence-plate .val {
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 22px;
    color: var(--r-ink);
    line-height: 1;
    letter-spacing: -0.005em;
  }

  .pr-ctas { display: flex; gap: 10px; flex-wrap: wrap; }

  /* STREAK */
  .streak { padding-top: 12px; display: flex; flex-direction: column; gap: 16px; }
  .streak-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
  }
  .streak-head .lbl {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-4);
  }
  .streak-head .meta {
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 15px;
    color: var(--r-text-5);
  }
  .streak-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 6px;
  }
  .streak-grid .cell {
    aspect-ratio: 1;
    border-radius: 2px;
    background: var(--r-rule-5);
  }
  .streak-grid .cell.kept { background: var(--r-sage); }
  .streak-grid .cell.strong { background: var(--r-sage-deep); }
  .streak-grid .cell.now { background: var(--r-ember); }
  .streak-grid .cell.skipped {
    background: transparent;
    border: 1px dashed var(--r-rule-3);
  }
  .streak-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--r-text-5);
  }
  .streak-legend span { display: inline-flex; align-items: center; gap: 6px; }
  .streak-legend .sw { width: 10px; height: 10px; border-radius: 2px; }
  .streak-legend .sw.strong { background: var(--r-sage-deep); }
  .streak-legend .sw.kept { background: var(--r-sage); }
  .streak-legend .sw.now { background: var(--r-ember); }
  .streak-legend .sw.upcoming { background: var(--r-rule-5); }
  .streak-legend .sw.skipped { background: transparent; border: 1px dashed var(--r-rule-3); }
  .streak-note {
    font-family: var(--r-serif);
    font-size: 15px;
    line-height: 1.5;
    color: var(--r-text-3);
    padding: 12px 14px;
    background: var(--r-paper);
    border: 1px solid var(--r-rule-5);
    border-radius: 3px;
  }
  .streak-note em { font-style: italic; color: var(--r-ink); }

  /* RITUAL BODY */
  .ritual-body {
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    gap: 48px;
    padding: 48px 0;
    border-top: 1px solid var(--r-rule-4);
  }
  .h2-serif {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 300;
    font-size: 40px;
    color: var(--r-ink);
    margin: 0;
    letter-spacing: -0.015em;
    line-height: 1;
  }
  .h2-serif em { font-style: italic; }
  .rb-lede {
    font-family: var(--r-serif);
    font-size: 17px;
    line-height: 1.55;
    color: var(--r-text-3);
    margin: 18px 0 28px;
    max-width: 44ch;
  }
  .rb-lede em { font-style: italic; color: var(--r-ink); }
  .step {
    display: grid;
    grid-template-columns: 56px 1fr;
    gap: 16px;
    padding: 18px 0;
    border-top: 1px solid var(--r-rule-5);
  }
  .step:last-child { border-bottom: 1px solid var(--r-rule-5); }
  .step .n {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 32px;
    color: var(--r-ember);
    line-height: 1;
    letter-spacing: -0.01em;
  }
  .step h3 {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 21px;
    line-height: 1.3;
    color: var(--r-ink);
    margin: 4px 0 0;
    letter-spacing: -0.005em;
  }

  .side { display: flex; flex-direction: column; gap: 18px; }
  .side-card {
    background: var(--r-paper);
    border: 1px solid var(--r-rule-5);
    border-radius: 3px;
    padding: 24px 24px 22px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .side-card .eyebrow {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--r-text-4);
  }
  .side-card h3 {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 22px;
    line-height: 1.1;
    color: var(--r-ink);
    margin: 0;
    letter-spacing: -0.01em;
  }
  .side-card p {
    font-family: var(--r-serif);
    font-size: 15.5px;
    line-height: 1.5;
    color: var(--r-text-3);
    margin: 0;
  }
  .when-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 8px 16px;
    margin: 6px 0 0;
  }
  .when-grid dt {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--r-text-5);
    padding-top: 3px;
  }
  .when-grid dd {
    margin: 0;
    font-family: var(--r-serif);
    font-size: 15px;
    line-height: 1.5;
    color: var(--r-ink);
  }

  /* SIT-DOWN */
  .sit-down {
    padding: 48px 0;
    border-top: 1px solid var(--r-rule-4);
  }
  .sd-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }
  .sd-sub {
    font-family: var(--r-serif);
    font-size: 16px;
    color: var(--r-text-4);
  }
  .sd-card {
    background: var(--r-paper);
    border: 1px solid var(--r-rule-5);
    border-radius: 3px;
    padding: 28px 32px;
  }
  .sd-textarea {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    resize: vertical;
    font-family: var(--r-serif);
    font-size: 20px;
    line-height: 1.55;
    color: var(--r-ink);
  }
  .sd-textarea::placeholder {
    color: var(--r-text-5);
    font-style: italic;
  }
  .sd-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid var(--r-rule-5);
  }
  .saved {
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 24px;
    color: var(--r-sage-deep);
    margin: 12px 0;
  }
  .saved em { font-style: italic; }

  /* LOG */
  .log-section { padding: 48px 0; border-top: 1px solid var(--r-rule-4); }
  .log-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }
  .log-head .sub {
    font-family: var(--r-serif);
    font-size: 16px;
    color: var(--r-text-4);
  }
  .log-entry {
    display: grid;
    grid-template-columns: 112px 1fr auto;
    gap: 20px;
    padding: 22px 0;
    border-top: 1px solid var(--r-rule-5);
    align-items: start;
  }
  .log-entry:first-of-type { border-top: none; }
  .log-date {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 17px;
    color: var(--r-ink);
    line-height: 1.3;
    letter-spacing: -0.005em;
  }
  .log-date .sm {
    display: block;
    font-family: var(--r-sans);
    font-style: normal;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--r-text-5);
    margin-top: 3px;
  }
  .log-body p {
    font-family: var(--r-serif);
    font-size: 16px;
    line-height: 1.55;
    color: var(--r-text-2);
    margin: 0 0 8px;
  }
  .log-body p em { font-style: italic; color: var(--r-ink); }
  .log-toggle {
    all: unset;
    cursor: pointer;
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--r-text-4);
    border-bottom: 1px solid var(--r-rule-3);
    padding-bottom: 2px;
  }
  .log-toggle:hover { color: var(--r-ink); border-color: var(--r-text-4); }
  .log-status {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--r-sage-deep);
    background: var(--r-tint-sage);
    padding: 5px 10px;
    border-radius: 999px;
    white-space: nowrap;
  }
  .log-status.with-media::after {
    content: " · ✦";
  }

  /* COLOPHON */
  .colophon {
    text-align: center;
    padding: 80px 0 40px;
    font-family: var(--r-serif);
    font-style: italic;
    color: var(--r-text-5);
    font-size: 14px;
  }
  .colophon .fleuron {
    display: block;
    font-size: 20px;
    margin-bottom: 10px;
    color: var(--r-rule-2);
    font-style: normal;
  }
  .colophon em { color: var(--r-text-3); }

  /* RESPONSIVE */
  @media (max-width: 1100px) {
    .pr-hero { grid-template-columns: 1fr; gap: 0; }
    .pr-hero-rule { display: none; }
    .ritual-body { grid-template-columns: 1fr; }
    .log-entry { grid-template-columns: 1fr; }
    .log-entry .log-status { justify-self: start; }
  }
  @media (max-width: 640px) {
    .pr-page { padding: 88px 20px 40px; }
    .cadence-plate { grid-template-columns: 1fr; gap: 8px; }
    .cadence-plate .div { display: none; }
    .cadence-plate .cell { align-items: flex-start !important; text-align: left !important; }
    .streak-grid { grid-template-columns: repeat(6, 1fr); }
  }
`;
