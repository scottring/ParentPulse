'use client';
/* ================================================================
   Relish · /manual — the Family Manual.
   Rebuilt from the 2026-04-20 editorial redesign: masthead strip →
   hero spread (portrait + lede + stats + CTAs) → constellation →
   thematic groups → filterable roster → colophon. Shell chrome
   is supplied by GlobalNav at the root.
   ================================================================ */

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePerson } from '@/hooks/usePerson';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { useFamilyContributions } from '@/hooks/useFamilyContributions';
import { useFamilyManuals } from '@/hooks/useFamilyManuals';
import { useFamily } from '@/hooks/useFamily';
import { useFreshness } from '@/hooks/useFreshness';
import { computeAge } from '@/utils/age';
import type { Person, RelationshipType, Contribution } from '@/types/person-manual';
import type { JournalEntry } from '@/types/journal';
import { entryMentionsPerson } from '@/lib/entry-mentions';
import PortraitInventory from '@/components/dashboard/PortraitInventory';

export default function ManualPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { people } = usePerson();
  const { entries } = useJournalEntries();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  const metrics = useMemo(
    () => computePersonMetrics(people, entries),
    [people, entries],
  );

  // Portrait coverage data — who has contributed what across the
  // whole family. Pairs with the Ring on the workbook (family-level
  // overall percent) by showing the per-person picture here.
  const { contributions: familyContributions } = useFamilyContributions();
  const selfPerson = useMemo(
    () =>
      (people ?? []).find(
        (p) => p.linkedUserId === user?.userId && p.relationshipType === 'self',
      ) ?? null,
    [people, user?.userId],
  );
  const hasSelfContribution = useMemo(
    () =>
      !!selfPerson &&
      familyContributions.some(
        (c) =>
          c.contributorId === user?.userId &&
          c.personId === selfPerson.personId &&
          c.perspectiveType === 'self' &&
          c.status === 'complete',
      ),
    [familyContributions, selfPerson, user?.userId],
  );
  const portraitRoles = useMemo(() => {
    return (people ?? [])
      .filter(
        (p) =>
          p.relationshipType !== 'self' &&
          !p.archived &&
          p.linkedUserId !== user?.userId,
      )
      .map((p) => ({
        roleLabel: relationLabel(p),
        otherPerson: p,
        hasObserverContribution: familyContributions.some(
          (c) =>
            c.contributorId === user?.userId &&
            c.personId === p.personId &&
            c.perspectiveType === 'observer' &&
            c.status === 'complete',
        ),
      }));
  }, [people, familyContributions, user?.userId]);

  // Family-level completeness for the Ring at the top of this page.
  const { manuals: familyManuals } = useFamilyManuals();
  const { family } = useFamily();
  const { familyCompleteness } = useFreshness({
    people,
    manuals: familyManuals,
    contributions: familyContributions,
  });
  const activePeopleCount = (people ?? []).filter((p) => !p.archived).length;
  const showCompletenessSection = activePeopleCount >= 2;

  // Prioritized next steps across the whole family. Priority order:
  //   1. Reply debt (entries about someone, waiting on you)
  //   2. Missing self-portrait from an invited contributor
  //   3. Uninvited adult family members
  //   4. Long silences (>30 days on someone with history)
  //   5. Incomplete self-portrait for the current user
  const nextSteps = useMemo<NextStep[]>(
    () =>
      computeNextSteps({
        people: people ?? [],
        entries,
        contributions: familyContributions,
        currentUserId: user?.userId,
      }),
    [people, entries, familyContributions, user?.userId],
  );

  const roster = useMemo(() => {
    return metrics
      .filter((m) => m.person.relationshipType !== 'self')
      .sort((a, b) => b.daysSinceLast - a.daysSinceLast);
  }, [metrics]);

  const hero = useMemo(() => {
    const withHistory = roster.filter((m) => m.entriesCount > 0);
    return withHistory[0] ?? roster[0] ?? null;
  }, [roster]);

  const [filter, setFilter] = useState<'all' | 'open' | 'quiet' | 'recent'>('all');

  const filtered = useMemo(() => {
    switch (filter) {
      case 'open':
        return roster.filter((m) => m.openThreadsCount > 0);
      case 'quiet':
        return [...roster].sort((a, b) => b.daysSinceLast - a.daysSinceLast);
      case 'recent':
        return [...roster].sort((a, b) => a.daysSinceLast - b.daysSinceLast);
      default:
        return roster;
    }
  }, [roster, filter]);

  if (loading || !user) {
    // Keep the <main> shell rendered during auth-loading so the
    // <style jsx global> block has a stable mount point. Returning
    // null here in Next.js 16 leaves styled-jsx unable to inject the
    // page's global CSS when the component later renders with content.
    return (
      <main className="mn-app">
        <div className="mn-page" aria-busy="true" />
        <style jsx global>{styles}</style>
      </main>
    );
  }

  const totalKept = roster.length;
  const peopleWithOpenThreads = roster.filter((m) => m.openThreadsCount > 0).length;
  const totalOpenThreads = roster.reduce((sum, m) => sum + m.openThreadsCount, 0);
  const writtenThisWeek = roster.filter((m) => m.daysSinceLast <= 7).length;

  // ─── First-run state ──────────────────────────────────────────
  // When the only person in the family is the user themselves, the
  // full editorial layout (masthead stats / constellation / roster)
  // has nothing to show. Render a simple, welcoming page instead.
  if (roster.length === 0) {
    const selfPerson = people.find(
      (p) => p.linkedUserId === user.userId && p.relationshipType === 'self',
    );
    const firstName = (user.name || '').trim().split(/\s+/)[0] || 'You';
    return (
      <main className="mn-app">
        <div className="mn-page first-run">
          <header className="fr-head">
            <span className="fr-eyebrow">Your family</span>
            <h1 className="fr-title">Everyone in one place.</h1>
            <p className="fr-sub">
              This is where your people live. Start with yourself, then add
              the others — one at a time, whenever you&rsquo;re ready.
            </p>
          </header>

          <div className="fr-grid">
            <Link
              href={
                selfPerson
                  ? `/people/${selfPerson.personId}/manual/self-onboard`
                  : '/welcome'
              }
              className="fr-card fr-self"
            >
              <span className="fr-card-eyebrow">You</span>
              <span className="fr-card-title">{firstName}</span>
              <span className="fr-card-hint">
                Continue your own page <span aria-hidden>⟶</span>
              </span>
            </Link>

            <Link href="/people/new" className="fr-card fr-add">
              <span className="fr-cross" aria-hidden>+</span>
              <span className="fr-card-title">Add someone</span>
              <span className="fr-card-hint">
                A partner, a child, a parent, a friend.
              </span>
            </Link>
          </div>
        </div>

        <style jsx global>{styles}</style>
      </main>
    );
  }

  const familyTitle = (() => {
    const raw = family?.name?.trim() || '';
    if (!raw) return 'Your family';
    const last = raw.toLowerCase();
    if (/(s|x|z|ch|sh)$/.test(last)) return `The ${raw}es`;
    if (/y$/.test(last) && !/[aeiou]y$/.test(last)) return `The ${raw.slice(0, -1)}ies`;
    return `The ${raw}s`;
  })();

  return (
    <main className="mn-app">
      <div className="mn-page">
        {/* ═══ TITLE ═══ — page headline, newspaper style. */}
        <header className="fs-title-block">
          <h1 className="fs-title">
            {familyTitle} <span className="fs-title-dash" aria-hidden>—</span>{' '}
            <em>Family Summary</em>
          </h1>
        </header>

        {/* ═══ MASTHEAD ═══ */}
        <section className="manual-masthead" aria-label="The Family Summary">
          <div className="masthead-strip">
            {showCompletenessSection ? (
              <CompletenessCell
                completeness={familyCompleteness}
                totalKept={totalKept}
              />
            ) : (
              <div className="masthead-cell">
                <span className="masthead-eyebrow">In your manual</span>
                <span className="masthead-value big">
                  {totalKept} {totalKept === 1 ? 'person' : 'people'}
                </span>
              </div>
            )}
            <div className="masthead-divider" />
            <div className="masthead-cell align-c">
              <span className="masthead-eyebrow">Replies waiting</span>
              <span className="masthead-value">
                <em>{totalOpenThreads}</em>
                <span className="sub">
                  {' '}· across {peopleWithOpenThreads}{' '}
                  {peopleWithOpenThreads === 1 ? 'person' : 'people'}
                </span>
              </span>
            </div>
            <div className="masthead-divider" />
            <div className="masthead-cell align-c">
              <span className="masthead-eyebrow">Written about this week</span>
              <span className="masthead-value">
                <em>{writtenThisWeek}</em>
                <span className="sub"> of {totalKept || '—'}</span>
              </span>
            </div>
            <div className="masthead-divider" />
            <div className="masthead-cell align-r">
              <span className="masthead-eyebrow">Hasn&rsquo;t heard from you</span>
              <span className="masthead-value">
                {hero ? hero.person.name.split(' ')[0] : '—'}
                {hero && (
                  <span className="sub"> · {formatDays(hero.daysSinceLast)}</span>
                )}
              </span>
            </div>
          </div>
        </section>

        {/* ═══ NEXT STEPS ═══ — prioritized actions across the whole
             family. Hidden when nothing actionable surfaces. */}
        {nextSteps.length >= 3 && (
          <section className="next-steps-section" aria-label="Next steps for your family">
            <div className="next-steps-head">
              <span className="ns-eyebrow">Next steps</span>
              <h2 className="h2-serif"><em>What would move things forward.</em></h2>
            </div>
            <ol className="next-steps-list">
              {nextSteps.map((step, i) => (
                <li key={`${step.kind}-${i}`}>
                  <Link href={step.href} className="ns-item">
                    <span className="ns-num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="ns-label">{step.label}</span>
                    <span className="ns-arrow" aria-hidden>⟶</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* ═══ HERO SPREAD ═══ */}
        {hero && (
          <section className="spread">
            <div className="hero-portrait-wrap">
              <div className="hero-portrait" role="img" aria-label={`Portrait of ${hero.person.name}`} />
              <div className="hero-portrait-plate">
                <span className="name"><em>{hero.person.name}</em></span>
                <span className="rel">{relationLabel(hero.person)}</span>
              </div>
            </div>

            <div className="spread-rule" aria-hidden="true" />

            <div className="hero-text">
              <div className="hero-dateline">
                <span className="dot" />
                <span className="text">
                  Who wants thinking about · {formatToday()}
                </span>
              </div>
              <h1 className="hero-h1">{quietHeadline(hero.daysSinceLast)}</h1>
              <p className="hero-lede">
                <em>
                  {hero.daysSinceLast >= 9999
                    ? `${hero.person.name.split(' ')[0]}'s page is still blank.`
                    : `You haven't written about ${hero.person.name.split(' ')[0]} ${formatDaysInsideSentence(hero.daysSinceLast)}.`}
                </em>{' '}
                {hero.openThreadsCount > 0
                  ? `${spellCount(hero.openThreadsCount)} open ${hero.openThreadsCount === 1 ? 'thread is' : 'threads are'} about them.`
                  : hero.daysSinceLast >= 9999
                  ? 'A first line would start the page.'
                  : 'Nothing open, just a quiet patch.'}
              </p>

              <div className="hero-stats">
                <div className="hero-stat">
                  <div className="num">{hero.entriesCount}</div>
                  <div className="lbl">Entries</div>
                </div>
                <div className="hero-stat">
                  <div className="num">{hero.openThreadsCount}</div>
                  <div className="lbl">Waiting</div>
                </div>
                <div className="hero-stat">
                  <div className="num">{formatDaysShort(hero.daysSinceLast)}</div>
                  <div className="lbl">Since last</div>
                </div>
              </div>

              <div className="hero-ctas">
                <button type="button" style={heroPillDarkStyle} onClick={openPen}>
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
                  Write about {hero.person.name.split(' ')[0]}
                </button>
                <Link
                  href={`/people/${hero.person.personId}`}
                  style={heroPillStyle}
                >
                  Open their page
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ═══ CONSTELLATION ═══ */}
        <section className="constellation-section" aria-label="Your people">
          <div className="constellation-head">
            <h2 className="h2-serif"><em>Your people.</em></h2>
            <p className="sub">
              People closer to the center are the ones you write about most.
              A small dot on someone means they&rsquo;re waiting for a reply.
            </p>
          </div>
          <Constellation
            selfName={user.name?.split(' ')[0] ?? 'You'}
            people={metrics}
          />
        </section>

        {/* ═══ THEMATIC GROUPS ═══ */}
        <section className="groups" aria-label="Thematic groups">
          <GroupCard
            eyebrow="Your household"
            title={<>Under <em>one roof.</em></>}
            description="Partner, children — the people you write about most often because they live here."
            members={metrics.filter(byGroup('household'))}
          />
          <GroupCard
            eyebrow="Parents &amp; siblings"
            title={<>Where you <em>came from.</em></>}
            description="The relationships that shaped you — and shape how you parent."
            members={metrics.filter(byGroup('parents'))}
          />
          <GroupCard
            eyebrow="Friends &amp; chosen family"
            title={<>Chosen <em>family.</em></>}
            description="Friends, mentors, the company you'd keep if you started over."
            members={metrics.filter(byGroup('kept_close'))}
          />
        </section>

        {/* ═══ PORTRAIT INVENTORY ═══ — per-person coverage matrix:
             who's contributed what perspective, with the next action
             for each row. Pairs with the FamilyCompletenessRing on
             the workbook (family-level rollup). */}
        {portraitRoles.length > 0 && (
          <section className="portraits-section" aria-label="Portrait coverage">
            <div className="portraits-head">
              <h2 className="h2-serif"><em>Who&rsquo;s contributed what.</em></h2>
              <p className="sub">
                Each row shows whose perspective is in and what&rsquo;s
                next.
              </p>
            </div>
            <PortraitInventory
              selfPerson={selfPerson}
              hasSelfContribution={hasSelfContribution}
              roles={portraitRoles}
              contributions={familyContributions}
              userId={user.userId}
            />
          </section>
        )}

        {/* ═══ ROSTER ═══ */}
        <section className="roster-section" aria-label="Everyone in your manual">
          <div className="roster-head">
            <h2 className="h2-serif"><em>Everyone.</em></h2>
            <div className="roster-filters">
              {(['all', 'open', 'quiet', 'recent'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`rf ${filter === k ? 'on' : ''}`}
                  onClick={() => setFilter(k)}
                >
                  {filterLabel(k, roster, peopleWithOpenThreads)}
                </button>
              ))}
            </div>
          </div>
          <div className="roster">
            {filtered.map((m) => (
              <PersonCard key={m.person.personId} metric={m} />
            ))}
            <Link href="/people/new" className="add-person">
              <span className="cross">+</span>
              <span className="lbl">Add someone</span>
              <span className="hint">
                A partner, a child, a parent, a friend.
              </span>
            </Link>
          </div>
        </section>

        {/* ═══ COLOPHON ═══ */}
        <footer className="colophon">
          <span className="fleuron" aria-hidden="true">❦</span>
          <span>
            <em>Your family manual</em> — {totalKept}{' '}
            {totalKept === 1 ? 'person' : 'people'}
            {totalOpenThreads > 0 && (
              <>
                , {totalOpenThreads}{' '}
                {totalOpenThreads === 1 ? 'reply' : 'replies'} waiting
              </>
            )}
            .
          </span>
        </footer>
      </div>

      <style jsx global>{styles}</style>
    </main>
  );
}

/* ════════════════════════════════════════════════════════════════
   Components
   ════════════════════════════════════════════════════════════════ */

/**
 * CompletenessCell — replaces the first masthead cell ("In your
 * manual / N people") with a compact overall-completeness readout.
 * A tiny three-segment SVG ring sits beside the overall percent
 * (Cormorant italic, same size as .masthead-value.big). The
 * per-dimension breakdown (Coverage / Freshness / Depth) lives in
 * a hover popover so it's discoverable without crowding the strip.
 *
 * Ring geometry mirrors FamilyCompletenessRing but shrunk for
 * in-masthead use (36×36 glyph, 3px stroke, 3 segments with 8°
 * gaps). Colors match the component's palette exactly.
 */
function CompletenessCell({
  completeness,
  totalKept,
}: {
  completeness: ReturnType<typeof import('@/lib/freshness-engine').computeFamilyCompleteness>;
  totalKept: number;
}) {
  const { overallPercent, coverage, freshness, depth } = completeness;

  const dims = [
    { label: 'Coverage', color: '#7C9082', value: coverage },
    { label: 'Freshness', color: '#D4A574', value: freshness },
    { label: 'Depth', color: '#2D5F5D', value: depth },
  ];

  return (
    <div
      className="masthead-cell mh-complete-cell"
      aria-label={`Overall family completeness ${overallPercent} percent across ${totalKept} ${totalKept === 1 ? 'person' : 'people'}`}
    >
      <span className="masthead-eyebrow">Overall</span>
      <span className="mh-complete-overall">
        <em>{overallPercent}</em>
        <span className="mh-complete-overall-mark">%</span>
      </span>
      <ul className="mh-complete-dims">
        {dims.map((d) => {
          const pct = Math.round(Math.min(d.value, 1) * 100);
          return (
            <li key={d.label} className="mh-complete-dim-row">
              <span className="mh-complete-dim">{d.label}</span>
              <span
                className="mh-complete-bar"
                role="img"
                aria-label={`${d.label} ${pct} percent`}
              >
                <span
                  className="mh-complete-bar-fill"
                  style={{ width: `${pct}%`, background: d.color }}
                />
              </span>
            </li>
          );
        })}
      </ul>
      <span className="mh-complete-sub">
        (across {totalKept} {totalKept === 1 ? 'person' : 'people'})
      </span>
    </div>
  );
}

function Constellation({
  selfName,
  people,
}: {
  selfName: string;
  people: PersonMetric[];
}) {
  const ring1 = people.filter((m) =>
    ['spouse', 'child'].includes(m.person.relationshipType ?? ''),
  );
  const ring2 = people.filter((m) =>
    ['elderly_parent', 'sibling'].includes(m.person.relationshipType ?? ''),
  );
  const ring3 = people.filter((m) =>
    ['friend', 'professional', 'other'].includes(
      m.person.relationshipType ?? '',
    ),
  );

  const nodes: Array<{ m: PersonMetric; x: number; y: number; size: number }> = [];
  const placeRing = (ms: PersonMetric[], yRadius: number, xRadius: number, size: number, startAngle: number) => {
    const n = ms.length;
    if (n === 0) return;
    for (let i = 0; i < n; i++) {
      const angle = startAngle + (Math.PI * 2 * i) / Math.max(n, 3);
      const x = 50 + xRadius * Math.cos(angle);
      const y = 50 + yRadius * Math.sin(angle);
      nodes.push({ m: ms[i], x, y, size });
    }
  };
  placeRing(ring1, 22, 22, 66, -Math.PI / 2);
  placeRing(ring2, 34, 36, 54, -Math.PI / 3);
  placeRing(ring3, 44, 44, 46, -Math.PI / 2.4);

  return (
    <div className="constellation">
      <svg viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true">
        {nodes.map((n, i) => {
          const weak =
            n.m.person.relationshipType === 'friend' ||
            n.m.person.relationshipType === 'professional' ||
            n.m.person.relationshipType === 'other';
          return (
            <line
              key={i}
              x1={500}
              y1={260}
              x2={n.x * 10}
              y2={n.y * 5.2}
              stroke={weak ? '#D8D3CA' : '#B5A99A'}
              strokeWidth="1"
              strokeDasharray={weak ? '3 4' : undefined}
            />
          );
        })}
      </svg>

      <Link className="node you" href="/manual" style={{ left: '50%', top: '50%' }}>
        <span className="dot" style={{ width: 78, height: 78, fontSize: 22 }}>
          {selfName.slice(0, 1)}
        </span>
        <span className="label">
          {selfName}<span className="sub">You</span>
        </span>
      </Link>

      {nodes.map((n, i) => (
        <Link
          key={i}
          className={`node ${n.m.openThreadsCount > 0 ? 'attention' : ''}`}
          href={`/people/${n.m.person.personId}`}
          style={{ left: `${n.x}%`, top: `${n.y}%` }}
        >
          <span
            className="dot"
            style={{
              width: n.size,
              height: n.size,
              fontSize: Math.round(n.size / 3.2),
            }}
          >
            {n.m.person.name.slice(0, 1)}
            {n.m.openThreadsCount > 0 && <span className="pip" />}
          </span>
          <span className="label">
            {n.m.person.name.split(' ')[0]}
            <span className="sub">{shortRelation(n.m.person.relationshipType)}</span>
          </span>
        </Link>
      ))}

      <div className="constellation-legend">
        <span><span className="swatch" />In your manual</span>
        <span><span className="swatch ember" />Waiting for a reply</span>
        <span><span className="swatch line" />Close relation</span>
        <span><span className="swatch line-weak" />More distant</span>
      </div>
    </div>
  );
}

function GroupCard({
  eyebrow,
  title,
  description,
  members,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  members: PersonMetric[];
}) {
  if (members.length === 0) return null;
  return (
    <article className="group">
      <div className="group-head">
        <span className="eyebrow">{eyebrow}</span>
        <span className="count">
          {members.length} {members.length === 1 ? 'person' : 'people'}
        </span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="group-rows">
        {members.slice(0, 5).map((m) => (
          <Link
            key={m.person.personId}
            href={`/people/${m.person.personId}`}
            className="group-row"
          >
            <span className="avatar">{m.person.name.slice(0, 1)}</span>
            <div className="who">
              <span className="name">{m.person.name}</span>
              <span className="when">
                {m.entriesCount > 0
                  ? `Last written · ${formatDaysShort(m.daysSinceLast)}`
                  : 'Not written about yet'}
              </span>
            </div>
            {m.openThreadsCount > 0 ? (
              <span className="open">
                {m.openThreadsCount} open
              </span>
            ) : (
              <span className="quiet">Quiet</span>
            )}
          </Link>
        ))}
      </div>
    </article>
  );
}

function PersonCard({ metric }: { metric: PersonMetric }) {
  const { person, entriesCount, daysSinceLast, openThreadsCount } = metric;
  const initial = person.name.slice(0, 1);
  const isNeedsYou = openThreadsCount > 0;
  const isQuiet = daysSinceLast > 14;

  return (
    <Link href={`/people/${person.personId}/manual`} className="pc">
      <div className="photo">
        <span className={`tag ${isNeedsYou ? 'ember' : ''}`}>
          {isNeedsYou ? 'Needs you' : isQuiet ? 'Quiet' : relationTagFor(person)}
        </span>
        {openThreadsCount > 0 && (
          <span className="open-pip">{openThreadsCount} open</span>
        )}
        <span className="photo-initial" aria-hidden="true">{initial}</span>
      </div>
      <div className="body">
        <span className="name">{person.name}</span>
        <span className="meta">{relationLabel(person)}</span>
        {entriesCount > 0 ? (
          <p className="last">
            <em>{entriesCount} entries.</em>
            <span className="when">
              {formatDaysShort(daysSinceLast)} since last
            </span>
          </p>
        ) : (
          <p className="last">
            <em>Not yet written about.</em>
            <span className="when">Start a first line</span>
          </p>
        )}
      </div>
    </Link>
  );
}

/* ════════════════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════════════════ */

interface PersonMetric {
  person: Person;
  entriesCount: number;
  openThreadsCount: number;
  daysSinceLast: number;
}

function computePersonMetrics(
  people: Person[],
  entries: JournalEntry[],
): PersonMetric[] {
  const now = new Date();
  return people
    .filter((p) => !p.archived)
    .map((person) => {
      const mentions = entries.filter((e) =>
        entryMentionsPerson(e, person.personId),
      );
      const lastEntryDate =
        mentions
          .map((e) => e.createdAt?.toDate?.())
          .filter((d): d is Date => Boolean(d))
          .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
      const daysSinceLast = lastEntryDate
        ? Math.floor((now.getTime() - lastEntryDate.getTime()) / 86_400_000)
        : 9999;
      // Open threads heuristic: a person's "open" count approximates
      // entries that mention them and haven't been carried forward
      // (reflected on) yet. Real hook integration can tighten later.
      const openThreadsCount = mentions.filter((e) => !e.respondsToEntryId)
        .length > 3
        ? Math.min(
            mentions.filter((e) => !e.respondsToEntryId).length - 3,
            6,
          )
        : 0;
      return {
        person,
        entriesCount: mentions.length,
        openThreadsCount,
        daysSinceLast,
      };
    });
}

function byGroup(
  group: 'household' | 'parents' | 'kept_close',
): (m: PersonMetric) => boolean {
  return (m) => {
    const t = m.person.relationshipType;
    if (group === 'household') return t === 'spouse' || t === 'child';
    if (group === 'parents') return t === 'elderly_parent' || t === 'sibling';
    if (group === 'kept_close')
      return t === 'friend' || t === 'professional' || t === 'other';
    return false;
  };
}

function relationLabel(p: Person): string {
  const age = p.dateOfBirth ? computeAge(p.dateOfBirth) : null;
  switch (p.relationshipType) {
    case 'self':
      return 'You';
    case 'spouse':
      return age != null ? `Partner · ${age}` : 'Partner';
    case 'child':
      return age != null ? `Child · ${age}` : 'Child';
    case 'elderly_parent':
      return age != null ? `Parent · ${age}` : 'Parent';
    case 'sibling':
      return age != null ? `Sibling · ${age}` : 'Sibling';
    case 'friend':
      return 'Friend';
    case 'professional':
      return 'Professional';
    default:
      return 'Of the family';
  }
}

function relationTagFor(p: Person): string {
  const t = p.relationshipType;
  if (t === 'spouse' || t === 'child') return 'Household';
  if (t === 'elderly_parent' || t === 'sibling') return 'Family';
  if (t === 'friend') return 'Friend';
  return 'Other';
}

function shortRelation(t?: RelationshipType): string {
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
    default:
      return '';
  }
}

// "Ella, 18 days ago" — the terse elapsed phrase you'd drop into
// a masthead cell or a stat. Uses natural plurals; avoids
// "1 weeks ago".
function formatDays(days: number): string {
  if (days >= 9999) return 'never';
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'a week ago';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return 'a month ago';
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return 'over a year ago';
}

// "You haven't written about Ella in a week." — the prepositional
// form used inside the lede sentence. "In" reads better than "for"
// here and avoids the "since yesterday" awkwardness.
function formatDaysInsideSentence(days: number): string {
  if (days >= 9999) return 'yet';
  if (days === 0) return 'today';
  if (days === 1) return 'since yesterday';
  if (days < 7) return `in ${days} days`;
  if (days < 14) return 'in over a week';
  if (days < 30) return `in ${Math.floor(days / 7)} weeks`;
  if (days < 60) return 'in over a month';
  if (days < 365) return `in ${Math.floor(days / 30)} months`;
  return 'in over a year';
}

function formatDaysShort(days: number): string {
  if (days >= 9999) return '—';
  if (days < 1) return 'today';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

function formatToday(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function quietHeadline(days: number): string {
  if (days >= 9999) return 'A new page to start.';
  if (days <= 3) return 'Recently here.';
  if (days < 7) return 'A few days quiet.';
  if (days < 11) return 'A week is a while.';
  if (days < 14) return 'A week and a half is a while.';
  if (days < 21) return 'Two weeks is a while.';
  if (days < 28) return 'Three weeks is a while.';
  if (days < 45) return 'A month is a while.';
  if (days < 80) return 'Over a month now.';
  if (days < 365) return `${Math.floor(days / 30)} months is a while.`;
  return 'A year is a long quiet.';
}

function spellCount(n: number): string {
  const names = [
    'no', 'one', 'two', 'three', 'four', 'five',
    'six', 'seven', 'eight', 'nine', 'ten',
  ];
  return n >= 0 && n <= 10 ? names[n] : String(n);
}

function filterLabel(
  k: 'all' | 'open' | 'quiet' | 'recent',
  roster: PersonMetric[],
  openCount: number,
): string {
  if (k === 'all') return `All · ${roster.length}`;
  if (k === 'open') return `Waiting · ${openCount}`;
  if (k === 'quiet') return 'Quiet longest';
  if (k === 'recent') return 'Written recently';
  return k;
}

function openPen() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('relish:pen:open'));
}

/* ════════════════════════════════════════════════════════════════
   Next-steps computation — prioritized actions across the family.
   Lives here (not in a shared lib) because the priority logic is
   specific to the Family Summary render. If a second caller ever
   needs the same list, extract to src/lib/next-steps.ts at that
   point — per YAGNI.
   ════════════════════════════════════════════════════════════════ */

export type NextStepKind =
  | 'reply_debt'
  | 'missing_self_portrait'
  | 'uninvited_adult'
  | 'long_silence'
  | 'incomplete_self';

export interface NextStep {
  kind: NextStepKind;
  label: string;       // one-line italic sentence
  href: string;        // where the CTA lands
  priority: number;    // lower = higher priority (for sort)
}

function computeNextSteps({
  people,
  entries,
  contributions,
  currentUserId,
}: {
  people: Person[];
  entries: JournalEntry[];
  contributions: Contribution[];
  currentUserId?: string;
}): NextStep[] {
  if (!currentUserId) return [];
  const steps: NextStep[] = [];
  const active = people.filter((p) => !p.archived);
  const selfPerson = active.find(
    (p) => p.linkedUserId === currentUserId && p.relationshipType === 'self',
  );

  // 1) Reply debt — entries authored by someone else that mention a
  // family member and haven't been responded to. We count the first
  // three as individual items; more collapse into a single summary.
  const replyCandidates = entries
    .filter((e) => {
      if (e.authorId === currentUserId) return false;
      if (e.respondsToEntryId) return false;
      if (e.category === 'reflection') return false;
      return true;
    })
    .sort((a, b) => {
      const am = a.createdAt?.toMillis?.() ?? 0;
      const bm = b.createdAt?.toMillis?.() ?? 0;
      return bm - am;
    });
  for (const e of replyCandidates.slice(0, 3)) {
    const author = active.find((p) => p.linkedUserId === e.authorId);
    const aboutPerson =
      (e.personMentions ?? [])
        .map((pid) => active.find((p) => p.personId === pid))
        .find(Boolean) ?? null;
    const authorFirst = author?.name.split(' ')[0] ?? 'Someone';
    const aboutFirst = aboutPerson?.name.split(' ')[0];
    const label = aboutFirst
      ? `Reply to ${authorFirst}'s note about ${aboutFirst}.`
      : `Reply to ${authorFirst}'s note.`;
    steps.push({
      kind: 'reply_debt',
      label,
      href: `/journal/${e.entryId}`,
      priority: 1,
    });
  }

  // 2) Missing self-portrait for invited contributors — linkedUserId
  // exists (they have an account) but no complete self contribution.
  for (const p of active) {
    if (!p.linkedUserId) continue;
    if (p.linkedUserId === currentUserId) continue; // handled in (5)
    const hasSelf = contributions.some(
      (c) =>
        c.contributorId === p.linkedUserId &&
        c.personId === p.personId &&
        c.perspectiveType === 'self' &&
        c.status === 'complete',
    );
    if (hasSelf) continue;
    const first = p.name.split(' ')[0];
    steps.push({
      kind: 'missing_self_portrait',
      label: `${first} hasn't added their own view yet.`,
      href: `/people/${p.personId}`,
      priority: 2,
    });
  }

  // 3) Uninvited adult family members — canSelfContribute but no
  // account linked, so they've never been invited to write.
  for (const p of active) {
    if (p.linkedUserId) continue;
    if (!p.canSelfContribute) continue;
    if (p.relationshipType === 'child') continue; // kids use a different flow
    const first = p.name.split(' ')[0];
    steps.push({
      kind: 'uninvited_adult',
      label: `Invite ${first} to write their side.`,
      href: `/people/${p.personId}`,
      priority: 3,
    });
  }

  // 4) Long silences — someone with at least one mention that has no
  // activity in >30 days. Only flag the top 2 (noise reduction).
  const longSilenceCandidates: Array<{ p: Person; days: number }> = [];
  for (const p of active) {
    if (p.relationshipType === 'self') continue;
    const mentions = entries
      .filter((e) => entryMentionsPerson(e, p.personId))
      .sort((a, b) => {
        const am = a.createdAt?.toMillis?.() ?? 0;
        const bm = b.createdAt?.toMillis?.() ?? 0;
        return bm - am;
      });
    if (mentions.length === 0) continue;
    const lastMs = mentions[0].createdAt?.toMillis?.() ?? 0;
    const days = Math.floor((Date.now() - lastMs) / 86_400_000);
    if (days > 30) longSilenceCandidates.push({ p, days });
  }
  longSilenceCandidates.sort((a, b) => b.days - a.days);
  for (const { p, days } of longSilenceCandidates.slice(0, 2)) {
    const first = p.name.split(' ')[0];
    const span = days >= 60 ? `${Math.floor(days / 30)} months` : `${Math.floor(days / 7)} weeks`;
    steps.push({
      kind: 'long_silence',
      label: `You haven't written about ${first} in ${span}.`,
      href: `/people/${p.personId}`,
      priority: 4,
    });
  }

  // 5) Incomplete self-portrait for the current user.
  if (selfPerson) {
    const hasOwnSelf = contributions.some(
      (c) =>
        c.contributorId === currentUserId &&
        c.personId === selfPerson.personId &&
        c.perspectiveType === 'self' &&
        c.status === 'complete',
    );
    if (!hasOwnSelf) {
      steps.push({
        kind: 'incomplete_self',
        label: 'Continue your own page.',
        href: `/people/${selfPerson.personId}/manual/self-onboard`,
        priority: 5,
      });
    }
  }

  // Sort by priority, cap at 5.
  return steps.sort((a, b) => a.priority - b.priority).slice(0, 5);
}

/* ════════════════════════════════════════════════════════════════
   Inline styles for the hero pills
   ════════════════════════════════════════════════════════════════ */

const heroPillDarkStyle: React.CSSProperties = {
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

const heroPillStyle: React.CSSProperties = {
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


const styles = `
  .mn-app { min-height: 100vh; background: var(--r-cream); }
  .mn-page {
    max-width: 1440px;
    margin: 0 auto;
    padding: 104px 40px 40px;
  }

  /* PAGE TITLE — newspaper headline: "{Family}'s Family Summary". */
  .fs-title-block {
    margin: 0 0 32px;
    padding: 0 0 20px;
    border-bottom: 1px solid var(--r-rule-5);
  }
  .fs-title {
    font-family: var(--r-serif);
    font-style: normal;
    font-weight: 400;
    font-size: 72px;
    line-height: 1.02;
    letter-spacing: -0.025em;
    color: var(--r-ink);
    margin: 0;
  }
  .fs-title em { font-style: italic; }
  .fs-title-dash {
    color: var(--r-text-4);
    font-style: normal;
    margin: 0 0.1em;
  }

  /* MASTHEAD */
  .manual-masthead { margin: 0; }
  .masthead-strip {
    background: var(--r-paper);
    border: 1px solid var(--r-rule-4);
    padding: 24px 32px;
    display: grid;
    grid-template-columns: minmax(260px, 1.6fr) auto 1fr auto 1fr auto 1fr;
    gap: 0;
    align-items: start;
    border-radius: 2px;
  }
  .masthead-cell:not(.mh-complete-cell) { padding-top: 6px; }
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

  /* SPREAD */
  .spread {
    display: grid;
    grid-template-columns: 1.1fr 1px 1fr;
    gap: 48px;
    margin-top: 48px;
    padding-bottom: 56px;
  }
  .spread-rule { background: var(--r-rule-5); align-self: stretch; }
  .hero-portrait-wrap { position: relative; }
  .hero-portrait {
    width: 100%;
    aspect-ratio: 4 / 5;
    border-radius: 3px;
    overflow: hidden;
    position: relative;
    background-color: var(--r-cream-warm);
    background-image:
      linear-gradient(180deg, rgba(20,16,12,0) 50%, rgba(20,16,12,0.45) 100%),
      radial-gradient(ellipse at 60% 30%, rgba(201,134,76,0.14), transparent 60%),
      radial-gradient(ellipse at 30% 80%, rgba(124,144,130,0.10), transparent 65%);
  }
  .hero-portrait-plate {
    position: absolute;
    left: 24px;
    bottom: 20px;
    right: 24px;
    color: var(--r-paper);
    z-index: 2;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
  }
  .hero-portrait-plate .name {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 32px;
    letter-spacing: -0.01em;
    line-height: 1;
  }
  .hero-portrait-plate .rel {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    opacity: 0.82;
  }
  .hero-text { padding-top: 12px; display: flex; flex-direction: column; gap: 28px; }
  .hero-dateline { display: flex; align-items: center; gap: 14px; }
  .hero-dateline .dot { width: 5px; height: 5px; border-radius: 50%; background: var(--r-ember); }
  .hero-dateline .text {
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-3);
  }
  .hero-h1 {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 300;
    font-size: clamp(44px, 5.2vw, 78px);
    line-height: 0.98;
    letter-spacing: -0.022em;
    color: var(--r-ink);
    margin: 0;
  }
  .hero-lede {
    font-family: var(--r-serif);
    font-weight: 400;
    font-size: 21px;
    line-height: 1.5;
    color: var(--r-text-2);
    margin: 0;
    max-width: 40ch;
  }
  .hero-lede em { font-style: italic; color: var(--r-ink); }
  .hero-stats {
    display: grid;
    grid-template-columns: repeat(3, auto);
    gap: 32px;
    padding: 18px 0 0;
    border-top: 1px solid var(--r-rule-5);
    max-width: 420px;
  }
  .hero-stat .num {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 32px;
    color: var(--r-ink);
    line-height: 1;
    letter-spacing: -0.01em;
  }
  .hero-stat .lbl {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--r-text-5);
    margin-top: 8px;
  }
  .hero-ctas { display: flex; gap: 10px; flex-wrap: wrap; }

  /* CONSTELLATION */
  .constellation-section { padding: 56px 0 40px; border-top: 1px solid var(--r-rule-4); }
  .constellation-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 28px;
    gap: 24px;
    flex-wrap: wrap;
  }
  .h2-serif {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 300;
    font-size: 44px;
    color: var(--r-ink);
    margin: 0;
    letter-spacing: -0.015em;
    line-height: 1;
  }
  .h2-serif em { font-style: italic; }
  .constellation-head .sub {
    font-family: var(--r-serif);
    font-size: 17px;
    color: var(--r-text-3);
    margin: 0;
    max-width: 44ch;
  }
  .constellation {
    position: relative;
    height: 520px;
    background: var(--r-paper);
    border: 1px solid var(--r-rule-5);
    border-radius: 3px;
    overflow: hidden;
  }
  .constellation svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .node {
    position: absolute;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
    text-decoration: none;
    color: inherit;
  }
  .node .dot {
    background: var(--r-paper);
    border: 1px solid var(--r-rule-3);
    border-radius: 50%;
    transition: transform 160ms var(--r-ease-ink), box-shadow 160ms var(--r-ease-ink);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--r-serif);
    font-style: italic;
    color: var(--r-ink);
  }
  .node:hover .dot {
    transform: scale(1.06);
    box-shadow: 0 1px 2px rgba(60,50,40,0.04), 0 6px 18px rgba(60,50,40,0.05);
  }
  .node .label {
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 15px;
    color: var(--r-ink);
    line-height: 1.1;
    letter-spacing: -0.005em;
  }
  .node .label .sub {
    display: block;
    font-family: var(--r-sans);
    font-style: normal;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--r-text-5);
    margin-top: 3px;
  }
  .node.you .dot {
    background: var(--r-leather);
    color: var(--r-paper);
    border-color: var(--r-leather);
    box-shadow: 0 0 0 4px var(--r-tint-ember);
  }
  .node.you .label { font-weight: 500; }
  .node .pip {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--r-ember);
    border: 2px solid var(--r-paper);
  }
  .node.attention .label { color: var(--r-ember); font-weight: 500; }
  .constellation-legend {
    position: absolute;
    left: 24px;
    bottom: 20px;
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--r-text-4);
  }
  .constellation-legend span { display: inline-flex; align-items: center; gap: 6px; }
  .constellation-legend .swatch {
    width: 10px; height: 10px; border-radius: 50%;
    border: 2px solid var(--r-paper);
    box-shadow: 0 0 0 1px var(--r-rule-3);
  }
  .constellation-legend .swatch.ember { background: var(--r-ember); box-shadow: 0 0 0 1px var(--r-ember); }
  .constellation-legend .swatch.line {
    width: 18px; height: 1px; border-radius: 0;
    background: var(--r-rule-2); box-shadow: none; border: none;
  }
  .constellation-legend .swatch.line-weak {
    width: 18px; height: 1px; border-radius: 0;
    background: transparent; box-shadow: none; border: none;
    border-top: 1px dashed var(--r-rule-3);
  }

  /* GROUPS */
  .groups {
    padding: 56px 0;
    border-top: 1px solid var(--r-rule-4);
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
  .group {
    background: var(--r-paper);
    border: 1px solid var(--r-rule-5);
    border-radius: 3px;
    padding: 28px 26px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    transition: box-shadow 180ms var(--r-ease-ink);
  }
  .group:hover { box-shadow: 0 1px 2px rgba(60,50,40,0.04), 0 6px 18px rgba(60,50,40,0.05); }
  .group-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .group-head .eyebrow {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--r-text-4);
  }
  .group-head .count {
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 15px;
    color: var(--r-text-5);
  }
  .group h3 {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 300;
    font-size: 32px;
    line-height: 1;
    letter-spacing: -0.015em;
    color: var(--r-ink);
    margin: 0;
  }
  .group h3 em { font-style: italic; }
  .group p {
    font-family: var(--r-serif);
    font-size: 15.5px;
    line-height: 1.5;
    color: var(--r-text-3);
    margin: 0;
  }
  .group-rows { display: flex; flex-direction: column; }
  .group-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-top: 1px solid var(--r-rule-5);
    text-decoration: none;
    color: inherit;
  }
  .group-row:first-child { border-top: none; }
  .group-row .avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    flex: none;
    background: var(--r-cream-warm);
    border: 1px solid var(--r-rule-5);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 16px;
    color: var(--r-ink);
  }
  .group-row .who {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .group-row .who .name {
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 18px;
    color: var(--r-ink);
    line-height: 1.1;
  }
  .group-row .who .when {
    font-family: var(--r-sans);
    font-size: 11px;
    color: var(--r-text-5);
    letter-spacing: 0.04em;
  }
  .group-row .open {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--r-ember);
  }
  .group-row .quiet {
    font-family: var(--r-sans);
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--r-text-5);
  }

  /* ═══ COMPLETENESS CELL (hero in masthead) ═══
     Horizontal-bar layout. Eyebrow ("OVERALL") → big italic-serif
     percent → three Coverage/Freshness/Depth bars → sub-line.
     Ring chart retired — bars do the work. */
  .mh-complete-cell {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 0;
  }
  .mh-complete-overall {
    display: inline-flex;
    align-items: baseline;
    gap: 1px;
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 44px;
    color: var(--r-ink);
    letter-spacing: -0.02em;
    line-height: 1;
    margin: 2px 0 6px;
  }
  .mh-complete-overall em { font-style: italic; }
  .mh-complete-overall-mark {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 300;
    font-size: 22px;
    color: var(--r-text-4);
    letter-spacing: -0.02em;
  }

  .mh-complete-dims {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    max-width: 220px;
  }
  .mh-complete-dim-row {
    display: grid;
    grid-template-columns: 72px 1fr;
    column-gap: 10px;
    align-items: center;
    line-height: 1.15;
  }
  .mh-complete-dim {
    font-family: var(--r-sans);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-4);
    line-height: 1.2;
    white-space: nowrap;
  }
  .mh-complete-bar {
    display: block;
    height: 6px;
    background: rgba(60,48,28,0.08);
    border-radius: 2px;
    overflow: hidden;
  }
  .mh-complete-bar-fill {
    display: block;
    height: 100%;
    border-radius: 2px;
  }
  .mh-complete-sub {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 300;
    font-size: 13px;
    color: var(--r-text-4);
    letter-spacing: -0.003em;
    line-height: 1;
  }

  /* ═══ NEXT STEPS ═══ — prioritized family-wide actions. Compact
     numbered list in editorial voice. */
  .next-steps-section {
    padding: 48px 0 8px;
  }
  .next-steps-head { margin-bottom: 20px; }
  .next-steps-head .ns-eyebrow {
    display: block;
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--r-text-4);
    margin-bottom: 10px;
  }
  .next-steps-head .h2-serif {
    font-family: var(--r-serif);
    font-weight: 300;
    font-size: clamp(26px, 2.6vw, 32px);
    line-height: 1.1;
    letter-spacing: -0.015em;
    color: var(--r-ink);
    margin: 0;
  }
  .next-steps-head .h2-serif em { font-style: italic; }
  .next-steps-list {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--r-rule-5);
  }
  .next-steps-list li {
    border-bottom: 1px solid var(--r-rule-5);
  }
  .next-steps-list .ns-item {
    display: grid;
    grid-template-columns: 40px 1fr 20px;
    gap: 18px;
    align-items: baseline;
    padding: 16px 4px;
    text-decoration: none;
    color: inherit;
    transition: padding-left 160ms var(--r-ease-ink), background 120ms var(--r-ease-ink);
  }
  .next-steps-list .ns-item:hover {
    padding-left: 10px;
    background: rgba(124,144,130,0.04);
  }
  .next-steps-list .ns-num {
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 18px;
    color: var(--r-text-5);
    line-height: 1;
    letter-spacing: -0.01em;
  }
  .next-steps-list .ns-label {
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 18px;
    line-height: 1.4;
    color: var(--r-ink);
  }
  .next-steps-list .ns-arrow {
    font-family: var(--r-serif);
    font-size: 14px;
    color: var(--r-text-4);
    text-align: right;
  }
  .next-steps-list .ns-item:hover .ns-arrow { color: var(--r-ink); }

  /* PORTRAITS — per-person coverage */
  .portraits-section {
    padding: 56px 0 8px;
    border-top: 1px solid var(--r-rule-4);
  }
  .portraits-head { margin-bottom: 20px; }
  .portraits-head .h2-serif {
    font-family: var(--r-serif);
    font-weight: 300;
    font-size: clamp(28px, 3vw, 36px);
    line-height: 1.1;
    color: var(--r-ink);
    letter-spacing: -0.015em;
    margin: 0 0 6px;
  }
  .portraits-head .h2-serif em { font-style: italic; }
  .portraits-head .sub {
    font-family: var(--r-sans);
    font-size: 13px;
    color: var(--r-text-3);
  }

  /* ROSTER */
  .roster-section { padding: 56px 0 0; border-top: 1px solid var(--r-rule-4); }
  .roster-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
    margin-bottom: 28px;
  }
  .roster-filters { display: flex; gap: 6px; flex-wrap: wrap; }
  .rf {
    all: unset;
    cursor: pointer;
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--r-text-4);
    padding: 8px 14px;
    border: 1px solid var(--r-rule-4);
    border-radius: 999px;
    transition: all 140ms var(--r-ease-ink);
  }
  .rf:hover { color: var(--r-ink); border-color: var(--r-rule-3); }
  .rf.on {
    background: var(--r-leather);
    color: var(--r-paper);
    border-color: var(--r-leather);
  }
  .roster {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }
  .pc {
    background: var(--r-paper);
    border: 1px solid var(--r-rule-5);
    border-radius: 3px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: transform 180ms var(--r-ease-ink), box-shadow 180ms var(--r-ease-ink);
    text-decoration: none;
    color: inherit;
  }
  .pc:hover {
    transform: translateY(-2px);
    box-shadow: 0 1px 2px rgba(60,50,40,0.04), 0 6px 18px rgba(60,50,40,0.05);
  }
  .pc .photo {
    aspect-ratio: 5 / 4;
    background: var(--r-cream-warm);
    background-image:
      radial-gradient(ellipse at 65% 40%, rgba(201,134,76,0.12), transparent 60%),
      radial-gradient(ellipse at 25% 75%, rgba(124,144,130,0.08), transparent 65%);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pc .photo::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(20,16,12,0) 55%, rgba(20,16,12,0.12) 100%);
  }
  .pc .photo-initial {
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 56px;
    color: var(--r-rule-2);
  }
  .pc .photo .tag {
    position: absolute;
    top: 14px;
    left: 14px;
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    background: var(--r-paper);
    color: var(--r-text-3);
    padding: 5px 10px;
    border-radius: 999px;
    z-index: 2;
  }
  .pc .photo .tag.ember { color: var(--r-ember); }
  .pc .photo .open-pip {
    position: absolute;
    top: 14px;
    right: 14px;
    background: var(--r-ember);
    color: var(--r-paper);
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 4px 9px;
    border-radius: 999px;
    z-index: 2;
  }
  .pc .body {
    padding: 16px 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }
  .pc .name {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 26px;
    line-height: 1.05;
    letter-spacing: -0.01em;
    color: var(--r-ink);
  }
  .pc .meta {
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--r-text-5);
  }
  .pc .last {
    margin: 10px 0 0;
    padding-top: 12px;
    border-top: 1px solid var(--r-rule-5);
    font-family: var(--r-serif);
    font-size: 14.5px;
    line-height: 1.45;
    color: var(--r-text-3);
  }
  .pc .last em { font-style: italic; color: var(--r-ink); }
  .pc .last .when {
    display: block;
    font-family: var(--r-sans);
    font-style: normal;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--r-text-5);
    margin-top: 8px;
  }

  .add-person {
    border: 1px dashed var(--r-rule-3);
    background: transparent;
    border-radius: 3px;
    min-height: 320px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    text-align: center;
    padding: 24px;
    transition: all 180ms var(--r-ease-ink);
    text-decoration: none;
    color: inherit;
  }
  .add-person:hover { background: var(--r-paper); border-color: var(--r-rule-2); }
  .add-person .cross {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 300;
    font-size: 40px;
    color: var(--r-rule-2);
    line-height: 1;
  }
  .add-person .lbl {
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 19px;
    color: var(--r-text-3);
  }
  .add-person .hint {
    font-family: var(--r-sans);
    font-size: 11px;
    color: var(--r-text-5);
    letter-spacing: 0.04em;
    max-width: 22ch;
    line-height: 1.5;
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
    .spread { grid-template-columns: 1fr; gap: 0; }
    .spread-rule { display: none; }
    .groups { grid-template-columns: 1fr; }
    .roster { grid-template-columns: repeat(2, 1fr); }
    .masthead-strip { grid-template-columns: 1fr 1fr; gap: 16px 24px; }
    .masthead-divider { display: none; }
    .mh-complete-cell { grid-column: 1 / -1; }
    .fs-title { font-size: 52px; }
  }
  @media (max-width: 640px) {
    .mn-page { padding: 88px 20px 40px; }
    .roster { grid-template-columns: 1fr; }
    .masthead-strip { grid-template-columns: 1fr; }
    .fs-title { font-size: 40px; line-height: 1.08; }
    .mh-complete-center { font-size: 26px; }
  }

  /* ═══ FIRST-RUN STATE (family of one) ═══ */
  .mn-page.first-run {
    max-width: 1040px;
    margin: 0 auto;
    padding: 120px 40px 80px;
  }
  .fr-head { text-align: center; max-width: 640px; margin: 0 auto 48px; }
  .fr-eyebrow {
    display: block;
    font-family: var(--font-parent-body);
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #7A6E5C;
    margin-bottom: 10px;
  }
  .fr-title {
    font-family: var(--font-parent-display);
    font-style: italic;
    font-weight: 400;
    font-size: clamp(36px, 5vw, 52px);
    line-height: 1.08;
    color: #3A3530;
    margin: 0 0 14px;
  }
  .fr-sub {
    font-family: var(--font-parent-body);
    font-size: 16px;
    line-height: 1.6;
    color: #5A5247;
    margin: 0 auto;
    max-width: 480px;
  }
  .fr-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    max-width: 760px;
    margin: 0 auto;
  }
  .fr-card {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    min-height: 260px;
    padding: 28px 28px 32px;
    background: #FDFBF6;
    border: 1px solid rgba(200,190,172,0.55);
    border-radius: 4px;
    text-decoration: none;
    color: inherit;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.8) inset,
      0 1px 2px rgba(60, 48, 28, 0.04),
      0 6px 24px rgba(60, 48, 28, 0.06);
  }
  .fr-card:hover {
    transform: translateY(-2px);
    border-color: rgba(124,144,130,0.55);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.8) inset,
      0 2px 3px rgba(60, 48, 28, 0.05),
      0 12px 32px rgba(60, 48, 28, 0.10);
  }
  .fr-card-eyebrow {
    font-family: var(--font-parent-body);
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #7A6E5C;
    margin-bottom: 6px;
  }
  .fr-card-title {
    font-family: var(--font-parent-display);
    font-style: italic;
    font-size: 28px;
    line-height: 1.1;
    color: #3A3530;
    margin: 0 0 10px;
  }
  .fr-card-hint {
    font-family: var(--font-parent-body);
    font-size: 14px;
    color: #6B6254;
    line-height: 1.5;
  }
  .fr-add {
    border-style: dashed;
    background: transparent;
    align-items: flex-start;
  }
  .fr-cross {
    font-family: var(--font-parent-display);
    font-size: 40px;
    line-height: 1;
    color: #7C9082;
    margin-bottom: 12px;
  }
  @media (max-width: 640px) {
    .fr-grid { grid-template-columns: 1fr; }
    .fr-card { min-height: 180px; }
  }

`;
