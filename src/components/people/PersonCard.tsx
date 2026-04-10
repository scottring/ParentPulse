'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Person } from '@/types/person-manual';
import { ManualSummary, ContributorInfo } from '@/hooks/useManualSummaries';
import { computeAge } from '@/utils/age';
import JourneyTimeline from './JourneyTimeline';
import {
  EllipsisVerticalIcon,
  PencilIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

interface PersonCardProps {
  person: Person;
  index: number;
  hasManual: boolean;
  summary?: ManualSummary;
  summaryLoading?: boolean;
  isTwin?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export default function PersonCard({
  person,
  index,
  hasManual,
  summary,
  summaryLoading,
  isTwin,
  onEdit,
  onDelete,
}: PersonCardProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleClick = () => {
    if (hasManual) {
      router.push(`/people/${person.personId}/manual`);
    } else {
      router.push(`/people/${person.personId}/create-manual`);
    }
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onEdit();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onDelete();
  };

  const personAge = person.dateOfBirth ? computeAge(person.dateOfBirth) : null;

  // Compute summary line
  const getSummaryLine = (): string => {
    if (!summary) return '';
    const complete = summary.contributors.filter(c => c.status === 'complete').length;
    const total = summary.contributors.length;
    const drafts = summary.draftsInProgress;

    if (complete === 0 && drafts === 0) return 'No perspectives yet';
    if (drafts > 0 && complete === 0) return `${drafts} in progress`;
    if (drafts > 0) return `${complete} complete, ${drafts} in progress`;
    return `${complete} perspective${complete !== 1 ? 's' : ''} complete`;
  };

  // Get the primary CTA
  const getPrimaryCta = (): { label: string; url: string } | null => {
    if (!summary) return null;
    for (const step of summary.journeySteps) {
      if (step.status === 'in-progress' && step.actionUrl) {
        return { label: `Continue: ${step.label}`, url: step.actionUrl };
      }
    }
    for (const step of summary.journeySteps) {
      if (step.status === 'not-started' && step.actionUrl) {
        return { label: `Start: ${step.label}`, url: step.actionUrl };
      }
    }
    return null;
  };

  return (
    <div className="relative">
      <div
        className="relative transition-all rounded-xl overflow-hidden"
        style={{
          background: hasManual
            ? 'rgba(255,255,255,0.7)'
            : 'rgba(124,144,130,0.06)',
          backdropFilter: 'blur(12px)',
          border: hasManual
            ? '1px solid rgba(255,255,255,0.4)'
            : '1px solid rgba(124,144,130,0.3)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
        data-testid="person-card"
      >
        {/* Card number label */}
        <div
          className="absolute -top-2 -left-2 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
          style={{
            fontFamily: 'var(--font-parent-body)',
            background: hasManual ? '#3A3530' : '#7C9082',
          }}
        >
          {String(index + 1).padStart(2, '0')}
        </div>

        {/* Menu button */}
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 rounded-full hover:bg-black/5 transition-colors"
            style={{ fontFamily: 'var(--font-parent-body)', color: '#5F564B' }}
            data-testid="person-menu-button"
          >
            <EllipsisVerticalIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Clickable card body */}
        <div
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          }}
          className="cursor-pointer p-6"
        >
          {/* Header: Name + badges */}
          <div className="flex items-center gap-2 mb-1">
            <h3
              className="text-xl font-medium"
              style={{
                fontFamily: 'var(--font-parent-display)',
                color: '#3A3530',
              }}
            >
              {person.name}
            </h3>
            {isTwin && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  background: 'rgba(147,130,195,0.12)',
                  color: '#7a6b8f',
                  border: '1px solid rgba(147,130,195,0.2)',
                }}
              >
                Twin
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mb-4">
            <span
              className="text-xs tracking-wide capitalize"
              style={{
                fontFamily: 'var(--font-parent-body)',
                color: '#5F564B',
              }}
            >
              {person.relationshipType || 'Unspecified'}
            </span>
            {personAge !== null && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  color: '#5C5347',
                  background: 'rgba(124,144,130,0.08)',
                  border: '1px solid rgba(124,144,130,0.15)',
                }}
              >
                Age {personAge}
              </span>
            )}
          </div>

          {/* Active manual card content */}
          {hasManual && summary && !summaryLoading ? (
            <>
              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span
                    className="text-xs"
                    style={{ fontFamily: 'var(--font-parent-body)', color: '#6B6254' }}
                  >
                    Progress
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ fontFamily: 'var(--font-parent-body)', color: '#5C5347' }}
                  >
                    {summary.overallProgress}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${summary.overallProgress}%`,
                      background: summary.overallProgress >= 80
                        ? '#4ade80'
                        : summary.overallProgress >= 40
                        ? '#7C9082'
                        : '#B8B0A6',
                    }}
                  />
                </div>
              </div>

              {/* Summary line */}
              <p
                className="text-xs mb-3"
                style={{ fontFamily: 'var(--font-parent-body)', color: '#5F564B' }}
              >
                {getSummaryLine()}
                {summary.hasSynthesis && (
                  <span className="ml-2 font-medium" style={{ color: '#16a34a' }}>Synthesized</span>
                )}
              </p>

              {/* Primary CTA */}
              {getPrimaryCta() && (
                <div
                  className="text-xs px-3 py-2 mb-3 text-center rounded-full font-medium"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    color: '#7C9082',
                    background: 'rgba(124,144,130,0.08)',
                    border: '1px solid rgba(124,144,130,0.2)',
                  }}
                >
                  {getPrimaryCta()!.label}
                </div>
              )}

              {/* View manual link */}
              <div
                className="text-center text-xs font-medium"
                style={{ fontFamily: 'var(--font-parent-body)', color: '#3A3530' }}
              >
                View Manual &rarr;
              </div>
            </>
          ) : hasManual && summaryLoading ? (
            <div className="space-y-2 mb-4">
              <div className="h-4 rounded-full animate-pulse" style={{ background: 'rgba(0,0,0,0.06)' }} />
              <div className="h-4 rounded-full animate-pulse w-3/4" style={{ background: 'rgba(0,0,0,0.06)' }} />
              <div className="h-4 rounded-full animate-pulse w-1/2" style={{ background: 'rgba(0,0,0,0.06)' }} />
              <div
                className="mt-4 text-center text-xs font-medium"
                style={{ fontFamily: 'var(--font-parent-body)', color: '#3A3530' }}
              >
                View Manual &rarr;
              </div>
            </div>
          ) : (
            <>
              <div
                className="inline-block px-3 py-1 rounded-full text-xs mb-4 text-white"
                style={{ fontFamily: 'var(--font-parent-body)', background: '#3A3530' }}
              >
                Pending
              </div>
              <div className="space-y-2 mb-6 pb-6" style={{ borderBottom: '1px solid rgba(124,144,130,0.15)' }}>
                <div className="flex justify-between text-xs" style={{ fontFamily: 'var(--font-parent-body)' }}>
                  <span style={{ color: '#6B6254' }}>Status:</span>
                  <span style={{ color: '#7C9082' }}>Uninitialized</span>
                </div>
              </div>
              <div
                className="text-center text-xs font-medium"
                style={{ fontFamily: 'var(--font-parent-body)', color: '#7C9082' }}
              >
                Create Manual &rarr;
              </div>
            </>
          )}
        </div>

        {/* Expand toggle — only for cards with manuals */}
        {hasManual && summary && !summaryLoading && (
          <button
            onClick={handleExpand}
            className="w-full px-6 py-2 flex items-center justify-center gap-1 hover:bg-black/[0.02] transition-colors"
            style={{ borderTop: '1px solid rgba(255,255,255,0.4)' }}
          >
            <span
              className="text-xs"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#6B6254' }}
            >
              {expanded ? 'Less' : 'Details'}
            </span>
            {expanded ? (
              <ChevronUpIcon className="w-3 h-3" style={{ color: '#6B6254' }} />
            ) : (
              <ChevronDownIcon className="w-3 h-3" style={{ color: '#6B6254' }} />
            )}
          </button>
        )}

        {/* Expanded content */}
        {expanded && summary && (
          <div className="px-6 pb-6 pt-4 space-y-5" style={{ borderTop: '1px solid rgba(255,255,255,0.4)' }}>
            {/* Contributor Matrix */}
            <div>
              <div
                className="text-xs tracking-wide mb-3"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  color: '#6B6254',
                  fontWeight: 500,
                }}
              >
                Contributors
              </div>
              <div className="space-y-2">
                {summary.contributors.map((contributor, i) => (
                  <ContributorRow key={`${contributor.contributorId}-${contributor.perspectiveType}-${i}`} contributor={contributor} />
                ))}
                {summary.contributors.length === 0 && (
                  <p
                    className="text-xs"
                    style={{ fontFamily: 'var(--font-parent-body)', color: '#6B6254' }}
                  >
                    No contributors yet
                  </p>
                )}
              </div>
            </div>

            {/* Journey Timeline */}
            <div>
              <div
                className="text-xs tracking-wide mb-3"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  color: '#6B6254',
                  fontWeight: 500,
                }}
              >
                Journey
              </div>
              <JourneyTimeline steps={summary.journeySteps} />
            </div>
          </div>
        )}
      </div>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setShowMenu(false)}
          />
          <div
            className="absolute right-2 top-12 z-30 rounded-xl overflow-hidden min-w-[140px]"
            style={{
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.4)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleEdit}
              className="w-full px-4 py-3 text-left text-xs hover:bg-black/[0.03] transition-colors flex items-center gap-2"
              style={{
                fontFamily: 'var(--font-parent-body)',
                color: '#3A3530',
                borderBottom: '1px solid rgba(255,255,255,0.4)',
              }}
              data-testid="edit-person-button"
            >
              <PencilIcon className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="w-full px-4 py-3 text-left text-xs hover:bg-red-50/50 transition-colors text-red-600 flex items-center gap-2"
              style={{ fontFamily: 'var(--font-parent-body)' }}
              data-testid="delete-person-button"
            >
              <XMarkIcon className="w-4 h-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ContributorRow({ contributor }: { contributor: ContributorInfo }) {
  const initial = contributor.contributorName.charAt(0).toUpperCase();
  const isKidObserver = contributor.relationshipToSubject === 'child-observer';
  const isChildSession = contributor.relationshipToSubject === 'child-session';
  const roleLabel = contributor.perspectiveType === 'self'
    ? (isChildSession ? 'Kid Self' : 'Self')
    : (isKidObserver ? 'Kid Obs' : 'Observer');

  return (
    <div className="flex items-center gap-3">
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
        style={{
          fontFamily: 'var(--font-parent-body)',
          background: contributor.status === 'complete'
            ? 'rgba(22,163,74,0.1)'
            : contributor.status === 'draft'
            ? 'rgba(124,144,130,0.1)'
            : 'rgba(0,0,0,0.04)',
          color: contributor.status === 'complete'
            ? '#16a34a'
            : contributor.status === 'draft'
            ? '#7C9082'
            : '#6B6254',
          border: `1px solid ${
            contributor.status === 'complete'
              ? 'rgba(22,163,74,0.2)'
              : contributor.status === 'draft'
              ? 'rgba(124,144,130,0.2)'
              : 'rgba(0,0,0,0.08)'
          }`,
        }}
      >
        {initial}
      </div>

      {/* Name + role */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="text-xs font-medium truncate"
            style={{ fontFamily: 'var(--font-parent-body)', color: '#3A3530' }}
          >
            {contributor.contributorName}
          </span>
          <span
            className="px-1.5 py-0.5 text-xs rounded-full"
            style={{
              fontFamily: 'var(--font-parent-body)',
              fontSize: '17px',
              background: contributor.perspectiveType === 'self'
                ? 'rgba(59,130,246,0.08)'
                : 'rgba(0,0,0,0.04)',
              color: contributor.perspectiveType === 'self'
                ? '#3b82f6'
                : '#5F564B',
              border: `1px solid ${
                contributor.perspectiveType === 'self'
                  ? 'rgba(59,130,246,0.15)'
                  : 'rgba(0,0,0,0.06)'
              }`,
            }}
          >
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {contributor.status === 'complete' ? (
          <span
            className="text-xs font-medium"
            style={{ fontFamily: 'var(--font-parent-body)', color: '#16a34a' }}
          >
            Done
          </span>
        ) : (
          <div className="flex items-center gap-1.5">
            <div
              className="w-12 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(0,0,0,0.06)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, contributor.progressPercent)}%`,
                  background: '#7C9082',
                }}
              />
            </div>
            <span
              className="text-xs w-8 text-right"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#7C9082' }}
            >
              {contributor.progressPercent}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
