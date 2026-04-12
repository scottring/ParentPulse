'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { usePerson } from '@/hooks/usePerson';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';

import Volume from '@/components/magazine/Volume';
import Masthead from '@/components/magazine/Masthead';
import PrimaryRow from '@/components/magazine/PrimaryRow';
import SideColumn from '@/components/magazine/SideColumn';
import Section from '@/components/magazine/Section';
import BackIssues from '@/components/magazine/BackIssues';

import { JOURNAL_CATEGORIES, type JournalEntry } from '@/types/journal';

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

function snippet(text: string, max = 140): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trim() + '…';
}

// ================================================================
// Page component
// ================================================================
export default function JournalPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { entries, loading: entriesLoading } = useJournalEntries();
  const { people } = usePerson();

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

  const dayGroups = useMemo(() => groupByDay(entries), [entries]);

  const recent = useMemo(() => entries.slice(0, 6), [entries]);

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
            <PrimaryRow
              featured={<EmptyCapture hasEntries={hasEntries} />}
              aside={
                hasEntries ? (
                  <SideColumn eyebrow="Recently" title="Entries">
                    {recent.map((entry) => (
                      <RecentSpine
                        key={entry.entryId}
                        entry={entry}
                        personNameById={personNameById}
                        userNameById={userNameById}
                        currentUserId={user.userId}
                      />
                    ))}
                  </SideColumn>
                ) : undefined
              }
            />

            {hasEntries && (
              <Section eyebrow="The stream" title="Day by day">
                <div className="journal-stream">
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
                  @media (max-width: 720px) {
                    .journal-stream {
                      gap: 36px;
                    }
                    .journal-day-entries {
                      gap: 28px;
                    }
                  }
                `}</style>
              </Section>
            )}

            <BackIssues line="Entries bind themselves by the month." />
          </Volume>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// Featured slot — capture invitation. Always rendered in the
// featured column (until Phase C brings the AI echo hero).
// ================================================================
function EmptyCapture({ hasEntries }: { hasEntries: boolean }) {
  const handleClick = () => {
    window.dispatchEvent(new Event('relish:open-capture'));
  };

  const heading = hasEntries
    ? 'What&rsquo;s on your mind today?'
    : 'These pages are still waiting.';

  const body = hasEntries
    ? 'Another moment, a question, a small thing you noticed — the Journal takes them all in the order they come.'
    : 'Capture a thought and it lands here, in the order it happened. Private by default; share when you&rsquo;re ready.';

  return (
    <div className="empty-capture">
      <span className="empty-capture-eyebrow">Today in the Journal</span>
      <div className="empty-capture-ornament" aria-hidden="true">
        ❦
      </div>
      <h2
        className="empty-capture-title"
        dangerouslySetInnerHTML={{ __html: heading }}
      />
      <p
        className="empty-capture-body"
        dangerouslySetInnerHTML={{ __html: body }}
      />
      <button
        type="button"
        onClick={handleClick}
        className="press-link empty-capture-cta"
      >
        Begin an entry <span className="arrow">⟶</span>
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

// ================================================================
// Recent spine — side column entry pointing to the full entry in
// the stream below. Since Phase A has no entry detail page, the
// link is an in-page anchor.
// ================================================================
interface SpineProps {
  entry: JournalEntry;
  personNameById: Map<string, string>;
  userNameById: Map<string, string>;
  currentUserId: string;
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

function RecentSpine({
  entry,
  personNameById,
  userNameById,
  currentUserId,
}: SpineProps) {
  const cat = CATEGORY_META[entry.category];
  const d = entry.createdAt?.toDate?.();
  const timeLabel = d ? formatTime(d) : '';
  const isMine = entry.authorId === currentUserId;
  const about = entry.personMentions
    .map((id) => personNameById.get(id))
    .filter(Boolean)
    .join(' & ');
  const privacy = describePrivacy(entry, currentUserId, userNameById);

  return (
    <Link href={`#entry-${entry.entryId}`} className="spine">
      <div className="spine-kind">
        <span className="spine-glyph" aria-hidden="true">
          {cat?.emoji ?? '✦'}
        </span>
        <span className="spine-kind-label">
          {cat?.label ?? 'Entry'}
          {timeLabel && (
            <>
              <span className="sep">·</span>
              {timeLabel}
            </>
          )}
        </span>
      </div>
      <p className="spine-snippet">{snippet(entry.text, 110)}</p>
      <p className="spine-meta">
        {isMine ? 'You' : privacy.label}
        {about && (
          <>
            <span className="sep">·</span>
            about <span className="press-sc">{about}</span>
          </>
        )}
        {isMine && (
          <>
            <span className="sep">·</span>
            {privacy.label.toLowerCase()}
          </>
        )}
      </p>

      <style jsx>{`
        :global(.spine) {
          display: block;
          padding: 18px 0;
          text-decoration: none;
          color: inherit;
          border-bottom: 1px solid rgba(200, 190, 172, 0.38);
          transition: opacity 0.2s ease;
        }
        :global(.spine:last-child) {
          border-bottom: 0;
        }
        :global(.spine:hover) {
          opacity: 0.78;
        }
        :global(.spine-kind) {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 6px;
        }
        :global(.spine-glyph) {
          font-size: 13px;
          line-height: 1;
          color: #5c8064;
        }
        :global(.spine-kind-label) {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #8a7b5f;
        }
        :global(.spine-kind-label .sep) {
          display: inline-block;
          margin: 0 6px;
          color: #b2a487;
        }
        :global(.spine-snippet) {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 17px;
          line-height: 1.35;
          color: #3a3530;
          margin: 0 0 8px;
          letter-spacing: -0.004em;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        :global(.spine-meta) {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #7c6e54;
          margin: 0;
          line-height: 1.55;
        }
        :global(.spine-meta .sep) {
          display: inline-block;
          margin: 0 7px;
          color: #a8997d;
        }
      `}</style>
    </Link>
  );
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
        <span>{isMine ? 'You' : privacy.label}</span>
        {isMine && (
          <>
            <span className="sep">·</span>
            <span className="entry-privacy">
              <span aria-hidden="true">{privacyGlyph}</span> {privacy.label}
            </span>
          </>
        )}
      </header>

      <div className="entry-body">
        {entry.text.split(/\n{2,}/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      {about && (
        <p className="entry-about">
          about <span className="press-sc">{about}</span>
        </p>
      )}

      <style jsx>{`
        .entry {
          scroll-margin-top: 84px;
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
          margin: 16px 0 0;
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
