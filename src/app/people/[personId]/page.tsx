'use client';
/* ================================================================
   Relish · /people/[personId] — the Person Page dossier.
   Rebuilt from the 2026-04-20 editorial redesign: breadcrumbs →
   hero (portrait + dossier) → threads + timeline → quiet-notes
   row → colophon. Shell chrome lives at the root (GlobalNav).
   ================================================================ */

import { use, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { computeAge } from '@/utils/age';
import { stockImagery } from '@/config/stock-imagery';
import type { Person, RelationshipType } from '@/types/person-manual';
import type { JournalEntry } from '@/types/journal';

export default function PersonPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { person, loading: personLoading } = usePersonById(personId);
  const { entries } = useJournalEntries();

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [authLoading, user, router]);

  const mentions = useMemo(() => {
    if (!person) return [] as JournalEntry[];
    return entries
      .filter((e) => (e.personMentions ?? []).includes(person.personId))
      .sort((a, b) => {
        const am = a.createdAt?.toMillis?.() ?? 0;
        const bm = b.createdAt?.toMillis?.() ?? 0;
        return bm - am;
      });
  }, [person, entries]);

  const openThreads = useMemo(() => {
    // Heuristic: non-response entries that haven't been carried
    // forward yet (no companion reflection in their wake). Wire up
    // to useOpenThreads by mention filter once that hook exposes a
    // per-person selector.
    return mentions.filter(
      (e) => !e.respondsToEntryId && e.category !== 'reflection',
    ).slice(0, 5);
  }, [mentions]);

  const loading = authLoading || personLoading;
  if (loading || !user) return null;

  if (!person) {
    return (
      <main className="pp-app">
        <div className="pp-page">
          <p className="pp-empty">
            <em>We can&rsquo;t find that person.</em>
          </p>
          <p className="pp-empty">
            <Link href="/manual">← back to the Family Manual</Link>
          </p>
        </div>
        <style jsx global>{styles}</style>
      </main>
    );
  }

  const firstName = person.name.split(' ')[0];
  const age = person.dateOfBirth ? computeAge(person.dateOfBirth) : null;
  const daysSinceLast = computeDaysSinceLast(mentions);
  const timeline = groupByYear(mentions);

  return (
    <main className="pp-app">
      <div className="pp-page">
        {/* ═══ BREADCRUMBS ═══ */}
        <div className="crumbs">
          <Link href="/manual">The Family Manual</Link>
          <span className="sep">/</span>
          <span>{firstName}</span>
        </div>

        {/* ═══ HERO — PORTRAIT + DOSSIER ═══ */}
        <section className="person-hero">
          <div className="person-portrait">
            <div className="person-plate">
              <span className="tag">
                {relationLabel(person)}
                {age != null && ` · ${age}`}
              </span>
              <h1>{firstName}</h1>
            </div>
          </div>

          <div className="person-hero-rule" aria-hidden="true" />

          <div className="dossier">
            <div className="dossier-dateline">
              <span className="dot" />
              <span>
                A page in the Family Manual · Updated {formatDays(daysSinceLast)}
              </span>
            </div>
            <p className="dossier-lede">
              {mentions.length > 0 ? (
                <>
                  <em>
                    The book has {mentions.length}{' '}
                    {mentions.length === 1 ? 'entry' : 'entries'} about {firstName}.
                  </em>{' '}
                  {openThreads.length > 0
                    ? `${spellCount(openThreads.length)} ${openThreads.length === 1 ? 'thread' : 'threads'} still open.`
                    : 'Nothing open right now.'}
                </>
              ) : (
                <>
                  <em>A new page, not yet written.</em>{' '}
                  Start a first line about {firstName} — the book will fill in.
                </>
              )}
            </p>

            <div className="dossier-stats">
              <div className="dossier-stat">
                <div className="num">{mentions.length}</div>
                <div className="lbl">Entries</div>
              </div>
              <div className="dossier-stat">
                <div className="num">{openThreads.length}</div>
                <div className="lbl">Open threads</div>
              </div>
              <div className="dossier-stat">
                <div className="num">{formatDaysShort(daysSinceLast)}</div>
                <div className="lbl">Since last</div>
              </div>
            </div>

            <dl className="dossier-facts">
              {age != null && (
                <>
                  <dt>Age</dt>
                  <dd>{age}</dd>
                </>
              )}
              {person.pronouns && (
                <>
                  <dt>Pronouns</dt>
                  <dd>{person.pronouns}</dd>
                </>
              )}
              <dt>Relation</dt>
              <dd>{relationDescription(person)}</dd>
              {person.hasManual && person.manualId && (
                <>
                  <dt>Manual</dt>
                  <dd>
                    <Link
                      href={`/people/${person.personId}/manual`}
                      style={{ borderBottom: '1px solid var(--r-rule-3)' }}
                    >
                      Open the full manual
                    </Link>
                  </dd>
                </>
              )}
            </dl>

            <div className="dossier-ctas">
              <button type="button" style={pillDarkStyle} onClick={openPen}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: 'var(--r-amber)', flex: 'none' }}
                  aria-hidden="true"
                >
                  <path d="M17 3l4 4L8 20l-5 1 1-5L17 3z" />
                </svg>
                Write about {firstName}
              </button>
              <Link
                href={`/people/${person.personId}/manual`}
                style={pillStyle}
              >
                Open the full manual
              </Link>
            </div>
          </div>
        </section>

        {/* ═══ THREADS + TIMELINE ═══ */}
        <section className="threads-section">
          <div className="threads-col">
            <div className="threads-head">
              <h2 className="h2-serif">
                {openThreads.length > 0 ? (
                  <>
                    Still open about <em>{firstName}.</em>
                  </>
                ) : (
                  <>
                    Nothing open about <em>{firstName}.</em>
                  </>
                )}
              </h2>
              <span className="sub">
                {openThreads.length > 0
                  ? `${spellCount(openThreads.length)} ${openThreads.length === 1 ? 'thread' : 'threads'}, newest first.`
                  : 'The book is quiet on this page.'}
              </span>
            </div>
            {openThreads.length === 0 ? (
              <div className="threads-empty">
                <p>
                  No threads waiting. If something lands — pick up the Pen.
                </p>
              </div>
            ) : (
              <div>
                {openThreads.map((entry) => (
                  <ThreadRow
                    key={entry.entryId}
                    entry={entry}
                    firstName={firstName}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="timeline">
            <p className="tl-head">Timeline</p>
            {Object.keys(timeline).length === 0 ? (
              <p className="tl-empty">
                <em>Nothing written about {firstName} yet.</em>
              </p>
            ) : (
              Object.entries(timeline)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([year, ys]) => (
                  <div key={year}>
                    <h3 className="tl-year">{year}</h3>
                    {ys.map((e) => (
                      <Link
                        key={e.entryId}
                        href={`/journal/${e.entryId}`}
                        className="tl-entry"
                      >
                        <span className="tl-when">{formatWhen(e.createdAt?.toDate?.())}</span>
                        <span className="tl-body">
                          {(e.title ?? excerptOf(e.text))}
                        </span>
                      </Link>
                    ))}
                  </div>
                ))
            )}
          </aside>
        </section>

        {/* ═══ QUIET NOTES ROW ═══ */}
        <section className="notes-row" aria-label="Notes about them">
          <article className="note-card">
            <span className="eyebrow">Things they say</span>
            <h3>Lines worth keeping.</h3>
            <ul className="note-list">
              <li>
                <span className="q">
                  Pulled quotes from entries will land here.
                </span>
                <span className="meta">awaiting data</span>
              </li>
            </ul>
          </article>

          <article className="note-card">
            <span className="eyebrow">Dates to remember</span>
            <h3>On the calendar.</h3>
            <ul className="note-list">
              {person.dateOfBirth && (
                <li>
                  <span className="q">Birthday</span>
                  <span className="meta">
                    {person.dateOfBirth
                      .toDate()
                      .toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                      })}
                  </span>
                </li>
              )}
              <li>
                <span className="q">Last entry</span>
                <span className="meta">
                  {mentions[0]?.createdAt
                    ?.toDate?.()
                    .toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    }) ?? '—'}
                </span>
              </li>
            </ul>
          </article>

          <article className="note-card dark">
            <span className="eyebrow">A prompt</span>
            <blockquote>
              What do you wish you could ask {firstName} the next time you
              sit down?
            </blockquote>
            <p className="attr">
              — A question for the next conversation.
            </p>
            <button type="button" onClick={openPen} className="cta">
              <span>Answer in the book</span>
              <span aria-hidden="true">→</span>
            </button>
          </article>
        </section>

        {/* ═══ COLOPHON ═══ */}
        <footer className="colophon">
          <span className="fleuron" aria-hidden="true">❦</span>
          <span>
            <em>{firstName}&rsquo;s page</em> · in the Family Manual
          </span>
        </footer>
      </div>

      <style jsx global>{styles}</style>
    </main>
  );
}

