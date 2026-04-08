'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/hooks/useDashboard';
import { useGrowthFeed } from '@/hooks/useGrowthFeed';
import { useRingScores } from '@/hooks/useRingScores';
import { useWorkbook } from '@/hooks/useWorkbook';
import { useFreshness } from '@/hooks/useFreshness';
import { useActionItems } from '@/hooks/useActionItems';
import { computeOneThing } from '@/lib/one-thing-engine';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';
import Link from 'next/link';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type { GrowthArc } from '@/types/growth-arc';
import type { PersonCompleteness } from '@/lib/freshness-engine';

export default function FamilyManualPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const {
    state, selfPerson, hasSelfContribution, roles, assessments,
    people, manuals, contributions,
  } = useDashboard();
  const { health } = useRingScores(assessments);
  const { activeChapters } = useWorkbook();

  const { familyCompleteness } = useFreshness({ people, manuals, contributions });
  const { items: actionItems, dismiss: dismissAction } = useActionItems({
    people, manuals, contributions, assessments, userId: user?.userId || '',
  });

  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const todayItems = useMemo(() => roles.flatMap((r) => r.todayItems), [roles]);
  const activeArcs = useMemo(
    () => roles.map((r) => r.activeArc).filter((a): a is GrowthArc => a !== null),
    [roles],
  );

  const oneThing = useMemo(
    () => computeOneThing({
      state, userId: user?.userId || '',
      userName: selfPerson?.name?.split(' ')[0] || user?.name?.split(' ')[0] || 'there',
      selfPerson, people, manuals, contributions, assessments,
      roles, activeArcs, todayItems, hasSelfContribution,
    }),
    [state, user, selfPerson, people, manuals, contributions, assessments, roles, activeArcs, todayItems, hasSelfContribution],
  );

  // Build insight cards from synthesis data
  const insights = useMemo(() => {
    const items: Array<{ id: string; text: string; type: 'gap' | 'stale' | 'strength'; route?: string }> = [];
    for (const manual of manuals) {
      const gaps = manual.synthesizedContent?.gaps?.filter((g) => g.gapSeverity === 'significant_gap');
      if (gaps && gaps.length > 0) {
        items.push({
          id: `gap-${manual.manualId}`,
          text: `${manual.personName}: "${gaps[0].topic}" \u2014 perspectives diverge here.`,
          type: 'gap',
          route: `/people/${manual.personId}/manual`,
        });
      }
    }
    // Stale manuals
    for (const p of familyCompleteness.perPerson) {
      if (p.status === 'stale') {
        items.push({
          id: `stale-${p.personId}`,
          text: `${p.name}\u2019s manual hasn\u2019t been updated recently.`,
          type: 'stale',
          route: `/people/${p.personId}/manual`,
        });
      }
    }
    // Strengths from synthesis
    for (const manual of manuals) {
      const alignments = manual.synthesizedContent?.alignments;
      if (alignments && alignments.length > 0) {
        items.push({
          id: `strength-${manual.manualId}`,
          text: `Everyone agrees: ${alignments[0].topic.toLowerCase()}`,
          type: 'strength',
          route: `/people/${manual.personId}/manual`,
        });
      }
    }
    return items.slice(0, 3);
  }, [manuals, familyCompleteness]);

  // What's new — recent contributions from others
  const whatsNew = useMemo(() => {
    const userId = user?.userId || '';
    return contributions
      .filter((c) => c.contributorId !== userId && c.status === 'complete' && c.updatedAt)
      .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))
      .slice(0, 5)
      .map((c) => {
        const person = people.find((p) => p.personId === c.personId);
        const date = c.updatedAt?.toDate?.();
        return {
          id: c.contributionId,
          text: `${c.contributorName?.split(' ')[0]} shared perspective${person ? ` on ${person.name}` : ''}`,
          date: date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
          color: '#7C9082',
          route: `/people/${c.personId}/manual`,
        };
      });
  }, [contributions, people, user]);

  // Synthesis updates
  const synthUpdates = useMemo(() => {
    return manuals
      .filter((m) => m.synthesizedContent?.lastSynthesizedAt)
      .sort((a, b) =>
        (b.synthesizedContent?.lastSynthesizedAt?.toMillis() || 0) -
        (a.synthesizedContent?.lastSynthesizedAt?.toMillis() || 0)
      )
      .slice(0, 3)
      .map((m) => {
        const date = m.synthesizedContent?.lastSynthesizedAt?.toDate?.();
        return {
          id: `synth-${m.manualId}`,
          text: `${m.personName}\u2019s manual updated`,
          date: date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
          color: '#A09888',
          route: `/people/${m.personId}/manual`,
        };
      });
  }, [manuals]);

  const allWhatsNew = [...whatsNew, ...synthUpdates]
    .sort((a, b) => (a.date > b.date ? -1 : 1))
    .slice(0, 5);

  // Timeline entries
  const timelineEntries = useMemo(() => {
    const entries: Array<{ id: string; label: string; date: string; above: boolean; route?: string }> = [];
    for (const c of contributions) {
      if (c.status !== 'complete') continue;
      const ts = c.updatedAt?.toDate?.();
      if (!ts) continue;
      entries.push({
        id: `c-${c.contributionId}`,
        label: `${c.contributorName?.split(' ')[0]} added perspective on ${people.find((p) => p.personId === c.personId)?.name || '...'}`,
        date: ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        above: true,
        route: `/people/${c.personId}/manual`,
      });
    }
    for (const m of manuals) {
      const ts = m.synthesizedContent?.lastSynthesizedAt?.toDate?.();
      if (!ts) continue;
      entries.push({
        id: `s-${m.manualId}`,
        label: `${m.personName}\u2019s manual updated`,
        date: ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        above: false,
        route: `/people/${m.personId}/manual`,
      });
    }
    return entries.slice(-8);
  }, [contributions, manuals, people]);

  const handleFamilySync = async () => {
    setSyncing(true);
    setSyncDone(false);
    try {
      const synthesizeFamilyManuals = httpsCallable(functions, 'synthesizeFamilyManuals');
      await synthesizeFamilyManuals({});
      setSyncDone(true);
      setTimeout(() => setSyncDone(false), 5000);
    } catch (err) {
      console.error('Family sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  if (authLoading || state === 'loading') {
    return (
      <div className="relish-page flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-2 border-t-transparent" style={{ borderColor: '#7C9082', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relish-page">
      <Navigation />
      <SideNav />

      <div className="pt-[60px]">
        <div className="relish-container">
          {/* Back to bookshelf */}
          <div className="pt-4 pb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-[13px] hover:opacity-70"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#7C7468' }}
            >
              &larr; Back to Bookshelf
            </Link>
          </div>

          {/* Two-page spread */}
          <div className="relish-panel">
            <div className="spread-container relative">
              <div className="spread-divider" aria-hidden="true" />
              {/* ===== LEFT PAGE: The Family ===== */}
              <div className="spread-page spread-page-left">
                <h2
                  style={{
                    fontFamily: 'var(--font-parent-display)',
                    fontSize: '32px',
                    fontWeight: 500,
                    color: '#3A3530',
                    marginBottom: 24,
                  }}
                >
                  The Family
                </h2>

                {/* Constellation */}
                <ConstellationView people={familyCompleteness.perPerson} />

                {/* Insight cards */}
                {insights.length > 0 && (
                  <div className="space-y-3 mt-8">
                    {insights.map((insight) => (
                      <Link
                        key={insight.id}
                        href={insight.route || '#'}
                        className={`block insight-card insight-${insight.type} hover:opacity-80 transition-opacity`}
                      >
                        {insight.text}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* ===== RIGHT PAGE: Your View ===== */}
              <div className="spread-page spread-page-right">
                <h2
                  style={{
                    fontFamily: 'var(--font-parent-display)',
                    fontSize: '32px',
                    fontWeight: 500,
                    color: '#3A3530',
                    marginBottom: 24,
                  }}
                >
                  Your View
                </h2>

                {/* The One Thing */}
                <div className="mb-6">
                  <span className="relish-label">The One Thing</span>
                  <div className="one-thing-card mt-2">
                    <h3 className="one-thing-title">{oneThing.title}</h3>
                    <p className="one-thing-body">{oneThing.description}</p>
                    <Link href={oneThing.actionRoute} className="one-thing-cta">
                      &#9675; {oneThing.actionLabel}
                    </Link>
                  </div>
                </div>

                {/* Active Growth */}
                {activeArcs.length > 0 && (
                  <div className="mb-6">
                    <span className="relish-label">Your Active Growth</span>
                    <div className="mt-2">
                      <div className="growth-bar-track">
                        <div
                          className="growth-bar-fill"
                          style={{ width: `${(activeArcs[0].completedItemCount / Math.max(activeArcs[0].totalItemCount, 1)) * 100}%` }}
                        />
                      </div>
                      <p className="mt-2" style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: '#3A3530' }}>
                        Day {activeArcs[0].currentWeek * 7} of {activeArcs[0].durationWeeks * 7}
                      </p>
                      <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: '#7C7468' }}>
                        {activeArcs[0].title}
                      </p>
                    </div>
                  </div>
                )}

                {/* What's New */}
                {allWhatsNew.length > 0 && (
                  <div>
                    <span className="relish-label">What&apos;s New</span>
                    <div className="mt-2 space-y-2">
                      {allWhatsNew.map((item) => (
                        <Link key={item.id} href={item.route || '#'} className="whats-new-item hover:opacity-70 transition-opacity">
                          <div className="whats-new-dot" style={{ background: item.color }} />
                          <div className="flex-1 min-w-0">
                            <p className="whats-new-text">{item.text}</p>
                            <p className="whats-new-date">{item.date}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          {/* Timeline — inside the same panel, cream bg */}
          {timelineEntries.length > 0 && (
            <div className="timeline-section">
              <div className="timeline-track relative" style={{ minHeight: 200 }}>
                {/* Horizontal line at vertical center */}
                <div className="timeline-line" aria-hidden="true" style={{ top: '50%' }} />

                {/* Left/right scroll arrows */}
                <button
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/50"
                  style={{ color: '#9B9488', fontSize: '16px' }}
                  aria-label="Scroll left"
                >
                  &lsaquo;
                </button>
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/50"
                  style={{ color: '#9B9488', fontSize: '16px' }}
                  aria-label="Scroll right"
                >
                  &rsaquo;
                </button>

                {/* Entries */}
                <div className="flex justify-around items-center relative px-10" style={{ height: 200 }}>
                  {timelineEntries.map((entry) => (
                    <Link
                      key={entry.id}
                      href={entry.route || '#'}
                      className="flex flex-col items-center hover:opacity-70 transition-opacity flex-1"
                      style={{
                        position: 'relative',
                        alignSelf: entry.above ? 'flex-start' : 'flex-end',
                        paddingTop: entry.above ? 8 : 0,
                        paddingBottom: entry.above ? 0 : 8,
                      }}
                    >
                      {entry.above ? (
                        <>
                          <span className="timeline-entry-label">{entry.label}</span>
                          <span className="timeline-entry-date">{entry.date}</span>
                          <div className="timeline-stem" />
                          <div className="timeline-dot timeline-dot-above" />
                        </>
                      ) : (
                        <>
                          <div className="timeline-dot timeline-dot-below" />
                          <div className="timeline-stem" />
                          <span className="timeline-entry-label">{entry.label}</span>
                          <span className="timeline-entry-date">{entry.date}</span>
                        </>
                      )}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-8 pb-5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#7C9082' }} />
                  <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#9B9488' }}>Above: Your inputs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#9B9488' }} />
                  <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#9B9488' }}>Below: System insights</span>
                </div>
              </div>
            </div>
          )}

          </div>{/* close relish-panel */}

          {/* Re-sync */}
          <div className="flex justify-center py-8">
            <button
              onClick={handleFamilySync}
              disabled={syncing}
              className="one-thing-cta disabled:opacity-40"
            >
              {syncing ? 'Syncing...' : syncDone ? '\u2713 Synced' : 'Re-synthesize Family'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== Constellation ====================

// Node fill colors — matching mockup: sage green, forest green, muted rose, soft purple
const NODE_COLORS = ['#5C8064', '#4A7050', '#C09898', '#8888AD', '#6B9878'];
// Ring colors — slightly brighter, used for the completeness ring stroke
const RING_COLORS = ['#7C9082', '#6B8B72', '#C8A0A0', '#9898B8', '#7CA088'];

function ConstellationView({ people }: { people: PersonCompleteness[] }) {
  if (people.length === 0) return null;

  const positions = computePositions(people.length);
  const r = 28; // node radius

  // Build all connection lines — every node connected to every other node (triangular mesh)
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      lines.push({ x1: positions[i].x, y1: positions[i].y, x2: positions[j].x, y2: positions[j].y });
    }
  }

  // Find if any person needs a notification dot — pick the midpoint of an edge near them
  const needsAttention = people.findIndex((p) => p.status === 'stale' || p.status === 'empty');
  let dotPos: { x: number; y: number } | null = null;
  if (needsAttention >= 0 && lines.length > 0) {
    // Place dot near the bottom-center of the constellation
    const lastPos = positions[positions.length - 1];
    dotPos = { x: lastPos.x + r + 12, y: lastPos.y - 8 };
  }

  return (
    <div className="relative" style={{ height: 280 }}>
      <svg
        viewBox="0 0 400 280"
        width="100%"
        height="280"
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* Connection lines — thin gray, forming triangular mesh */}
        {lines.map((line, i) => (
          <line
            key={`line-${i}`}
            x1={line.x1} y1={line.y1}
            x2={line.x2} y2={line.y2}
            stroke="#D8D3CA"
            strokeWidth={1}
          />
        ))}

        {/* Notification dot */}
        {dotPos && (
          <circle cx={dotPos.x} cy={dotPos.y} r={4} fill="#E5C44B" />
        )}

        {/* Person nodes */}
        {people.map((person, i) => {
          const pos = positions[i];
          const fillColor = NODE_COLORS[i % NODE_COLORS.length];
          const ringColor = RING_COLORS[i % RING_COLORS.length];
          const isDashed = person.freshness === 'stale' || person.status === 'empty';
          // Always two characters: first+last initial, or first two chars of single name
          const parts = person.name.trim().split(/\s+/);
          const initials = parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : person.name.slice(0, 2).toUpperCase();

          return (
            <g key={person.personId}>
              {/* Completeness ring — thick colored stroke outside white gap */}
              <circle
                cx={pos.x} cy={pos.y} r={r + 6}
                fill="none"
                stroke={ringColor}
                strokeWidth={2.5}
                strokeDasharray={isDashed ? '5 4' : 'none'}
                opacity={person.status === 'empty' ? 0.35 : 0.7}
              />
              {/* White gap ring between colored ring and fill */}
              <circle
                cx={pos.x} cy={pos.y} r={r + 2}
                fill="#FAF8F5"
                stroke="none"
              />
              {/* Colored fill circle */}
              <circle
                cx={pos.x} cy={pos.y} r={r}
                fill={fillColor}
                opacity={person.status === 'empty' ? 0.3 : 1}
              />
              {/* Initials */}
              <text
                x={pos.x} y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#FFFFFF"
                fontFamily="var(--font-parent-body)"
                fontSize="16"
                fontWeight="600"
                letterSpacing="0.03em"
              >
                {initials}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Click targets — invisible links over each node */}
      {people.map((person, i) => {
        const pos = positions[i];
        return (
          <Link
            key={person.personId}
            href={`/people/${person.personId}/manual`}
            className="absolute rounded-full hover:opacity-80 transition-opacity"
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
  // Diamond/triangular layout matching the mockup:
  // 1 person: center
  // 2 people: top, bottom
  // 3 people: top, bottom-left, bottom-right (triangle)
  // 4 people: top, middle-left, middle-right, bottom (diamond)
  // 5+: top, then distributed below

  const cx = 200;

  if (count === 0) return [];
  if (count === 1) return [{ x: cx, y: 140 }];
  if (count === 2) return [{ x: cx, y: 60 }, { x: cx, y: 200 }];
  if (count === 3) return [
    { x: cx, y: 50 },          // top center
    { x: cx - 80, y: 170 },    // bottom left
    { x: cx + 80, y: 170 },    // bottom right
  ];
  if (count === 4) return [
    { x: cx, y: 45 },          // top
    { x: cx - 95, y: 135 },    // middle left
    { x: cx + 95, y: 135 },    // middle right
    { x: cx, y: 225 },         // bottom
  ];

  // 5+ people: top, then two rows
  const positions: Pos[] = [{ x: cx, y: 40 }];
  const remaining = count - 1;
  const topRow = Math.ceil(remaining / 2);
  const bottomRow = remaining - topRow;

  for (let i = 0; i < topRow; i++) {
    const spread = 85;
    const offset = topRow > 1 ? (i / (topRow - 1) - 0.5) * spread * 2 : 0;
    positions.push({ x: cx + offset, y: 120 });
  }
  for (let i = 0; i < bottomRow; i++) {
    const spread = 70;
    const offset = bottomRow > 1 ? (i / (bottomRow - 1) - 0.5) * spread * 2 : 0;
    positions.push({ x: cx + offset, y: 210 });
  }

  return positions;
}
