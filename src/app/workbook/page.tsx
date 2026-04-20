'use client';
/* ================================================================
   Relish · /workbook — the canonical landing page.
   Rebuilt from the 2026-04-20 editorial redesign: broadsheet
   masthead → spread (hero + open threads) → feature row → dispatches
   → week ahead → song strip → colophon. Shell chrome (top nav + the
   Pen) is provided by the root layout (GlobalNav).
   ================================================================ */

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { stockImagery } from '@/config/stock-imagery';

// Dispatch the same custom event the CaptureSheet listens for.
// "Open the book" / "Answer in the book" / "Pick up the Pen" all
// route here — they ask the shared floating Pen to open its sheet,
// not navigate to another page.
function openPen() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('relish:pen:open'));
}

// The three Pen-opening buttons use inline styles because styled-jsx
// :global() scoping interacts oddly with <button> vs <a> in this
// component's tree — the previous CSS version let browser button
// defaults show through and the pill shape never rendered. Inline
// wins; keep it as the canonical way to style these CTAs.

const heroActionStyle: React.CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  marginTop: 36,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 18px 10px 14px',
  border: '1px solid var(--r-rule-3)',
  borderRadius: 999,
  fontFamily: 'var(--r-sans)',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--r-ink)',
  background: 'var(--r-paper)',
  transition: 'background 160ms var(--r-ease-ink), transform 160ms var(--r-ease-ink)',
};

const quietCtaStyle: React.CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  marginTop: 20,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '0 0 2px',
  fontFamily: 'var(--r-sans)',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'var(--r-ember)',
  borderBottom: '1px solid currentColor',
};

const promptCtaDarkStyle: React.CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  marginTop: 'auto',
  paddingTop: 14,
  borderTop: '1px solid rgba(245,236,216,0.15)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontFamily: 'var(--r-sans)',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--r-amber)',
  width: '100%',
};
import { useAuth } from '@/context/AuthContext';
import { useWorkbookData } from '@/integration';
import { useNextRitual } from '@/hooks/useNextRitual';
import { useOpenThreads } from '@/hooks/useOpenThreads';
import { ensureSoloWeekly } from '@/lib/ritual-seeds';
import type { OpenThread } from '@/lib/open-threads';

