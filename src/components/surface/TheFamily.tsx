'use client';

import Link from 'next/link';
import Section from '@/components/magazine/Section';
import type { FamilyPill } from '@/types/surface';

interface TheFamilyProps {
  people: FamilyPill[];
}

const FRESHNESS_COLOR = {
  fresh: '#7C9082',
  aging: '#C4A265',
  stale: '#C9BBA8',
} as const;

const RELATIONSHIP_LABEL: Record<string, string> = {
  child: 'Child',
  spouse: 'Partner',
  elderly_parent: 'Parent',
  friend: 'Friend',
  sibling: 'Sibling',
  professional: 'Professional',
  other: 'Family',
};

/**
 * Compact person pills showing who's in the library.
 */
export default function TheFamily({ people }: TheFamilyProps) {
  if (people.length === 0) return null;

  return (
    <Section eyebrow="The library" title="Your people">
      <div className="family-pills">
        {people.map((person) => (
          <Link
            key={person.personId}
            href={person.manualRoute}
            className="family-pill"
          >
            <span
              className="pill-dot"
              style={{ background: FRESHNESS_COLOR[person.freshness] }}
              aria-label={`${person.freshness} data`}
            />
            <span className="pill-name">{person.name}</span>
            <span className="pill-role">
              {RELATIONSHIP_LABEL[person.relationshipType] || 'Family'}
            </span>
            {person.hasNewContribution && (
              <span className="pill-badge" aria-label="New contribution">
                ✦
              </span>
            )}
          </Link>
        ))}
      </div>
      <div className="family-footer">
        <Link href="/family-manual" className="press-link-sm">
          Open the family manual ⟶
        </Link>
      </div>

      <style jsx>{`
        .family-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
        }
        :global(.family-pill) {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px 8px 12px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.025);
          border: 1px solid rgba(0, 0, 0, 0.06);
          text-decoration: none;
          color: inherit;
          transition: all 0.15s ease;
        }
        :global(.family-pill:hover) {
          background: rgba(0, 0, 0, 0.05);
          border-color: rgba(0, 0, 0, 0.1);
        }
        .pill-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .pill-name {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 16px;
          color: #3a3530;
        }
        .pill-role {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.08em;
          color: #8a7b5f;
        }
        .pill-badge {
          font-size: 10px;
          color: #7C9082;
          margin-left: -2px;
        }
        .family-footer {
          margin-top: 20px;
          text-align: center;
        }
        @media (max-width: 720px) {
          .family-pills {
            gap: 8px;
          }
          :global(.family-pill) {
            padding: 6px 12px 6px 10px;
          }
          .pill-name {
            font-size: 14px;
          }
        }
      `}</style>
    </Section>
  );
}
