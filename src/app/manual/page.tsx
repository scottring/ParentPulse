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
import { computeAge } from '@/utils/age';
import type { Person, RelationshipType } from '@/types/person-manual';
import type { JournalEntry } from '@/types/journal';

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

  if (loading || !user) return null;

  const totalKept = roster.length;
  const peopleWithOpenThreads = roster.filter((m) => m.openThreadsCount > 0).length;
  const totalOpenThreads = roster.reduce((sum, m) => sum + m.openThreadsCount, 0);
  const writtenThisWeek = roster.filter((m) => m.daysSinceLast <= 7).length;

  return (
    <main className="mn-app">
      <div className="mn-page">
        {/* ═══ MASTHEAD ═══ */}
        <section className="manual-masthead" aria-label="The Family Manual at a glance">
          <div className="masthead-strip">
            <div className="masthead-cell">
              <span className="masthead-eyebrow">The Manual</span>
              <span className="masthead-value big">
                {spellCount(totalKept)} kept
              </span>
            </div>
            <div className="masthead-divider" />
            <div className="masthead-cell align-c">
              <span className="masthead-eyebrow">Open threads</span>
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
              <span className="masthead-eyebrow">Quiet longest</span>
              <span className="masthead-value">
                {hero ? hero.person.name.split(' ')[0] : '—'}
                {hero && (
                  <span className="sub"> · {formatDays(hero.daysSinceLast)}</span>
                )}
              </span>
            </div>
          </div>
        </section>

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
                  <div className="lbl">Open threads</div>
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
        <section className="constellation-section" aria-label="Who you keep">
          <div className="constellation-head">
            <h2 className="h2-serif">The ones <em>you keep.</em></h2>
            <p className="sub">
              Closer means written about more often. An ember pip means
              someone&rsquo;s waiting.
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
            eyebrow="Kept close"
            title={<>Chosen <em>family.</em></>}
            description="Friends, mentors, the company you'd keep if you started over."
            members={metrics.filter(byGroup('kept_close'))}
          />
        </section>

        {/* ═══ ROSTER ═══ */}
        <section className="roster-section" aria-label="Full roster">
          <div className="roster-head">
            <h2 className="h2-serif">The <em>full index.</em></h2>
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
            <Link href="/settings#add-person" className="add-person">
              <span className="cross">+</span>
              <span className="lbl">Someone worth keeping</span>
              <span className="hint">
                Add a person to the book. They&rsquo;ll get their own page.
              </span>
            </Link>
          </div>
        </section>

        {/* ═══ COLOPHON ═══ */}
        <footer className="colophon">
          <span className="fleuron" aria-hidden="true">❦</span>
          <span>
            <em>The Family Manual</em> — {spellCount(totalKept)} kept,{' '}
            {totalOpenThreads} {totalOpenThreads === 1 ? 'thread' : 'threads'} open.
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
        <span><span className="swatch" />Kept</span>
        <span><span className="swatch ember" />Someone waiting</span>
        <span><span className="swatch line" />Close</span>
        <span><span className="swatch line-weak" />Further</span>
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
        (e.personMentions ?? []).includes(person.personId),
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
  if (t === 'friend') return 'Kept close';
  return 'Of the book';
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
  if (k === 'open') return `Has open threads · ${openCount}`;
  if (k === 'quiet') return 'Quiet longest';
  if (k === 'recent') return 'Written recently';
  return k;
}

function openPen() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('relish:pen:open'));
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

  /* MASTHEAD */
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
    .masthead-strip { grid-template-columns: 1fr 1fr; gap: 16px; }
    .masthead-divider { display: none; }
  }
  @media (max-width: 640px) {
    .mn-page { padding: 88px 20px 40px; }
    .roster { grid-template-columns: 1fr; }
    .masthead-strip { grid-template-columns: 1fr; }
  }
`;