export default function WorkbookPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const wb = useWorkbookData();
  const { ritual: nextRitual, loading: ritualLoading } = useNextRitual();
  const { threads: openThreads } = useOpenThreads();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  // First-visit seeding of the default solo_weekly ritual — kept
  // from the prior /workbook so new users land with something to do.
  useEffect(() => {
    if (ritualLoading || !user?.familyId || !user?.userId) return;
    if (nextRitual) return;
    ensureSoloWeekly({
      familyId: user.familyId,
      userId: user.userId,
    }).catch((err) => console.warn('workbook: ensureSoloWeekly failed', err));
  }, [ritualLoading, nextRitual, user?.familyId, user?.userId]);

  if (loading || !user) return null;

  const firstName = wb.firstName ?? user.name?.split(' ')[0] ?? 'you';
  const today = new Date();
  const season = seasonFor(today);
  const dateToday = today.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const weekNumber = isoWeek(today);

  const greeting = greetFor(today, firstName);
  const ledeCount = openThreads.length;
  const lede = ledeForState(ledeCount);

  return (
    <main className="wb-app">
      <div className="wb-page">
        {/* ═══ MASTHEAD ═══ */}
        <section className="masthead" aria-label="Today">
          <div className="masthead-band" data-season={season} />
          <div className="masthead-strip">
            <div className="masthead-cell">
              <span className="masthead-eyebrow">Today</span>
              <span className="masthead-value big">{dateToday}</span>
            </div>
            <div className="masthead-divider" />
            <div className="masthead-cell align-c">
              <span className="masthead-eyebrow">Season</span>
              <span className="masthead-value">
                {seasonLabel(season)}
                <span className="sub"> · week {weekNumber}</span>
              </span>
            </div>
            <div className="masthead-divider" />
            <div className="masthead-cell align-c">
              <span className="masthead-eyebrow">Open</span>
              <span className="masthead-value">
                {ledeCount === 0 ? 'Nothing' : `${ledeCount}`}
                <span className="sub">
                  {ledeCount === 1 ? ' thread' : ' threads'}
                </span>
              </span>
            </div>
            <div className="masthead-divider" />
            <div className="masthead-cell align-r">
              <span className="masthead-eyebrow">Colophon</span>
              <span className="masthead-value">
                The Workbook<span className="sub"> · {partOfDay(today)} edition</span>
              </span>
            </div>
          </div>
        </section>

        {/* ═══ SPREAD — hero + tending ═══ */}
        <section className="spread">
          <div className="hero">
            <div className="hero-dateline">
              <span className="dot" />
              <span className="text">
                {firstName}&rsquo;s daily · {partOfDay(today)} edition
              </span>
            </div>
            <h1 className="hero-title">{greeting}</h1>
            <p className="hero-lede">{lede}</p>
            <button type="button" onClick={openPen} style={heroActionStyle}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'var(--r-ember)', flex: 'none' }}
                aria-hidden="true"
              >
                <path d="M17 3l4 4L8 20l-5 1 1-5L17 3z" />
              </svg>
              <span>
                {ledeCount > 0 ? 'Pick up where you left off' : 'Open the book'}
              </span>
            </button>
          </div>

          <div className="spread-rule" aria-hidden="true" />

          <div className="tending">
            <div className="tending-head">
              <span className="eyebrow">Open threads</span>
              <span className="count">
                {ledeCount === 0 ? 'nothing waiting' : `${ledeCount} kept open`}
              </span>
            </div>
            {ledeCount === 0 ? (
              <QuietBlock />
            ) : (
              <div>
                {openThreads.slice(0, 3).map((t) => (
                  <ThreadRow key={`${t.kind}:${t.id}`} thread={t} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ═══ FEATURE ROW — memory · person · prompt ═══ */}
        <section className="feature-row" aria-label="Today's readings">
          <FeatureMemory />
          <FeaturePerson />
          <FeaturePrompt />
        </section>

        {/* ═══ DISPATCHES ═══ */}
        <section className="dispatches">
          <div className="dispatches-head">
            <h2 className="dispatches-title">
              What Relish is <em>returning</em> to you.
            </h2>
            <p className="sub">
              You write the raw material in. Once a week Relish sends a few
              things back — patterns it noticed, a brief for this week&rsquo;s
              conversations, an echo from last season.
            </p>
          </div>

          <DispatchLeadPlaceholder />

          <div className="dispatch-row">
            <DispatchBriefPlaceholder />
            <DispatchPatternPlaceholder />
            <DispatchEchoPlaceholder />
          </div>
        </section>

        {/* ═══ WEEK AHEAD ═══ */}
        <section className="week" aria-label="The week ahead">
          <div className="week-head">
            <h2 className="week-title">The week, plotted.</h2>
            <p className="week-sub">
              Practices you&rsquo;ve kept, and the ones coming up.
            </p>
          </div>
          <WeekGrid today={today} nextRitualKind={nextRitual?.kind} />
          <SongStripPlaceholder />
        </section>

        {/* ═══ COLOPHON ═══ */}
        <footer className="colophon">
          <span className="fleuron" aria-hidden="true">❦</span>
          <span>
            <em>The Workbook</em>, {partOfDay(today)} edition. &nbsp;·&nbsp; kept
            by <em>{firstName}</em>.{' '}
            <button
              type="button"
              className="sign-out"
              onClick={() => logout().then(() => router.push('/login'))}
            >
              Sign out
            </button>
          </span>
        </footer>
      </div>

      <style jsx>{styles}</style>
    </main>
  );
}

/* ════════════════════════════════════════════════════════════════
   Sub-components
   ════════════════════════════════════════════════════════════════ */

function ThreadRow({ thread }: { thread: OpenThread }) {
  return (
    <Link href={thread.closingAction.href} className="thread">
      <div className="thread-row1">
        <span className="thread-title">{threadTitle(thread)}</span>
        <span className="thread-age">{threadAge(thread)}</span>
      </div>
      <p className="thread-preview">{thread.subtitle}</p>
      <span className={`thread-tag ${threadTagClass(thread)}`}>
        {threadTagLabel(thread)}
      </span>
    </Link>
  );
}

function QuietBlock() {
  return (
    <div className="quiet-block">
      <div className="glyph">❦</div>
      <h3>The book is quiet.</h3>
      <p>
        Nothing&rsquo;s waiting on you this morning. When you want a line,
        a prompt is below — or pick up the Pen.
      </p>
      <button type="button" onClick={openPen} style={quietCtaStyle}>
        Pick up the Pen <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

function FeatureMemory() {
  return (
    <article className="feature memory">
      <div className="feature-photo" aria-hidden="true">
        <span className="photo-fleuron">❦</span>
      </div>
      <span className="feature-eyebrow">
        <span className="pip" />
        From the archive · a year ago
      </span>
      <span className="memory-date">
        A memory will surface here from the archive.
      </span>
      <p className="memory-quote">
        &ldquo;A quiet line will appear here when there&rsquo;s a year-ago
        entry worth re-reading.&rdquo;
      </p>
      <div className="memory-foot">
        <span>Archive pipeline not yet wired</span>
        <span>Open →</span>
      </div>
    </article>
  );
}

function FeaturePerson() {
  return (
    <article className="feature person">
      <span className="feature-eyebrow">
        <span className="pip" />
        Someone you haven&rsquo;t written about in a while
      </span>
      <div className="person-row">
        <div className="person-portrait">·</div>
        <div>
          <h3 className="person-name">A person surfaces here</h3>
          <div className="person-rel">Last entry · —</div>
        </div>
      </div>
      <p className="person-note">
        The person longest unwritten-about will appear here with the last line
        you wrote about them.
      </p>
      <div className="person-foot">
        <div className="stat"><span className="num">—</span>entries</div>
        <div className="stat"><span className="num">—</span>open</div>
        <div className="stat"><span className="num">—</span>since</div>
      </div>
    </article>
  );
}

function FeaturePrompt() {
  return (
    <article className="feature prompt">
      <span className="feature-eyebrow">
        <span className="pip" />
        A prompt for this morning
      </span>
      <blockquote>
        What did you notice this weekend that you almost didn&rsquo;t
        write down?
      </blockquote>
      <p className="prompt-attr">— Monday prompt · one minute, in the book</p>
      <button type="button" onClick={openPen} style={promptCtaDarkStyle}>
        <span>Answer in the book</span>
        <span aria-hidden="true">→</span>
      </button>
    </article>
  );
}

function DispatchLeadPlaceholder() {
  return (
    <article className="lead">
      <div className="lead-text">
        <span className="lead-eyebrow">
          <span className="pip" />
          The weekly synthesis · ready Sunday 9pm
        </span>
        <h3>The weekly synthesis will read here.</h3>
        <p className="dek">
          Relish will open a lead story once a week — the pattern it thinks
          you&rsquo;re <em>already writing about</em>, with three lines of
          evidence pulled verbatim from the week&rsquo;s entries.
        </p>
        <div className="evidence">
          <div className="ev">
            <span className="when">Synthesis</span>
            <span className="line">
              <em>Not yet wired.</em> The pipeline will land under this
              eyebrow as soon as the weekly job runs.
            </span>
          </div>
        </div>
        <div className="lead-actions">
          <button className="lead-pill dark" type="button" disabled>
            Read the full dispatch
          </button>
          <button className="lead-pill" type="button" disabled>
            Add to this week&rsquo;s brief
          </button>
        </div>
      </div>
      <div className="lead-art" aria-hidden="true">
        <span className="lead-art-fleuron">❦</span>
      </div>
    </article>
  );
}

function DispatchBriefPlaceholder() {
  return (
    <article className="dispatch brief">
      <span className="eyebrow">
        <span className="pip" />
        Brief · not yet scheduled
      </span>
      <h3>A brief for your next hard conversation.</h3>
      <ul className="bullets">
        <li>
          <em>What to bring.</em> Three items the book noticed across the
          week&rsquo;s entries.
        </li>
        <li>
          <em>Who it touches.</em> Counts and people pulled from the
          relevant threads.
        </li>
        <li>
          <em>What&rsquo;s unresolved.</em> Anything left open more than
          ten days.
        </li>
      </ul>
      <div className="foot">
        <span>Briefs come online once you&rsquo;ve been writing a while.</span>
        <span className="arrow">—</span>
      </div>
    </article>
  );
}

function DispatchPatternPlaceholder() {
  return (
    <article className="dispatch">
      <span className="eyebrow amber">
        <span className="pip" />A pattern Relish is watching
      </span>
      <h3>A rhythm will surface here.</h3>
      <p>
        Once there&rsquo;s enough in the book, a simple day-of-week chart
        will run in this cell and name the pattern in one sentence.
      </p>
      <div className="pattern-chart" aria-hidden="true">
        {[32, 44, 88, 28, 38, 22, 18].map((h, i) => (
          <div
            key={i}
            className={`bar ${i === 2 ? 'ember' : 'ember-s'}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="pattern-legend">
        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span>
        <span>Fri</span><span>Sat</span><span>Sun</span>
      </div>
      <div className="foot">
        <span>Illustrative — awaiting real data</span>
        <span className="arrow">—</span>
      </div>
    </article>
  );
}

function DispatchEchoPlaceholder() {
  return (
    <article className="dispatch">
      <span className="eyebrow sage">
        <span className="pip" />
        An echo · from an earlier chapter
      </span>
      <blockquote className="echo-quote">
        &ldquo;A line from the past that matters this week will sit here.&rdquo;
      </blockquote>
      <span className="echo-attr">Illustrative</span>
      <p className="echo-note">
        Relish will resurface an older entry when the current week touches
        the same subject. It reads better than most reminders.
      </p>
      <div className="foot">
        <span>Resurfaces when you&rsquo;ve got history to draw from</span>
        <span className="arrow">—</span>
      </div>
    </article>
  );
}

function WeekGrid({
  today,
  nextRitualKind,
}: {
  today: Date;
  nextRitualKind?: string;
}) {
  // Sunday-anchored week. Render 7 days starting from this week's Sunday.
  const days = useMemo(() => {
    const sunday = new Date(today);
    sunday.setDate(sunday.getDate() - sunday.getDay());
    sunday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [today]);

  const todayKey = today.toDateString();

  return (
    <div className="week-grid">
      {days.map((d, i) => {
        const isToday = d.toDateString() === todayKey;
        const isPast = d.getTime() < new Date(todayKey).getTime();
        const cls = [
          'day',
          isPast ? 'past' : '',
          isToday ? 'today' : '',
        ]
          .filter(Boolean)
          .join(' ');
        const letter = d.toLocaleDateString('en-GB', { weekday: 'short' });
        const entry =
          isToday && nextRitualKind
            ? {
                label: prettyRitualLabel(nextRitualKind),
                cadence: 'Next ritual',
                tone: 'ember' as const,
              }
            : null;
        return (
          <div key={i} className={cls}>
            <span className="day-letter">
              {isToday ? `${letter} · Today` : letter}
            </span>
            <span className="day-date">{d.getDate()}</span>
            {entry && (
              <div className="day-entries">
                <div className={`entry ${entry.tone}`}>
                  {entry.label}
                  <span className="entry-cadence">{entry.cadence}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SongStripPlaceholder() {
  return (
    <div className="song-strip">
      <div className="song-art" aria-hidden="true">
        <span className="song-art-fleuron">♪</span>
      </div>
      <div className="song-meta">
        <div className="song-eyebrow">
          On the family&rsquo;s record · this week
        </div>
        <div className="song-title">
          A line from what you&rsquo;ve been listening to.
        </div>
        <div className="song-attrib">
          Wire a song with the Pen&rsquo;s + Song button; the newest one
          runs here.
        </div>
      </div>
      <span className="song-play" aria-disabled="true">Listen →</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════════════════ */

function greetFor(d: Date, name: string): string {
  const h = d.getHours();
  if (h < 5) return `Still up, ${name}.`;
  if (h < 12) return `Good morning, ${name}.`;
  if (h < 18) return `Good afternoon, ${name}.`;
  return `Good evening, ${name}.`;
}

function partOfDay(d: Date): string {
  const h = d.getHours();
  if (h < 12) return 'Morning';
  if (h < 18) return 'Afternoon';
  return 'Evening';
}

function seasonFor(
  d: Date,
): 'spring' | 'summer' | 'autumn' | 'winter' {
  const m = d.getMonth();
  if (m < 2 || m === 11) return 'winter';
  if (m < 5) return 'spring';
  if (m < 8) return 'summer';
  return 'autumn';
}

function seasonLabel(s: ReturnType<typeof seasonFor>): string {
  switch (s) {
    case 'spring':
      return 'Mid-spring';
    case 'summer':
      return 'Summer';
    case 'autumn':
      return 'Autumn';
    case 'winter':
      return 'Winter';
  }
}

function isoWeek(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 86400000));
}

function ledeForState(openCount: number): string {
  if (openCount === 0)
    return 'The kitchen is quiet. The book is where you left it.';
  if (openCount === 1) return 'One thread is open and the kitchen is quiet.';
  if (openCount === 2) return 'Two threads are open and the kitchen is quiet.';
  return `${openCount} threads are open.`;
}

function threadTitle(t: OpenThread): string {
  switch (t.reason) {
    case 'overdue_ritual':
      return 'A ritual is due';
    case 'unclosed_divergence':
      return 'A divergence to sit with';
    case 'pending_invite':
      return 'A view is waiting';
    case 'incomplete_practice':
      return 'A practice left unfinished';
  }
}

function threadAge(t: OpenThread): string {
  const d = t.openedAt;
  if (!d) return 'now';
  const ms = Date.now() - d.getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function threadTagClass(t: OpenThread): string {
  switch (t.reason) {
    case 'overdue_ritual':
      return 'home';
    case 'unclosed_divergence':
      return 'people';
    case 'pending_invite':
      return 'people';
    case 'incomplete_practice':
      return 'plans';
  }
}

function threadTagLabel(t: OpenThread): string {
  switch (t.reason) {
    case 'overdue_ritual':
      return 'Ritual · due';
    case 'unclosed_divergence':
      return 'Divergence';
    case 'pending_invite':
      return 'Invite · waiting';
    case 'incomplete_practice':
      return 'Practice';
  }
}

function prettyRitualLabel(kind: string): string {
  switch (kind) {
    case 'solo_weekly':
      return 'Your solo week';
    case 'partner_biweekly':
      return 'With your partner';
    case 'family_monthly':
      return 'Family read';
    case 'repair':
      return 'Repair ritual';
    default:
      return 'Ritual';
  }
}

/* ════════════════════════════════════════════════════════════════
   Styles
   ════════════════════════════════════════════════════════════════ */

const styles = `
  .wb-app { min-height: 100vh; background: var(--r-cream); }
  .wb-page {
    max-width: 1440px;
    margin: 0 auto;
    padding: 104px 40px 40px;
  }

  /* ═══ MASTHEAD ═══ */
  .masthead { margin: 0 0 0; }
  .masthead-band {
    height: 168px;
    border: 1px solid var(--r-rule-4);
    border-bottom: none;
    border-radius: 2px 2px 0 0;
    position: relative;
    background-size: cover;
    background-position: center 38%;
    background-repeat: no-repeat;
  }
  .masthead-band[data-season="spring"] {
    background-image:
      linear-gradient(180deg, rgba(20,16,12,0.15) 0%, rgba(20,16,12,0) 40%, rgba(245,240,232,0.35) 82%, rgba(245,240,232,0.62) 100%),
      url('${stockImagery.masthead.spring}');
  }
  .masthead-band[data-season="summer"] {
    background-image:
      linear-gradient(180deg, rgba(20,16,12,0.12) 0%, rgba(20,16,12,0) 40%, rgba(245,240,232,0.4) 82%, rgba(245,240,232,0.65) 100%),
      url('${stockImagery.masthead.summer}');
  }
  .masthead-band[data-season="autumn"] {
    background-image:
      linear-gradient(180deg, rgba(20,16,12,0.2) 0%, rgba(20,16,12,0) 40%, rgba(245,240,232,0.35) 82%, rgba(245,240,232,0.62) 100%),
      url('${stockImagery.masthead.autumn}');
  }
  .masthead-band[data-season="winter"] {
    background-image:
      linear-gradient(180deg, rgba(20,16,12,0.25) 0%, rgba(20,16,12,0) 40%, rgba(245,240,232,0.35) 82%, rgba(245,240,232,0.62) 100%),
      url('${stockImagery.masthead.winter}');
  }
  .masthead-strip {
    background: var(--r-paper);
    border: 1px solid var(--r-rule-4);
    border-top: none;
    padding: 18px 32px;
    display: grid;
    grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
    gap: 0;
    align-items: center;
  }
  .masthead-cell { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .masthead-cell.align-c { align-items: center; text-align: center; }
  .masthead-cell.align-r { align-items: flex-end; text-align: right; }
  .masthead-divider { width: 1px; height: 32px; background: var(--r-rule-5); }
  .masthead-eyebrow {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-5);
  }
  .masthead-value {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 22px;
    color: var(--r-ink);
    line-height: 1;
    letter-spacing: -0.005em;
  }
  .masthead-value.big { font-size: 30px; }
  .masthead-value .sub {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 300;
    font-size: 18px;
    color: var(--r-text-4);
  }

  /* ═══ SPREAD ═══ */
  .spread {
    display: grid;
    grid-template-columns: 1.35fr 1px 1fr;
    gap: 48px;
    margin-top: 48px;
    padding-bottom: 56px;
  }
  .spread-rule { background: var(--r-rule-5); align-self: stretch; }
  .hero { padding-right: 16px; }
  .hero-dateline { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
  .hero-dateline .dot { width: 5px; height: 5px; border-radius: 50%; background: var(--r-ember); }
  .hero-dateline .text {
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-3);
  }
  .hero-title {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 300;
    font-size: clamp(56px, 7.5vw, 104px);
    line-height: 0.96;
    letter-spacing: -0.025em;
    color: var(--r-ink);
    margin: 0;
  }
  .hero-lede {
    font-family: var(--r-serif);
    font-weight: 400;
    font-size: 22px;
    line-height: 1.5;
    color: var(--r-text-2);
    margin: 28px 0 0;
    max-width: 38ch;
  }
  .hero-lede em { font-style: italic; color: var(--r-ink); }
  :global(.hero-action) {
    margin-top: 36px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px 10px 14px;
    border: 1px solid var(--r-rule-3);
    border-radius: 999px;
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--r-ink);
    background: var(--r-paper);
    text-decoration: none;
    transition: background 160ms var(--r-ease-ink), transform 160ms var(--r-ease-ink);
  }
  :global(.hero-action:hover) { background: var(--r-cream-warm); transform: translateY(-1px); }
  :global(.pen-glyph) { width: 14px; height: 14px; color: var(--r-ember); }

  .tending { display: flex; flex-direction: column; gap: 20px; padding-top: 6px; }
  .tending-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 4px; }
  .tending-head .eyebrow {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--r-text-4);
  }
  .tending-head .count {
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 15px;
    color: var(--r-text-5);
  }
  :global(.thread) {
    display: block;
    padding: 18px 2px 20px;
    border-bottom: 1px solid var(--r-rule-5);
    color: inherit;
    text-decoration: none;
  }
  :global(.thread:last-child) { border-bottom: none; }
  :global(.thread:hover .thread-title) { color: var(--r-ember); }
  :global(.thread-row1) { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
  :global(.thread-title) {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 21px;
    color: var(--r-ink);
    line-height: 1.25;
    letter-spacing: -0.005em;
    transition: color 160ms var(--r-ease-ink);
  }
  :global(.thread-age) {
    font-family: var(--r-sans);
    font-size: 11px;
    color: var(--r-text-5);
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
  :global(.thread-preview) {
    font-family: var(--r-serif);
    font-size: 15.5px;
    line-height: 1.5;
    color: var(--r-text-3);
    margin: 0;
  }
  :global(.thread-tag) {
    display: inline-block;
    margin-top: 8px;
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--r-text-5);
    padding: 3px 10px;
    background: var(--r-cream);
    border-radius: 999px;
  }
  :global(.thread-tag.health)   { color: var(--r-burgundy); background: var(--r-tint-burgundy); }
  :global(.thread-tag.home)     { color: var(--r-ember);    background: var(--r-tint-ember); }
  :global(.thread-tag.people)   { color: var(--r-sage);     background: var(--r-tint-sage); }
  :global(.thread-tag.plans)    { color: #8B6F2B;           background: var(--r-tint-amber); }

  .quiet-block { padding: 32px 8px; text-align: left; }
  .quiet-block .glyph { font-family: var(--r-serif); font-size: 28px; color: var(--r-rule-2); margin-bottom: 16px; }
  .quiet-block h3 { font-family: var(--r-serif); font-style: italic; font-weight: 400; font-size: 26px; line-height: 1.25; color: var(--r-ink); margin: 0 0 10px; }
  .quiet-block p { font-family: var(--r-serif); font-size: 16px; line-height: 1.55; color: var(--r-text-3); margin: 0; max-width: 32ch; }
  :global(.prompt-cta) {
    margin-top: 20px;
    display: inline-block;
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--r-ember);
    border-bottom: 1px solid currentColor;
    padding-bottom: 2px;
    text-decoration: none;
  }

  /* ═══ FEATURE ROW ═══ */
  .feature-row {
    display: grid;
    grid-template-columns: 1.15fr 1fr 1.05fr;
    gap: 24px;
    padding: 48px 0;
    border-top: 1px solid var(--r-rule-4);
  }
  .feature {
    background: var(--r-paper);
    border: 1px solid var(--r-rule-5);
    border-radius: 3px;
    padding: 28px 28px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 280px;
    position: relative;
    overflow: hidden;
    transition: transform 180ms var(--r-ease-ink), box-shadow 180ms var(--r-ease-ink);
  }
  .feature:hover { transform: translateY(-1px); box-shadow: var(--r-shadow-card); }
  .feature-eyebrow {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--r-text-4);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .feature-eyebrow .pip { width: 5px; height: 5px; border-radius: 50%; background: var(--r-ember); }

  /* Memory card: archive photo placeholder. Autumn-leaves still
     life — evocative and seasonal without being wedding-y. Real
     photos come from the archive entry's own media when the
     pipeline's wired. */
  .feature-photo {
    height: 120px;
    margin: -28px -28px 0;
    background-image:
      linear-gradient(180deg, rgba(20,16,12,0.05) 0%, rgba(251,248,242,0) 60%, var(--r-paper) 100%),
      url('${stockImagery.memoryCard}');
    background-size: cover;
    background-position: center 50%;
    border-bottom: 1px solid var(--r-rule-5);
  }
  .photo-fleuron { display: none; }
  .memory-date { font-family: var(--r-serif); font-style: italic; font-size: 15px; color: var(--r-text-4); }
  .memory-quote {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 22px;
    line-height: 1.35;
    color: var(--r-ink);
    margin: 4px 0 0;
    letter-spacing: -0.005em;
  }
  .memory-foot {
    margin-top: auto;
    padding-top: 14px;
    border-top: 1px solid var(--r-rule-5);
    font-family: var(--r-sans);
    font-size: 11px;
    color: var(--r-text-5);
    letter-spacing: 0.04em;
    display: flex;
    justify-content: space-between;
  }

  .person-row { display: flex; gap: 18px; align-items: center; }
  .person-portrait {
    width: 72px; height: 72px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--r-cream-warm), var(--r-cream));
    border: 1px solid var(--r-rule-4);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 30px;
    color: var(--r-ember);
    flex: none;
  }
  .person-name {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 26px;
    line-height: 1.1;
    color: var(--r-ink);
    margin: 0;
    letter-spacing: -0.01em;
  }
  .person-rel {
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--r-text-5);
    margin-top: 6px;
  }
  .person-note { font-family: var(--r-serif); font-size: 16px; line-height: 1.5; color: var(--r-text-3); margin: 0; }
  .person-note em { font-style: italic; color: var(--r-ink); }
  .person-foot {
    margin-top: auto;
    padding-top: 14px;
    display: flex;
    align-items: center;
    gap: 14px;
    font-family: var(--r-sans);
    font-size: 11px;
    color: var(--r-text-5);
    letter-spacing: 0.04em;
  }
  .person-foot .stat { display: flex; flex-direction: column; gap: 2px; }
  .person-foot .stat .num {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 20px;
    color: var(--r-ink);
    line-height: 1;
  }

  .prompt { background: var(--r-leather); color: var(--r-paper); border-color: var(--r-leather); }
  .prompt .feature-eyebrow { color: rgba(245,236,216,0.6); }
  .prompt .feature-eyebrow .pip { background: var(--r-amber); }
  .prompt blockquote {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 300;
    font-size: 28px;
    line-height: 1.25;
    margin: 0;
    letter-spacing: -0.01em;
    color: var(--r-paper);
  }
  .prompt blockquote::before {
    content: "";
    display: block;
    width: 24px;
    height: 1px;
    background: rgba(245,236,216,0.3);
    margin-bottom: 18px;
  }
  .prompt-attr {
    font-family: var(--r-sans);
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(245,236,216,0.55);
    margin: 0;
  }
  :global(.prompt-cta-dark) {
    margin-top: auto;
    padding-top: 14px;
    border-top: 1px solid rgba(245,236,216,0.15);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--r-amber);
    text-decoration: none;
  }

  /* ═══ DISPATCHES ═══ */
  .dispatches { padding: 48px 0; border-top: 1px solid var(--r-rule-4); }
  .dispatches-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
    margin-bottom: 28px;
  }
  .dispatches-title {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 300;
    font-size: 44px;
    color: var(--r-ink);
    margin: 0;
    letter-spacing: -0.015em;
    line-height: 1;
  }
  .dispatches-title em { font-style: italic; }
  .dispatches-head .sub {
    font-family: var(--r-serif);
    font-size: 17px;
    color: var(--r-text-3);
    margin: 0;
    max-width: 44ch;
  }

  .lead {
    background: var(--r-paper);
    border: 1px solid var(--r-rule-4);
    border-radius: 3px;
    padding: 0;
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 0;
    overflow: hidden;
    margin-bottom: 24px;
  }
  .lead-text { padding: 32px 36px 28px; display: flex; flex-direction: column; gap: 16px; }
  .lead-eyebrow {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--r-text-4);
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }
  .lead-eyebrow .pip { width: 6px; height: 6px; border-radius: 50%; background: var(--r-burgundy); }
  .lead h3 {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 300;
    font-size: 38px;
    line-height: 1.08;
    letter-spacing: -0.02em;
    color: var(--r-ink);
    margin: 0;
  }
  .lead .dek {
    font-family: var(--r-serif);
    font-size: 18px;
    line-height: 1.55;
    color: var(--r-text-2);
    margin: 0;
  }
  .lead .dek em { font-style: italic; color: var(--r-ink); }
  .evidence { margin-top: 6px; display: flex; flex-direction: column; border-top: 1px solid var(--r-rule-5); }
  .ev { padding: 12px 0; border-bottom: 1px solid var(--r-rule-5); display: grid; grid-template-columns: 82px 1fr; gap: 14px; align-items: baseline; }
  .ev:last-child { border-bottom: none; }
  .ev .when {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--r-text-5);
  }
  .ev .line { font-family: var(--r-serif); font-style: italic; font-size: 16px; line-height: 1.45; color: var(--r-text-2); }
  .lead-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
  .lead-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 14px;
    border: 1px solid var(--r-rule-3);
    border-radius: 999px;
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--r-ink);
    background: var(--r-paper);
  }
  .lead-pill.dark { background: var(--r-leather); color: var(--r-paper); border-color: var(--r-leather); }
  .lead-pill:disabled { opacity: 0.45; cursor: not-allowed; }
  /* Lead art: the redesign mock shows a pattern illustration here;
     we don't have one sourced yet that's definitively on-brand, so
     a warm paper panel with a subtle gradient + the "A pattern
     Relish noticed" label stands in. Swap to real art once a
     visual pattern-of-the-week is sourced or generated per family. */
  .lead-art {
    background: var(--r-paper-soft);
    background-image:
      radial-gradient(ellipse at 30% 30%, rgba(201,134,76,0.12), transparent 55%),
      radial-gradient(ellipse at 80% 70%, rgba(140,74,62,0.08), transparent 60%);
    min-height: 280px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    border-left: 1px solid var(--r-rule-5);
  }
  .lead-art::after {
    content: "A pattern Relish noticed";
    position: absolute;
    left: 20px;
    bottom: 18px;
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-5);
    background: transparent;
    padding: 0;
  }
  .lead-art-fleuron {
    font-family: var(--r-serif);
    font-size: 48px;
    color: var(--r-rule-2);
    display: block;
  }

  .dispatch-row { display: grid; grid-template-columns: 1.1fr 1fr 1fr; gap: 24px; }
  .dispatch {
    background: var(--r-paper);
    border: 1px solid var(--r-rule-5);
    border-radius: 3px;
    padding: 26px 26px 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: 300px;
    transition: transform 180ms var(--r-ease-ink), box-shadow 180ms var(--r-ease-ink);
  }
  .dispatch:hover { transform: translateY(-1px); box-shadow: var(--r-shadow-card); }
  .dispatch .eyebrow {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--r-text-4);
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }
  .dispatch .eyebrow .pip { width: 5px; height: 5px; border-radius: 50%; background: var(--r-text-4); }
  .dispatch .eyebrow.sage .pip { background: var(--r-sage); }
  .dispatch .eyebrow.ember .pip { background: var(--r-ember); }
  .dispatch .eyebrow.amber .pip { background: var(--r-amber); }
  .dispatch h3 {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 24px;
    line-height: 1.2;
    letter-spacing: -0.005em;
    color: var(--r-ink);
    margin: 0;
  }
  .dispatch p {
    font-family: var(--r-serif);
    font-size: 16px;
    line-height: 1.5;
    color: var(--r-text-3);
    margin: 0;
  }
  .dispatch p em { font-style: italic; color: var(--r-ink); }
  .dispatch .foot {
    margin-top: auto;
    padding-top: 14px;
    border-top: 1px solid var(--r-rule-5);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--r-text-5);
  }
  .dispatch .foot .arrow { color: var(--r-ember); }

  .brief { background: var(--r-leather); color: var(--r-paper); border-color: var(--r-leather); position: relative; overflow: hidden; }
  .brief::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--r-ember), var(--r-amber)); }
  .brief .eyebrow { color: rgba(245,236,216,0.6); }
  .brief .eyebrow .pip { background: var(--r-amber); }
  .brief h3 { color: var(--r-paper); }
  .brief p { color: rgba(245,236,216,0.75); }
  .brief p em { color: var(--r-paper); }
  .brief .bullets { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .brief .bullets li {
    font-family: var(--r-serif);
    font-size: 15.5px;
    line-height: 1.45;
    color: rgba(245,236,216,0.78);
    padding-left: 14px;
    position: relative;
  }
  .brief .bullets li::before { content: "—"; position: absolute; left: 0; color: var(--r-amber); }
  .brief .bullets li em { font-style: italic; color: var(--r-paper); }
  .brief .foot { border-top-color: rgba(245,236,216,0.15); color: rgba(245,236,216,0.55); }
  .brief .foot .arrow { color: var(--r-amber); }

  .pattern-chart { display: flex; align-items: flex-end; gap: 6px; height: 72px; margin: 2px 0 6px; }
  .pattern-chart .bar { flex: 1; background: var(--r-rule-4); border-radius: 1px; min-height: 8%; }
  .pattern-chart .bar.ember { background: var(--r-ember); }
  .pattern-chart .bar.ember-s { background: var(--r-ember-soft); }
  .pattern-legend {
    display: flex;
    justify-content: space-between;
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--r-text-5);
  }

  .echo-quote {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 22px;
    line-height: 1.3;
    color: var(--r-ink);
    border-left: 2px solid var(--r-ember);
    padding-left: 16px;
    margin: 0;
    letter-spacing: -0.005em;
  }
  .echo-attr {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--r-text-5);
  }
  .echo-note { font-size: 15px; color: var(--r-text-4); margin: 0; }

  /* ═══ WEEK AHEAD ═══ */
  .week { padding: 40px 0 48px; border-top: 1px solid var(--r-rule-4); }
  .week-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 24px;
    gap: 24px;
    flex-wrap: wrap;
  }
  .week-title {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 300;
    font-size: 44px;
    color: var(--r-ink);
    margin: 0;
    letter-spacing: -0.015em;
    line-height: 1;
  }
  .week-sub { font-family: var(--r-serif); font-size: 17px; color: var(--r-text-3); margin: 0; }
  .week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; }
  .day {
    background: var(--r-paper);
    border: 1px solid var(--r-rule-5);
    border-radius: 3px;
    padding: 16px 14px 18px;
    min-height: 160px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
  }
  .day.past { opacity: 0.55; background: transparent; border-style: dashed; }
  .day.today {
    background: var(--r-paper);
    border-color: var(--r-ink);
    box-shadow: 0 0 0 3px var(--r-tint-ember);
  }
  .day-letter {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-5);
  }
  .day.today .day-letter { color: var(--r-ember); }
  .day-date {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 26px;
    color: var(--r-ink);
    line-height: 1;
    letter-spacing: -0.01em;
  }
  .day.past .day-date { color: var(--r-text-5); }
  .day-entries { margin-top: auto; display: flex; flex-direction: column; gap: 6px; }
  .entry {
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 13.5px;
    line-height: 1.3;
    color: var(--r-ink);
    padding-left: 9px;
    border-left: 2px solid var(--r-ember);
  }
  .entry.sage { border-color: var(--r-sage); }
  .entry.burgundy { border-color: var(--r-burgundy); }
  .entry.amber { border-color: var(--r-amber); }
  .entry-cadence {
    display: block;
    font-family: var(--r-sans);
    font-style: normal;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--r-text-5);
    margin-top: 2px;
  }

  /* ═══ SONG STRIP ═══ */
  .song-strip {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 24px;
    align-items: center;
    padding: 22px 28px;
    background: var(--r-leather);
    color: var(--r-paper);
    border-radius: 3px;
    margin-top: 16px;
  }
  .song-art {
    width: 56px;
    height: 56px;
    border-radius: 2px;
    background-image:
      linear-gradient(135deg, rgba(201,134,76,0.25), rgba(140,74,62,0.35)),
      url('${stockImagery.songArt}');
    background-size: cover;
    background-position: center;
    flex: none;
  }
  .song-art-fleuron { display: none; }
  .song-meta { min-width: 0; }
  .song-eyebrow {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--r-amber);
  }
  .song-title {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 22px;
    color: var(--r-paper);
    line-height: 1.15;
    margin-top: 4px;
    letter-spacing: -0.005em;
  }
  .song-attrib { font-family: var(--r-sans); font-size: 12px; color: rgba(245,236,216,0.55); margin-top: 4px; }
  .song-play {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--r-amber);
    padding: 10px 18px;
    border: 1px solid rgba(201,168,76,0.4);
    border-radius: 999px;
    opacity: 0.5;
  }

  /* ═══ COLOPHON ═══ */
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
  .sign-out {
    all: unset;
    cursor: pointer;
    color: var(--r-text-5);
    text-decoration: underline;
    font-style: italic;
    font-family: var(--r-serif);
  }
  .sign-out:hover { color: var(--r-text-3); }

  /* ═══ RESPONSIVE ═══ */
  @media (max-width: 1100px) {
    .spread { grid-template-columns: 1fr; gap: 0; }
    .spread-rule { display: none; }
    .feature-row { grid-template-columns: 1fr; }
    .lead { grid-template-columns: 1fr; }
    .lead-art { min-height: 180px; }
    .dispatch-row { grid-template-columns: 1fr; }
    .week-grid { grid-template-columns: repeat(4, 1fr); }
    .masthead-strip { grid-template-columns: 1fr 1fr; gap: 16px; }
    .masthead-divider { display: none; }
  }
  @media (max-width: 640px) {
    .wb-page { padding: 88px 20px 40px; }
    .week-grid { grid-template-columns: repeat(2, 1fr); }
    .masthead-strip { grid-template-columns: 1fr; }
  }
`;
