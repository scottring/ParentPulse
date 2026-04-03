'use client';

import { JourneyStep } from '@/hooks/useManualSummaries';

interface JourneyTimelineProps {
  steps: JourneyStep[];
  compact?: boolean;
}

export default function JourneyTimeline({ steps, compact = false }: JourneyTimelineProps) {
  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex gap-3">
            {/* Timeline column */}
            <div className="flex flex-col items-center">
              {/* Circle indicator */}
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: step.status === 'complete'
                    ? '#16a34a'
                    : step.status === 'in-progress'
                    ? 'rgba(124,144,130,0.12)'
                    : '#FFFFFF',
                  border: `2px solid ${
                    step.status === 'complete'
                      ? '#15803d'
                      : step.status === 'in-progress'
                      ? '#7C9082'
                      : 'rgba(0,0,0,0.12)'
                  }`,
                }}
              >
                {step.status === 'complete' && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {step.status === 'in-progress' && (
                  <div className="w-2 h-2 rounded-full" style={{ background: '#7C9082' }} />
                )}
              </div>
              {/* Connecting line */}
              {!isLast && (
                <div
                  className="w-0.5 flex-1 min-h-[16px]"
                  style={{
                    background: step.status === 'complete'
                      ? 'rgba(22,163,74,0.3)'
                      : 'rgba(0,0,0,0.08)',
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div className={`pb-3 flex-1 ${compact ? 'pb-2' : 'pb-3'}`}>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-medium"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    color: step.status === 'complete'
                      ? '#15803d'
                      : step.status === 'in-progress'
                      ? '#5C5347'
                      : '#8A8078',
                  }}
                >
                  {step.label}
                </span>
                {step.contributorName && step.status !== 'not-started' && (
                  <span
                    className="text-xs"
                    style={{ fontFamily: 'var(--font-parent-body)', color: '#8A8078' }}
                  >
                    ({step.contributorName})
                  </span>
                )}
              </div>
              {!compact && (
                <p
                  className="text-xs mt-0.5"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    color: step.status === 'complete'
                      ? 'rgba(22,163,74,0.7)'
                      : step.status === 'in-progress'
                      ? '#7C7468'
                      : '#8A8078',
                  }}
                >
                  {step.description}
                </p>
              )}
              {/* Progress bar for in-progress steps */}
              {step.status === 'in-progress' && step.progress !== undefined && (
                <div
                  className="mt-1.5 h-1.5 rounded-full overflow-hidden w-full max-w-[120px]"
                  style={{ background: 'rgba(0,0,0,0.06)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, step.progress)}%`,
                      background: '#7C9082',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