/* ════════════════════════════════════════════════════════════════
   Sub-components
   ════════════════════════════════════════════════════════════════ */

function ThreadRow({
  entry,
  firstName,
}: {
  entry: JournalEntry;
  firstName: string;
}) {
  const created = entry.createdAt?.toDate?.();
  const days = created
    ? Math.floor((Date.now() - created.getTime()) / 86_400_000)
    : 0;
  return (
    <Link href={`/journal/${entry.entryId}`} className="thread">
      <span className="thread-age">
        <span className="num">{formatDaysShortest(days)}</span>
        since
      </span>
      <div className="thread-body">
        <h3>{entry.title ?? excerptOf(entry.text, 80)}</h3>
        <p>{excerptOf(entry.text, 160)}</p>
        <div className="cues">
          <span className="pip">About · {firstName}</span>
        </div>
      </div>
      <div className="thread-actions">
        <span className="ta">Open</span>
      </div>
    </Link>
  );
}

/* ════════════════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════════════════ */

function computeDaysSinceLast(entries: JournalEntry[]): number {
  const last = entries[0]?.createdAt?.toDate?.();
  if (!last) return 9999;
  return Math.floor((Date.now() - last.getTime()) / 86_400_000);
}

function groupByYear(
  entries: JournalEntry[],
): Record<string, JournalEntry[]> {
  const out: Record<string, JournalEntry[]> = {};
  for (const e of entries.slice(0, 30)) {
    const d = e.createdAt?.toDate?.();
    if (!d) continue;
    const year = String(d.getFullYear());
    if (!out[year]) out[year] = [];
    out[year].push(e);
  }
  return out;
}

