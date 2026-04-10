'use client';

import Link from 'next/link';
import type { UserRole } from '@/hooks/useDashboard';
import { scoreToRelationshipPhrase } from '@/lib/climate-engine';
import { getDimension } from '@/config/relationship-dimensions';
import { computeAge } from '@/utils/age';
import type { WorkbookChapter } from '@/types/workbook';

interface RelationshipCardProps {
  role: UserRole;
  variant: 'spouse' | 'child';
  demoQ?: string;
  activeChapters?: WorkbookChapter[];
}

function climateIcon(score: number): string {
  if (score >= 4.0) return '\u2600\uFE0F'; // sun
  if (score >= 3.5) return '\u26C5';       // sun behind cloud
  if (score >= 3.0) return '\u2601\uFE0F'; // cloud
  if (score >= 2.0) return '\uD83C\uDF25\uFE0F'; // sun behind large cloud
  return '\u26C8\uFE0F'; // cloud with lightning
}

export function RelationshipCard({
  role, variant, demoQ = '', activeChapters = [],
}: RelationshipCardProps) {
  const person = role.otherPerson;

  const avgScore = role.assessments.length > 0
    ? role.assessments.reduce((sum, a) => sum + a.currentScore, 0) / role.assessments.length
    : 0;
  const healthPhrase = scoreToRelationshipPhrase(avgScore, role.domain);

  // Find strongest and weakest dimensions
  const sorted = [...role.assessments]
    .filter(a => a.currentScore > 0)
    .sort((a, b) => b.currentScore - a.currentScore);

  const strongDims = sorted.slice(0, 2).map(a => {
    const dim = getDimension(a.dimensionId);
    return dim?.name || a.dimensionId;
  });

  const watchDim = sorted.length > 0
    ? (() => {
        const weakest = sorted[sorted.length - 1];
        const dim = getDimension(weakest.dimensionId);
        return dim?.name || weakest.dimensionId;
      })()
    : null;

  // Active workbook chapter for this person
  const activeChapter = activeChapters.find(
    c => c.personId === person.personId && c.status === 'active'
  );
  const activeChapterDim = activeChapter
    ? getDimension(activeChapter.dimensionId)?.name || activeChapter.dimensionId
    : null;

  return (
    <div className="glass-card weather-card overflow-hidden">
      <div className="p-5 sm:p-6">

        {/* Top row: name + climate icon */}
        <div className="flex items-start justify-between">
          <h2
            style={{
              fontFamily: 'var(--font-parent-display)',
              fontSize: '28px',
              fontWeight: 500,
              color: 'var(--parent-text)',
              letterSpacing: '-0.01em',
            }}
          >
            {person.name}
          </h2>
          {avgScore > 0 && (
            <span style={{ fontSize: '28px', lineHeight: 1 }}>
              {climateIcon(avgScore)}
            </span>
          )}
        </div>

        {/* Qualitative band — no numbers */}
        {avgScore > 0 && (
          <p
            className="mt-1"
            style={{
              fontFamily: 'var(--font-parent-body)',
              fontSize: '19px',
              fontWeight: 400,
              fontStyle: 'italic',
              color: 'var(--parent-text)',
            }}
          >
            {healthPhrase}
          </p>
        )}

        {/* Strong + Watch dimensions */}
        {sorted.length > 0 && (
          <div className="mt-3 space-y-1">
            {strongDims.length > 0 && (
              <p
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '17px',
                  color: 'var(--parent-text-light)',
                  lineHeight: 1.5,
                }}
              >
                <span style={{ fontWeight: 500, color: 'var(--parent-text)' }}>Strong:</span>{' '}
                {strongDims.join(', ')}
              </p>
            )}
            {watchDim && sorted.length > 2 && (
              <p
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '17px',
                  color: 'var(--parent-text-light)',
                  lineHeight: 1.5,
                }}
              >
                <span style={{ fontWeight: 500, color: 'var(--parent-text)' }}>Watch:</span>{' '}
                {watchDim}
              </p>
            )}
          </div>
        )}

        {/* Active workbook chapter */}
        {activeChapterDim && (
          <p
            className="mt-3"
            style={{
              fontFamily: 'var(--font-parent-body)',
              fontSize: '17px',
              color: 'var(--parent-text-light)',
              lineHeight: 1.5,
            }}
          >
            <span style={{ fontWeight: 500, color: 'var(--parent-text)' }}>Working on:</span>{' '}
            <Link
              href="/journal"
              className="hover:opacity-70"
              style={{ color: 'var(--parent-primary)' }}
            >
              {activeChapterDim}
            </Link>
          </p>
        )}

        {/* Action links — micro labels */}
        <div className="flex items-center gap-4 mt-4 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
          {[
            { href: `/people/${person.personId}/manual${demoQ ? `?${demoQ.slice(1)}` : ''}`, label: 'Manual' },
            { href: '/journal', label: 'Workbook' },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[14px] tracking-wide uppercase hover:opacity-70"
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: 'var(--parent-text-light)',
                opacity: 0.6,
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
