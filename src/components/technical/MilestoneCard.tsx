'use client';

import React from 'react';
import { TechnicalCard } from './TechnicalCard';
import { TechnicalLabel } from './TechnicalLabel';
import { ProgressBar } from './ProgressBar';

interface MilestoneCardProps {
  target: 'day30' | 'day60' | 'day90';
  title: string;
  description?: string;
  daysRemaining: number;
  daysElapsed: number;
  status?: 'upcoming' | 'active' | 'completed';
  className?: string;
}

const targetDayMap = {
  day30: 30,
  day60: 60,
  day90: 90,
};

const statusColorMap = {
  upcoming: 'slate' as const,
  active: 'amber' as const,
  completed: 'green' as const,
};

export function MilestoneCard({
  target,
  title,
  description,
  daysRemaining,
  daysElapsed,
  status = 'active',
  className = '',
}: MilestoneCardProps) {
  const targetDays = targetDayMap[target];
  const progress = Math.min(100, (daysElapsed / targetDays) * 100);

  return (
    <TechnicalCard
      cornerBrackets
      shadowSize="md"
      className={`p-4 ${className}`}
    >
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <TechnicalLabel
            variant="filled"
            color={statusColorMap[status]}
            size="sm"
          >
            MILESTONE · DAY {targetDays}
          </TechnicalLabel>
          <span className="font-mono text-xs text-slate-500">
            {daysRemaining} DAYS REMAINING
          </span>
        </div>

        {/* Title */}
        <h3 className="font-mono font-bold text-lg text-slate-800">
          &quot;{title}&quot;
        </h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-slate-600">
            {description}
          </p>
        )}

        {/* Progress */}
        <ProgressBar
          progress={progress}
          segments={10}
          color={statusColorMap[status]}
          label={`DAY ${daysElapsed} OF ${targetDays}`}
        />

        {/* Status indicator */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
          <div
            className={`
              w-2 h-2 rounded-full
              ${status === 'active' ? 'bg-amber-500 animate-pulse' : ''}
              ${status === 'completed' ? 'bg-green-500' : ''}
              ${status === 'upcoming' ? 'bg-slate-300' : ''}
            `}
          />
          <span className="font-mono text-xs uppercase tracking-wider text-slate-500">
            {status === 'active' && 'In Progress'}
            {status === 'completed' && 'Achieved'}
            {status === 'upcoming' && 'Upcoming'}
          </span>
        </div>
      </div>
    </TechnicalCard>
  );
}

export default MilestoneCard;
