'use client';
/* ================================================================
   Relish · /people/[personId] — the Person Page dossier.
   Rebuilt from the 2026-04-20 editorial redesign: breadcrumbs →
   hero (portrait + dossier) → threads + timeline → quiet-notes
   row → colophon. Shell chrome lives at the root (GlobalNav).
   ================================================================ */

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePersonById, usePerson } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { useContribution } from '@/hooks/useContribution';
import { useEquivalentManualIds } from '@/hooks/useEquivalentManualIds';
import { useFamily } from '@/hooks/useFamily';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { computeAge } from '@/utils/age';
import { stockImagery } from '@/config/stock-imagery';
import type { Person, RelationshipType } from '@/types/person-manual';
import { EditPersonSheet } from '@/components/people/EditPersonSheet';
import type { JournalEntry } from '@/types/journal';
import { entryMentionsPerson } from '@/lib/entry-mentions';
import { computeBalance } from '@/lib/balance';
import { useSettledMentions } from '@/hooks/useSettledMentions';

export default function PersonPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { person, loading: personLoading, updatePerson } = usePersonById(personId);
  const { manual, loading: manualLoading } = usePersonManual(personId);
  const { people } = usePerson();
  const equivalentManualIds = useEquivalentManualIds(personId, people);
  const { contributions } = useContribution(manual?.manualId, equivalentManualIds);
  const { inviteParent } = useFamily();
  const { entries } = useJournalEntries();
  const { settledIds, settle } = useSettledMentions();
  const [isEditing, setIsEditing] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteDone, setInviteDone] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [authLoading, user, router]);

  const mentions = useMemo(() => {
    if (!person) return [] as JournalEntry[];
    return entries
      .filter((e) => entryMentionsPerson(e, person.personId))
      .sort((a, b) => {
        const am = a.createdAt?.toMillis?.() ?? 0;
        const bm = b.createdAt?.toMillis?.() ?? 0;
        return bm - am;
      });
  }, [person, entries]);

  const openThreads = useMemo(() => {
    // Heuristic: non-response entries that haven't been carried
    // forward yet (no companion reflection in their wake), minus
    // anything the user has explicitly settled. Settled is the
    // lightweight "I've seen this, stop surfacing it" gesture —
    // same mechanism as the workbook "written about you" dispatch.
    return mentions
      .filter(
        (e) =>
          !e.respondsToEntryId &&
          e.category !== 'reflection' &&
          !settledIds.has(e.entryId),
      )
      .slice(0, 5);
  }, [mentions, settledIds]);

  // Manual-derived content — computed here (before any early return)
  // so the hook order is stable across all render branches.
  const topStrategies = useMemo(
    () =>
      (manual?.whatWorks ?? [])
        .slice()
        .sort((a, b) => b.effectiveness - a.effectiveness)
        .slice(0, 4),
    [manual?.whatWorks],
  );
  const topTriggers = useMemo(() => {
    const order: Record<string, number> = { significant: 0, moderate: 1, mild: 2 };
    return (manual?.triggers ?? [])
      .slice()
      .sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3))
      .slice(0, 3);
  }, [manual?.triggers]);

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

  // Manual-derived content (topStrategies/topTriggers already memoized above)
  const synth = manual?.synthesizedContent;
  const strengths = manual?.coreInfo?.strengths?.slice(0, 6) ?? [];

  const selfContributions = contributions.filter((c) => c.perspectiveType === 'self' && c.status === 'complete');
  const observerContributions = contributions.filter((c) => c.perspectiveType === 'observer' && c.status === 'complete');
  const isSelf = person.linkedUserId === user.userId;
  const theyCanContribute = !!person.canSelfContribute && person.relationshipType !== 'child';
  const theyHaveAccount = !!person.linkedUserId;

  const balance = computeBalance({
    firstName,
    mentions: mentions.length,
    daysSinceLast,
    openThreads: openThreads.length,
    hasSelfContribution: selfContributions.length > 0,
    hasObserverContribution: observerContributions.length > 0,
    theyCanContribute,
    theyHaveAccount,
    isSelf,
  });

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setInviteBusy(true);
    setInviteError(null);
    try {
      await inviteParent(email);
      setInviteDone(true);
    } catch (err) {
      console.error('Invite failed:', err);
      setInviteError('Could not send the invite. Please try again.');
    } finally {
      setInviteBusy(false);
    }
  };

  return (
    <main className="pp-app">
      {/* Plain <style> safety net — styled-jsx global has been dropping
          on Next 16 + Turbopack, leaving new classes unstyled. Mirror the
          load-bearing rules here so they render regardless. */}
      <style dangerouslySetInnerHTML={{ __html: personPageCss }} />
      <div className="pp-page">
        {/* ═══ BREADCRUMBS ═══ */}
        <div className="crumbs">
          <Link href="/manual">Family</Link>
          <span className="sep">/</span>
          <span>{firstName}</span>
          <button
            type="button"
            className="crumbs-edit"
            aria-label={`Edit ${firstName}'s page`}
            onClick={() => setIsEditing(true)}
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
              aria-hidden="true"
            >
              <path d="M17 3l4 4L8 20l-5 1 1-5L17 3z" />
            </svg>
          </button>
        </div>

        {/* ═══ HERO — PORTRAIT + DOSSIER ═══ */}
        <section className="person-hero">
          <div
            className="person-portrait"
            style={
              person.bannerUrl
                ? { backgroundImage: `url('${person.bannerUrl}')` }
                : undefined
            }
          >
            <div className="person-plate">
              {person.avatarUrl && (
                <img
                  className="person-avatar"
                  src={person.avatarUrl}
                  alt=""
                />
              )}
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
                {isSelf ? 'Your page' : 'Their page'}
                {daysSinceLast < 9999 && <> · updated {formatDays(daysSinceLast)}</>}
              </span>
            </div>

            {/* Balance line — one sentence that says where things
                stand. Color of the dot conveys the state (sage = in
                balance, amber = mostly, coral = needs attention,
                gray = new). When there's a specific waiting entry,
                link the sentence into it instead of leaving the
                reader with a vague "N things waiting". */}
            <div className={`balance-line balance-${balance.state}`}>
              <svg
                className="balance-leaf"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5 14c0-5 4-9 9-9h5v5c0 5-4 9-9 9-2 0-3.8-0.8-5-2"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5 21c2-6 6-10 12-13"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <span className="balance-text">
                {(() => {
                  const firstWaiting = openThreads[0];
                  if (!isSelf && firstWaiting && openThreads.length === 1) {
                    // The most common "mostly in balance" case — one
                    // open thread about this person. Link it to the
                    // in-page list (anchor scroll) so the reader sees
                    // what they're about to open before diving in.
                    const snippet =
                      firstWaiting.title ?? excerptOf(firstWaiting.text, 70);
                    return (
                      <>
                        <a href="#still-open" className="balance-inline-link">
                          “{snippet}”
                        </a>
                        {' '}is still open about {firstName}.
                      </>
                    );
                  }
                  if (!isSelf && firstWaiting && openThreads.length > 1) {
                    return (
                      <>
                        <a href="#still-open" className="balance-inline-link">
                          {openThreads.length} things
                        </a>
                        {' '}are still open about {firstName} — take them one at a time.
                      </>
                    );
                  }
                  // Fall back to the computed sentence for every
                  // other state (in balance, long silence, not-yet-
                  // invited, self page, empty page).
                  return balance.line;
                })()}
              </span>
            </div>

            {/* Synthesis lead — 1–3 sentences distilled from contributions */}
            {synth?.overview ? (
              <p className="dossier-lede">
                <em>{synth.overview}</em>
              </p>
            ) : isSelf && !selfContributions.length ? (
              <p className="dossier-lede">
                <em>A new page — your own.</em> Answer your questions in your
                own words. The app will start distilling once you do.
              </p>
            ) : isSelf ? (
              <p className="dossier-lede">
                <em>Your own perspective is in.</em> More will show up here as
                you add to it or invite others to add their view of you.
              </p>
            ) : mentions.length === 0 ? (
              <p className="dossier-lede">
                <em>A new page.</em> Write a first note about {firstName} and
                this page starts to fill.
              </p>
            ) : (
              <p className="dossier-lede">
                <em>No summary yet.</em> A few more notes and the app will
                start distilling what it&rsquo;s hearing.
              </p>
            )}

            <div className="dossier-stats">
              <div className="dossier-stat">
                <div className="num">{mentions.length}</div>
                <div className="lbl">Entries</div>
              </div>
              <div className="dossier-stat">
                <div className="num">{openThreads.length}</div>
                <div className="lbl">Waiting</div>
              </div>
              <div className="dossier-stat">
                <div className="num">{formatDaysShort(daysSinceLast)}</div>
                <div className="lbl">Since last</div>
              </div>
            </div>

            <div className="dossier-relation">
              <span className="dossier-relation-label">Relation</span>
              <span className="dossier-relation-value">
                {relationDescription(person)}
              </span>
            </div>

            <div className="dossier-ctas">
              {isSelf ? (
                <Link
                  href={`/people/${person.personId}/manual/self-onboard`}
                  style={pillDarkStyle as React.CSSProperties}
                >
                  {selfContributions.length > 0
                    ? 'Revise your own answers'
                    : 'Continue your own page'}
                  <span aria-hidden="true">⟶</span>
                </Link>
              ) : (
                <>
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
                  <a href="#invite-iris" style={pillStyle}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flex: 'none' }}
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M9.5 9.5a2.5 2.5 0 115 0c0 1.5-2.5 2-2.5 3.5" />
                      <path d="M12 17h.01" />
                    </svg>
                    Ask {firstName} a few questions
                  </a>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ═══ THREADS + TIMELINE ═══ */}
        <section className="threads-section" id="still-open">
          <div className="threads-col">
            <div className="threads-head">
              <h2 className="h2-serif">
                {openThreads.length > 0 ? (
                  isSelf ? (
                    <>Waiting <em>for you.</em></>
                  ) : (
                    <>Still open about <em>{firstName}.</em></>
                  )
                ) : (
                  isSelf ? (
                    <>Nothing <em>waiting.</em></>
                  ) : (
                    <>Nothing open about <em>{firstName}.</em></>
                  )
                )}
              </h2>
              <span className="sub">
                {openThreads.length > 0
                  ? `${spellCount(openThreads.length)} ${openThreads.length === 1 ? 'thing' : 'things'} waiting, newest first.`
                  : 'Nothing to reply to right now.'}
              </span>
            </div>
            {openThreads.length === 0 ? (
              <div className="threads-empty">
                <p>
                  {isSelf
                    ? 'Nothing waiting for you right now.'
                    : 'Nothing waiting. If something lands, just write.'}
                </p>
              </div>
            ) : (
              <div>
                {openThreads.map((entry) => (
                  <ThreadRow
                    key={entry.entryId}
                    entry={entry}
                    firstName={firstName}
                    onSettle={() => {
                      void settle(entry.entryId);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="timeline">
            <p className="tl-head">Timeline</p>
            {Object.keys(timeline).length === 0 ? (
              <p className="tl-empty">
                <em>
                  {isSelf
                    ? 'Nothing written yet.'
                    : `Nothing written about ${firstName} yet.`}
                </em>
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

        {/* ═══ DETAILS — what the app has learned ═══ */}
        {(topStrategies.length > 0 || topTriggers.length > 0 || strengths.length > 0) && (
          <section className="details" aria-label="What the app has learned">
            <div className="details-head">
              <h2 className="h2-serif"><em>What helps.</em></h2>
              <span className="sub">
                Gathered from what you&rsquo;ve written
                {observerContributions.length > 0 && ' and what others have added'}.
              </span>
            </div>

            <div className="details-cols">
              {topStrategies.length > 0 && (
                <article className="details-col">
                  <span className="eyebrow">What works</span>
                  <ul className="details-list">
                    {topStrategies.map((s) => (
                      <li key={s.id}>{s.description}</li>
                    ))}
                  </ul>
                </article>
              )}

              {topTriggers.length > 0 && (
                <article className="details-col">
                  <span className="eyebrow">Handle with care</span>
                  <ul className="details-list">
                    {topTriggers.map((t) => (
                      <li key={t.id}>
                        {t.description}
                        {t.deescalationStrategy && (
                          <span className="details-quiet"> — {t.deescalationStrategy}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </article>
              )}

              {strengths.length > 0 && (
                <article className="details-col">
                  <span className="eyebrow">Their strengths</span>
                  <p className="details-strengths">
                    {strengths.map((s, i) => (
                      <span key={i}>
                        {s.toLowerCase()}
                        {i < strengths.length - 1 ? ', ' : '.'}
                      </span>
                    ))}
                  </p>
                </article>
              )}
            </div>
          </section>
        )}

        {/* ═══ THEIR SIDE — invite card (horizontal, illustrated) ═══ */}
        {!isSelf && theyCanContribute && (
          <section
            id="invite-iris"
            className="their-side"
            aria-label="Their own side"
          >
            {selfContributions.length > 0 ? (
              <article className="their-side-card filled">
                <span className="eyebrow">{firstName}&rsquo;s own side</span>
                <h3>
                  <em>{firstName}</em> has added their own view.
                </h3>
                <p>
                  Both perspectives are in this page. As more is written on
                  each side, the synthesis above fills out.
                </p>
              </article>
            ) : theyHaveAccount ? (
              <article className="their-side-card">
                <span className="eyebrow">{firstName}&rsquo;s own side</span>
                <h3>
                  <em>{firstName}</em> hasn&rsquo;t added their view yet.
                </h3>
                <p>
                  When they do, their page will hold both perspectives — and
                  the app can show where you see the same thing and where you
                  see differently.
                </p>
              </article>
            ) : inviteDone ? (
              <article className="their-side-card filled">
                <span className="eyebrow">Invite sent</span>
                <h3>
                  On its way to {firstName}.
                </h3>
                <p>
                  When they sign up, their contributions will appear here
                  alongside yours.
                </p>
              </article>
            ) : (
              <article className="invite-card">
                <div className="invite-card-icon" aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
                    strokeLinejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="1" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                </div>
                <div className="invite-card-body">
                  <span className="invite-card-eyebrow">
                    {firstName}&rsquo;s own side
                  </span>
                  <h3 className="invite-card-title">
                    Invite {firstName} to write their own side.
                  </h3>
                  <p className="invite-card-copy">
                    One email. They&rsquo;ll sign up and land here,
                    <br />
                    with their own page already waiting.
                  </p>
                  {!inviteOpen ? (
                    <button
                      type="button"
                      onClick={() => setInviteOpen(true)}
                      className="invite-card-cta"
                    >
                      Send an invite <span aria-hidden="true">⟶</span>
                    </button>
                  ) : (
                    <div className="invite-form">
                      <input
                        type="email"
                        placeholder="them@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        disabled={inviteBusy}
                        className="invite-input"
                      />
                      <button
                        type="button"
                        onClick={handleInvite}
                        disabled={inviteBusy || !inviteEmail.trim()}
                        className="invite-card-cta"
                      >
                        {inviteBusy ? 'Sending…' : 'Send invite'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setInviteOpen(false); setInviteEmail(''); }}
                        className="invite-cancel"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {inviteError && (
                    <p className="invite-error">{inviteError}</p>
                  )}
                </div>
                <div className="invite-card-illustration" aria-hidden="true">
                  <svg width="180" height="120" viewBox="0 0 180 120" fill="none">
                    {/* dotted flight path */}
                    <path
                      d="M10 90 Q 55 40, 95 60 T 170 30"
                      stroke="rgba(60,48,28,0.28)"
                      strokeWidth="1"
                      strokeDasharray="2 4"
                      fill="none"
                    />
                    {/* envelope */}
                    <g transform="translate(70 40) rotate(-8)">
                      <rect x="0" y="0" width="64" height="42" rx="1.5"
                        fill="#FDFBF6" stroke="#3A3530" strokeWidth="1.3" />
                      <path d="M0 0 L32 26 L64 0" stroke="#3A3530"
                        strokeWidth="1.3" fill="none" />
                    </g>
                    {/* little leaves */}
                    <g stroke="#7C9082" strokeWidth="1.2" fill="none"
                      strokeLinecap="round" strokeLinejoin="round">
                      <path d="M48 92 q 6 -8 14 -6" />
                      <path d="M54 88 l 2 2" />
                      <path d="M58 84 l 2 2" />
                      <path d="M160 78 q -6 8 -14 6" />
                      <path d="M154 82 l -2 2" />
                      <path d="M150 86 l -2 2" />
                    </g>
                  </svg>
                </div>
              </article>
            )}
          </section>
        )}

        {/* ═══ COLOPHON ═══ */}
        <footer className="colophon">
          <span>A safe place for honest words and stronger relationships.</span>
        </footer>
      </div>

      {isEditing && person && (
        <EditPersonSheet
          person={person}
          onClose={() => setIsEditing(false)}
          onSave={async (updates) => {
            await updatePerson(updates as Partial<Person>);
          }}
        />
      )}

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
  onSettle,
}: {
  entry: JournalEntry;
  firstName: string;
  onSettle: () => void;
}) {
  const created = entry.createdAt?.toDate?.();
  const days = created
    ? Math.floor((Date.now() - created.getTime()) / 86_400_000)
    : 0;
  return (
    <div className="thread">
      <span className="thread-age">
        <span className="num">{formatDaysShortest(days)}</span>
        since
      </span>
      <Link href={`/journal/${entry.entryId}`} className="thread-body">
        <h3>{entry.title ?? excerptOf(entry.text, 80)}</h3>
        <p>{excerptOf(entry.text, 160)}</p>
        <div className="cues">
          <span className="pip">About · {firstName}</span>
        </div>
      </Link>
      <div className="thread-actions">
        <Link href={`/journal/${entry.entryId}`} className="ta">Open</Link>
        <button
          type="button"
          className="ta ta-rest"
          onClick={onSettle}
          aria-label="Let this rest — stop surfacing it"
        >
          Let it rest
        </button>
      </div>
    </div>
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
  .pp-empty a {
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
  .crumbs a {
    color: var(--r-text-4);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: border-color 120ms var(--r-ease-ink);
  }
  .crumbs a:hover { border-color: var(--r-text-4); }
  .crumbs .sep { opacity: 0.5; }
  .crumbs-edit {
    all: unset;
    margin-left: auto;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 999px;
    color: var(--r-text-4);
    transition: color 120ms var(--r-ease-ink), background 120ms var(--r-ease-ink);
  }
  .crumbs-edit:hover { color: var(--r-ink); background: var(--r-cream-warm); }
  .crumbs-edit:focus-visible { outline: 1px solid var(--r-text-4); outline-offset: 2px; }

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
    border-radius: 14px;
    overflow: hidden;
    position: relative;
    background: ${heroBg};
    background-color: var(--r-cream-warm);
    background-size: cover;
    background-position: center 30%;
    box-shadow: 0 1px 2px rgba(20,16,12,0.06), 0 8px 30px rgba(20,16,12,0.06);
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
  .person-avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid rgba(245, 236, 216, 0.85);
    box-shadow: 0 4px 18px rgba(20, 16, 12, 0.35);
    margin-bottom: 6px;
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
  .dossier-relation {
    display: flex;
    align-items: baseline;
    gap: 20px;
    margin: 4px 0 8px;
  }
  .dossier-relation-label {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-5);
  }
  .dossier-relation-value {
    font-family: var(--r-serif);
    font-size: 17px;
    line-height: 1.5;
    color: var(--r-ink);
  }
  .dossier-ctas { display: flex; gap: 10px; flex-wrap: wrap; }

  /* THREADS + TIMELINE */
  .threads-section {
    padding: 48px 0;
    border-top: 1px solid var(--r-rule-4);
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 48px;
    scroll-margin-top: 84px;
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

  .thread {
    padding: 22px 0;
    border-bottom: 1px solid var(--r-rule-5);
    display: grid;
    grid-template-columns: 72px 1fr auto;
    gap: 18px;
    align-items: start;
  }
  .thread:last-child { border-bottom: none; }
  .thread:hover .thread-body h3 { color: var(--r-ember); }
  .thread-body {
    text-decoration: none;
    color: inherit;
    display: block;
  }

  .thread-age {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--r-text-5);
    padding-top: 5px;
    line-height: 1.4;
  }
  .thread-age .num {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 26px;
    color: var(--r-ink);
    display: block;
    letter-spacing: -0.01em;
    margin-bottom: 2px;
  }
  .thread-body h3 {
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
  .thread-body p {
    font-family: var(--r-serif);
    font-size: 15.5px;
    line-height: 1.55;
    color: var(--r-text-3);
    margin: 0;
  }
  .thread-body .cues {
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
  .thread-body .cues .pip {
    padding: 3px 10px;
    border-radius: 999px;
    background: var(--r-cream);
    color: var(--r-text-4);
  }
  .thread-actions {
    display: flex;
    gap: 6px;
    padding-top: 4px;
    align-items: center;
  }
  .thread-actions .ta {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--r-text-4);
    padding: 6px 10px;
    border: 1px solid var(--r-rule-5);
    border-radius: 999px;
    background: transparent;
  }
  .thread-actions button.ta {
    cursor: pointer;
    transition: color 160ms ease, border-color 160ms ease, background 160ms ease;
  }
  .thread-actions button.ta:hover {
    color: var(--r-ink);
    border-color: var(--r-rule-3);
    background: rgba(255,255,255,0.5);
  }
  .thread-actions .ta-rest {
    color: var(--r-text-5);
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
  .tl-entry {
    display: grid;
    grid-template-columns: 56px 1fr;
    gap: 12px;
    padding: 10px 0;
    border-top: 1px solid var(--r-rule-5);
    text-decoration: none;
    color: inherit;
  }
  .tl-entry:first-of-type { border-top: none; }
  .tl-entry:hover .tl-body { color: var(--r-ember); }
  .tl-when {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--r-text-5);
    padding-top: 4px;
  }
  .tl-body {
    font-family: var(--r-serif);
    font-size: 15.5px;
    line-height: 1.45;
    color: var(--r-ink);
    transition: color 160ms var(--r-ease-ink);
  }

  /* BALANCE LINE */
  .balance-line {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    margin: 4px 0 20px;
    border-radius: 3px;
    font-family: var(--r-sans);
    font-size: 13px;
    line-height: 1.45;
    color: var(--r-ink);
    background: rgba(124,144,130,0.12);
    flex-wrap: wrap;
  }
  .balance-line .balance-leaf {
    flex: none;
    color: #6C8571;
  }
  .balance-line .balance-text {
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 16px;
    color: var(--r-text-2);
  }
  .balance-line .balance-inline-link {
    color: var(--r-ink);
    font-style: italic;
    text-decoration: none;
    border-bottom: 1px solid var(--r-rule-3);
    transition: border-color 120ms var(--r-ease-ink);
  }
  .balance-line .balance-inline-link:hover {
    border-bottom-color: var(--r-ink);
  }
  .balance-line.balance-mostly-in-balance {
    background: rgba(196,162,101,0.14);
  }
  .balance-line.balance-mostly-in-balance .balance-leaf { color: #A07F3E; }

  .balance-line.balance-needs-attention {
    background: rgba(201,104,82,0.12);
  }
  .balance-line.balance-needs-attention .balance-leaf { color: #A85438; }

  .balance-line.balance-new {
    background: rgba(60,48,28,0.06);
  }
  .balance-line.balance-new .balance-leaf { color: var(--r-text-5); }

  /* DETAILS */
  .details {
    padding: 48px 0;
    border-top: 1px solid var(--r-rule-4);
  }
  .details-head { margin-bottom: 28px; }
  .details-head .h2-serif {
    font-family: var(--r-serif);
    font-weight: 300;
    font-size: clamp(32px, 3.6vw, 44px);
    line-height: 1.05;
    color: var(--r-ink);
    letter-spacing: -0.015em;
    margin: 0 0 8px;
  }
  .details-head .h2-serif em { font-style: italic; }
  .details-head .sub {
    font-family: var(--r-sans);
    font-size: 13px;
    color: var(--r-text-3);
  }
  .details-cols {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
  }
  .details-col {
    background: var(--r-paper);
    border: 1px solid var(--r-rule-5);
    border-radius: 3px;
    padding: 24px 24px 22px;
  }
  .details-col .eyebrow {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-4);
    display: block;
    margin-bottom: 12px;
  }
  .details-list { margin: 0; padding: 0; list-style: none; }
  .details-list li {
    padding: 12px 0;
    border-top: 1px solid var(--r-rule-5);
    font-family: var(--r-sans);
    font-size: 14.5px;
    line-height: 1.55;
    color: var(--r-text-2);
  }
  .details-list li:first-child { border-top: none; padding-top: 0; }
  .details-quiet {
    color: var(--r-text-4);
    font-style: italic;
  }
  .details-strengths {
    margin: 0;
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 17px;
    line-height: 1.55;
    color: var(--r-text-2);
  }

  /* THEIR SIDE */
  .their-side {
    padding: 32px 0 48px;
  }
  .invite-card {
    background: rgba(60,48,28,0.04);
    border: 1px solid rgba(60,48,28,0.08);
    border-radius: 4px;
    padding: 32px 36px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 28px;
  }
  .invite-card-icon {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: rgba(60,48,28,0.07);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--r-text-4);
    flex: none;
  }
  .invite-card-body { min-width: 0; }
  .invite-card-eyebrow {
    display: block;
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-5);
    margin-bottom: 10px;
  }
  .invite-card-title {
    font-family: var(--r-serif);
    font-weight: 400;
    font-size: 24px;
    line-height: 1.25;
    color: var(--r-ink);
    letter-spacing: -0.01em;
    margin: 0 0 10px;
  }
  .invite-card-copy {
    font-family: var(--r-serif);
    font-size: 15px;
    line-height: 1.55;
    color: var(--r-text-3);
    margin: 0 0 18px;
    max-width: 42ch;
  }
  .invite-card-cta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: 2px;
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #F7F5F0;
    background: #2B2620;
    border: 1px solid #2B2620;
    cursor: pointer;
    transition: background 160ms ease;
  }
  .invite-card-cta:hover { background: #3A3530; }
  .invite-card-cta:disabled { opacity: 0.5; cursor: not-allowed; }
  .invite-card-illustration {
    flex: none;
    opacity: 0.9;
    margin-left: 12px;
  }
  @media (max-width: 720px) {
    .invite-card {
      grid-template-columns: 1fr;
      padding: 24px;
    }
    .invite-card-illustration { display: none; }
  }

  .their-side-card {
    max-width: 720px;
    background: var(--r-paper);
    border: 1px solid var(--r-rule-5);
    border-radius: 3px;
    padding: 28px 32px 30px;
  }
  .their-side-card.filled {
    background: rgba(124,144,130,0.06);
    border-color: rgba(124,144,130,0.35);
  }
  .their-side-card .eyebrow {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-4);
    display: block;
    margin-bottom: 10px;
  }
  .their-side-card h3 {
    font-family: var(--r-serif);
    font-weight: 300;
    font-size: 26px;
    line-height: 1.15;
    color: var(--r-ink);
    letter-spacing: -0.015em;
    margin: 0 0 10px;
  }
  .their-side-card h3 em { font-style: italic; }
  .their-side-card p {
    font-family: var(--r-sans);
    font-size: 14.5px;
    line-height: 1.55;
    color: var(--r-text-3);
    margin: 0 0 16px;
  }
  .their-side-cta {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border-radius: 999px;
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--r-paper);
    background: var(--r-leather);
    border: 1px solid var(--r-leather);
  }
  .their-side-cta:disabled { opacity: 0.5; cursor: not-allowed; }

  .invite-form {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }
  .invite-input {
    flex: 1 1 260px;
    font-family: var(--r-sans);
    font-size: 14px;
    color: var(--r-ink);
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--r-rule-3);
    padding: 8px 2px 10px;
  }
  .invite-input:focus { outline: none; border-bottom-color: #7C9082; }
  .invite-cancel {
    all: unset;
    cursor: pointer;
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--r-text-4);
  }
  .invite-error {
    margin: 10px 0 0;
    font-family: var(--r-sans);
    font-size: 13px;
    color: #9E4A38;
  }

  @media (max-width: 880px) {
    .details-cols { grid-template-columns: 1fr; }
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

/* ================================================================
   personPageCss — plain-<style> safety net. styled-jsx global has
   been dropping these rules silently on Next 16 + Turbopack; until
   that's fixed at the framework level, duplicate the load-bearing
   selectors here so the page doesn't render naked. Scoped under
   .pp-page so nothing leaks.
   ================================================================ */
const personPageCss = `
.pp-page .person-portrait {
  width: 100%;
  aspect-ratio: 4 / 5;
  border-radius: 14px;
  overflow: hidden;
  position: relative;
  background-color: var(--r-cream-warm, #EEE8DA);
  background-size: cover;
  background-position: center 30%;
  box-shadow: 0 1px 2px rgba(20,16,12,0.06), 0 8px 30px rgba(20,16,12,0.06);
}
.pp-page .person-portrait::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(20,16,12,0) 55%, rgba(20,16,12,0.55) 100%);
}
.pp-page .person-plate {
  position: absolute;
  left: 28px;
  bottom: 24px;
  right: 28px;
  color: var(--r-paper, #FDFBF6);
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pp-page .person-plate .tag {
  font-family: var(--r-sans, 'DM Sans', system-ui, sans-serif);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  opacity: 0.9;
}
.pp-page .person-plate h1 {
  font-family: var(--r-serif, 'Cormorant Garamond', Georgia, serif);
  font-style: italic;
  font-weight: 400;
  font-size: 48px;
  line-height: 1;
  letter-spacing: -0.02em;
  margin: 0;
  color: #FDFBF6;
}
.pp-page .person-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid rgba(253,251,246,0.85);
  object-fit: cover;
  margin-bottom: 4px;
}

.pp-page .dossier-relation {
  display: flex;
  align-items: baseline;
  gap: 20px;
  margin: 4px 0 18px;
}
.pp-page .dossier-relation-label {
  font-family: var(--r-sans, 'DM Sans', system-ui, sans-serif);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--r-text-5, #8A7B5F);
}
.pp-page .dossier-relation-value {
  font-family: var(--r-serif, 'Cormorant Garamond', Georgia, serif);
  font-size: 17px;
  line-height: 1.5;
  color: var(--r-ink, #3A3530);
}

.pp-page .invite-card {
  background: rgba(60,48,28,0.04);
  border: 1px solid rgba(60,48,28,0.08);
  border-radius: 4px;
  padding: 32px 36px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 28px;
}
.pp-page .invite-card-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(60,48,28,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--r-text-4, #6B6254);
  flex: none;
}
.pp-page .invite-card-body { min-width: 0; }
.pp-page .invite-card-eyebrow {
  display: block;
  font-family: var(--r-sans, 'DM Sans', system-ui, sans-serif);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--r-text-5, #8A7B5F);
  margin-bottom: 10px;
}
.pp-page .invite-card-title {
  font-family: var(--r-serif, 'Cormorant Garamond', Georgia, serif);
  font-weight: 400;
  font-size: 26px;
  line-height: 1.2;
  color: var(--r-ink, #3A3530);
  letter-spacing: -0.01em;
  margin: 0 0 10px;
}
.pp-page .invite-card-copy {
  font-family: var(--r-serif, 'Cormorant Garamond', Georgia, serif);
  font-size: 15px;
  line-height: 1.55;
  color: var(--r-text-3, #4a4139);
  margin: 0 0 18px;
  max-width: 42ch;
}
.pp-page .invite-card-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  border-radius: 2px;
  font-family: var(--r-sans, 'DM Sans', system-ui, sans-serif);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #F7F5F0;
  background: #2B2620;
  border: 1px solid #2B2620;
  cursor: pointer;
  text-decoration: none;
  transition: background 160ms ease;
}
.pp-page .invite-card-cta:hover { background: #3A3530; }
.pp-page .invite-card-cta:disabled { opacity: 0.5; cursor: not-allowed; }
.pp-page .invite-card-illustration {
  flex: none;
  opacity: 0.9;
  margin-left: 12px;
}
.pp-page .invite-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.pp-page .invite-input {
  flex: 1 1 240px;
  font-family: var(--r-sans, 'DM Sans', system-ui, sans-serif);
  font-size: 14px;
  color: var(--r-ink, #3A3530);
  background: transparent;
  border: 0;
  border-bottom: 1px solid rgba(60,48,28,0.2);
  padding: 8px 2px 10px;
}
.pp-page .invite-input:focus {
  outline: none;
  border-bottom-color: #7C9082;
}
.pp-page .invite-cancel {
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--r-sans, 'DM Sans', system-ui, sans-serif);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--r-text-4, #6B6254);
  padding: 6px 4px;
}
.pp-page .invite-error {
  margin: 10px 0 0;
  font-family: var(--r-sans, 'DM Sans', system-ui, sans-serif);
  font-size: 13px;
  color: #9E4A38;
}
@media (max-width: 720px) {
  .pp-page .invite-card {
    grid-template-columns: 1fr;
    padding: 24px;
  }
  .pp-page .invite-card-illustration { display: none; }
}

.pp-page .balance-line {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  margin: 4px 0 20px;
  border-radius: 3px;
  font-family: var(--r-sans, 'DM Sans', system-ui, sans-serif);
  font-size: 13px;
  line-height: 1.45;
  color: var(--r-ink, #3A3530);
  background: rgba(124,144,130,0.14);
  flex-wrap: wrap;
}
.pp-page .balance-line .balance-leaf {
  flex: none;
  color: #6C8571;
}
.pp-page .balance-line .balance-text {
  font-family: var(--r-serif, 'Cormorant Garamond', Georgia, serif);
  font-style: italic;
  font-size: 16px;
  color: var(--r-text-2, #2B2620);
}
.pp-page .balance-line .balance-inline-link {
  color: var(--r-ink, #3A3530);
  font-style: italic;
  text-decoration: none;
  border-bottom: 1px solid rgba(60,48,28,0.25);
}
.pp-page .balance-line.balance-mostly-in-balance {
  background: rgba(196,162,101,0.16);
}
.pp-page .balance-line.balance-mostly-in-balance .balance-leaf { color: #A07F3E; }
.pp-page .balance-line.balance-needs-attention {
  background: rgba(201,104,82,0.14);
}
.pp-page .balance-line.balance-needs-attention .balance-leaf { color: #A85438; }

.pp-page .colophon {
  text-align: center;
  padding: 64px 0 40px;
  font-family: var(--r-serif, 'Cormorant Garamond', Georgia, serif);
  font-style: italic;
  color: var(--r-text-5, #8A7B5F);
  font-size: 14px;
}
`;
