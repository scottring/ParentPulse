'use client';

import { GrowthStage } from '@/types/growth-arc';
import { getStageDisplay } from '@/lib/progression-engine';

interface JourneyPathProps {
  currentStage: GrowthStage;
}

const STAGES: GrowthStage[] = ['learning', 'growing', 'mastering', 'assimilating'];

export default function JourneyPath({ currentStage }: JourneyPathProps) {
  const currentIndex = STAGES.indexOf(currentStage);

  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {STAGES.map((stage, i) => {
        const display = getStageDisplay(stage);
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isLocked = i > currentIndex;

        return (
          <div key={stage} className="flex items-center">
            {/* Node */}
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all"
                style={{
                  background: isCurrent
                    ? display.color + '30'
                    : isCompleted
                      ? 'rgba(22,163,74,0.2)'
                      : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${
                    isCurrent
                      ? display.color
                      : isCompleted
                        ? 'rgba(22,163,74,0.4)'
                        : 'rgba(255,255,255,0.08)'
                  }`,
                  boxShadow: isCurrent ? `0 0 12px ${display.color}30` : 'none',
                }}
              >
                {isCompleted ? '✓' : display.emoji}
              </div>
              <span
                className="font-mono text-[7px] font-bold tracking-widest mt-1.5"
                style={{
                  color: isCurrent
                    ? display.color
                    : isCompleted
                      ? 'rgba(22,163,74,0.5)'
                      : 'rgba(255,255,255,0.15)',
                }}
              >
                {display.label}
              </span>
            </div>

            {/* Connector */}
            {i < STAGES.length - 1 && (
              <div
                className="w-8 h-0.5 mx-1 rounded-full"
                style={{
                  background: i < currentIndex
                    ? 'rgba(22,163,74,0.3)'
                    : 'rgba(255,255,255,0.06)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
