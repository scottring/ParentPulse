'use client';

import type { GrowthArc, ArcPhase } from '@/types/growth-arc';
import type { GrowthItem } from '@/types/growth';

interface GrowthArcCardProps {
  arc: GrowthArc;
  todayItem?: GrowthItem;
  onReact?: (itemId: string, reaction: string) => void;
}

const PHASE_LABELS: Record<ArcPhase, string> = {
  awareness: 'Awareness',
  practice: 'Practice',
  integration: 'Integration',
};

const PHASE_COLORS: Record<ArcPhase, string> = {
  awareness: 'var(--parent-secondary)',
  practice: 'var(--parent-primary)',
  integration: 'var(--parent-accent)',
};

export function GrowthArcCard({ arc, todayItem, onReact }: GrowthArcCardProps) {
  const totalWeeks = arc.durationWeeks;
  const currentWeek = arc.currentWeek;
  const progress = Math.min(currentWeek / totalWeeks, 1);

  return (
    <div
      className="rounded-2xl bg-white p-6"
      style={{ boxShadow: 'var(--shadow-soft)', border: '1px solid var(--parent-border)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p
            className="text-xs font-medium tracking-wide uppercase mb-1"
            style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)', letterSpacing: '0.08em' }}
          >
            Growth arc
          </p>
          <h3
            className="text-base font-semibold"
            style={{ fontFamily: 'var(--font-parent-heading)', color: 'var(--parent-text)' }}
          >
            {arc.emoji} {arc.title}
          </h3>
          <p
            className="text-xs mt-0.5"
            style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
          >
            {arc.dimensionName} &middot; Week {currentWeek} of {totalWeeks}
          </p>
        </div>
      </div>

      {/* Phase progress */}
      <div className="flex gap-1 mb-2">
        {arc.phases.map((phase) => {
          const phaseStart = phase.weekStart;
          const phaseEnd = phase.weekEnd;
          const phaseWidth = ((phaseEnd - phaseStart + 1) / totalWeeks) * 100;
          const isCurrent = arc.currentPhase === phase.phase;
          const isPast = currentWeek > phaseEnd;

          return (
            <div
              key={phase.phase}
              className="relative rounded-full overflow-hidden"
              style={{ width: `${phaseWidth}%`, height: 6 }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: isPast || isCurrent
                    ? PHASE_COLORS[phase.phase]
                    : '#E8E3DC',
                  opacity: isPast ? 1 : isCurrent ? 0.6 : 0.3,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Phase labels */}
      <div className="flex justify-between mb-4">
        {arc.phases.map((phase) => (
          <span
            key={phase.phase}
            className="text-[14px]"
            style={{
              fontFamily: 'var(--font-parent-body)',
              color: arc.currentPhase === phase.phase ? 'var(--parent-text)' : 'var(--parent-text-light)',
              fontWeight: arc.currentPhase === phase.phase ? 500 : 400,
            }}
          >
            {PHASE_LABELS[phase.phase]}
          </span>
        ))}
      </div>

      {/* Today's item from this arc */}
      {todayItem && (
        <div
          className="rounded-xl p-4 mt-2"
          style={{ background: '#FAF8F5', border: '1px solid var(--parent-border)' }}
        >
          <div className="flex items-start gap-3">
            <span className="text-lg">{todayItem.emoji}</span>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium leading-snug"
                style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text)' }}
              >
                {todayItem.title}
              </p>
              <p
                className="text-xs mt-1 leading-relaxed"
                style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
              >
                {todayItem.body}
              </p>
            </div>
          </div>

          {todayItem.status !== 'completed' && onReact && (
            <div className="flex gap-1.5 mt-3 ml-8">
              {[
                { emoji: '\u2764\ufe0f', key: 'loved_it' },
                { emoji: '\u2705', key: 'tried_it' },
                { emoji: '\u23f0', key: 'not_now' },
                { emoji: '\u274c', key: 'doesnt_fit' },
              ].map((r) => (
                <button
                  key={r.key}
                  onClick={() => onReact(todayItem.growthItemId, r.key)}
                  className="px-2 py-1 rounded-lg text-sm transition-all hover:scale-105"
                  style={{ background: 'rgba(44,44,44,0.04)', border: '1px solid var(--parent-border)' }}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
