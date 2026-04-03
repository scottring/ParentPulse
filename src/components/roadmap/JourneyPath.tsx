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

        return (
          <div key={stage} className="flex items-center">
            {/* Node */}
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all"
                style={{
                  background: isCurrent
                    ? display.color + '20'
                    : isCompleted
                      ? 'rgba(22,163,74,0.1)'
                      : '#FAF8F5',
                  border: `2px solid ${
                    isCurrent
                      ? display.color
                      : isCompleted
                        ? 'rgba(22,163,74,0.4)'
                        : '#E8E3DC'
                  }`,
                  boxShadow: isCurrent ? `0 0 12px ${display.color}30` : 'none',
                }}
              >
                {isCompleted ? '\u2713' : display.emoji}
              </div>
              <span
                className="text-[7px] font-medium tracking-widest mt-1.5"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  color: isCurrent
                    ? display.color
                    : isCompleted
                      ? 'rgba(22,163,74,0.5)'
                      : '#A3A3A3',
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
                    : '#E8E3DC',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
