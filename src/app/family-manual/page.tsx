'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/hooks/useDashboard';
import { useFreshness } from '@/hooks/useFreshness';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';
import Link from 'next/link';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type { PersonCompleteness } from '@/lib/freshness-engine';
import type { Person } from '@/types/person-manual';

// ================================================================
// Roman numeral helpers
// ================================================================
function toRoman(n: number): string {
  if (n < 1) return '';
  const map: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let result = '';
  let num = n;
  for (const [value, numeral] of map) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
}

function spellDays(n: number): string {
  if (n === 0) return 'today';
  if (n === 1) return 'yesterday';
  return `${n} days ago`;
}

function spellCount(n: number): string {
  return String(n);
}

// Health descriptors — editorial prose, not clinical
const HEALTH_PROSE: Record<string, string> = {
  complete: 'steady',
  partial: 'in the writing',
  empty: 'awaiting its first page',
  stale: 'awaiting a fresh entry',
};
const HEALTH_COLOR: Record<string, string> = {
  complete: '#7C9082',
  partial: '#C4A265',
  empty: '#C9BBA8',
  stale: '#C08070',
};

// ================================================================
// Main page
// ================================================================
export default function FamilyManualPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { state, people, manuals, contributions } = useDashboard();
  const { familyCompleteness } = useFreshness({ people, manuals, contributions });

  const [synthesizing, setSynthesizing] = useState(false);
  const [syntheseDone, setSyntheseDone] = useState(false);

  const handleResynthesize = async () => {
    if (synthesizing) return;
    setSynthesizing(true);
    setSyntheseDone(false);
    try {
      const synthesizeFamilyManuals = httpsCallable(functions, 'synthesizeFamilyManuals');
      await synthesizeFamilyManuals({});
      setSyntheseDone(true);
      setTimeout(() => setSyntheseDone(false), 6000);
    } catch (err) {
      console.error('Family synthesis failed:', err);
    } finally {
      setSynthesizing(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  // Build insights from synthesis data — as marginalia
  const insights = useMemo(() => {
    const items: Array<{ id: string; text: string; type: 'gap' | 'stale' | 'strength'; route?: string }> = [];
    for (const manual of manuals) {
      const gaps = manual.synthesizedContent?.gaps?.filter((g) => g.gapSeverity === 'significant_gap');
      if (gaps && gaps.length > 0) {
        items.push({
          id: `gap-${manual.manualId}`,
          text: `On ${manual.personName}: perspectives differ on "${gaps[0].topic.toLowerCase()}"`,
          type: 'gap',
          route: `/people/${manual.personId}/manual`,
        });
      }
    }
    for (const manual of manuals) {
      const alignments = manual.synthesizedContent?.alignments;
      if (alignments && alignments.length > 0) {
        items.push({
          id: `strength-${manual.manualId}`,
          text: `Everyone agrees about ${alignments[0].topic.toLowerCase()}`,
          type: 'strength',
          route: `/people/${manual.personId}/manual`,
        });
      }
    }
    return items.slice(0, 3);
  }, [manuals]);

  // What's new — recent manual activity
  const whatsNew = useMemo(() => {
    const userId = user?.userId || '';
    const entries: Array<{ id: string; text: string; date: string; route?: string }> = [];

    contributions
      .filter((c) => c.contributorId !== userId && c.status === 'complete' && c.updatedAt)
      .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))
      .slice(0, 4)
      .forEach((c) => {
        const person = people.find((p) => p.personId === c.personId);
        const date = c.updatedAt?.toDate?.();
        entries.push({
          id: c.contributionId,
          text: `${c.contributorName?.split(' ')[0] || 'Someone'} added perspective${person ? ` on ${person.name}` : ''}`,
          date: date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase() : '',
          route: `/people/${c.personId}/manual`,
        });
      });

    manuals
      .filter((m) => m.synthesizedContent?.lastSynthesizedAt)
      .sort((a, b) =>
        (b.synthesizedContent?.lastSynthesizedAt?.toMillis() || 0) -
        (a.synthesizedContent?.lastSynthesizedAt?.toMillis() || 0),
      )
      .slice(0, 3)
      .forEach((m) => {
        const date = m.synthesizedContent?.lastSynthesizedAt?.toDate?.();
        entries.push({
          id: `synth-${m.manualId}`,
          text: `${m.personName}’s volume was resynthesized`,
          date: date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase() : '',
          route: `/people/${m.personId}/manual`,
        });
      });

    return entries.slice(0, 5);
  }, [contributions, people, manuals, user]);

  // Prepare volume data — one entry per person
  const volumes = useMemo(() => {
    const activePeople: Person[] = people.filter((p) => !p.archived);
    const completenessByPerson = new Map(
      familyCompleteness.perPerson.map((p) => [p.personId, p]),
    );

    return activePeople.map((person, idx) => {
      const manual = manuals.find((m) => m.personId === person.personId);
      const completeness = completenessByPerson.get(person.personId);
      const status = completeness?.status || 'empty';
      const lastUpdated = manual?.lastContributionAt?.toDate?.();
      const daysSince = lastUpdated
        ? Math.floor((Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Count "entries" — triggers + strategies + boundaries + patterns
      const entryCount =
        (manual?.triggers?.length || 0) +
        (manual?.whatWorks?.length || 0) +
        (manual?.whatDoesntWork?.length || 0) +
        (manual?.boundaries?.length || 0) +
        (manual?.emergingPatterns?.length || 0);

      const relationshipLabel = getRelationshipLabel(person);

      return {
        person,
        volumeNumber: toRoman(idx + 1),
        relationshipLabel,
        daysSince,
        entryCount,
        status,
        healthProse: HEALTH_PROSE[status] || 'unknown',
        healthColor: HEALTH_COLOR[status] || '#C9BBA8',
      };
    });
  }, [people, manuals, familyCompleteness]);

  if (authLoading || state === 'loading') {
    return (
      <div className="relish-page">
        <Navigation />
        <SideNav />
        <div className="pt-[64px]">
          <div className="press-loading">Opening the family manual&hellip;</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relish-page">
      <Navigation />
      <SideNav />

      <div className="pt-[64px] pb-24">
        <div className="relish-container">

          {/* The volume */}
          <div className="press-volume mt-8 relative overflow-hidden">

            {/* Masthead — the nameplate that anchors the volume */}
            <header className="press-masthead">
              <div className="press-masthead-rule" aria-hidden="true" />
              <h1 className="press-masthead-title">The Family Manual</h1>
              <div className="press-masthead-fleuron" aria-hidden="true">❦</div>
              <p className="press-masthead-meta">
                <span>A Shared Work</span>
                <span className="sep">·</span>
                <span>Kept by {(user.name || 'You').split(' ')[0]}</span>
              </p>
              <div className="press-masthead-rule" aria-hidden="true" />
            </header>

            {/* The two-page spread */}
            <div className="spread-container relative">
              <div className="press-gutter" aria-hidden="true" />

              {/* LEFT PAGE — The Atlas */}
              <div className="press-page-left" data-walkthrough="atlas" style={{ minHeight: 620 }}>
                <h2 className="press-display-md mb-1">The atlas</h2>
                <p
                  className="press-marginalia mb-6"
                  style={{ borderBottom: '1px solid rgba(200,190,172,0.5)', paddingBottom: 18 }}
                >
                  A map of the people under this roof, and the threads
                  between them.
                </p>

                {/* Constellation */}
                <ConstellationView people={familyCompleteness.perPerson} />

                {/* Insights as marginalia */}
                {insights.length > 0 && (
                  <div className="mt-6">
                    <span className="press-chapter-label mb-3 block">Of note</span>
                    <div>
                      {insights.map((insight) => (
                        <Link
                          key={insight.id}
                          href={insight.route || '#'}
                          className="block py-2.5 hover:opacity-70 transition-opacity"
                          style={{
                            borderBottom: '1px solid rgba(200,190,172,0.35)',
                            textDecoration: 'none',
                            color: 'inherit',
                          }}
                        >
                          <p
                            className="press-body-italic"
                            style={{ fontSize: 14, margin: 0 }}
                          >
                            {insightDash(insight.type)} {insight.text}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Folio */}
                <div
                  style={{
                    position: 'absolute',
                    left: 56,
                    bottom: 76,
                    pointerEvents: 'none',
                  }}
                  className="press-folio"
                >
                  3
                </div>
              </div>

              {/* RIGHT PAGE — The Volumes */}
              <div className="press-page-right" data-walkthrough="volumes" style={{ minHeight: 620 }}>
                <h2 className="press-display-md mb-1">The volumes</h2>
                <p
                  className="press-marginalia mb-6"
                  style={{ borderBottom: '1px solid rgba(200,190,172,0.5)', paddingBottom: 18 }}
                >
                  A separate volume for each person, kept open to its
                  most recent entry.
                </p>

                {volumes.length === 0 ? (
                  <div className="py-6">
                    <p className="press-body-italic">
                      No volumes yet. Begin by adding someone to the
                      family.
                    </p>
                    <div className="mt-6">
                      <Link href="/people" className="press-link">
                        Add the first person
                        <span className="arrow">⟶</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div>
                    {volumes.map((vol) => (
                      <Link
                        key={vol.person.personId}
                        href={`/people/${vol.person.personId}/manual`}
                        className="press-volume-entry"
                      >
                        <div className="press-volume-number">
                          Vol. {vol.volumeNumber}
                        </div>
                        <div>
                          <h3 className="press-volume-title">{vol.person.name}</h3>
                          <p className="press-volume-sub">
                            {vol.relationshipLabel}
                            {vol.daysSince !== null && (
                              <> &middot; updated {spellDays(vol.daysSince)}</>
                            )}
                          </p>
                          <p className="press-volume-stat">
                            {vol.entryCount > 0
                              ? <>{spellCount(vol.entryCount)} entries &middot; <em>{vol.healthProse}</em></>
                              : <em>{vol.healthProse}</em>}
                          </p>
                        </div>
                        <div
                          className="press-volume-health"
                          style={{ background: vol.healthColor }}
                        />
                      </Link>
                    ))}
                  </div>
                )}

                {/* Add a new volume — secondary action */}
                {volumes.length > 0 && (
                  <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(200,190,172,0.5)' }}>
                    <Link href="/people" className="press-link-sm" data-walkthrough="add-person">
                      Begin a new volume ⟶
                    </Link>
                  </div>
                )}

                {/* Folio */}
                <div
                  style={{
                    position: 'absolute',
                    right: 56,
                    bottom: 76,
                    pointerEvents: 'none',
                  }}
                  className="press-folio"
                >
                  4
                </div>
              </div>
            </div>

            {/* Bottom band — what's new */}
            {whatsNew.length > 0 && (
              <div className="press-count-band" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '24px 56px 28px' }}>
                <div
                  className="press-chapter-label mb-3"
                  style={{ textAlign: 'center' }}
                >
                  Since you were last here
                </div>
                <div
                  className="flex flex-wrap justify-center"
                  style={{ gap: '8px 22px' }}
                >
                  {whatsNew.map((entry) => (
                    <Link
                      key={entry.id}
                      href={entry.route || '#'}
                      className="press-marginalia hover:opacity-70 transition-opacity"
                      style={{ textDecoration: 'none', fontSize: 14 }}
                    >
                      <em>{entry.text}</em>
                      {entry.date && (
                        <span style={{ color: '#7A6E5C', marginLeft: 8 }}>
                          {entry.date}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Resynthesize — quiet italic link beneath the volume */}
          <div style={{ textAlign: 'center', paddingTop: 32 }}>
            <button
              onClick={handleResynthesize}
              disabled={synthesizing}
              className="press-link-sm"
              style={{
                background: 'transparent',
                cursor: synthesizing ? 'wait' : 'pointer',
                opacity: synthesizing ? 0.5 : 1,
              }}
            >
              {synthesizing
                ? 'Resynthesizing the manual…'
                : syntheseDone
                ? '✓ The manual has been resynthesized'
                : 'Resynthesize the manual ⟶'}
            </button>
            <p
              className="press-marginalia mt-2"
              style={{ fontSize: 14, color: '#7A6E5C' }}
            >
              Ask the AI to re-read every perspective and refresh each
              volume&rsquo;s synthesized overview.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Visual dash prefix by insight type
function insightDash(type: 'gap' | 'stale' | 'strength'): string {
  if (type === 'gap') return '—';
  if (type === 'strength') return '✦';
  return '·';
}

// Relationship label — editorial phrasing
function getRelationshipLabel(person: Person): string {
  const type = person.relationshipType;
  if (!type) return 'Of the family';
  const ageStr = person.age ? ` (age ${person.age})` : '';
  switch (type) {
    case 'self': return 'Self';
    case 'spouse': return `Partner${ageStr}`;
    case 'child': return `Child${ageStr}`;
    case 'elderly_parent': return `Parent${ageStr}`;
    case 'friend': return 'Friend';
    case 'professional': return 'Professional';
    case 'sibling': return `Sibling${ageStr}`;
    default: return 'Of the family';
  }
}

// ================================================================
// Constellation — kept from previous design, it works well
// ================================================================
const NODE_COLORS = ['#5C8064', '#4A7050', '#C09898', '#8888AD', '#6B9878'];
const RING_COLORS = ['#7C9082', '#6B8B72', '#C8A0A0', '#9898B8', '#7CA088'];

function ConstellationView({ people }: { people: PersonCompleteness[] }) {
  if (people.length === 0) return null;

  const positions = computePositions(people.length);
  const r = 30;

  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      lines.push({
        x1: positions[i].x, y1: positions[i].y,
        x2: positions[j].x, y2: positions[j].y,
      });
    }
  }

  return (
    <div className="relative" style={{ height: 300 }}>
      <svg
        viewBox="0 0 400 300"
        width="100%"
        height="300"
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* Connection lines */}
        {lines.map((line, i) => (
          <line
            key={`line-${i}`}
            x1={line.x1} y1={line.y1}
            x2={line.x2} y2={line.y2}
            stroke="#CEC6B8"
            strokeWidth={1}
          />
        ))}

        {/* Person nodes */}
        {people.map((person, i) => {
          const pos = positions[i];
          const fillColor = NODE_COLORS[i % NODE_COLORS.length];
          const ringColor = RING_COLORS[i % RING_COLORS.length];
          const isDashed = person.freshness === 'stale' || person.status === 'empty';
          const parts = person.name.trim().split(/\s+/);
          const initials = parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : person.name.slice(0, 2).toUpperCase();

          return (
            <g key={person.personId}>
              <circle
                cx={pos.x} cy={pos.y} r={r + 6}
                fill="none"
                stroke={ringColor}
                strokeWidth={2.5}
                strokeDasharray={isDashed ? '5 4' : 'none'}
                opacity={person.status === 'empty' ? 0.35 : 0.7}
              />
              <circle
                cx={pos.x} cy={pos.y} r={r + 2}
                fill="#F7F5F0"
                stroke="none"
              />
              <circle
                cx={pos.x} cy={pos.y} r={r}
                fill={fillColor}
                opacity={person.status === 'empty' ? 0.3 : 1}
              />
              <text
                x={pos.x} y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#FFFFFF"
                fontFamily="var(--font-parent-display)"
                fontSize="16"
                fontStyle="italic"
                fontWeight="400"
                letterSpacing="0.03em"
              >
                {initials}
              </text>
            </g>
          );
        })}
      </svg>

      {people.map((person, i) => {
        const pos = positions[i];
        return (
          <Link
            key={person.personId}
            href={`/people/${person.personId}/manual`}
            className="absolute rounded-full hover:opacity-85 transition-opacity"
            style={{
              left: pos.x - r - 6,
              top: pos.y - r - 6,
              width: (r + 6) * 2,
              height: (r + 6) * 2,
            }}
            aria-label={`View ${person.name}'s manual`}
          />
        );
      })}
    </div>
  );
}

interface Pos { x: number; y: number }

function computePositions(count: number): Pos[] {
  const cx = 200;

  if (count === 0) return [];
  if (count === 1) return [{ x: cx, y: 150 }];
  if (count === 2) return [{ x: cx, y: 70 }, { x: cx, y: 220 }];
  if (count === 3) return [
    { x: cx, y: 60 },
    { x: cx - 85, y: 190 },
    { x: cx + 85, y: 190 },
  ];
  if (count === 4) return [
    { x: cx, y: 50 },
    { x: cx - 100, y: 150 },
    { x: cx + 100, y: 150 },
    { x: cx, y: 240 },
  ];

  const positions: Pos[] = [{ x: cx, y: 50 }];
  const remaining = count - 1;
  const topRow = Math.ceil(remaining / 2);
  const bottomRow = remaining - topRow;

  for (let i = 0; i < topRow; i++) {
    const spread = 90;
    const offset = topRow > 1 ? (i / (topRow - 1) - 0.5) * spread * 2 : 0;
    positions.push({ x: cx + offset, y: 140 });
  }
  for (let i = 0; i < bottomRow; i++) {
    const spread = 75;
    const offset = bottomRow > 1 ? (i / (bottomRow - 1) - 0.5) * spread * 2 : 0;
    positions.push({ x: cx + offset, y: 230 });
  }

  return positions;
}
