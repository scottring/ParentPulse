'use client';

import { GrowthArc } from '@/types/growth-arc';

interface ArcHeaderProps {
  arc: GrowthArc;
  progress: number;
}

const PHASE_LABELS = {
  awareness: 'Awareness',
  practice: 'Practice',
  integration: 'Integration',
};

export default function ArcHeader({ arc, progress }: ArcHeaderProps) {
  const phaseLabel = PHASE_LABELS[arc.currentPhase] || arc.currentPhase;

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.4)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      {/* Top badge row */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-[10px] font-medium px-2.5 py-0.5 rounded-full text-white"
          style={{ fontFamily: 'var(--font-parent-body)', background: '#3A3530' }}
        >
          Growth Arc
        </span>
        <span
          className="text-[10px]"
          style={{ fontFamily: 'var(--font-parent-body)', color: '#8A8078' }}
        >
          Level {arc.level} &middot; {arc.levelTitle}
        </span>
      </div>

      {/* Title */}
      <div className="flex items-start gap-3 mb-2">
        <span className="text-2xl">{arc.emoji}</span>
        <div>
          <h2
            className="text-lg leading-tight"
            style={{
              fontFamily: 'var(--font-parent-display)',
              fontWeight: 500,
              color: '#3A3530',
            }}
          >
            {arc.title}
          </h2>
          {arc.subtitle && (
            <p
              className="text-sm mt-0.5"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#8A8078' }}
            >
              {arc.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Research basis */}
      {arc.researchBasis && (
        <p
          className="text-[10px] mb-3 pl-9"
          style={{ fontFamily: 'var(--font-parent-body)', color: '#8A8078' }}
        >
          {arc.researchBasis}
        </p>
      )}

      {/* Progress bar */}
      <div className="pl-9">
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-[10px]"
            style={{ fontFamily: 'var(--font-parent-body)', color: '#8A8078' }}
          >
            Week {arc.currentWeek} of {arc.durationWeeks} &middot; {phaseLabel} Phase
          </span>
          <span
            className="text-[10px]"
            style={{ fontFamily: 'var(--font-parent-body)', color: '#8A8078' }}
          >
            {arc.completedItemCount}/{arc.totalItemCount}
          </span>
        </div>
        <div
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(0,0,0,0.06)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, progress)}%`, background: '#7C9082' }}
          />
        </div>
      </div>

      {/* Participants */}
      <div className="pl-9 mt-3">
        <span
          className="text-[10px]"
          style={{ fontFamily: 'var(--font-parent-body)', color: '#8A8078' }}
        >
          {arc.participantNames.join(' & ')} &middot; {arc.dimensionName}
        </span>
      </div>
    </div>
  );
}
