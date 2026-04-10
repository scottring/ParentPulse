'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { PersonCompleteness, FreshnessStatus } from '@/lib/freshness-engine';

interface FamilyConstellationProps {
  people: PersonCompleteness[];
  insights?: Array<{ id: string; text: string; route?: string }>;
}

/**
 * FamilyConstellation — family tree with brass compass completeness ring
 * and parchment insight cards with watercolor accents.
 */
export function FamilyConstellation({ people, insights }: FamilyConstellationProps) {
  if (people.length === 0) {
    return (
      <div className="parchment-card p-8 text-center">
        <p className="storybook-heading text-xl mb-2">Your Family Tree</p>
        <p className="storybook-body text-sm" style={{ color: '#5F564B' }}>
          Add people to start growing your family tree.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Family members as tree nodes */}
      <div className="flex flex-wrap justify-center gap-4 py-3">
        {people.map((person, i) => (
          <FamilyTreeNode key={person.personId} person={person} isFirst={i === 0} />
        ))}
      </div>

      {/* Insight cards — parchment torn-edge style */}
      {insights && insights.length > 0 && (
        <div className="space-y-3 mt-4">
          <span className="storybook-label">Needs Attention</span>
          {insights.slice(0, 3).map((insight) => (
            <ParchmentInsight key={insight.id} text={insight.text} route={insight.route} />
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== Family Tree Node ====================

function FamilyTreeNode({ person, isFirst }: { person: PersonCompleteness; isFirst: boolean }) {
  const ringColor = freshnessToColor(person.freshness);
  const size = isFirst ? 56 : 48;

  return (
    <Link
      href={`/people/${person.personId}/manual`}
      className="flex flex-col items-center gap-1.5 group"
    >
      {/* Avatar with tree ring */}
      <div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: size,
          height: size,
          background: `linear-gradient(145deg, #F5EDE4, #EDE3D4)`,
          border: `3px solid ${ringColor}`,
          boxShadow: `
            0 3px 12px rgba(60, 40, 20, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.5),
            inset 0 -2px 4px rgba(100, 70, 40, 0.08)
          `,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {/* Tree icon SVG inside the avatar */}
        <svg viewBox="0 0 32 32" width={size * 0.5} height={size * 0.5}>
          <defs>
            <linearGradient id={`tree-${person.personId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ringColor} stopOpacity="0.8" />
              <stop offset="100%" stopColor={ringColor} stopOpacity="0.4" />
            </linearGradient>
          </defs>
          {/* Trunk */}
          <rect x="14.5" y="20" width="3" height="8" rx="1" fill="#8B6F4E" opacity="0.6" />
          {/* Canopy layers */}
          <ellipse cx="16" cy="14" rx="10" ry="10" fill={`url(#tree-${person.personId})`} />
          <ellipse cx="12" cy="12" rx="6" ry="7" fill={ringColor} opacity="0.3" />
          <ellipse cx="20" cy="13" rx="5" ry="6" fill={ringColor} opacity="0.2" />
        </svg>

        {/* Status badge */}
        {person.status === 'stale' && (
          <div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[11px]"
            style={{
              background: '#D97706',
              color: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              fontWeight: 700,
            }}
          >
            !
          </div>
        )}
        {person.status === 'empty' && (
          <div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[11px]"
            style={{
              background: '#B8A898',
              color: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              fontWeight: 700,
            }}
          >
            +
          </div>
        )}
      </div>

      {/* Name */}
      <span
        className="storybook-body text-[16px] font-medium group-hover:opacity-70 transition-opacity"
        style={{ color: '#5C5347' }}
      >
        {person.name.split(' ')[0]}
      </span>
    </Link>
  );
}

// ==================== Parchment Insight Card ====================

function ParchmentInsight({ text, route }: { text: string; route?: string }) {
  const content = (
    <div className="parchment-card-torn p-4 flex items-start gap-3">
      {/* Decorative watercolor dot */}
      <div
        className="shrink-0 mt-1 w-3 h-3 rounded-full"
        style={{
          background: 'radial-gradient(circle, #B8A0D4 0%, #9B7EC4 50%, transparent 70%)',
          opacity: 0.7,
        }}
      />
      <p
        className="storybook-body text-[17px] leading-relaxed"
        style={{ color: '#5C5347' }}
      >
        {text}
      </p>
    </div>
  );

  if (route) {
    return <Link href={route} className="block hover:opacity-80 transition-opacity">{content}</Link>;
  }
  return content;
}

// ==================== Helpers ====================

function freshnessToColor(freshness: FreshnessStatus): string {
  switch (freshness) {
    case 'fresh': return '#7C9082';
    case 'aging': return '#C4956A';
    case 'stale': return '#B87B5E';
  }
}
