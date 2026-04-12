'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { useJournalEcho } from '@/hooks/useJournalEcho';
import { usePerson } from '@/hooks/usePerson';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';

import Volume from '@/components/magazine/Volume';
import Masthead from '@/components/magazine/Masthead';
import FeaturedHero from '@/components/magazine/FeaturedHero';
import BackIssues from '@/components/magazine/BackIssues';

import { JOURNAL_CATEGORIES, type JournalEntry } from '@/types/journal';
import { getDimension, type DimensionId } from '@/config/relationship-dimensions';

// ================================================================
// THE JOURNAL — diary surface.
//
// Chronological journal_entries, newest first. A flat family-wide
// stream grouped by day. The magazine primitives provide the chrome
// (masthead + primary row with empty-state featured + recent-entries
// side column + back-issues footer); the stream is the substance.
//
// Phase A: pure UI over the existing schema. No entry detail page,
// no AI echo (featured slot is always the capture invitation), no
// themes/embedding, no media. See memory/project_journal_first_architecture.md.
// ================================================================

const CATEGORY_META = Object.fromEntries(
  JOURNAL_CATEGORIES.map((c) => [c.value, c]),
);

// ---------------------------------------------------------------
// Day grouping
// ---------------------------------------------------------------
interface DayGroup {
  key: string;
  label: string;
  entries: JournalEntry[];
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatDayLabel(day: Date, today: Date): string {
  const dayMs = day.getTime();
  const todayMs = startOfDay(today).getTime();
  const diffDays = Math.round((todayMs - dayMs) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return day.toLocaleDateString('en-US', { weekday: 'long' });
  }
  if (day.getFullYear() === today.getFullYear()) {
    return day.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  }
  return day.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function groupByDay(entries: JournalEntry[]): DayGroup[] {
  const today = new Date();
  const groups = new Map<string, DayGroup>();
  for (const entry of entries) {
    const d = entry.createdAt?.toDate?.();
    if (!d) continue;
    const dayStart = startOfDay(d);
    const key = dayStart.toISOString().slice(0, 10);
    const existing = groups.get(key);
    if (existing) {
      existing.entries.push(entry);
    } else {
      groups.set(key, {
        key,
        label: formatDayLabel(dayStart, today),
        entries: [entry],
      });
    }
  }
  // Entries come in desc order already; map preserves insertion order,
  // so groups are also desc. Good.
  return Array.from(groups.values());
}

function formatTime(d: Date): string {
  return d
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
    .toLowerCase();
}

// ================================================================
// Page component
// ================================================================
export default function JournalPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { entries, loading: entriesLoading, loadMore, loadingMore, hasMore } = useJournalEntries();
  const { people } = usePerson();
  const { echo } = useJournalEcho(entries);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const personNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of people) map.set(p.personId, p.name);
    return map;
  }, [people]);

  // Name lookup for userIds — used to render "Shared with Iris" on
  // entries. Built from Persons whose `linkedUserId` is set.
  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of people) {
      if (p.linkedUserId) map.set(p.linkedUserId, p.name);
    }
    return map;
  }, [people]);

  const [filter, setFilter] = useState<'all' | 'personal' | 'family'>('all');

  const filteredEntries = useMemo(() => {
    if (!user) return entries;
    if (filter === 'personal') return entries.filter((e) => e.authorId === user.userId);
    if (filter === 'family') return entries.filter((e) => e.authorId !== user.userId);
    return entries;
  }, [entries, filter, user]);

  const dayGroups = useMemo(() => groupByDay(filteredEntries), [filteredEntries]);

  if (authLoading || entriesLoading) {
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

  const firstName = (user.name || 'Reader').split(' ')[0];
  const hasEntries = entries.length > 0;

  return (
    <div className="relish-page">
      <Navigation />
      <SideNav />

      <div className="pt-[64px] pb-24">
        <div className="relish-container">
          <Volume
            masthead={<Masthead title={`${firstName}'s Journal`} />}
          >
            {!hasEntries && <EmptyCapture />}

            {hasEntries && (
              <div className="journal-single-col">

                {echo && <div data-walkthrough="echo"><EchoHero echo={echo} /></div>}

                <CaptureButton />

                <div className="journal-filter-row" data-walkthrough="journal-filters">
                  {(['all', 'personal', 'family'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      className={`journal-filter-btn${filter === f ? ' active' : ''}`}
                    >
                      {f === 'all' ? 'All entries' : f === 'personal' ? 'Personal' : 'Family'}
                    </button>
                  ))}
                </div>

                <div className="journal-stream" data-walkthrough="journal-entries">
                  {dayGroups.length === 0 && (
                    <p style={{
                      fontFamily: 'var(--font-parent-display)',
                      fontStyle: 'italic', fontSize: 17, color: '#8a7b5f',
                      textAlign: 'center', padding: '32px 0',
                    }}>
                      {filter === 'family'
                        ? 'No family entries yet.'
                        : 'No entries match this filter.'}
                    </p>
                  )}
                  {dayGroups.map((group) => (
                    <div key={group.key} className="journal-day">
                      <div className="journal-day-header">
                        <span className="journal-day-label">{group.label}</span>
                        <span className="journal-day-rule" aria-hidden="true" />
                      </div>
                      <div className="journal-day-entries">
                        {group.entries.map((entry) => (
                          <EntryCard
                            key={entry.entryId}
                            entry={entry}
                            personNameById={personNameById}
                            userNameById={userNameById}
                            currentUserId={user.userId}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {hasMore && (
                  <div className="load-more-row">
                    <button
                      type="button"
                      className="load-more-btn"
                      onClick={loadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? 'Loading…' : 'Older entries'}
                    </button>
                  </div>
                )}

                <style jsx>{`
                  .journal-stream {
                    display: flex;
                    flex-direction: column;
                    gap: 48px;
                    max-width: 760px;
                  }
                  .journal-day {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                  }
                  .journal-filter-row {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 32px;
                    padding-bottom: 24px;
                    border-bottom: 1px solid rgba(200, 190, 172, 0.35);
                  }
                  .journal-filter-btn {
                    font-family: var(--font-parent-body);
                    font-size: 12px;
                    font-weight: 500;
                    letter-spacing: 0.08em;
                    padding: 6px 16px;
                    border-radius: 999px;
                    background: rgba(0, 0, 0, 0.03);
                    border: 1px solid rgba(0, 0, 0, 0.06);
                    color: #5f564b;
                    cursor: pointer;
                    transition: all 0.15s ease;
                  }
                  .journal-filter-btn:hover {
                    background: rgba(0, 0, 0, 0.06);
                  }
                  .journal-filter-btn.active {
                    background: color-mix(in srgb, #7c9082 12%, white);
                    border-color: rgba(124, 144, 130, 0.3);
                    color: #5c7566;
                    font-weight: 600;
                  }
                  .journal-day-header {
                    display: flex;
                    align-items: center;
                    gap: 18px;
                  }
                  .journal-day-label {
                    font-family: var(--font-parent-body);
                    font-size: 10px;
                    font-weight: 600;
                    letter-spacing: 0.28em;
                    text-transform: uppercase;
                    color: #8a7b5f;
                    flex-shrink: 0;
                  }
                  .journal-day-rule {
                    flex: 1;
                    height: 1px;
                    background: rgba(200, 190, 172, 0.45);
                  }
                  .journal-day-entries {
                    display: flex;
                    flex-direction: column;
                    gap: 36px;
                  }
                  .load-more-row {
                    display: flex;
                    justify-content: center;
                    padding-top: 12px;
                  }
                  .load-more-btn {
                    font-family: var(--font-parent-display);
                    font-style: italic;
                    font-size: 15px;
                    color: #7c6e54;
                    background: transparent;
                    border: 1px solid rgba(200, 190, 172, 0.45);
                    border-radius: 999px;
                    padding: 8px 28px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                  }
                  .load-more-btn:hover:not(:disabled) {
                    background: rgba(200, 190, 172, 0.12);
                    color: #3a3530;
                  }
                  .load-more-btn:disabled {
                    opacity: 0.5;
                    cursor: default;
                  }
                  @media (max-width: 720px) {
                    .journal-stream {
                      gap: 36px;
                    }
                    .journal-day-entries {
                      gap: 28px;
                    }
                  }
                  .journal-single-col {
                    max-width: 760px;
                    margin: 0 auto;
                  }
                `}</style>
              </div>
            )}

            <BackIssues line="Entries bind themselves by the month." />
          </Volume>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// Featured slot — AI echo hero. Shows a pull-quote from a
// semantically similar older journal entry. The echo creates a
// feeling of the journal having memory — "you wrote something
// like this before."
// ================================================================
function EchoHero({ echo }: { echo: import('@/hooks/useJournalEcho').EchoMatch }) {
  const cat = CATEGORY_META[echo.category];
  const createdDate = echo.createdAt?._seconds
    ? new Date(echo.createdAt._seconds * 1000)
    : null;
  const dateLabel = createdDate
    ? createdDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year:
          createdDate.getFullYear() === new Date().getFullYear()
            ? undefined
            : 'numeric',
      })
    : '';

  // Use summary as the body if available, otherwise truncate the text
  const body = echo.summary || echo.text.slice(0, 200) + (echo.text.length > 200 ? '…' : '');
  const title = echo.title || 'A familiar thread';

  return (
    <FeaturedHero
      eyebrow="An echo from your journal"
      kindLabel={cat?.label ?? 'Entry'}
      glyph={cat?.emoji ?? '✦'}
      glyphColor="#5C8064"
      title={title}
      body={body}
      meta={
        <>
          {dateLabel}
          {echo.themes.length > 0 && (
            <>
              <span style={{ display: 'inline-block', margin: '0 8px', color: '#a8997d' }}>·</span>
              {echo.themes.slice(0, 2).join(' · ')}
            </>
          )}
        </>
      }
      ctaHref={`/journal/${echo.entryId}`}
      ctaLabel="Revisit this entry"
    />
  );
}

// ================================================================
// Featured slot — capture invitation. Fallback when no echo exists.
// ================================================================
// Compact tactile button for starting a new entry — sits inline above
// the stream when the user has entries but no AI echo filling the hero.
function CaptureButton() {
  return (
    <div className="capture-compact">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event('relish:open-capture'))}
        className="capture-btn"
      >
        <span className="capture-btn-glyph" aria-hidden="true">✦</span>
        <span className="capture-btn-label">Begin an entry</span>
      </button>

      <style jsx>{`
        .capture-compact {
          margin-bottom: 36px;
          max-width: 760px;
        }
        .capture-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          width: 100%;
          padding: 22px 32px;
          background: rgba(92, 128, 100, 0.04);
          border: 1.5px solid rgba(92, 128, 100, 0.2);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          user-select: none;
        }
        .capture-btn:hover {
          background: rgba(92, 128, 100, 0.08);
          border-color: rgba(92, 128, 100, 0.35);
        }
        .capture-btn:active {
          transform: scale(0.985);
          background: rgba(92, 128, 100, 0.12);
        }
        .capture-btn-glyph {
          font-size: 16px;
          color: #5c8064;
        }
        .capture-btn-label {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 20px;
          color: #3a3530;
          letter-spacing: -0.008em;
        }
        @media (max-width: 720px) {
          .capture-btn {
            padding: 18px 20px;
          }
          .capture-btn-label {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
}

// First-time onboarding pitch — only shown when there are zero entries.
function EmptyCapture() {
  return (
    <div className="empty-capture">
      <span className="empty-capture-eyebrow">The Journal</span>
      <div className="empty-capture-ornament" aria-hidden="true">
        ❦
      </div>
      <h2 className="empty-capture-title">
        These pages are still waiting.
      </h2>
      <p className="empty-capture-body">
        Capture a thought and it lands here, in the order it happened.
        Private by default; share when you&rsquo;re ready.
      </p>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event('relish:open-capture'))}
        className="press-link empty-capture-cta"
      >
        Begin your first entry <span className="arrow">⟶</span>
      </button>

      <style jsx>{`
        .empty-capture {
          padding: 16px 0 8px;
          max-width: 640px;
        }
        .empty-capture-eyebrow {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8a7b5f;
          display: block;
          margin-bottom: 20px;
        }
        .empty-capture-ornament {
          font-family: var(--font-parent-display);
          font-size: 24px;
          color: #8a7b5f;
          line-height: 1;
          margin-bottom: 16px;
        }
        .empty-capture-title {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: clamp(34px, 4.2vw, 50px);
          color: #3a3530;
          margin: 0 0 20px;
          line-height: 1.08;
          letter-spacing: -0.012em;
          max-width: 640px;
        }
        .empty-capture-body {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 19px;
          line-height: 1.55;
          color: #4a4238;
          margin: 0 0 28px;
          max-width: 560px;
        }
        :global(.empty-capture-cta) {
          background: transparent;
          border: none;
          padding: 0 0 3px;
          cursor: pointer;
          font-size: 24px !important;
          border-bottom-width: 2px !important;
        }
        @media (max-width: 720px) {
          .empty-capture-title {
            font-size: 32px;
          }
          .empty-capture-body {
            font-size: 17px;
          }
          :global(.empty-capture-cta) {
            font-size: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}

// Privacy descriptor for the compact meta line. Distinguishes between:
//   - mine + nobody shared = "Private"
//   - mine + shared with someone = "Shared with X"
//   - others + shared with me = "From X"
//   - others + legacy family-visible = no extra label
function describePrivacy(
  entry: JournalEntry,
  currentUserId: string,
  userNameById: Map<string, string>,
): { label: string; kind: 'private' | 'shared' | 'received' | 'none' } {
  const isMine = entry.authorId === currentUserId;
  const sharedIds = entry.sharedWithUserIds ?? [];
  if (isMine) {
    if (sharedIds.length === 0) return { label: 'Private', kind: 'private' };
    const names = sharedIds
      .map((id) => userNameById.get(id))
      .filter(Boolean) as string[];
    if (names.length === 0)
      return { label: 'Shared', kind: 'shared' };
    return {
      label: `Shared with ${names.join(' & ')}`,
      kind: 'shared',
    };
  }
  // Not mine — always received. Author name isn't resolvable from
  // `authorId` in Phase A (no user→name map for non-linked users), so
  // we keep it vague.
  const authorName = userNameById.get(entry.authorId);
  return {
    label: authorName ? `From ${authorName}` : 'Received',
    kind: 'received',
  };
}

// ================================================================
// Entry card — full rendering in the stream. No truncation, the
// entry is the whole point. Cream paper background, Cormorant body,
// margin-whisper metadata.
// ================================================================
interface EntryCardProps {
  entry: JournalEntry;
  personNameById: Map<string, string>;
  userNameById: Map<string, string>;
  currentUserId: string;
}

function EntryCard({
  entry,
  personNameById,
  userNameById,
  currentUserId,
}: EntryCardProps) {
  const cat = CATEGORY_META[entry.category];
  const d = entry.createdAt?.toDate?.();
  const timeLabel = d ? formatTime(d) : '';
  const isMine = entry.authorId === currentUserId;
  const about = entry.personMentions
    .map((id) => personNameById.get(id))
    .filter(Boolean)
    .join(' & ');
  const privacy = describePrivacy(entry, currentUserId, userNameById);
  const privacyGlyph = privacy.kind === 'private' ? '🔒' : '✦';
  const isChildProxy = entry.subjectType === 'child_proxy' && entry.subjectPersonId;
  const childName = isChildProxy ? personNameById.get(entry.subjectPersonId!) : null;

  return (
    <article id={`entry-${entry.entryId}`} className="entry">
      <header className="entry-eyebrow">
        <span className="entry-kind">
          <span className="entry-glyph" aria-hidden="true">
            {cat?.emoji ?? '✦'}
          </span>
          {cat?.label ?? 'Entry'}
        </span>
        {timeLabel && (
          <>
            <span className="sep">·</span>
            <span>{timeLabel}</span>
          </>
        )}
        <span className="sep">·</span>
        <span>{childName ? `${childName}\u2019s entry` : isMine ? 'You' : privacy.label}</span>
        {isMine && (
          <>
            <span className="sep">·</span>
            <span className="entry-privacy">
              <span aria-hidden="true">{privacyGlyph}</span> {privacy.label}
            </span>
          </>
        )}
      </header>

      {entry.title && <h3 className="entry-title">{entry.title}</h3>}

      <div className="entry-body">
        {entry.text.split(/\n{2,}/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      {/* Media thumbnails */}
      {entry.media && entry.media.length > 0 && (
        <div className="entry-media">
          {entry.media.filter((m) => m.type === 'image').map((m, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={m.url}
              alt={m.filename || 'Photo'}
              className="entry-media-thumb"
            />
          ))}
          {entry.media.filter((m) => m.type === 'audio').map((m, i) => (
            <div key={`audio-${i}`} className="entry-media-audio">
              <span>🎵</span>
              <span>{m.filename || 'Voice note'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Enrichment tags — compact inline display in the stream */}
      {entry.enrichment && (entry.enrichment.aiDimensions.length > 0 || entry.enrichment.themes.length > 0) && (
        <div className="entry-enrichment">
          {entry.enrichment.aiDimensions.map((id) => {
            const dim = getDimension(id as DimensionId);
            return dim ? (
              <span key={id} className="entry-etag entry-etag--dim">{dim.name}</span>
            ) : null;
          })}
          {entry.enrichment.themes.map((t) => (
            <span key={t} className="entry-etag entry-etag--theme">{t}</span>
          ))}
        </div>
      )}

      {/* Provenance: this entry spawned a Workbook practice */}
      {entry.activitySpawnedItemId && (
        <Link href={`/growth/${entry.activitySpawnedItemId}`} className="entry-provenance-link">
          <span className="entry-provenance-glyph" aria-hidden="true">◆</span>
          Led to a practice in the Workbook
          <span className="arrow">⟶</span>
        </Link>
      )}

      <div className="entry-bottom">
        {about && (
          <p className="entry-about">
            about <span className="press-sc">{about}</span>
          </p>
        )}
        <div className="entry-bottom-right">
          {entry.hasChatThread && (
            <span className="entry-chat-indicator" title="Has AI conversation">
              💬
            </span>
          )}
          <Link href={`/journal/${entry.entryId}`} className="entry-open">
            Open<span className="arrow">⟶</span>
          </Link>
        </div>
      </div>

      <style jsx>{`
        .entry {
          scroll-margin-top: 84px;
        }
        .entry-title {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: 26px;
          line-height: 1.15;
          letter-spacing: -0.008em;
          color: #3a3530;
          margin: 0 0 14px;
        }
        .entry-media {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
        }
        :global(.entry-media-thumb) {
          width: 120px;
          height: 90px;
          object-fit: cover;
          border-radius: 6px;
          border: 1px solid rgba(200, 190, 172, 0.4);
        }
        .entry-media-audio {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.06);
          font-family: var(--font-parent-body);
          font-size: 12px;
          color: #5f564b;
        }
        .entry-enrichment {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 14px;
        }
        .entry-etag {
          padding: 2px 8px;
          border-radius: 999px;
          font-family: var(--font-parent-body);
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.08em;
        }
        .entry-etag--dim {
          background: rgba(92, 128, 100, 0.07);
          border: 1px solid rgba(92, 128, 100, 0.18);
          color: #5c7566;
        }
        .entry-etag--theme {
          background: rgba(184, 142, 90, 0.05);
          border: 1px solid rgba(184, 142, 90, 0.18);
          color: #8a6f42;
        }
        :global(.entry-provenance-link) {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-top: 14px;
          padding: 6px 14px;
          border-radius: 999px;
          background: rgba(92, 128, 100, 0.06);
          border: 1px solid rgba(92, 128, 100, 0.15);
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.14em;
          color: #5c7566;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        :global(.entry-provenance-link:hover) {
          background: rgba(92, 128, 100, 0.1);
          border-color: rgba(92, 128, 100, 0.25);
          color: #3a3530;
        }
        :global(.entry-provenance-link .arrow) {
          display: inline-block;
          margin-left: 2px;
          transition: transform 0.25s ease;
        }
        :global(.entry-provenance-link:hover .arrow) {
          transform: translateX(3px);
        }
        .entry-provenance-glyph {
          font-size: 9px;
        }
        .entry-bottom {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 16px;
          margin-top: 16px;
        }
        .entry-bottom-right {
          display: flex;
          align-items: baseline;
          gap: 12px;
          flex-shrink: 0;
        }
        .entry-chat-indicator {
          font-size: 12px;
          opacity: 0.5;
        }
        :global(.entry-open) {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #8a7b5f;
          text-decoration: none;
          transition: color 0.2s ease;
          flex-shrink: 0;
        }
        :global(.entry-open:hover) {
          color: #3a3530;
        }
        :global(.entry-open .arrow) {
          display: inline-block;
          margin-left: 6px;
          transition: transform 0.25s ease;
        }
        :global(.entry-open:hover .arrow) {
          transform: translateX(3px);
        }
        .entry-eyebrow {
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 0;
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #8a7b5f;
          margin-bottom: 14px;
        }
        .entry-kind {
          display: inline-flex;
          align-items: baseline;
          gap: 6px;
          color: #5a4f3b;
        }
        .entry-glyph {
          font-size: 12px;
          color: #5c8064;
        }
        .entry-eyebrow .sep {
          display: inline-block;
          margin: 0 10px;
          color: #b2a487;
        }
        .entry-privacy {
          color: #6b6254;
          text-transform: none;
          letter-spacing: 0.12em;
          font-style: italic;
        }

        .entry-body {
          font-family: var(--font-parent-display);
          font-size: 21px;
          line-height: 1.6;
          color: #3a3530;
          letter-spacing: -0.002em;
        }
        .entry-body :global(p) {
          margin: 0 0 14px;
        }
        .entry-body :global(p:last-child) {
          margin-bottom: 0;
        }

        .entry-about {
          margin: 0;
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #7c6e54;
        }

        @media (max-width: 720px) {
          .entry-body {
            font-size: 19px;
          }
        }
      `}</style>
    </article>
  );
}
