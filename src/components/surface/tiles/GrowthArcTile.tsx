'use client';

import { ArcGroup } from '@/hooks/useGrowthFeed';

interface GrowthArcTileProps {
  arcGroup: ArcGroup;
}

export function GrowthArcTile({ arcGroup }: GrowthArcTileProps) {
  const { arc, progress } = arcGroup;

  return (
    <div className="bg-white rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8B7E6A' }}>
        Growth arc
      </p>
      <p className="text-sm leading-snug" style={{ color: '#3A3530' }}>
        {arc.dimensionName}
      </p>
      <p className="text-xs mt-1 mb-2" style={{ color: '#8B7E6A' }}>
        Week {arc.currentWeek} of {arc.durationWeeks}
      </p>
      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#EDE8E0' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${progress}%`, backgroundColor: '#8BAF8E' }}
        />
      </div>
    </div>
  );
}
