'use client';
/* ================================================================
   Relish · /archive — everything the book has kept.
   Built in the 2026-04-20 editorial language: masthead strip →
   year selector → chronological entries grouped by month →
   colophon. Shell chrome comes from GlobalNav at the root.
   The 2026-04-20 handoff flagged the Archive as needing more
   design iteration; this is a first pass that matches the other
   rooms' voice and is live against real journal_entries.
   ================================================================ */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import type { JournalEntry, JournalCategory } from '@/types/journal';

export default function ArchivePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { entries, loading: entriesLoading } = useJournalEntries();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const [query, setQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const hay = `${e.title ?? ''} ${e.text ?? ''} ${(e.tags ?? []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [entries, query]);

  const grouped = useMemo(() => groupByYearMonth(filtered), [filtered]);

  const years = useMemo(
    () => Object.keys(grouped).map(Number).sort((a, b) => b - a),
    [grouped],
  );

  useEffect(() => {
    if (selectedYear == null && years.length > 0) setSelectedYear(years[0]);
  }, [years, selectedYear]);

  const stats = useMemo(() => computeStats(entries), [entries]);

  if (loading || !user) return null;

  const currentYear = selectedYear ?? new Date().getFullYear();
  const monthsForYear = grouped[currentYear] ?? {};
  const hasAny = entries.length > 0;

  return (
    <main className="ar-app">
      <div className="ar-page">
        {/* ═══ MASTHEAD ═══ */}
        <section className="manual-masthead" aria-label="The Archive at a glance">
          <div className="masthead-strip">
            <div className="masthead-cell">
              <span className="masthead-eyebrow">The Archive</span>
              <span className="masthead-value big">
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
            <div className="masthead-divider" />
            <div className="masthead-cell align-c">
              <span className="masthead-eyebrow">This month</span>
              <span className="masthead-value">
                <em>{stats.thisMonth}</em>
                <span className="sub"> written</span>
              </span>
            </div>
            <div className="masthead-divider" />
            <div className="masthead-cell align-c">
              <span className="masthead-eyebrow">This year</span>
              <span className="masthead-value">
                <em>{stats.thisYear}</em>
                <span className="sub"> so far</span>
              </span>
            </div>
            <div className="masthead-divider" />
            <div className="masthead-cell align-r">
              <span className="masthead-eyebrow">First line</span>
              <span className="masthead-value">
                {stats.firstLine ? (
                  <>
                    {stats.firstLine.toLocaleDateString('en-GB', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </>
                ) : (
                  '—'
                )}
              </span>
            </div>
          </div>
        </section>

        {/* ═══ HERO / SEARCH ═══ */}
        <section className="ar-hero">
          <div>
            <p className="ar-kicker">The Archive · everything kept</p>
            <h1 className="ar-h1">
              {hasAny
                ? 'Read back through it.'
                : 'The archive will fill as you write.'}
            </h1>
            <p className="ar-lede">
              {hasAny ? (
                <>
                  <em>
                    {entries.length}{' '}
                    {entries.length === 1 ? 'entry' : 'entries'} in the book
                    so far.
                  </em>{' '}
                  Search for a name, a feeling, a word you keep coming back to.
                </>
              ) : (
                <>
                  <em>Nothing in the archive yet.</em> Write your first line —
                  it lands here.
                </>
              )}
            </p>
          </div>
          <div className="ar-search-wrap">
            <input
              type="text"
              className="ar-search"
              placeholder="Search the book…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="ar-clear"
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </section>

        {/* ═══ YEAR SELECTOR ═══ */}
        {years.length > 0 && (
          <nav className="ar-years" aria-label="Year">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                className={`ar-year ${y === currentYear ? 'on' : ''}`}
                onClick={() => setSelectedYear(y)}
              >
                {y}
              </button>
            ))}
          </nav>
        )}

        {/* ═══ ENTRIES BY MONTH ═══ */}
        <section className="ar-timeline" aria-label={`Entries from ${currentYear}`}>
          {!hasAny && !entriesLoading ? (
            <p className="ar-empty">
              <em>A quiet first page.</em> Nothing written yet.
            </p>
          ) : entriesLoading ? (
            <p className="ar-empty">Reading the book…</p>
          ) : Object.keys(monthsForYear).length === 0 ? (
            <p className="ar-empty">
              <em>Nothing from {currentYear}{query ? ` matches "${query}"` : ''}.</em>{' '}
              Pick another year or clear the search.
            </p>
          ) : (
            Object.entries(monthsForYear)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([monthKey, monthEntries]) => (
                <MonthBlock
                  key={monthKey}
                  month={Number(monthKey)}
                  year={currentYear}
                  entries={monthEntries}
                />
              ))
          )}
        </section>

        {/* ═══ COLOPHON ═══ */}
        <footer className="colophon">
          <span className="fleuron" aria-hidden="true">❦</span>
          <span>
            <em>The Archive</em>
            {entries.length > 0 && ` — ${entries.length} ${entries.length === 1 ? 'line' : 'lines'} kept`}
            .
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

function MonthBlock({
  month,
  year,
  entries,
}: {
  month: number;
  year: number;
  entries: JournalEntry[];
}) {
  const monthName = new Date(year, month, 1).toLocaleDateString('en-GB', {
    month: 'long',
  });
  return (
    <div className="ar-month">
      <div className="ar-month-head">
        <h3 className="ar-month-title">
          <em>{monthName}.</em>
        </h3>
        <span className="ar-month-count">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>
      <ol className="ar-entries">
        {entries.map((e) => (
          <ArchiveEntryRow key={e.entryId} entry={e} />
        ))}
      </ol>
    </div>
  );
}

function ArchiveEntryRow({ entry }: { entry: JournalEntry }) {
  const d = entry.createdAt?.toDate?.();
  const day = d ? d.getDate() : '';
  const weekday = d
    ? d.toLocaleDateString('en-GB', { weekday: 'short' })
    : '';
  const title = entry.title ?? firstLineOf(entry.text);
  const excerpt = excerptOf(entry.text, 180);
  const hasMedia = (entry.media?.length ?? 0) > 0;
  const isReflection =
    entry.category === 'reflection' &&
    (entry.reflectsOnEntryIds?.length ?? 0) > 0;

  return (
    <li>
      <Link href={`/journal/${entry.entryId}`} className="ar-entry">
        <div className="ar-entry-date">
          <span className="num">{day}</span>
          <span className="wd">{weekday}</span>
        </div>
        <div className="ar-entry-body">
          <h4 className="ar-entry-title">
            {isReflection && (
              <span className="ar-seedling" aria-hidden="true">
                ❦
              </span>
            )}
            {title}
          </h4>
          <p className="ar-entry-excerpt">{excerpt}</p>
          <div className="ar-entry-meta">
            <span className={`ar-entry-tag ${entry.category}`}>
              {categoryLabel(entry.category)}
            </span>
            {hasMedia && (
              <span className="ar-media-cue">
                · {entry.media?.length} {entry.media?.length === 1 ? 'attachment' : 'attachments'}
              </span>
            )}
            {entry.sharedWithUserIds.length > 0 && (
              <span className="ar-shared-cue">
                · shared
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

/* ════════════════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════════════════ */

function groupByYearMonth(
  entries: JournalEntry[],
): Record<number, Record<number, JournalEntry[]>> {
  const out: Record<number, Record<number, JournalEntry[]>> = {};
  for (const e of entries) {
    const d = e.createdAt?.toDate?.();
    if (!d) continue;
    const y = d.getFullYear();
    const m = d.getMonth();
    if (!out[y]) out[y] = {};
    if (!out[y][m]) out[y][m] = [];
    out[y][m].push(e);
  }
  // Sort each month's entries newest-first.
  for (const y of Object.keys(out).map(Number)) {
    for (const m of Object.keys(out[y]).map(Number)) {
      out[y][m].sort((a, b) => {
        const am = a.createdAt?.toMillis?.() ?? 0;
        const bm = b.createdAt?.toMillis?.() ?? 0;
        return bm - am;
      });
    }
  }
  return out;
}

function computeStats(entries: JournalEntry[]): {
  thisMonth: number;
  thisYear: number;
  firstLine: Date | null;
} {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const yearKey = now.getFullYear();
  let thisMonth = 0;
  let thisYear = 0;
  let earliest: Date | null = null;
  for (const e of entries) {
    const d = e.createdAt?.toDate?.();
    if (!d) continue;
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    if (k === monthKey) thisMonth++;
    if (d.getFullYear() === yearKey) thisYear++;
    if (!earliest || d < earliest) earliest = d;
  }
  return { thisMonth, thisYear, firstLine: earliest };
}

function firstLineOf(text: string): string {
  const t = (text ?? '').trim().replace(/\s+/g, ' ');
  if (!t) return 'An entry';
  const dot = t.search(/[.!?]\s/);
  if (dot !== -1 && dot < 80) return t.slice(0, dot + 1);
  if (t.length <= 80) return t;
  return t.slice(0, 79).trimEnd() + '…';
}

function excerptOf(text: string, max: number): string {
  const t = (text ?? '').trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + '…';
}

function categoryLabel(c: JournalCategory): string {
  switch (c) {
    case 'moment':
      return 'A moment';
    case 'reflection':
      return 'Reflection';
    case 'win':
      return 'A win';
    case 'challenge':
      return 'Challenge';
    case 'question':
      return 'Question';
    case 'gratitude':
      return 'Gratitude';
  }
}

/* ════════════════════════════════════════════════════════════════
   Styles
   ════════════════════════════════════════════════════════════════ */

const styles = `
  .ar-app { min-height: 100vh; background: var(--r-cream); }
  .ar-page { max-width: 1440px; margin: 0 auto; padding: 104px 40px 40px; }

  /* MASTHEAD (same pattern as the other rooms) */
  .manual-masthead { margin: 0; }
  .masthead-strip {
    background: var(--r-paper);
    border: 1px solid var(--r-rule-4);
    padding: 18px 32px;
    display: grid;
    grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
    gap: 0;
    align-items: center;
    border-radius: 2px;
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
  .masthead-value em { font-style: italic; color: var(--r-ink); }
  .masthead-value .sub {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 300;
    font-size: 18px;
    color: var(--r-text-4);
  }

  /* HERO */
  .ar-hero {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 48px;
    padding: 48px 0;
    border-bottom: 1px solid var(--r-rule-4);
    align-items: end;
  }
  .ar-kicker {
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-3);
    margin: 0 0 12px;
  }
  .ar-h1 {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 300;
    font-size: clamp(48px, 6vw, 88px);
    line-height: 0.98;
    letter-spacing: -0.025em;
    color: var(--r-ink);
    margin: 0 0 20px;
  }
  .ar-lede {
    font-family: var(--r-serif);
    font-weight: 400;
    font-size: 20px;
    line-height: 1.5;
    color: var(--r-text-2);
    margin: 0;
    max-width: 40ch;
  }
  .ar-lede em { font-style: italic; color: var(--r-ink); }

  .ar-search-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .ar-search {
    width: 100%;
    padding: 14px 40px 14px 18px;
    border: 1px solid var(--r-rule-3);
    background: var(--r-paper);
    border-radius: 3px;
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 18px;
    color: var(--r-ink);
    outline: none;
    transition: border-color 140ms var(--r-ease-ink);
  }
  .ar-search::placeholder { color: var(--r-text-5); }
  .ar-search:focus { border-color: var(--r-ink); }
  .ar-clear {
    all: unset;
    cursor: pointer;
    position: absolute;
    right: 14px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--r-rule-4);
    color: var(--r-paper);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    line-height: 1;
  }

  /* YEAR SELECTOR */
  .ar-years {
    padding: 20px 0;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--r-rule-5);
  }
  .ar-year {
    all: unset;
    cursor: pointer;
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 22px;
    color: var(--r-text-5);
    padding: 4px 14px;
    border: 1px solid transparent;
    border-radius: 999px;
    transition: all 140ms var(--r-ease-ink);
  }
  .ar-year:hover { color: var(--r-ink); }
  .ar-year.on {
    color: var(--r-paper);
    background: var(--r-leather);
    border-color: var(--r-leather);
  }

  /* TIMELINE */
  .ar-timeline { padding: 32px 0 48px; display: flex; flex-direction: column; gap: 48px; }
  .ar-empty {
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 18px;
    color: var(--r-text-4);
    padding: 48px 0;
    text-align: center;
    margin: 0;
  }
  .ar-empty em { color: var(--r-text-2); font-style: italic; }

  .ar-month {}
  .ar-month-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 18px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--r-rule-5);
  }
  .ar-month-title {
    font-family: var(--r-serif);
    font-weight: 300;
    font-size: 40px;
    color: var(--r-ink);
    margin: 0;
    letter-spacing: -0.015em;
    line-height: 1;
  }
  .ar-month-title em { font-style: italic; }
  .ar-month-count {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-5);
  }

  .ar-entries {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .ar-entry {
    display: grid;
    grid-template-columns: 72px 1fr;
    gap: 18px;
    padding: 22px 0;
    border-bottom: 1px solid var(--r-rule-5);
    text-decoration: none;
    color: inherit;
    transition: background 160ms var(--r-ease-ink);
  }
  .ar-entry:last-child { border-bottom: none; }
  .ar-entry:hover { background: rgba(251, 248, 242, 0.6); }
  .ar-entry:hover .ar-entry-title { color: var(--r-ember); }

  .ar-entry-date {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding-top: 4px;
    gap: 2px;
  }
  .ar-entry-date .num {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 32px;
    color: var(--r-ink);
    line-height: 1;
    letter-spacing: -0.01em;
  }
  .ar-entry-date .wd {
    font-family: var(--r-sans);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--r-text-5);
  }

  .ar-entry-body { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .ar-entry-title {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 22px;
    line-height: 1.2;
    color: var(--r-ink);
    margin: 0;
    letter-spacing: -0.005em;
    transition: color 160ms var(--r-ease-ink);
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .ar-seedling {
    color: var(--r-sage);
    font-size: 18px;
    line-height: 1;
    flex: none;
  }
  .ar-entry-excerpt {
    font-family: var(--r-serif);
    font-size: 15.5px;
    line-height: 1.55;
    color: var(--r-text-3);
    margin: 2px 0 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .ar-entry-meta {
    margin-top: 6px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--r-text-5);
  }
  .ar-entry-tag {
    padding: 3px 10px;
    border-radius: 999px;
    background: var(--r-cream);
    color: var(--r-text-4);
  }
  .ar-entry-tag.reflection { color: var(--r-sage-deep); background: var(--r-tint-sage); }
  .ar-entry-tag.win { color: var(--r-sage-deep); background: var(--r-tint-sage); }
  .ar-entry-tag.challenge { color: var(--r-burgundy); background: var(--r-tint-burgundy); }
  .ar-entry-tag.question { color: var(--r-ember); background: var(--r-tint-ember); }
  .ar-entry-tag.gratitude { color: #8B6F2B; background: var(--r-tint-amber); }
  .ar-media-cue, .ar-shared-cue { color: var(--r-text-5); }

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
    .ar-hero { grid-template-columns: 1fr; gap: 24px; align-items: start; }
    .masthead-strip { grid-template-columns: 1fr 1fr; gap: 16px; }
    .masthead-divider { display: none; }
  }
  @media (max-width: 640px) {
    .ar-page { padding: 88px 20px 40px; }
    .ar-month-title { font-size: 32px; }
    .ar-entry { grid-template-columns: 56px 1fr; gap: 14px; }
    .ar-entry-date .num { font-size: 26px; }
    .masthead-strip { grid-template-columns: 1fr; }
  }
`;
