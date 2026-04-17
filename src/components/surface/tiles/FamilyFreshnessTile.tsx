'use client';

import Link from 'next/link';
import { Person, PersonManual } from '@/types/person-manual';
import { computeFreshness, FreshnessStatus } from '@/lib/freshness-engine';

interface FamilyFreshnessTileProps {
  people: Person[];
  manuals: PersonManual[];
}

const FRESHNESS_COLORS: Record<FreshnessStatus, string> = {
  fresh: '#8BAF8E',
  aging: '#C9A84C',
  stale: '#D07070',
};

const FRESHNESS_LABELS: Record<FreshnessStatus, string> = {
  fresh: 'Fresh',
  aging: 'Aging',
  stale: 'Stale',
};

export function FamilyFreshnessTile({ people, manuals }: FamilyFreshnessTileProps) {
  const manualByPersonId = new Map(manuals.map((m) => [m.personId, m]));
  const nonSelf = people.filter((p) => p.relationshipType !== 'self' && !p.archived);

  return (
    <div className="bg-white rounded-xl p-4 col-span-2">
      <p className="text-[10px] uppercase tracking-[0.12em] mb-3" style={{ color: '#8B7E6A' }}>
        Family
      </p>
      <div className="flex flex-wrap gap-3">
        {nonSelf.map((person) => {
          const manual = manualByPersonId.get(person.personId);
          const freshness: FreshnessStatus = manual ? computeFreshness(manual) : 'stale';
          const initial = person.name.charAt(0).toUpperCase();
          const manualPath = person.manualId
            ? `/people/${person.personId}/manual`
            : `/people/${person.personId}/create-manual`;

          return (
            <Link
              key={person.personId}
              href={manualPath}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                style={{ backgroundColor: FRESHNESS_COLORS[freshness] }}
              >
                {initial}
              </span>
              <span>
                <span className="block text-xs font-medium" style={{ color: '#3A3530' }}>
                  {person.name}
                </span>
                <span className="block text-[10px]" style={{ color: '#8B7E6A' }}>
                  {FRESHNESS_LABELS[freshness]}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
