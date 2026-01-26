'use client';

import React from 'react';
import { TechnicalCard, TechnicalLabel, ProgressBar } from '../technical';

interface MilestoneTrackerProps {
  currentMilestone: {
    target: 'day30' | 'day60' | 'day90';
    description: string;
    daysRemaining: number;
  };
  journeyDay: number;
  className?: string;
}

export function MilestoneTracker({
  currentMilestone,
  journeyDay,
  className = '',
}: MilestoneTrackerProps) {
  const targetDay = currentMilestone.target === 'day30' ? 30 :
                    currentMilestone.target === 'day60' ? 60 : 90;

  // Calculate progress toward current milestone
  const milestoneStart = currentMilestone.target === 'day30' ? 0 :
                         currentMilestone.target === 'day60' ? 30 : 60;
  const milestoneDuration = 30; // Each milestone is 30 days
  const daysIntoMilestone = journeyDay - milestoneStart;
  const milestoneProgress = Math.min(100, (daysIntoMilestone / milestoneDuration) * 100);

  const getMilestoneLabel = () => {
    switch (currentMilestone.target) {
      case 'day30': return 'FIRST MILESTONE';
      case 'day60': return 'SECOND MILESTONE';
      case 'day90': return 'FINAL MILESTONE';
    }
  };

  return (
    <TechnicalCard cornerBrackets shadowSize="md" className={`p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <TechnicalLabel
          variant="filled"
          color={currentMilestone.target === 'day30' ? 'amber' : currentMilestone.target === 'day60' ? 'blue' : 'green'}
          size="sm"
        >
          {getMilestoneLabel()} · DAY {targetDay}
        </TechnicalLabel>
        <span className="font-mono text-xs text-slate-500">
          {currentMilestone.daysRemaining} DAYS LEFT
        </span>
      </div>

      {/* Milestone description */}
      <blockquote className="font-mono text-slate-800 italic mb-4">
        &quot;{currentMilestone.description}&quot;
      </blockquote>

      {/* Progress */}
      <ProgressBar
        progress={milestoneProgress}
        segments={6}
        label={`PROGRESS TO DAY ${targetDay}`}
        color={currentMilestone.target === 'day30' ? 'amber' : currentMilestone.target === 'day60' ? 'blue' : 'green'}
        size="md"
      />

      {/* Journey day indicator */}
      <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
        <span className="font-mono text-xs text-slate-500 uppercase">
          JOURNEY DAY
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-2xl text-slate-800">
            {journeyDay}
          </span>
          <span className="font-mono text-xs text-slate-400">
            / 90
          </span>
        </div>
      </div>
    </TechnicalCard>
  );
}

export default MilestoneTracker;