function excerptOf(text: string, max = 140): string {
  const t = (text ?? '').trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + '…';
}

function relationLabel(p: Person): string {
  const age = p.dateOfBirth ? computeAge(p.dateOfBirth) : null;
  switch (p.relationshipType) {
    case 'self':
      return 'You';
    case 'spouse':
      return 'Partner';
    case 'child':
      return age != null ? `Child · ${age}` : 'Child';
    case 'elderly_parent':
      return 'Parent';
    case 'sibling':
      return 'Sibling';
    case 'friend':
      return 'Friend';
    case 'professional':
      return 'Professional';
    default:
      return 'Of the family';
  }
}

function relationDescription(p: Person): string {
  const t: RelationshipType | undefined = p.relationshipType;
  switch (t) {
    case 'self':
      return 'You';
    case 'spouse':
      return 'Your partner';
    case 'child':
      return 'Your child';
    case 'elderly_parent':
      return 'Your parent';
    case 'sibling':
      return 'Your sibling';
    case 'friend':
      return 'A friend';
    case 'professional':
      return 'A professional in your life';
    default:
      return 'Someone the book is keeping';
  }
}

function formatDays(days: number): string {
  if (days >= 9999) return 'not yet written about';
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'a week ago';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return 'a month ago';
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return 'over a year ago';
}

function formatDaysShort(days: number): string {
  if (days >= 9999) return '—';
  if (days < 1) return 'today';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

function formatDaysShortest(days: number): string {
  if (days < 1) return 'today';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

function formatWhen(d?: Date): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function spellCount(n: number): string {
  const names = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
  return n >= 0 && n < names.length ? names[n] : String(n);
}

function openPen() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('relish:pen:open'));
}

/* ════════════════════════════════════════════════════════════════
   Inline pill styles
   ════════════════════════════════════════════════════════════════ */

const pillDarkStyle: React.CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 18px 10px 14px',
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
  textDecoration: 'none',
};

/* ════════════════════════════════════════════════════════════════
   Styles
   ════════════════════════════════════════════════════════════════ */

const heroBg = stockImagery.personHeroFallback
  ? `url('${stockImagery.personHeroFallback}')`
  : `radial-gradient(ellipse at 60% 30%, rgba(201,134,76,0.18), transparent 60%),
     radial-gradient(ellipse at 30% 80%, rgba(124,144,130,0.12), transparent 65%),
     var(--r-cream-warm)`;

