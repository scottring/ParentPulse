'use client';

import { GrowthStage } from '@/types/growth-arc';
import { DomainProgressionView } from '@/hooks/useProgression';
import { getStageDisplay } from '@/lib/progression-engine';

interface StageCardProps {
  stage: GrowthStage;
  isCurrent: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  domainProgressions: DomainProgressionView[];
  onboardingSteps?: {
    id: string;
    title: string;
    complete: boolean;
    action?: { label: string; href: string } | null;
  }[];
}

const DOMAIN_LABELS: Record<string, string> = {
  self: 'Self',
  couple: 'Couple',
  parent_child: 'Parent',
};

export default function StageCard({
  stage,
  isCurrent,
  isCompleted,
  isLocked,
  domainProgressions,
  onboardingSteps,
}: StageCardProps) {
  const display = getStageDisplay(stage);

  // Domain progressions that are at or past this stage
  const stageOrder: GrowthStage[] = ['learning', 'growing', 'mastering', 'assimilating'];
  const stageIndex = stageOrder.indexOf(stage);

  return (
    <div
      className="rounded-xl p-5 transition-all"
      style={{
        background: isCurrent
          ? '#FFFFFF'
          : isCompleted
            ? 'rgba(22,163,74,0.03)'
            : '#FAF8F5',
        border: isCurrent
          ? `2px solid ${display.color}60`
          : isCompleted
            ? '1px solid rgba(22,163,74,0.15)'
            : '1px solid #E8E3DC',
        boxShadow: isCurrent ? '4px 4px 0px 0px rgba(0,0,0,1)' : 'none',
        opacity: isLocked ? 0.5 : 1,
      }}
    >
      {/* Stage header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{display.emoji}</span>
          <div>
            <h3
              className="font-mono text-[13px] font-bold tracking-wider"
              style={{ color: isCompleted ? 'rgba(22,163,74,0.7)' : '#2C2C2C' }}
            >
              {isCompleted && '✓ '}{display.label}
            </h3>
            <p
              className="font-mono text-[10px] mt-0.5"
              style={{ color: '#6B6B6B' }}
            >
              {display.description}
            </p>
          </div>
        </div>
        {isCurrent && (
          <span
            className="font-mono text-[8px] font-bold tracking-widest px-2 py-1 rounded-full"
            style={{
              color: display.color,
              background: display.color + '20',
              border: `1px solid ${display.color}40`,
            }}
          >
            CURRENT
          </span>
        )}
      </div>

      {/* Philosophy quote */}
      <p
        className="font-mono text-[10px] italic mb-4"
        style={{ color: '#A3A3A3' }}
      >
        &ldquo;{display.philosophy}&rdquo;
      </p>

      {/* Domain progress bars (when current or completed) */}
      {(isCurrent || isCompleted) && domainProgressions.length > 0 && (
        <div className="space-y-2 mb-4">
          {domainProgressions.map((dp) => {
            const dpStageIndex = stageOrder.indexOf(dp.stage);
            const domainAtOrPast = dpStageIndex >= stageIndex;
            const domainProgress = dp.stage === stage
              ? dp.stageProgress
              : domainAtOrPast ? 1.0 : 0;

            return (
              <div key={dp.domain} className="flex items-center gap-3">
                <span
                  className="font-mono text-[9px] font-bold tracking-wider w-14"
                  style={{ color: '#6B6B6B' }}
                >
                  {DOMAIN_LABELS[dp.domain]}
                </span>
                <div
                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ background: '#E8E3DC' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.round(domainProgress * 100)}%`,
                      background: domainAtOrPast
                        ? display.color
                        : '#E8E3DC',
                    }}
                  />
                </div>
                <span
                  className="font-mono text-[8px] w-8 text-right"
                  style={{ color: '#A3A3A3' }}
                >
                  {Math.round(domainProgress * 100)}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Onboarding steps (for Learning stage when not yet active) */}
      {onboardingSteps && onboardingSteps.length > 0 && isCurrent && (
        <div className="space-y-1.5 mb-3">
          {onboardingSteps.map((step) => (
            <div
              key={step.id}
              className="flex items-center justify-between rounded-lg px-3 py-2"
              style={{
                background: step.complete
                  ? 'rgba(22,163,74,0.05)'
                  : '#FAF8F5',
                border: `1px solid ${
                  step.complete
                    ? 'rgba(22,163,74,0.15)'
                    : '#E8E3DC'
                }`,
              }}
            >
              <span
                className="font-mono text-[10px]"
                style={{
                  color: step.complete
                    ? 'rgba(22,163,74,0.6)'
                    : '#2C2C2C',
                  textDecoration: step.complete ? 'line-through' : 'none',
                }}
              >
                {step.complete ? '✓ ' : ''}{step.title}
              </span>
              {!step.complete && step.action && (
                <a
                  href={step.action.href}
                  className="font-mono text-[8px] font-bold px-2 py-1 rounded transition-all hover:scale-105"
                  style={{
                    color: '#d97706',
                    border: '1px solid rgba(217,119,6,0.3)',
                    background: 'rgba(217,119,6,0.1)',
                  }}
                >
                  {step.action.label}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Advancement requirements (when current) */}
      {isCurrent && domainProgressions.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid #E8E3DC' }}>
          <span
            className="font-mono text-[8px] font-bold tracking-widest block mb-1.5"
            style={{ color: '#A3A3A3' }}
          >
            TO ADVANCE
          </span>
          {domainProgressions
            .filter((dp) => dp.stage === stage)
            .flatMap((dp) => dp.requirements)
            .filter((r, i, arr) => arr.indexOf(r) === i) // dedupe
            .slice(0, 4)
            .map((req, i) => (
              <p
                key={i}
                className="font-mono text-[9px] mt-0.5"
                style={{ color: '#6B6B6B' }}
              >
                &bull; {req}
              </p>
            ))}
        </div>
      )}

      {/* Locked state */}
      {isLocked && (
        <div className="text-center py-2">
          <span
            className="font-mono text-[9px]"
            style={{ color: '#A3A3A3' }}
          >
            Complete {stageOrder[stageIndex - 1]?.toUpperCase()} to unlock
          </span>
        </div>
      )}
    </div>
  );
}
