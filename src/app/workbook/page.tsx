'use client';
/* ================================================================
   Relish · /workbook — the canonical landing page.
   Rebuilt from the 2026-04-20 editorial redesign: broadsheet
   masthead → spread (hero + open threads) → feature row → dispatches
   → week ahead → song strip → colophon. Shell chrome (top nav + the
   Pen) is provided by the root layout (GlobalNav).
   ================================================================ */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { stockImagery } from '@/config/stock-imagery';
import { useMemoryOfTheDay } from '@/hooks/useMemoryOfTheDay';
import { useLeastWrittenPerson } from '@/hooks/useLeastWrittenPerson';
import { useDispatches } from '@/hooks/useDispatches';
import type { JournalEntry } from '@/types/journal';
import type { LeastWrittenPerson } from '@/hooks/useLeastWrittenPerson';

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
import { useWeeklyLead } from '@/hooks/useWeeklyLead';
import { useWeeklyBrief } from '@/hooks/useWeeklyBrief';
import type { Ritual } from '@/types/ritual';
import type { WeeklyDispatch } from '@/types/weekly-dispatch';
import type { WeeklyBrief } from '@/types/weekly-brief';
import { useOpenThreads } from '@/hooks/useOpenThreads';
import { ensureSoloWeekly } from '@/lib/ritual-seeds';
import type { OpenThread } from '@/lib/open-threads';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { usePerson } from '@/hooks/usePerson';
import { entryMentionsPerson } from '@/lib/entry-mentions';
import { computeBalance, type BalanceState } from '@/lib/balance';
import { useLatestCoachClosure } from '@/hooks/useLatestCoachClosure';
import { useFamilyManuals } from '@/hooks/useFamilyManuals';
import { useFamilyContributions } from '@/hooks/useFamilyContributions';
import { useFreshness } from '@/hooks/useFreshness';
import { FamilyCompletenessRing } from '@/components/dashboard/FamilyCompletenessRing';
import { useWorkbookVisit } from '@/hooks/useWorkbookVisit';
import { useSettledMentions } from '@/hooks/useSettledMentions';

