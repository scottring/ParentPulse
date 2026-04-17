'use client';

import Link from 'next/link';

interface PerspectiveGapTileProps {
  personName: string;
  personId: string;
}

export function PerspectiveGapTile({ personName, personId }: PerspectiveGapTileProps) {
  return (
    <Link
      href={`/people/${personId}/manual`}
      className="bg-white rounded-xl p-4 hover:shadow-sm transition-shadow block"
    >
      <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8B7E6A' }}>
        Perspective gap
      </p>
      <p className="text-sm leading-snug" style={{ color: '#3A3530' }}>
        {personName} needs another view
      </p>
      <p className="text-xs mt-1" style={{ color: '#8B7E6A' }}>
        Add a perspective
      </p>
    </Link>
  );
}
