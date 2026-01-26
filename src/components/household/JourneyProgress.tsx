'use client';

import React from 'react';
import { TechnicalCard, ProgressBar, TechnicalLabel } from '../technical';
import { HouseholdMilestone } from '@/types/household-workbook';

interface JourneyProgressProps {
  currentDay: number;
  totalDays?: number;
  milestones: {
    day30: HouseholdMilestone;
    day60: HouseholdMilestone;
    day90: HouseholdMilestone;
  };
  className?: string;
}

export function JourneyProgress({
  currentDay,
  totalDays = 90,
  milestones,
  className = '',
}: JourneyProgressProps) {
  const getMilestoneStatus = (milestone: HouseholdMilestone, targetDay: number) => {
    if (milestone.status === 'completed') return 'completed';
    if (currentDay >= targetDay) return 'active';
    return 'upcoming';
  };

  const milestoneList = [
    { day: 30, ...milestones.day30 },
    { day: 60, ...milestones.day60 },
    { day: 90, ...milestones.day90 },
  ];

  return (
    <TechnicalCard shadowSize="md" className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <TechnicalLabel variant="filled" color="slate" size="sm">
            90-DAY JOURNEY
          </TechnicalLabel>
          <span className="font-mono text-sm font-bold text-slate-800">
            DAY {currentDay}
          </span>
        </div>

        {/* Main progress bar */}
        <ProgressBar
          progress={(currentDay / totalDays) * 100}
          segments={9}
          showPercentage
          color="green"
          size="md"
        />

        {/* Milestone timeline */}
        <div className="relative pt-4">
          {/* Timeline line */}
          <div className="absolute top-6 left-4 right-4 h-0.5 bg-slate-300" />

          {/* Milestone markers */}
          <div className="relative flex justify-between">
            {milestoneList.map((milestone, index) => {
              const status = getMilestoneStatus(milestone, milestone.day);
              return (
                <div key={index} className="flex flex-col items-center" style={{ width: '30%' }}>
                  {/* Marker */}
                  <div
                    className={`
                      w-8 h-8 rounded-full border-2 flex items-center justify-center
                      font-mono text-xs font-bold
                      ${status === 'completed' ? 'bg-green-600 border-green-600 text-white' : ''}
                      ${status === 'active' ? 'bg-amber-500 border-amber-500 text-white animate-pulse' : ''}
                      ${status === 'upcoming' ? 'bg-white border-slate-300 text-slate-400' : ''}
                    `}
                  >
                    {status === 'completed' ? '\u2713' : milestone.day}
                  </div>

                  {/* Label */}
                  <div className="mt-2 text-center">
                    <div className="font-mono text-xs font-bold text-slate-700">
                      Day {milestone.day}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500 max-w-24 truncate">
                      {milestone.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </TechnicalCard>
  );
}

export default JourneyProgress;