export default function WorkbookPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const wb = useWorkbookData();
  const { ritual: nextRitual, loading: ritualLoading } = useNextRitual();
  const { threads: openThreads } = useOpenThreads();
  // Section gate: the "What Relish is returning to you" block is
  // hidden until the family has ever had a Weekly Lead generated.
  // Once any Lead exists in Firestore, the section is permanent
  // furniture. See docs/superpowers/specs/2026-04-20-dispatch-collapse-design.md.
  const { dispatch: leadDispatch, loading: leadLoading } = useWeeklyLead();
  const hasReturns = !leadLoading && !!leadDispatch;

  // Latest coach-chat closure — the one-sentence distillation the app
  // pulled from your most recent conversation with the coach. Surfaces
  // as a small "From your last conversation" card below the spread.
  // Hidden when >7 days old to avoid stale encouragement.
  const { closure: latestClosure } = useLatestCoachClosure();

  const freshClosure = (() => {
    if (!latestClosure || !latestClosure.emergent) return null;
    const ms = latestClosure.distilledAt?.toMillis?.() ?? 0;
    if (!ms) return null;
    const ageDays = (Date.now() - ms) / 86_400_000;
    if (ageDays > 7) return null;
    return latestClosure;
  })();

  // Living daily edition: a short book-voice paragraph above the
  // greeting summarising what changed since the user last opened the
  // Workbook — primarily, entries someone else wrote about them that
  // arrived between visits. First-ever visit or no changes render
  // nothing, so the surface stays quiet when it has nothing to say.
  const { priorLastSeenAt, loaded: visitLoaded } = useWorkbookVisit();
  const { entries: allEntries } = useJournalEntries();
  const { people } = usePerson();
  const { settledIds } = useSettledMentions();

  // Family-wide completeness data for the Ring visualisation.
  // Hidden on the workbook when the user is alone (nothing meaningful
  // to compute) to avoid a sad 0% donut on first visit.
  const { manuals: familyManuals } = useFamilyManuals();
  const { contributions: familyContributions } = useFamilyContributions();
  const { familyCompleteness } = useFreshness({
    people,
    manuals: familyManuals,
    contributions: familyContributions,
  });
  const activePeopleCount = (people ?? []).filter(
    (p) => !p.archived,
  ).length;
  const showCompletenessRing = activePeopleCount >= 2;
  const sinceSummary = useMemo<SinceSummary | null>(() => {
    if (!visitLoaded || !priorLastSeenAt || !user?.userId) return null;
    const mePersonIds = (people ?? [])
      .filter((p) => p.linkedUserId === user.userId)
      .map((p) => p.personId);
    const priorMs = priorLastSeenAt.getTime();
    const newMentions = allEntries.filter((e) => {
      if (e.authorId === user.userId) return false;
      if (settledIds.has(e.entryId)) return false;
      const ms = e.createdAt?.toMillis?.() ?? 0;
      if (ms <= priorMs) return false;
      const tagged = (e.personMentions ?? []).some((pid) =>
        mePersonIds.includes(pid),
      );
      const aiExtracted = (e.enrichment?.aiPeople ?? []).some((pid) =>
        mePersonIds.includes(pid),
      );
      return tagged || aiExtracted;
    });
    if (newMentions.length === 0) return null;
    const authorFirstNames = Array.from(
      new Set(
        newMentions.map((e) => {
          const author = people.find((p) => p.linkedUserId === e.authorId);
          return author?.name.split(' ')[0] ?? 'Someone';
        }),
      ),
    );
    return {
      count: newMentions.length,
      authors: authorFirstNames,
      priorLastSeenAt,
      firstNewEntryId: newMentions[0].entryId,
    };
  }, [allEntries, priorLastSeenAt, visitLoaded, people, user?.userId, settledIds]);

  // Persistent "written about you this week" dispatch — always on
  // when there's something to surface, not just on return from absence.
  // Complements sinceSummary (which fires only on re-entry). When both
  // are available, sinceSummary wins — it's the more specific signal.
  const mentionsAboutMeRecent = useMemo(() => {
    if (!user?.userId) return null;
    const mePersonIds = (people ?? [])
      .filter((p) => p.linkedUserId === user.userId)
      .map((p) => p.personId);
    if (mePersonIds.length === 0) return null;
    const fourteenDaysAgoMs = Date.now() - 14 * 86_400_000;
    const recent = allEntries.filter((e) => {
      if (e.authorId === user.userId) return false;
      if (settledIds.has(e.entryId)) return false;
      const ms = e.createdAt?.toMillis?.() ?? 0;
      if (ms < fourteenDaysAgoMs) return false;
      const tagged = (e.personMentions ?? []).some((pid) =>
        mePersonIds.includes(pid),
      );
      const aiExtracted = (e.enrichment?.aiPeople ?? []).some((pid) =>
        mePersonIds.includes(pid),
      );
      return tagged || aiExtracted;
    });
    if (recent.length === 0) return null;
    const sorted = recent
      .slice()
      .sort((a, b) => {
        const am = a.createdAt?.toMillis?.() ?? 0;
        const bm = b.createdAt?.toMillis?.() ?? 0;
        return am - bm; // oldest first — that's the next one to read
      });
    return {
      count: recent.length,
      oldestEntryId: sorted[0].entryId,
    };
  }, [allEntries, people, user?.userId, settledIds]);

  // Family balance rollup — per-person balance state for everyone
  // else in the family, aggregated for the masthead sub-strip. Hidden
  // entirely when the user is alone in their manual.
  const familyBalance = useMemo(() => {
    if (!user?.userId || !people || people.length === 0) return null;

    const others = people.filter(
      (p) =>
        p.relationshipType !== 'self' &&
        p.linkedUserId !== user.userId &&
        !p.archived,
    );
    if (others.length === 0) return null;

    const perPerson = others.map((p) => {
      const fn = p.name.split(' ')[0];
      const mentions = allEntries
        .filter((e) => entryMentionsPerson(e, p.personId))
        .sort((a, b) => {
          const am = a.createdAt?.toMillis?.() ?? 0;
          const bm = b.createdAt?.toMillis?.() ?? 0;
          return bm - am;
        });
      const lastMs = mentions[0]?.createdAt?.toMillis?.() ?? 0;
      const daysSinceLast = lastMs
        ? Math.floor((Date.now() - lastMs) / 86_400_000)
        : 9999;
      const openCount = mentions.filter(
        (e) => !e.respondsToEntryId && e.category !== 'reflection',
      ).length;

      const balance = computeBalance({
        firstName: fn,
        mentions: mentions.length,
        daysSinceLast,
        openThreads: openCount,
        theyCanContribute: !!p.canSelfContribute,
        theyHaveAccount: !!p.linkedUserId,
        // hasSelfContribution / hasObserverContribution intentionally
        // undefined — a lightweight rollup skips contribution-aware
        // branches; the deep version lives on the person page.
      });

      return { person: p, firstName: fn, balance };
    });

    const counts: Record<BalanceState, number> = {
      'in-balance': 0,
      'mostly-in-balance': 0,
      'needs-attention': 0,
      'new': 0,
    };
    for (const { balance } of perPerson) counts[balance.state]++;

    const needsAttention = perPerson.filter(
      (p) => p.balance.state === 'needs-attention',
    );
    const mostly = perPerson.filter(
      (p) => p.balance.state === 'mostly-in-balance',
    );

    return {
      total: others.length,
      counts,
      needsAttention,
      mostly,
      allInBalance:
        counts['needs-attention'] === 0 && counts['mostly-in-balance'] === 0,
    };
  }, [people, allEntries, user?.userId]);

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
            {showCompletenessRing && (
              <>
                <div className="masthead-divider" />
                <div className="masthead-cell align-c mh-bars-cell">
                  <Link
                    href="/manual"
                    className="mh-bars-link"
                    aria-label="Family at a glance — open the per-person breakdown"
                  >
                    <span className="masthead-eyebrow">Family, at a glance</span>
                    <div className="mh-bars">
                      {[
                        { key: 'coverage', label: 'Coverage', color: '#7C9082', value: familyCompleteness.coverage },
                        { key: 'freshness', label: 'Freshness', color: '#D4A574', value: familyCompleteness.freshness },
                        { key: 'depth', label: 'Depth', color: '#2D5F5D', value: familyCompleteness.depth },
                      ].map((b) => {
                        const pct = Math.round(Math.min(b.value, 1) * 100);
                        return (
                          <div key={b.key} className="mh-bar-row">
                            <span className="mh-bar-label">{b.label}</span>
                            <span className="mh-bar-track">
                              <span
                                className="mh-bar-fill"
                                style={{ width: `${pct}%`, background: b.color }}
                              />
                            </span>
                            <span className="mh-bar-pct">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </Link>
                </div>
              </>
            )}
            <div className="masthead-divider" />
            <div className="masthead-cell align-r">
              <span className="masthead-eyebrow">In your family</span>
              {!familyBalance ? (
                <span className="masthead-value">
                  Just you
                </span>
              ) : familyBalance.needsAttention.length === 1 ? (
                <span className="masthead-value">
                  <Link
                    href={`/people/${familyBalance.needsAttention[0].person.personId}`}
                    className="mb-link mb-link-attention"
                  >
                    {familyBalance.needsAttention[0].firstName}
                  </Link>
                  <span className="sub"> · needs attention</span>
                </span>
              ) : familyBalance.needsAttention.length > 1 ? (
                <span className="masthead-value">
                  <em>{familyBalance.needsAttention.length}</em>
                  <span className="sub"> need attention</span>
                </span>
              ) : familyBalance.mostly.length > 0 ? (
                <span className="masthead-value">
                  <Link
                    href={`/people/${familyBalance.mostly[0].person.personId}`}
                    className="mb-link mb-link-mostly"
                  >
                    {familyBalance.mostly[0].firstName}
                  </Link>
                  <span className="sub"> · mostly in balance</span>
                </span>
              ) : familyBalance.counts['in-balance'] > 0 ? (
                <span className="masthead-value">
                  In balance
                  <span className="sub">
                    {' '}· {familyBalance.total}{' '}
                    {familyBalance.total === 1 ? 'person' : 'people'}
                  </span>
                </span>
              ) : (
                <span className="masthead-value">
                  {familyBalance.total}{' '}
                  {familyBalance.total === 1 ? 'person' : 'people'}
                  <span className="sub"> · new page{familyBalance.total === 1 ? '' : 's'}</span>
                </span>
              )}
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
            {sinceSummary ? (
              <p className="hero-since">
                <em>Since you were last here,</em>{' '}
                {sinceSummary.authors.length === 1
                  ? `${sinceSummary.authors[0]} wrote`
                  : `${sinceSummary.authors.slice(0, -1).join(', ')} and ${sinceSummary.authors[sinceSummary.authors.length - 1]} wrote`}{' '}
                about you
                {sinceSummary.count > 1
                  ? ` — ${sinceSummary.count} ${sinceSummary.count === 1 ? 'line' : 'lines'} in the book`
                  : ''}
                .{' '}
                <Link
                  href={`/journal/${sinceSummary.firstNewEntryId}`}
                  className="hero-since-link"
                >
                  Start with the newest →
                </Link>
              </p>
            ) : mentionsAboutMeRecent ? (
              <p className="hero-since">
                <em>
                  {mentionsAboutMeRecent.count}{' '}
                  {mentionsAboutMeRecent.count === 1 ? 'thing' : 'things'} written
                  about you in the last two weeks.
                </em>{' '}
                <Link
                  href={`/journal/${mentionsAboutMeRecent.oldestEntryId}`}
                  className="hero-since-link"
                >
                  Start with the oldest →
                </Link>
              </p>
            ) : null}
            <p className="hero-lede">{lede}</p>
            {ledeCount > 0 ? (
              // "Pick up where you left off" must actually pick up
              // somewhere — route to the first (most urgent) open
              // thread's closing surface, not a blank pen.
              <Link
                href={openThreads[0].closingAction.href}
                style={heroActionStyle}
              >
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
                <span>Pick up where you left off</span>
              </Link>
            ) : (
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
                <span>Write a note</span>
              </button>
            )}
          </div>

          <div className="spread-rule" aria-hidden="true" />

          <div className="tending">
            <div className="tending-head">
              <span className="eyebrow">Waiting on you</span>
              <span className="count">
                {ledeCount === 0 ? 'nothing waiting' : `${ledeCount} waiting`}
              </span>
            </div>
            {ledeCount === 0 ? (
              <QuietBlock
                showLeadTeaser={!hasReturns && allEntries.length <= 3}
              />
            ) : (
              <div>
                {openThreads.slice(0, 3).map((t) => (
                  <ThreadRow key={`${t.kind}:${t.id}`} thread={t} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ═══ FROM YOUR LAST CONVERSATION ═══ — the back-half of the
             coach-chat loop. Shows the emergent line Relish distilled
             from your most recent coach conversation. Hidden when no
             closure exists, or when it's older than a week. */}
        {freshClosure && (
          <Link
            href="/coach"
            className="coach-closure-card"
            aria-label="From your last conversation — continue with the coach"
          >
            <span className="ccc-eyebrow">
              <span className="pip" aria-hidden="true" />
              From your last conversation
            </span>
            <p className="ccc-emergent">
              <em>&ldquo;{freshClosure.emergent}&rdquo;</em>
            </p>
            {freshClosure.themes && freshClosure.themes.length > 0 && (
              <p className="ccc-themes">
                {freshClosure.themes.slice(0, 4).join(' · ')}
              </p>
            )}
            <span className="ccc-cta">
              Pick it up <span aria-hidden>⟶</span>
            </span>
          </Link>
        )}

        {/* ═══ FEATURE ROW — memory · person · prompt ═══ */}
        <section className="feature-row" aria-label="Today's readings">
          <FeatureMemory />
          <FeaturePerson />
          <FeaturePrompt />
        </section>

        {/* ═══ DISPATCHES ═══
             Earned on first Lead. Hidden until any Lead has ever
             been written for this family. */}
        {hasReturns && (
          <section className="dispatches">
            <div className="dispatches-head">
              <h2 className="dispatches-title">
                This week, <em>from Relish.</em>
              </h2>
            </div>

            <DispatchLead />

            <DispatchBrief />

            <PatternFooterLine />
          </section>
        )}

        {/* ═══ WEEK AHEAD ═══ */}
        <section className="week" aria-label="The week ahead">
          <div className="week-head">
            <h2 className="week-title">The week ahead.</h2>
            <p className="week-sub">
              Practices you&rsquo;ve done, and the ones coming up.
            </p>
          </div>
          <WeekGrid today={today} nextRitual={nextRitual ?? null} />
          <SongStripPlaceholder />
        </section>

        {/* ═══ COLOPHON ═══ */}
        <footer className="colophon">
          <span className="fleuron" aria-hidden="true">❦</span>
          <span>
            <em>The Workbook</em>, {partOfDay(today)} edition. &nbsp;·&nbsp;{' '}
            <em>{firstName}</em>.{' '}
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

function QuietBlock({ showLeadTeaser }: { showLeadTeaser: boolean }) {
  return (
    <div className="quiet-block">
      <div className="glyph">❦</div>
      <h3>Nothing waiting.</h3>
      <p>
        Replies, reminders, and prompts from your family will show up here
        when they arrive.
      </p>
      {showLeadTeaser && (
        <p className="lead-teaser">
          <em>After a week of writing, Relish starts reading back to you.</em>
          {' '}Come back Sunday.
        </p>
      )}
    </div>
  );
}

function FeatureMemory() {
  // Absorbs the old Echo-dispatch logic AND the progressive-fallback:
  // if Relish surfaced a theme-matched year-ago entry, prefer it. Else
  // fall back to whatever depth of memory the archive can actually
  // supply — year-ago, or "a month ago", or "two weeks ago" — labeled
  // honestly. When the archive is too young to have anything older
  // than a week, the slot is replaced by FeatureInvite instead of a
  // dead placeholder.
  const { entry: calendarEntry, ageLabel, loading: memLoading } = useMemoryOfTheDay();
  const { echo, loading: echoLoading } = useDispatches();
  const preferred = echo?.entry ?? calendarEntry;
  const origin: 'echo' | 'calendar' | 'none' = echo?.entry
    ? 'echo'
    : calendarEntry
      ? 'calendar'
      : 'none';
  const loading = memLoading || echoLoading;

  if (!loading && origin === 'none') {
    return <FeatureInvite />;
  }

  return (
    <FeatureMemoryView
      entry={preferred}
      origin={origin}
      ageLabel={origin === 'echo' ? 'a year ago' : ageLabel}
      loading={loading}
    />
  );
}

function FeatureMemoryView({
  entry,
  origin,
  ageLabel,
  loading,
}: {
  entry: JournalEntry | null;
  origin: 'echo' | 'calendar' | 'none';
  ageLabel: string | null;
  loading: boolean;
}) {
  const date = entry?.createdAt?.toDate?.();
  const dateLabel = date
    ? date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';
  const weekday = date
    ? date.toLocaleDateString('en-GB', { weekday: 'long' })
    : '';
  const excerpt = entry ? memoryExcerpt(entry.text) : '';
  const ageForEyebrow = ageLabel ?? 'a year ago';
  const eyebrow =
    origin === 'echo'
      ? `From the archive · ${ageForEyebrow} · like what you\u2019re writing now`
      : `From the archive · ${ageForEyebrow}`;

  if (loading) {
    return (
      <article className="feature memory">
        <div className="feature-photo" aria-hidden="true" />
        <span className="feature-eyebrow">
          <span className="pip" />
          From the archive
        </span>
        <span className="memory-date">Turning back the pages…</span>
      </article>
    );
  }

  if (!entry) {
    // Unreachable in practice — FeatureMemory swaps in FeatureInvite
    // when there's no entry — but kept as a defensive fallback.
    return <FeatureInvite />;
  }

  return (
    <Link
      href={`/journal/${entry.entryId}`}
      className="feature memory"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div className="feature-photo" aria-hidden="true" />
      <span className="feature-eyebrow">
        <span className="pip" />
        {eyebrow}
      </span>
      <span className="memory-date">
        {dateLabel}
        {weekday && ` — a ${weekday}`}
      </span>
      <p className="memory-quote">&ldquo;{excerpt}&rdquo;</p>
      <div className="memory-foot">
        <span>Open the entry</span>
        <span>→</span>
      </div>
    </Link>
  );
}

// Replacement slot when the archive is too young to have a memory to
// echo (no entries older than 7 days). Pitches the collaborative
// angle that gives Relish its magic — rather than a dead placeholder,
// the slot invites you to invite someone else into the book.
function FeatureInvite() {
  return (
    <Link
      href="/manual"
      className="feature memory"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div className="feature-photo" aria-hidden="true" />
      <span className="feature-eyebrow">
        <span className="pip" />
        A book worth co-writing
      </span>
      <span className="memory-date">Two views are better than one.</span>
      <p className="memory-quote">
        &ldquo;The magic is what shows up when more than one person reads the
        same moment.&rdquo;
      </p>
      <div className="memory-foot">
        <span>Open the Family Manual</span>
        <span>→</span>
      </div>
    </Link>
  );
}

function memoryExcerpt(text: string): string {
  const t = (text ?? '').trim().replace(/\s+/g, ' ');
  if (t.length <= 220) return t;
  return t.slice(0, 219).trimEnd() + '…';
}

function FeaturePerson() {
  const { candidate, loading } = useLeastWrittenPerson();
  return <FeaturePersonView candidate={candidate} loading={loading} />;
}

function FeaturePersonView({
  candidate,
  loading,
}: {
  candidate: LeastWrittenPerson | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <article className="feature person">
        <span className="feature-eyebrow">
          <span className="pip" />
          Someone you haven&rsquo;t written about in a while
        </span>
        <p className="person-note">Reading through the roster…</p>
      </article>
    );
  }

  if (!candidate) {
    return (
      <article className="feature person">
        <span className="feature-eyebrow">
          <span className="pip" />
          Someone in your family
        </span>
        <p className="person-note">
          <em>Add someone to your family</em> and they&rsquo;ll show up here
          when it&rsquo;s been a while.
        </p>
        <div className="person-foot">
          <Link
            href="/people/new"
            style={{
              fontFamily: 'var(--r-sans)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--r-ember)',
              borderBottom: '1px solid currentColor',
              textDecoration: 'none',
              paddingBottom: 2,
            }}
          >
            Add someone →
          </Link>
        </div>
      </article>
    );
  }

  const firstName = candidate.person.name.split(' ')[0];
  const initial = firstName.slice(0, 1).toUpperCase();
  const hasHistory = candidate.entriesCount > 0;

  return (
    <Link
      href={`/people/${candidate.person.personId}`}
      className="feature person"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <span className="feature-eyebrow">
        <span className="pip" />
        {hasHistory
          ? `Someone you haven't written about in a while`
          : `Someone worth starting a page for`}
      </span>
      <div className="person-row">
        <div className="person-portrait">{initial}</div>
        <div>
          <h3 className="person-name">{firstName}</h3>
          <div className="person-rel">
            {relationShort(candidate.person.relationshipType)}
            {hasHistory
              ? ` · last entry ${formatDaysAgo(candidate.daysSinceLast)}`
              : ' · no entries yet'}
          </div>
        </div>
      </div>
      {hasHistory && candidate.lastEntry ? (
        <p className="person-note">
          <em>{entryEcho(candidate.lastEntry.text)}</em>
        </p>
      ) : (
        <p className="person-note">
          A first line would open their page.
        </p>
      )}
      <div className="person-foot">
        <div className="stat">
          <span className="num">{candidate.entriesCount}</span>entries
        </div>
        <div className="stat">
          <span className="num">
            {candidate.entriesCount > 0
              ? formatDaysCompact(candidate.daysSinceLast)
              : '—'}
          </span>
          since
        </div>
      </div>
    </Link>
  );
}

function entryEcho(text: string): string {
  const t = (text ?? '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  // First sentence, or 120-char clip.
  const dot = t.search(/[.!?]\s/);
  if (dot !== -1 && dot < 120) return t.slice(0, dot + 1);
  if (t.length <= 120) return t;
  return t.slice(0, 119).trimEnd() + '…';
}

function relationShort(
  t: import('@/types/person-manual').RelationshipType | undefined,
): string {
  switch (t) {
    case 'spouse':
      return 'Partner';
    case 'child':
      return 'Child';
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

function formatDaysAgo(days: number): string {
  if (days >= 9999) return '—';
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'a week ago';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return 'a month ago';
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return 'over a year ago';
}

function formatDaysCompact(days: number): string {
  if (days >= 9999) return '—';
  if (days < 1) return 'today';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

// A rotating pool of prompts. Each day picks one via a stable
// day-index so the user sees the same prompt all day and a new one
// tomorrow. Each prompt has a stable `id` so answer state (tracked
// in localStorage) follows the prompt correctly across sessions.
const PROMPT_POOL: Array<{ id: string; text: string }> = [
  { id: 'weekend-notice',
    text: 'What did you notice this weekend that you almost didn\u2019t write down?' },
  { id: 'small-thing',
    text: 'What\u2019s one small thing someone in your family did this week that stuck with you?' },
  { id: 'surprise',
    text: 'When was the last time someone surprised you \u2014 and what did it reveal?' },
  { id: 'pattern-in-me',
    text: 'What\u2019s a pattern you\u2019ve started to see in yourself lately?' },
  { id: 'holding-for',
    text: 'Something you\u2019re holding for someone in your family right now?' },
  { id: 'meant-to-have',
    text: 'A conversation you meant to have but haven\u2019t yet \u2014 who, and about what?' },
  { id: 'woke-up-different',
    text: 'What\u2019s different about how you woke up today?' },
  { id: 'unnamed-joy',
    text: 'A small joy from the last few days you haven\u2019t named?' },
  { id: 'quiet-this-week',
    text: 'Where did you feel quiet this week \u2014 the good kind, or the heavy kind?' },
  { id: 'want-them-to-know',
    text: 'What would you want someone in your family to know about you today?' },
  { id: 'on-your-mind',
    text: 'Who\u2019s been on your mind lately, and what would you tell them?' },
  { id: 'most-yourself',
    text: 'A moment this week when you felt most yourself?' },
  { id: 'lingering',
    text: 'Something someone close to you said that\u2019s been lingering?' },
  { id: 'taking-up-space',
    text: 'What\u2019s taking up space in your head right now?' },
  { id: 'disagreed-with-self',
    text: 'Where did you disagree with yourself this week?' },
];

function daysSinceEpochLocal(d: Date): number {
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor(utc / 86_400_000);
}

function pickPromptForDate(d: Date): { id: string; text: string } {
  const i = daysSinceEpochLocal(d) % PROMPT_POOL.length;
  return PROMPT_POOL[i];
}

function FeaturePrompt() {
  const { user } = useAuth();
  const wb = useWorkbookData();
  // We want the entries stream so we can detect the user's answer
  // the moment it saves. Reading the same stream the rest of the
  // workbook reads — no extra subscription.
  const { entries } = useJournalEntries();

  // Today's prompt — picked from the rotating pool by local date.
  // Stable id means answer-tracking per-day, so answering today's
  // prompt doesn't mark tomorrow's as answered.
  const todayPrompt = useMemo(() => pickPromptForDate(new Date()), []);
  const promptId = todayPrompt.id;
  const promptText = todayPrompt.text;
  const promptPartOfDay = partOfDay(new Date());

  // Track the click-to-answer moment. When the user clicks "Answer",
  // we remember the clock time; the first new entry authored by them
  // after that moment counts as the answer to this prompt.
  const [clickedAt, setClickedAt] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(
        `relish:prompt:clickedAt:${promptId}`,
      );
      return raw ? Number(raw) : null;
    } catch {
      return null;
    }
  });
  const [answeredEntryId, setAnsweredEntryId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(
        `relish:prompt:answered:${promptId}`,
      );
    } catch {
      return null;
    }
  });

  // Detect a new entry authored by me after the click moment — that's
  // the answer. Persist the entryId so reloads keep the ack state.
  useEffect(() => {
    if (answeredEntryId) return; // already resolved
    if (!clickedAt || !user?.userId) return;
    const MAX_MS = 30 * 60 * 1000; // 30-minute answer window
    const now = Date.now();
    if (now - clickedAt > MAX_MS) return;
    const mine = entries.filter((e) => e.authorId === user.userId);
    const match = mine.find((e) => {
      const ms = e.createdAt?.toMillis?.() ?? 0;
      return ms >= clickedAt;
    });
    if (match) {
      setAnsweredEntryId(match.entryId);
      try {
        window.localStorage.setItem(
          `relish:prompt:answered:${promptId}`,
          match.entryId,
        );
      } catch {
        // storage disabled; in-memory state still works this session
      }
    }
  }, [entries, clickedAt, answeredEntryId, user?.userId]);

  const handleAnswer = () => {
    const now = Date.now();
    setClickedAt(now);
    try {
      window.localStorage.setItem(
        `relish:prompt:clickedAt:${promptId}`,
        String(now),
      );
    } catch {
      // not fatal
    }
    // Prefill the Pen with the prompt text + a blank line so the user
    // writes their answer directly below the question. The saved entry
    // keeps both the question and the answer — useful provenance when
    // reading it back later.
    window.dispatchEvent(
      new CustomEvent('relish:open-capture', {
        detail: { prefillText: `${promptText}\n\n` },
      }),
    );
  };

  if (answeredEntryId) {
    const answered = entries.find((e) => e.entryId === answeredEntryId);
    return (
      <article className="feature prompt">
        <span className="feature-eyebrow">
          <span className="pip" />
          A prompt for this {promptPartOfDay} · <em>answered</em>
        </span>
        <blockquote className="prompt-question-answered">
          {promptText}
        </blockquote>
        {answered ? (
          <>
            <p className="prompt-answer">
              <em>You wrote:</em> &ldquo;{promptExcerpt(answered.text)}&rdquo;
            </p>
            <Link
              href={`/journal/${answered.entryId}`}
              style={{ ...promptCtaDarkStyle, textDecoration: 'none' }}
            >
              <span>Open the entry</span>
              <span aria-hidden="true">→</span>
            </Link>
          </>
        ) : (
          <p className="prompt-answer">
            <em>Answered.</em> Relish caught it — it&rsquo;s in the book.
          </p>
        )}
      </article>
    );
  }

  const name = wb.firstName ?? user?.name?.split(' ')[0] ?? '';
  return (
    <article className="feature prompt">
      <span className="feature-eyebrow">
        <span className="pip" />
        A prompt for this {promptPartOfDay}
      </span>
      <blockquote>{promptText}</blockquote>
      <p className="prompt-attr">
        — One minute{name ? `, ${name}` : ''}
      </p>
      <button type="button" onClick={handleAnswer} style={promptCtaDarkStyle}>
        <span>Answer</span>
        <span aria-hidden="true">→</span>
      </button>
    </article>
  );
}

function promptExcerpt(text: string): string {
  const t = (text ?? '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  if (t.length <= 150) return t;
  const dot = t.slice(0, 150).search(/[.!?]\s/);
  if (dot >= 40) return t.slice(0, dot + 1);
  return t.slice(0, 149).trimEnd() + '…';
}

function DispatchLead() {
  const { dispatch, loading } = useWeeklyLead();
  if (loading) {
    return (
      <article className="lead">
        <div className="lead-text">
          <span className="lead-eyebrow">
            <span className="pip" />
            What Relish noticed this week
          </span>
          <h3>Gathering the week&rsquo;s lines…</h3>
        </div>
        <div className="lead-art" aria-hidden="true">
          <span className="lead-art-fleuron">❦</span>
        </div>
      </article>
    );
  }
  if (!dispatch) return <DispatchLeadPlaceholder />;
  return <DispatchLeadView dispatch={dispatch} />;
}

function DispatchLeadView({ dispatch }: { dispatch: WeeklyDispatch }) {
  const weekEnding = dispatch.weekEnding?.toDate?.();
  const weekStarting = dispatch.weekStarting?.toDate?.();
  const rangeLabel =
    weekStarting && weekEnding
      ? `${weekStarting.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        })} – ${weekEnding.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        })}`
      : '';
  return (
    <article className="lead">
      <div className="lead-text">
        <span className="lead-eyebrow">
          <span className="pip" />
          What Relish noticed this week{rangeLabel ? ` · ${rangeLabel}` : ''}
        </span>
        <h3>{dispatch.headline}</h3>
        <p className="dek">{dispatch.dek}</p>
        {dispatch.evidence.length > 0 && (
          <div className="evidence">
            {dispatch.evidence.map((ev) => {
              const d = ev.createdAt?.toDate?.();
              const dateShort = d
                ? d.toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })
                : '';
              return (
                <Link
                  key={ev.entryId}
                  href={`/journal/${ev.entryId}`}
                  className="ev"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <span className="when">
                    {ev.authorName}
                    {dateShort ? ` · ${dateShort}` : ''}
                  </span>
                  <span className="line">&ldquo;{ev.excerpt}&rdquo;</span>
                </Link>
              );
            })}
          </div>
        )}
        {dispatch.emergentLine && (
          <p
            className="dek"
            style={{ marginTop: 18, fontStyle: 'italic', color: 'var(--r-text-3)' }}
          >
            {dispatch.emergentLine}
          </p>
        )}
      </div>
      <div className="lead-art" aria-hidden="true">
        <span className="lead-art-fleuron">❦</span>
      </div>
    </article>
  );
}

function DispatchLeadPlaceholder() {
  // Backend pipeline hasn't written a dispatch for the user's family
  // yet (either not Sunday 9pm yet or the family is brand new). Pure
  // status card — no CTAs, no dead buttons.
  return (
    <article className="lead">
      <div className="lead-text">
        <span className="lead-eyebrow">
          <span className="pip" />
          What Relish noticed this week · ready Sunday 9pm
        </span>
        <h3>A lead story will read here.</h3>
        <p className="dek">
          Relish will open a lead story once a week — the pattern it thinks
          you&rsquo;re <em>already writing about</em>, with three lines of
          evidence pulled verbatim from the week&rsquo;s entries.
        </p>
        <div className="evidence">
          <div className="ev">
            <span className="when">Synthesis</span>
            <span className="line">
              <em>Nothing for this week yet.</em> The lead writes itself
              once the weekly job runs.
            </span>
          </div>
        </div>
      </div>
      <div className="lead-art" aria-hidden="true">
        <span className="lead-art-fleuron">❦</span>
      </div>
    </article>
  );
}

function DispatchBrief() {
  const { brief, loading } = useWeeklyBrief();
  if (loading) {
    return (
      <article className="dispatch brief">
        <span className="eyebrow">
          <span className="pip" />
          What to bring up
        </span>
        <h3>Pulling the threads together…</h3>
      </article>
    );
  }
  if (!brief || brief.topics.length === 0) return <DispatchBriefPlaceholder />;
  return <DispatchBriefView brief={brief} />;
}

function DispatchBriefView({ brief }: { brief: WeeklyBrief }) {
  // Shows the first topic prominently; expands to show the rest when
  // the "+N more" footer is clicked. Each topic's quote deep-links
  // to the source entry so the card is a real entry point back into
  // the material it was built from, not a one-way summary.
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? brief.topics : brief.topics.slice(0, 1);
  const hiddenCount = brief.topics.length - 1;
  return (
    <article className="dispatch brief">
      <span className="eyebrow">
        <span className="pip" />
        What to bring up
      </span>
      {visible.map((topic, idx) => (
        <BriefTopicBlock
          key={idx}
          topic={topic}
          divider={idx > 0}
        />
      ))}
      <div className="foot">
        <span>
          {visible[0]?.who.length ? visible[0].who.join(', ') : '—'}
          {typeof visible[0]?.daysOpen === 'number' && visible[0].daysOpen > 0
            ? ` · ${visible[0].daysOpen}d open`
            : ''}
        </span>
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="arrow"
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'inherit',
              font: 'inherit',
            }}
          >
            {expanded ? 'show less ←' : `+${hiddenCount} more →`}
          </button>
        )}
      </div>
    </article>
  );
}

function BriefTopicBlock({
  topic,
  divider,
}: {
  topic: WeeklyBrief['topics'][number];
  divider: boolean;
}) {
  return (
    <div
      style={{
        borderTop: divider ? '1px dashed var(--r-rule-5)' : 'none',
        paddingTop: divider ? 14 : 0,
        marginTop: divider ? 14 : 0,
      }}
    >
      {divider && (
        <p
          style={{
            margin: '0 0 6px 0',
            fontFamily: 'var(--r-sans)',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--r-text-5)',
          }}
        >
          also worth bringing · {topic.who.join(', ') || 'solo'}
        </p>
      )}
      <h3 style={{ margin: divider ? '2px 0 6px 0' : undefined }}>{topic.title}</h3>
      {topic.framing && (
        <p
          style={{
            fontStyle: 'italic',
            color: 'var(--r-text-3)',
            margin: '0 0 10px 0',
            fontSize: 14,
          }}
        >
          {topic.framing}
        </p>
      )}
      <ul className="bullets">
        {topic.talkingPoints.slice(0, 3).map((point, i) => (
          <li key={i}>{renderTalkingPoint(point)}</li>
        ))}
      </ul>
      {topic.sourceQuote && topic.sourceEntryId && (
        <Link
          href={`/journal/${topic.sourceEntryId}`}
          style={{
            display: 'block',
            margin: '10px 0 6px 0',
            padding: '8px 10px',
            background: 'rgba(200,184,154,0.12)',
            borderLeft: '2px solid rgba(138,111,74,0.35)',
            borderRadius: 3,
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--r-text-3)',
            fontStyle: 'italic',
            textDecoration: 'none',
          }}
        >
          &ldquo;{topic.sourceQuote}&rdquo;
        </Link>
      )}
      {topic.sourceQuote && !topic.sourceEntryId && (
        <p
          style={{
            margin: '10px 0 6px 0',
            padding: '8px 10px',
            background: 'rgba(200,184,154,0.12)',
            borderLeft: '2px solid rgba(138,111,74,0.35)',
            borderRadius: 3,
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--r-text-3)',
            fontStyle: 'italic',
          }}
        >
          &ldquo;{topic.sourceQuote}&rdquo;
        </p>
      )}
    </div>
  );
}

