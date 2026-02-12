'use client';

import type { SystemObservation } from '@/types/checkin';

interface PatternSummaryProps {
  observations: SystemObservation[];
  loading: boolean;
}

export function PatternSummary({ observations, loading }: PatternSummaryProps) {
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-4 bg-stone-200 rounded w-3/4" />
        <div className="h-4 bg-stone-200 rounded w-1/2" />
        <div className="h-4 bg-stone-200 rounded w-2/3" />
      </div>
    );
  }

  if (observations.length === 0) {
    return (
      <p className="text-sm text-stone-400 italic">
        Keep checking in — patterns will emerge over time.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {observations.map((obs, i) => (
        <div
          key={obs.id || i}
          className="bg-white rounded-xl border border-stone-200 p-4"
        >
          <p className="text-sm text-stone-600 leading-relaxed">{obs.text}</p>
        </div>
      ))}
    </div>
  );
}
