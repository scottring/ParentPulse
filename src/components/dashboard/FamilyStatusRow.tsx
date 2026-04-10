'use client';

import Link from 'next/link';
import { PersonCompleteness } from '@/lib/freshness-engine';

interface Props {
  people: PersonCompleteness[];
  dark?: boolean;
}

const STATUS_COLORS = {
  complete: '#16a34a',  // green
  partial: '#d97706',   // amber
  empty: '#dc2626',     // red
  stale: '#5F564B',     // gray
} as const;

const FRESHNESS_RING = {
  fresh: '#16a34a',
  aging: '#d97706',
  stale: '#5F564B',
} as const;

/**
 * Horizontal scrollable row of family member avatars with health ring indicators.
 */
export function FamilyStatusRow({ people, dark }: Props) {
  if (people.length === 0) return null;

  const textColor = dark ? 'rgba(255,255,255,0.7)' : '#5C5347';

  return (
    <div className="flex gap-4 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
      {people.map((person) => {
        const ringColor = FRESHNESS_RING[person.freshness];
        const statusColor = STATUS_COLORS[person.status];
        const initial = person.name.charAt(0).toUpperCase();

        return (
          <Link
            key={person.personId}
            href={`/people/${person.personId}/manual`}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
          >
            {/* Avatar with ring */}
            <div className="relative">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center transition-transform group-hover:scale-105"
                style={{
                  background: `${statusColor}15`,
                  border: `2.5px solid ${ringColor}`,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-parent-display)',
                    fontSize: '22px',
                    fontWeight: 500,
                    color: statusColor,
                  }}
                >
                  {initial}
                </span>
              </div>

              {/* Observer count badge */}
              {person.observerCount > 0 && (
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{
                    background: '#7C9082',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'white',
                    fontFamily: 'var(--font-parent-body)',
                  }}
                >
                  {person.observerCount}
                </div>
              )}
            </div>

            {/* Name */}
            <span
              className="max-w-[56px] truncate text-center"
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: '17px',
                fontWeight: 500,
                color: textColor,
              }}
            >
              {person.name.split(' ')[0]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