// Lightweight italics pass on markers like *word* / _word_ so the
// LLM can emphasize a phrase in a talking point without us writing
// a markdown parser.
function renderTalkingPoint(point: string) {
  const parts = point.split(/(\*[^*]+\*|_[^_]+_)/);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('_') && part.endsWith('_')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <span key={i}>{part}</span>;
  });
}

function DispatchBriefPlaceholder() {
  return (
    <article className="dispatch brief">
      <span className="eyebrow">
        <span className="pip" />
        What to bring up · not yet scheduled
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

// Pattern footer line — subtle italic sentence beneath the Lead +
// Brief pair. Renders only when Relish has enough data to speak with
// moderate or high confidence; otherwise silent. No card, no chart.
function PatternFooterLine() {
  const { pattern } = useDispatches();
  if (!pattern || !pattern.peakDayLabel) return null;
  if (pattern.confidence !== 'moderate' && pattern.confidence !== 'high') {
    return null;
  }
  return (
    <p className="pattern-footer">
      {patternHeadline(pattern.peakDayLabel)}
    </p>
  );
}

function patternHeadline(day: string): string {
  const rough = ['Monday', 'Tuesday', 'Wednesday'];
  const quiet = ['Friday', 'Saturday', 'Sunday'];
  if (rough.includes(day)) return `Your week runs hot on ${day}s.`;
  if (quiet.includes(day)) return `${day}s carry more of the book than the rest.`;
  return `${day}s do most of the writing.`;
}

function WeekGrid({
  today,
  nextRitual,
}: {
  today: Date;
  nextRitual: Ritual | null;
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
  // Place the ritual chip on the actual scheduled day when it lands
  // within this week's Sunday→Saturday span; otherwise fall back to
  // today so the user still sees it.
  const ritualDate = nextRitual?.nextRunAt?.toDate?.();
  const ritualInWeek = ritualDate
    ? days.some((d) => d.toDateString() === ritualDate.toDateString())
    : false;
  const ritualDayKey = ritualInWeek
    ? ritualDate!.toDateString()
    : nextRitual
      ? todayKey
      : null;

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
        const showRitual =
          !!nextRitual && d.toDateString() === ritualDayKey;
        const entry = showRitual
          ? {
              label: prettyRitualLabel(nextRitual.kind),
              cadence: ritualInWeek ? 'Next ritual' : 'Coming up',
              tone: 'ember' as const,
            }
          : null;
        const inner = (
          <>
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
          </>
        );
        if (showRitual && nextRitual) {
          return (
            <Link
              key={i}
              href={`/rituals/${nextRitual.ritualId}/run`}
              className={`${cls} day-link`}
            >
              {inner}
            </Link>
          );
        }
        return (
          <div key={i} className={cls}>
            {inner}
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
          Paste a song link when you write; the newest one runs here.
        </div>
      </div>
      <span className="song-play" aria-disabled="true">Listen →</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════════════════ */

interface SinceSummary {
  count: number;
  authors: string[];        // unique first names of authors
  priorLastSeenAt: Date;
  firstNewEntryId: string;  // newest mention-of-me since the prior visit
}

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
  if (openCount === 0) return 'Nothing is open right now. Write whenever something comes up.';
  if (openCount === 1) return 'One thing is waiting for you.';
  if (openCount === 2) return 'Two things are waiting for you.';
  return `${openCount} things are waiting for you.`;
}

function threadTitle(t: OpenThread): string {
  switch (t.reason) {
    case 'overdue_ritual':
      return ritualThreadTitle(t.ritualKind);
    case 'unclosed_divergence':
      return 'A divergence to sit with';
    case 'pending_invite':
      return 'A view is waiting';
    case 'incomplete_practice':
      return 'A practice left unfinished';
    case 'mention_for_me':
      return 'Someone wrote about you';
  }
}

function ritualThreadTitle(kind: string | undefined): string {
  switch (kind) {
    case 'solo_weekly':
      return 'Your solo ritual is due';
    case 'partner_biweekly':
      return 'Your couple ritual is due';
    case 'family_monthly':
      return 'Your family ritual is due';
    case 'repair':
      return 'A repair ritual is due';
    default:
      return 'A ritual is due';
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
    case 'mention_for_me':
      return 'people';
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
    case 'mention_for_me':
      return 'Mention · new';
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 40px;
  }
  .masthead-cell { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1 1 0; }
  .masthead-cell.align-c { align-items: center; text-align: center; justify-self: center; }
  .masthead-cell.align-r { align-items: flex-end; text-align: right; justify-self: end; }
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

  /* Family-at-a-glance bars — sits in the middle masthead cell when
     the family has 2+ people. Replaces the old Season/week cell,
     which was decorative filler. Three compact rows (Coverage,
     Freshness, Depth) with the same color coding as the dossier
     ring below. Clickable into /manual. */
  .mh-bars-cell { flex: 1.4 1 0; }
  .mh-bars-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
    text-decoration: none;
    color: inherit;
    transition: opacity 120ms var(--r-ease-ink);
  }
  .mh-bars-link:hover { opacity: 0.92; }
  .mh-bars {
    display: flex;
    flex-direction: column;
    gap: 5px;
    width: 100%;
    max-width: 260px;
  }
  .mh-bar-row {
    display: grid;
    grid-template-columns: 68px 1fr 36px;
    align-items: center;
    gap: 10px;
  }
  .mh-bar-label {
    font-family: var(--r-sans);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--r-text-4);
    line-height: 1;
  }
  .mh-bar-track {
    position: relative;
    display: block;
    width: 100%;
    height: 4px;
    background: rgba(60,48,28,0.06);
    border-radius: 999px;
    overflow: hidden;
  }
  .mh-bar-fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    border-radius: 999px;
    transition: width 0.5s ease;
  }
  .mh-bar-pct {
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 13px;
    color: var(--r-ink);
    line-height: 1;
    text-align: right;
  }

  /* Balance indicator rendered inside the third masthead cell — uses
     the cell's own typography, just tinted for attention states. */
  .mb-link {
    text-decoration: none;
    border-bottom: 1px dashed currentColor;
    transition: opacity 120ms var(--r-ease-ink);
  }
  .mb-link:hover { opacity: 0.75; }
  .mb-link-attention { color: #9E4A38; }
  .mb-link-mostly { color: #8F6B2D; }

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
  .hero-since {
    font-family: var(--r-serif);
    font-size: 17px;
    line-height: 1.55;
    color: var(--r-text-3);
    margin: 24px 0 0;
    padding: 14px 18px 14px 16px;
    border-left: 2px solid var(--r-ember);
    background: rgba(201, 134, 76, 0.06);
    max-width: 52ch;
    border-radius: 2px;
  }
  .hero-since em { font-style: italic; color: var(--r-ink); }
  :global(.hero-since-link) {
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--r-ember);
    border-bottom: 1px solid currentColor;
    padding-bottom: 2px;
    text-decoration: none;
    white-space: nowrap;
  }
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
  /* Thread-row styles live in globals.css now — styled-jsx :global
     proved unreliable at emitting them when the component tree was
     the first instance to render. Global CSS loads deterministically. */

  .quiet-block { padding: 32px 8px; text-align: left; }
  .quiet-block .glyph { font-family: var(--r-serif); font-size: 28px; color: var(--r-rule-2); margin-bottom: 16px; }
  .quiet-block h3 { font-family: var(--r-serif); font-style: italic; font-weight: 400; font-size: 26px; line-height: 1.25; color: var(--r-ink); margin: 0 0 10px; }
  .quiet-block p { font-family: var(--r-serif); font-size: 16px; line-height: 1.55; color: var(--r-text-3); margin: 0; max-width: 32ch; }
  .quiet-block .lead-teaser {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid var(--r-rule-5);
    font-size: 14.5px;
    color: var(--r-text-4);
    max-width: 34ch;
  }
  .quiet-block .lead-teaser em { font-style: italic; color: var(--r-text-3); }
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

  /* ═══ FROM YOUR LAST CONVERSATION ═══ */
  .coach-closure-card {
    display: block;
    margin-top: 32px;
    padding: 20px 24px 22px;
    background: rgba(124,144,130,0.06);
    border-left: 3px solid var(--r-sage, #7C9082);
    border-radius: 2px;
    text-decoration: none;
    color: inherit;
    transition: background 120ms var(--r-ease-ink);
  }
  .coach-closure-card:hover { background: rgba(124,144,130,0.10); }
  .coach-closure-card .ccc-cta {
    display: inline-block;
    margin-top: 12px;
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--r-ember);
    border-bottom: 1px solid currentColor;
    padding-bottom: 2px;
  }
  .coach-closure-card .ccc-eyebrow {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-4);
    margin-bottom: 10px;
  }
  .coach-closure-card .ccc-eyebrow .pip {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--r-sage, #7C9082);
  }
  .coach-closure-card .ccc-emergent {
    font-family: var(--r-serif);
    font-size: 18px;
    line-height: 1.5;
    color: var(--r-ink);
    margin: 0 0 8px;
  }
  .coach-closure-card .ccc-emergent em {
    font-style: italic;
  }
  .coach-closure-card .ccc-themes {
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--r-text-5);
    margin: 0;
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
  .prompt-question-answered {
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 15px;
    line-height: 1.4;
    color: rgba(245,236,216,0.55);
    margin: 0 0 14px;
    padding: 0;
    border: none;
  }
  .prompt-answer {
    font-family: var(--r-serif);
    font-size: 17px;
    line-height: 1.55;
    color: var(--r-paper);
    margin: 0 0 18px;
  }
  .prompt-answer em {
    font-style: italic;
    color: var(--r-amber);
    letter-spacing: 0.02em;
  }
  .feature.prompt .feature-eyebrow em {
    color: var(--r-amber);
    font-style: italic;
    text-transform: none;
    letter-spacing: 0.02em;
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
  .pattern-footer {
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 15.5px;
    line-height: 1.4;
    color: var(--r-text-4);
    margin: 20px 0 0;
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
  a.day-link {
    text-decoration: none;
    color: inherit;
    cursor: pointer;
    transition: background 160ms var(--r-ease-ink);
  }
  a.day-link:hover {
    background: var(--r-tint-ember);
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
