'use client';

import { DimensionAssessment } from '@/types/growth-arc';
import { getDimension } from '@/config/relationship-dimensions';

interface DimensionBarsProps {
  assessments: DimensionAssessment[];
  activeArcDimensionId?: string;
}

function scoreColor(score: number): string {
  if (score >= 4.0) return '#4ade80';
  if (score >= 3.0) return '#7C9082';
  return '#e57373';
}

function scoreTextColor(score: number): string {
  if (score >= 4.0) return '#16a34a';
  if (score >= 3.0) return '#5C5347';
  return '#dc2626';
}

function confidenceLabel(confidence: string): string {
  if (confidence === 'high') return '';
  if (confidence === 'medium') return '~';
  return '?';
}

export default function DimensionBars({ assessments, activeArcDimensionId }: DimensionBarsProps) {
  if (assessments.length === 0) {
    return (
      <p
        className="text-xs italic"
        style={{ fontFamily: 'var(--font-parent-body)', color: '#6B6254' }}
      >
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
                className="text-[11px] leading-tight"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontWeight: isActiveArc ? 600 : 400,
                  color: isActiveArc ? '#3A3530' : '#6B6254',
                }}
              >
                {name}
              </span>
            </div>

            {/* Bar */}
            <div
              className="flex-1 h-2 rounded-full overflow-hidden relative"
              style={{ background: 'rgba(0,0,0,0.06)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: scoreColor(score) }}
              />
            </div>

            {/* Score */}
            <div className="w-10 text-right flex-shrink-0">
              <span
                className="text-[11px] font-medium"
                style={{ fontFamily: 'var(--font-parent-body)', color: scoreTextColor(score) }}
              >
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
