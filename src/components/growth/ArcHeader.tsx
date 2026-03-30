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
    <div className="border-2 border-slate-800 bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      {/* Top badge row */}
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-white uppercase">
          Growth Arc
        </span>
        <span className="font-mono text-[10px] text-slate-400">
          Level {arc.level} &middot; {arc.levelTitle}
        </span>
      </div>

      {/* Title */}
      <div className="flex items-start gap-3 mb-2">
        <span className="text-2xl">{arc.emoji}</span>
        <div>
          <h2 className="font-mono font-bold text-lg text-slate-900 leading-tight">
            {arc.title}
          </h2>
          {arc.subtitle && (
            <p className="font-mono text-sm text-slate-500 mt-0.5">
              {arc.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Research basis */}
      {arc.researchBasis && (
        <p className="font-mono text-[10px] text-slate-400 mb-3 pl-9">
          {arc.researchBasis}
        </p>
      )}

      {/* Progress bar */}
      <div className="pl-9">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[10px] text-slate-500">
            Week {arc.currentWeek} of {arc.durationWeeks} &middot; {phaseLabel} Phase
          </span>
          <span className="font-mono text-[10px] text-slate-500">
            {arc.completedItemCount}/{arc.totalItemCount}
          </span>
        </div>
        <div className="w-full h-2 bg-slate-100 border border-slate-200">
          <div
            className="h-full bg-slate-800 transition-all duration-500"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      {/* Participants */}
      <div className="pl-9 mt-3">
        <span className="font-mono text-[10px] text-slate-400">
          {arc.participantNames.join(' & ')} &middot; {arc.dimensionName}
        </span>
      </div>
    </div>
  );
}
