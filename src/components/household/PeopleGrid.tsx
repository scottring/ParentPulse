'use client';

import React from 'react';
import Link from 'next/link';
import { TechnicalCard, SectionHeader, TechnicalLabel } from '../technical';

interface FamilyMember {
  personId: string;
  name: string;
  role: 'parent' | 'child' | 'other';
  avatarUrl?: string;
  hasManual: boolean;
}

interface PeopleGridProps {
  members: FamilyMember[];
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getRoleLabel(role: FamilyMember['role']): string {
  switch (role) {
    case 'parent': return 'PARENT';
    case 'child': return 'CHILD';
    case 'other': return 'OTHER';
  }
}

export function PeopleGrid({ members, className = '' }: PeopleGridProps) {
  return (
    <div className={className}>
      <SectionHeader
        number={1}
        title="HOUSEHOLD MEMBERS"
        className="mb-4"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {members.map((member) => (
          <Link
            key={member.personId}
            href={member.hasManual ? `/people/${member.personId}/manual` : '#'}
            className={member.hasManual ? '' : 'pointer-events-none'}
          >
            <TechnicalCard
              shadowSize="sm"
              className={`
                p-4 text-center
                ${member.hasManual ? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer' : 'opacity-70'}
              `}
            >
              {/* Avatar */}
              <div className="flex justify-center mb-3">
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.name}
                    className="w-16 h-16 rounded-full border-2 border-slate-800 object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-slate-800 flex items-center justify-center">
                    <span className="font-mono font-bold text-lg text-slate-600">
                      {getInitials(member.name)}
                    </span>
                  </div>
                )}
              </div>

              {/* Name */}
              <h3 className="font-mono font-bold text-slate-800 truncate">
                {member.name}
              </h3>

              {/* Role label */}
              <TechnicalLabel
                variant="outline"
                color={member.role === 'parent' ? 'blue' : member.role === 'child' ? 'amber' : 'slate'}
                size="xs"
                className="mt-2"
              >
                {getRoleLabel(member.role)}
              </TechnicalLabel>

              {/* Manual status */}
              {member.hasManual && (
                <div className="mt-2 font-mono text-[10px] text-green-600 uppercase">
                  \u2713 Manual Created
                </div>
              )}
            </TechnicalCard>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default PeopleGrid;