const styles = `
  .pp-app { min-height: 100vh; background: var(--r-cream); }
  .pp-page { max-width: 1440px; margin: 0 auto; padding: 104px 40px 40px; }

  .pp-empty {
    max-width: 640px;
    margin: 48px auto 0;
    padding: 0 24px;
    font-family: var(--r-serif);
    font-style: italic;
    color: var(--r-text-4);
    text-align: center;
  }
  .pp-empty :global(a) {
    color: var(--r-ink);
    text-decoration: underline;
  }

  /* BREADCRUMBS */
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
  .crumbs :global(a) {
    color: var(--r-text-4);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: border-color 120ms var(--r-ease-ink);
  }
  .crumbs :global(a:hover) { border-color: var(--r-text-4); }
  .crumbs .sep { opacity: 0.5; }

  /* HERO */
  .person-hero {
    display: grid;
    grid-template-columns: 1.2fr 1px 1fr;
    gap: 48px;
    padding-bottom: 56px;
  }
  .person-hero-rule { background: var(--r-rule-5); align-self: stretch; }

  .person-portrait {
    width: 100%;
    aspect-ratio: 4 / 5;
    border-radius: 3px;
    overflow: hidden;
    position: relative;
    background: ${heroBg};
    background-color: var(--r-cream-warm);
    background-size: cover;
    background-position: center 30%;
  }
  .person-portrait::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(20,16,12,0) 55%, rgba(20,16,12,0.5) 100%);
  }
  .person-plate {
    position: absolute;
    left: 28px;
    bottom: 24px;
    right: 28px;
    color: var(--r-paper);
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .person-plate .tag {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    opacity: 0.85;
  }
  .person-plate h1 {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 300;
    font-size: clamp(56px, 7vw, 96px);
    line-height: 0.95;
    letter-spacing: -0.025em;
    margin: 0;
  }

  .dossier { padding-top: 12px; display: flex; flex-direction: column; gap: 24px; }
  .dossier-dateline {
    display: flex;
    align-items: center;
    gap: 14px;
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-3);
  }
  .dossier-dateline .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--r-ember);
  }
  .dossier-lede {
    font-family: var(--r-serif);
    font-weight: 400;
    font-size: 21px;
    line-height: 1.5;
    color: var(--r-text-2);
    margin: 0;
    max-width: 40ch;
  }
  .dossier-lede em { font-style: italic; color: var(--r-ink); }
  .dossier-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    padding: 20px 0;
    border-top: 1px solid var(--r-rule-5);
    border-bottom: 1px solid var(--r-rule-5);
  }
  .dossier-stat .num {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 32px;
    color: var(--r-ink);
    line-height: 1;
    letter-spacing: -0.01em;
  }
  .dossier-stat .lbl {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--r-text-5);
    margin-top: 8px;
  }
  .dossier-facts {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 10px 24px;
    margin: 0;
  }
  .dossier-facts dt {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--r-text-5);
    padding-top: 4px;
  }
  .dossier-facts dd {
    margin: 0;
    font-family: var(--r-serif);
    font-size: 17px;
    line-height: 1.5;
    color: var(--r-ink);
  }
  .dossier-facts dd :global(a) { color: inherit; text-decoration: none; }
  .dossier-ctas { display: flex; gap: 10px; flex-wrap: wrap; }

  /* THREADS + TIMELINE */
  .threads-section {
    padding: 48px 0;
    border-top: 1px solid var(--r-rule-4);
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 48px;
  }
  .threads-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
    margin-bottom: 20px;
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
  .threads-head .sub {
    font-family: var(--r-serif);
    font-size: 16px;
    color: var(--r-text-4);
  }

  .threads-empty {
    padding: 32px 0;
  }
  .threads-empty p {
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 17px;
    color: var(--r-text-4);
    margin: 0;
  }

  :global(.thread) {
    padding: 22px 0;
    border-bottom: 1px solid var(--r-rule-5);
    display: grid;
    grid-template-columns: 72px 1fr auto;
    gap: 18px;
    align-items: start;
    text-decoration: none;
    color: inherit;
  }
  :global(.thread:last-child) { border-bottom: none; }
  :global(.thread:hover .thread-body h3) { color: var(--r-ember); }

  :global(.thread-age) {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--r-text-5);
    padding-top: 5px;
    line-height: 1.4;
  }
  :global(.thread-age .num) {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 26px;
    color: var(--r-ink);
    display: block;
    letter-spacing: -0.01em;
    margin-bottom: 2px;
  }
  :global(.thread-body h3) {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 22px;
    line-height: 1.2;
    color: var(--r-ink);
    margin: 0 0 8px;
    letter-spacing: -0.005em;
    transition: color 160ms var(--r-ease-ink);
  }
  :global(.thread-body p) {
    font-family: var(--r-serif);
    font-size: 15.5px;
    line-height: 1.55;
    color: var(--r-text-3);
    margin: 0;
  }
  :global(.thread-body .cues) {
    margin-top: 10px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--r-text-5);
  }
  :global(.thread-body .cues .pip) {
    padding: 3px 10px;
    border-radius: 999px;
    background: var(--r-cream);
    color: var(--r-text-4);
  }
  :global(.thread-actions) {
    display: flex;
    gap: 6px;
    padding-top: 4px;
  }
  :global(.thread-actions .ta) {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--r-text-4);
    padding: 6px 10px;
    border: 1px solid var(--r-rule-5);
    border-radius: 999px;
  }

  /* TIMELINE */
  .timeline { padding-top: 8px; }
  .tl-head {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-4);
    margin: 0 0 16px;
  }
  .tl-empty {
    font-family: var(--r-serif);
    color: var(--r-text-5);
    margin: 0;
  }
  .tl-year {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 24px;
    color: var(--r-ink);
    margin: 28px 0 10px;
    letter-spacing: -0.01em;
  }
  .tl-year:first-of-type { margin-top: 0; }
  :global(.tl-entry) {
    display: grid;
    grid-template-columns: 56px 1fr;
    gap: 12px;
    padding: 10px 0;
    border-top: 1px solid var(--r-rule-5);
    text-decoration: none;
    color: inherit;
  }
  :global(.tl-entry:first-of-type) { border-top: none; }
  :global(.tl-entry:hover .tl-body) { color: var(--r-ember); }
  :global(.tl-when) {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--r-text-5);
    padding-top: 4px;
  }
  :global(.tl-body) {
    font-family: var(--r-serif);
    font-size: 15.5px;
    line-height: 1.45;
    color: var(--r-ink);
    transition: color 160ms var(--r-ease-ink);
  }

  /* NOTES ROW */
  .notes-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    padding: 48px 0;
    border-top: 1px solid var(--r-rule-4);
  }
  .note-card {
    background: var(--r-paper);
    border: 1px solid var(--r-rule-5);
    border-radius: 3px;
    padding: 28px 28px 26px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .note-card .eyebrow {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--r-text-4);
  }
  .note-card h3 {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 300;
    font-size: 30px;
    line-height: 1.05;
    letter-spacing: -0.015em;
    color: var(--r-ink);
    margin: 0;
  }
  .note-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; }
  .note-list li {
    padding: 10px 0;
    border-top: 1px solid var(--r-rule-5);
    font-family: var(--r-serif);
    font-size: 16px;
    line-height: 1.5;
    color: var(--r-text-2);
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: baseline;
  }
  .note-list li:first-child { border-top: none; }
  .note-list li .q { font-style: italic; color: var(--r-ink); }
  .note-list li .meta {
    font-family: var(--r-sans);
    font-style: normal;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--r-text-5);
    white-space: nowrap;
  }
  .note-card.dark {
    background: var(--r-leather);
    color: var(--r-paper);
    border-color: var(--r-leather);
  }
  .note-card.dark h3 { color: var(--r-paper); }
  .note-card.dark .eyebrow { color: rgba(245,236,216,0.55); }
  .note-card.dark blockquote {
    margin: 0;
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 300;
    font-size: 24px;
    line-height: 1.3;
    color: var(--r-paper);
    letter-spacing: -0.01em;
  }
  .note-card.dark blockquote::before {
    content: "";
    display: block;
    width: 24px;
    height: 1px;
    background: rgba(245,236,216,0.3);
    margin-bottom: 16px;
  }
  .note-card.dark .attr {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(245,236,216,0.55);
    margin: 0;
  }
  .note-card.dark .cta {
    all: unset;
    cursor: pointer;
    margin-top: auto;
    padding-top: 14px;
    border-top: 1px solid rgba(245,236,216,0.15);
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--r-amber);
    display: flex;
    justify-content: space-between;
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

  @media (max-width: 1100px) {
    .person-hero { grid-template-columns: 1fr; gap: 0; }
    .person-hero-rule { display: none; }
    .threads-section { grid-template-columns: 1fr; }
    .notes-row { grid-template-columns: 1fr; }
  }
  @media (max-width: 640px) {
    .pp-page { padding: 88px 20px 40px; }
    .dossier-stats { grid-template-columns: repeat(3, 1fr); gap: 12px; }
  }
`;
