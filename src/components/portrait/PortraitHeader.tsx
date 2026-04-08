'use client';

import { Person, PersonManual } from '@/types/person-manual';
import { Timestamp } from 'firebase/firestore';
import { computeFreshness, freshnessLabel, getAgeGroup, ageGroupLabel, FreshnessStatus } from '@/lib/freshness-engine';

interface Props {
  person: Person;
  manual: PersonManual;
}

function computeAge(dob: Timestamp): number {
  const birthDate = dob.toDate();
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) age--;
  return age;
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  self: 'Self',
  child: 'Child',
  spouse: 'Partner',
  elderly_parent: 'Parent',
  friend: 'Friend',
  professional: 'Professional',
  sibling: 'Sibling',
  other: 'Other',
};

export function PortraitHeader({ person, manual }: Props) {
  const age = person.dateOfBirth ? computeAge(person.dateOfBirth) : person.age ?? null;
  const ageGroup = age !== null ? getAgeGroup(age) : null;
  const freshness = computeFreshness(manual);
  const freshLabel = freshnessLabel(manual);
  const relLabel = RELATIONSHIP_LABELS[person.relationshipType || 'other'];

  const freshnessColors: Record<FreshnessStatus, string> = {
    fresh: '#16a34a',
    aging: '#d97706',
    stale: '#9ca3af',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(124,144,130,0.1)', border: '2px solid #7C9082' }}
        >
          <span style={{ fontFamily: 'var(--font-parent-display)', fontSize: '22px', fontWeight: 500, color: '#3A3530' }}>
            {person.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-parent-display)',
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 400,
              color: '#3A3530',
              lineHeight: 1.2,
            }}
          >
            {person.name}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className="text-[11px] px-2 py-0.5 rounded-full"
              style={{
                fontFamily: 'var(--font-parent-body)',
                background: 'rgba(124,144,130,0.08)',
                color: '#5C5347',
                fontWeight: 500,
              }}
            >
              {relLabel}
            </span>
            {age !== null && (
              <span
                className="text-[11px]"
                style={{ fontFamily: 'var(--font-parent-body)', color: '#7C7468' }}
              >
                Age {age}
              </span>
            )}
            {ageGroup && age !== null && age < 18 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  background: 'rgba(212,165,116,0.1)',
                  color: '#92400e',
                  fontWeight: 500,
                }}
              >
                {ageGroupLabel(ageGroup)}
              </span>
            )}
            <span
              className="flex items-center gap-1 text-[11px]"
              style={{ fontFamily: 'var(--font-parent-body)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: freshnessColors[freshness] }} />
              <span style={{ color: '#7C7468' }}>{freshLabel}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
