'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { Contribution, PersonManual } from '@/types/person-manual';

export type TimelineEntryType = 'contribution' | 'synthesis' | 'growth_complete' | 'check_in';

export interface TimelineEntry {
  id: string;
  type: TimelineEntryType;
  label: string;
  personName?: string;
  timestamp: number;
  route?: string;
  isAboveLine: boolean;
}

interface FamilyTimelineProps {
  contributions: Contribution[];
  manuals: PersonManual[];
  maxEntries?: number;
}

/**
 * FamilyTimeline — leather & wood styled progress bars.
 * Shows activity as a rich, tactile progress visualization.
 */
export function FamilyTimeline({
  contributions,
  manuals,
}: FamilyTimelineProps) {
  const completedContribs = contributions.filter((c) => c.status === 'complete');

  // Get current week range
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weekLabel = `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}`;

  // Per-person activity this week
  const personActivity = useMemo(() => {
    const activity: Array<{ name: string; total: number; thisWeek: number; personId: string }> = [];

    for (const m of manuals) {
      const personContribs = completedContribs.filter((c) => c.personId === m.personId);
      const weekContribs = personContribs.filter((c) => {
        const ts = c.updatedAt?.toMillis?.() || 0;
        return ts >= weekStart.getTime() && ts <= weekEnd.getTime();
      });

      activity.push({
        name: m.personName?.split(' ')[0] || 'Unknown',
        total: personContribs.length,
        thisWeek: weekContribs.length,
        personId: m.personId,
      });
    }

    return activity;
  }, [manuals, completedContribs]);

  if (completedContribs.length === 0 && manuals.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="storybook-body text-[17px] italic" style={{ color: 'rgba(140, 110, 70, 0.4)' }}>
          Your family&apos;s story begins here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="storybook-label">This Week</span>
        <span className="storybook-body text-[16px]" style={{ color: '#8B7B6B' }}>
          {weekLabel}
        </span>
      </div>

      {/* Overall family bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {/* Leather avatar circle */}
          <div className="timeline-avatar">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <circle cx="12" cy="12" r="10" fill="none" stroke="#8B7B6B" strokeWidth="1.5" opacity="0.4" />
              <circle cx="12" cy="9" r="3.5" fill="#8B7B6B" opacity="0.3" />
              <path d="M5,20 Q5,15 12,14 Q19,15 19,20" fill="#8B7B6B" opacity="0.2" />
            </svg>
          </div>
          <span className="storybook-body text-[17px]" style={{ color: '#5C5347' }}>
            Relish
          </span>
          <div className="flex-1">
            <TimelineBar value={Math.min(completedContribs.length / Math.max(manuals.length * 2, 1), 1)} />
          </div>
        </div>

        {/* Per-person bars */}
        {personActivity.map((pa) => (
          <div key={pa.personId} className="flex items-center gap-3">
            <div className="timeline-avatar">
              <span className="text-[14px] font-medium" style={{ color: '#8B7B6B' }}>
                {pa.name.charAt(0)}
              </span>
            </div>
            <span className="storybook-body text-[17px] w-24 truncate" style={{ color: '#5C5347' }}>
              {pa.name}
            </span>
            <div className="flex-1">
              <TimelineBar value={Math.min(pa.total / 4, 1)} />
            </div>
            <span className="storybook-body text-[14px] tabular-nums" style={{ color: '#8B7B6B' }}>
              {pa.total}/{pa.total + 2}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== Timeline Bar ====================

function TimelineBar({ value }: { value: number }) {
  const percent = Math.round(value * 100);

  return (
    <div className="timeline-bar-track">
      <div
        className="timeline-bar-fill"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

// ==================== Helpers ====================

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
