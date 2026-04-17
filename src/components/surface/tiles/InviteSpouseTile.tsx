'use client';

import Link from 'next/link';

interface InviteSpouseTileProps {
  spouseName: string;
  spousePersonId: string;
}

export function InviteSpouseTile({ spouseName, spousePersonId }: InviteSpouseTileProps) {
  return (
    <Link
      href={`/people/${spousePersonId}/manual`}
      className="bg-white rounded-xl p-4 hover:shadow-sm transition-shadow block"
    >
      <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8B7E6A' }}>
        Invite
      </p>
      <p className="text-sm leading-snug" style={{ color: '#3A3530' }}>
        Invite {spouseName} to Relish
      </p>
      <p className="text-xs mt-1" style={{ color: '#8B7E6A' }}>
        See the view from both sides
      </p>
    </Link>
  );
}
