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
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  step.status === 'complete'
                    ? 'bg-green-600 border-green-700'
                    : step.status === 'in-progress'
                    ? 'bg-amber-100 border-amber-500'
                    : 'bg-white border-slate-300'
                }`}
              >
                {step.status === 'complete' && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {step.status === 'in-progress' && (
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                )}
              </div>
              {/* Connecting line */}
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 min-h-[16px] ${
                    step.status === 'complete' ? 'bg-green-400' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>

            {/* Content */}
            <div className={`pb-3 flex-1 ${compact ? 'pb-2' : 'pb-3'}`}>
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-xs font-bold ${
                    step.status === 'complete'
                      ? 'text-green-800'
                      : step.status === 'in-progress'
                      ? 'text-amber-800'
                      : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
                {step.contributorName && step.status !== 'not-started' && (
                  <span className="font-mono text-xs text-slate-400">
                    ({step.contributorName})
                  </span>
                )}
              </div>
              {!compact && (
                <p
                  className={`font-mono text-xs mt-0.5 ${
                    step.status === 'complete'
                      ? 'text-green-600'
                      : step.status === 'in-progress'
                      ? 'text-amber-600'
                      : 'text-slate-400'
                  }`}
                >
                  {step.description}
                </p>
              )}
              {/* Progress bar for in-progress steps */}
              {step.status === 'in-progress' && step.progress !== undefined && (
                <div className="mt-1.5 h-1.5 bg-slate-100 border border-slate-200 w-full max-w-[120px]">
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${Math.min(100, step.progress)}%` }}
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
