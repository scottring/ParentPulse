'use client';

import Link from 'next/link';

interface PatternTileProps {
  description: string;
  source: string;
  entryId?: string;
}

export function PatternTile({ description, source, entryId }: PatternTileProps) {
  const inner = (
    <>
      <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8B7E6A' }}>
        Pattern
      </p>
      <p className="text-sm leading-snug" style={{ color: '#3A3530' }}>
        {description}
      </p>
      <p className="text-xs mt-1" style={{ color: '#8B7E6A' }}>
        {source}
      </p>
    </>
  );

  if (entryId) {
    return (
      <Link
        href={`/journal/${entryId}`}
        className="bg-white rounded-xl p-4 hover:shadow-sm transition-shadow block"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4">
      {inner}
    </div>
  );
}
