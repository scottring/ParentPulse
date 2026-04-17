'use client';

import { GrowthItem } from '@/types/growth';

interface ReflectionPromptTileProps {
  item: GrowthItem;
}

export function ReflectionPromptTile({ item }: ReflectionPromptTileProps) {
  return (
    <div className="bg-white rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8B7E6A' }}>
        Reflect
      </p>
      <p className="text-sm leading-snug" style={{ color: '#3A3530' }}>
        {item.title}
      </p>
    </div>
  );
}
