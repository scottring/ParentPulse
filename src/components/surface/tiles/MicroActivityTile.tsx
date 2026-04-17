'use client';

import Link from 'next/link';
import { GrowthItem } from '@/types/growth';

interface MicroActivityTileProps {
  item: GrowthItem;
}

export function MicroActivityTile({ item }: MicroActivityTileProps) {
  const firstPerson = item.targetPersonNames[0] ?? null;

  return (
    <Link
      href={`/growth/${item.growthItemId}`}
      className="bg-white rounded-xl p-4 hover:shadow-sm transition-shadow block"
    >
      <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8B7E6A' }}>
        Today
      </p>
      <p className="text-sm leading-snug" style={{ color: '#3A3530' }}>
        {item.title}
      </p>
      {firstPerson && (
        <p className="text-xs mt-1" style={{ color: '#8B7E6A' }}>
          {firstPerson}
        </p>
      )}
    </Link>
  );
}
