'use client';

import React from 'react';
import { TechnicalCard, TechnicalLabel, SpecificationBadge } from '../technical';

interface HouseholdManualHeaderProps {
  householdName: string;
  currentDay: number;
  totalDays: number;
  currentMilestone?: {
    target: 'day30' | 'day60' | 'day90';
    description: string;
    daysRemaining: number;
  };
  onOpenWorkbook?: () => void;
}

export function HouseholdManualHeader({
  householdName,
  currentDay,
  totalDays,
  currentMilestone,
  onOpenWorkbook,
}: HouseholdManualHeaderProps) {
  const progress = (currentDay / totalDays) * 100;

  return (
    <div className="relative">
      {/* Main header card */}
      <TechnicalCard cornerBrackets shadowSize="lg" className="p-6">
        <div className="flex items-start gap-4">
          {/* HQ Badge */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-slate-800 border-2 border-amber-600 flex items-center justify-center">
              <span className="font-mono font-bold text-xl text-white">HQ</span>
            </div>
          </div>

          {/* Title section */}
          <div className="flex-1">
            <TechnicalLabel variant="subtle" color="slate" size="xs">
              HOUSEHOLD OPERATING MANUAL
            </TechnicalLabel>
            <h1 className="font-mono font-bold text-2xl text-slate-800 mt-1">
              {householdName}
            </h1>
          </div>
        </div>

        {/* Journey status section */}
        {currentMilestone && (
          <div className="mt-6 pt-6 border-t-2 border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-medium uppercase tracking-wider text-slate-500">
                JOURNEY STATUS
              </span>
              <span className="font-mono text-sm font-bold text-slate-800">
                DAY {currentDay} OF {totalDays}
              </span>
            </div>

            {/* Progress bar */}
            <div className="flex gap-0.5 mb-3">
              {Array.from({ length: 30 }).map((_, i) => {
                const segmentPercent = (i + 1) / 30 * 100;
                return (
                  <div
                    key={i}
                    className={`
                      flex-1 h-3 border border-slate-300
                      ${segmentPercent <= progress ? 'bg-green-600' : 'bg-slate-100'}
                    `}
                  />
                );
              })}
            </div>

            {/* Percentage */}
            <div className="flex justify-between items-center text-sm font-mono">
              <span className="text-slate-500">
                {Array.from({ length: 10 }).map((_, i) =>
                  i < Math.floor(progress / 10) ? '\u2588' : '\u2591'
                ).join('')} {Math.round(progress)}%
              </span>
            </div>

            {/* Current milestone */}
            <div className="mt-4 p-3 bg-amber-50 border-l-4 border-amber-500">
              <div className="font-mono text-xs uppercase tracking-wider text-amber-700 mb-1">
                CURRENT MILESTONE: Day {currentMilestone.target.replace('day', '')}
              </div>
              <div className="font-mono font-bold text-slate-800">
                &quot;{currentMilestone.description}&quot;
              </div>
              <div className="font-mono text-xs text-slate-500 mt-1">
                {currentMilestone.daysRemaining} days remaining
              </div>
            </div>

            {/* Open workbook button */}
            {onOpenWorkbook && (
              <button
                onClick={onOpenWorkbook}
                className="
                  mt-4 w-full
                  bg-slate-800 text-white
                  border-2 border-slate-800
                  px-4 py-3
                  font-mono font-bold text-sm uppercase tracking-wider
                  shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                  hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                  hover:translate-x-[2px] hover:translate-y-[2px]
                  transition-all
                "
              >
                [ OPEN THIS WEEK&apos;S WORKBOOK ]
              </button>
            )}
          </div>
        )}
      </TechnicalCard>
    </div>
  );
}

export default HouseholdManualHeader;
