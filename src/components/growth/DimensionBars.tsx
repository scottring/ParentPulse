'use client';

import { DimensionAssessment } from '@/types/growth-arc';
import { getDimension } from '@/config/relationship-dimensions';

interface DimensionBarsProps {
  assessments: DimensionAssessment[];
  activeArcDimensionId?: string;
}

function scoreColor(score: number): string {
  if (score >= 4.0) return 'bg-green-500';
  if (score >= 3.0) return 'bg-amber-500';
  return 'bg-red-500';
}

function scoreTextColor(score: number): string {
  if (score >= 4.0) return 'text-green-700';
  if (score >= 3.0) return 'text-amber-700';
  return 'text-red-700';
}

function confidenceLabel(confidence: string): string {
  if (confidence === 'high') return '';
  if (confidence === 'medium') return '~';
  return '?';
}

export default function DimensionBars({ assessments, activeArcDimensionId }: DimensionBarsProps) {
  if (assessments.length === 0) {
    return (
      <p className="font-mono text-xs text-slate-400 italic">
        No portraits yet — start a growth arc to begin measuring
      </p>
    );
  }

  // Sort: lowest score first (biggest opportunity)
  const sorted = [...assessments].sort((a, b) => a.currentScore - b.currentScore);

  return (
    <div className="space-y-1.5">
      {sorted.map((assessment) => {
        const dim = getDimension(assessment.dimensionId);
        const name = dim?.name || assessment.dimensionId;
        const score = assessment.currentScore;
        const pct = Math.round((score / 5.0) * 100);
        const isActiveArc = assessment.dimensionId === activeArcDimensionId;
        const conf = confidenceLabel(assessment.confidence);

        return (
          <div key={assessment.assessmentId} className="flex items-center gap-2">
            {/* Dimension name */}
            <div className="w-32 flex-shrink-0">
              <span
                className={`font-mono text-[11px] leading-tight ${
                  isActiveArc ? 'font-bold text-slate-900' : 'text-slate-500'
                }`}
              >
                {name}
              </span>
            </div>

            {/* Bar */}
            <div className="flex-1 h-3 bg-slate-100 border border-slate-200 relative">
              <div
                className={`h-full ${scoreColor(score)} transition-all duration-700`}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Score */}
            <div className="w-10 text-right flex-shrink-0">
              <span className={`font-mono text-[11px] font-bold ${scoreTextColor(score)}`}>
                {score.toFixed(1)}{conf}
              </span>
            </div>

            {/* Active arc indicator */}
            {isActiveArc && (
              <div className="w-4 flex-shrink-0">
                <span className="text-[10px]" title="Active Growth Arc">&#9654;</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
