'use client';

import Link from 'next/link';
import { Person } from '@/types/person-manual';

interface ContributionNeededTileProps {
  person: Person;
}

export function ContributionNeededTile({ person }: ContributionNeededTileProps) {
  // Person uses personId as the ID field (not id)
  return (
    <Link
      href={`/people/${person.personId}/manual/onboard`}
      className="bg-white rounded-xl p-4 hover:shadow-sm transition-shadow block"
    >
      <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8B7E6A' }}>
        Your perspective
      </p>
      <p className="text-sm leading-snug" style={{ color: '#3A3530' }}>
        Add your view of {person.name}
      </p>
      <p className="text-xs mt-1" style={{ color: '#8B7E6A' }}>
        Contribute to their manual
      </p>
    </Link>
  );
}
