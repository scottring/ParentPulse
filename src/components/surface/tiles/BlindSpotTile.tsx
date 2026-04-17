'use client';

import Link from 'next/link';

interface BlindSpotTileProps {
  description: string;
  personName: string;
  personId: string;
}

export function BlindSpotTile({ description, personName, personId }: BlindSpotTileProps) {
  return (
    <Link
      href={`/people/${personId}/manual`}
      className="bg-white rounded-xl p-4 hover:shadow-sm transition-shadow block"
    >
      <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8B7E6A' }}>
        Blind spot
      </p>
      <p className="text-sm leading-snug" style={{ color: '#3A3530' }}>
        {description}
      </p>
      <p className="text-xs mt-1" style={{ color: '#8B7E6A' }}>
        {personName}
      </p>
    </Link>
  );
}
