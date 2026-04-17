'use client';

import Link from 'next/link';

interface RitualSetupTileProps {
  spouseName: string;
}

export function RitualSetupTile({ spouseName }: RitualSetupTileProps) {
  return (
    <Link
      href="/rituals/couple/setup"
      className="bg-white rounded-xl p-4 hover:shadow-sm transition-shadow block"
    >
      <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8B7E6A' }}>
        Ritual
      </p>
      <p className="text-sm leading-snug" style={{ color: '#3A3530' }}>
        Set up a regular check-in with {spouseName}
      </p>
      <p className="text-xs mt-1" style={{ color: '#8B7E6A' }}>
        Schedule now
      </p>
    </Link>
  );
}
