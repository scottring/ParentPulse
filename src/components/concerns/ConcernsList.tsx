'use client';

import { useState } from 'react';
import { TechnicalCard, TechnicalButton, TechnicalLabel } from '@/components/technical';
import { useConcerns } from '@/hooks/useConcerns';
import { useAuth } from '@/context/AuthContext';
import type { Concern, ConcernUrgency } from '@/types/household-workbook';
import { CONCERN_URGENCY_LABELS } from '@/types/household-workbook';

interface ConcernsListProps {
  showAll?: boolean; // Show all concerns including addressed/dismissed
  onMakeFocus?: (concern: Concern) => void; // Callback to make a concern the weekly focus
  className?: string;
}

export function ConcernsList({
  showAll = false,
  onMakeFocus,
  className = '',
}: ConcernsListProps) {
  const { user } = useAuth();
  const {
    concerns,
    activeConcerns,
    loading,
    dismissConcern,
    markAddressed,
    deleteConcern,
  } = useConcerns(user?.familyId);

  const [expandedConcern, setExpandedConcern] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const displayConcerns = showAll ? concerns : activeConcerns;

  // Sort by urgency (need-soon first) then by date
  const sortedConcerns = [...displayConcerns].sort((a, b) => {
    const urgencyOrder: Record<ConcernUrgency, number> = {
      'need-soon': 0,
      'simmering': 1,
      'can-wait': 2,
    };
    if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    }
    return b.createdAt.toMillis() - a.createdAt.toMillis();
  });

  if (loading) {
    return (
      <div className={`p-4 text-center ${className}`}>
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto" />
        <p className="font-mono text-xs text-slate-500 mt-2">Loading concerns...</p>
      </div>
    );
  }

  if (sortedConcerns.length === 0) {
    return (
      <TechnicalCard shadowSize="sm" className={`p-6 text-center ${className}`}>
        <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 border-2 border-slate-300 flex items-center justify-center">
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-mono text-sm text-slate-600">No concerns logged</p>
        <p className="font-mono text-[10px] text-slate-400 mt-1">
          Use &quot;What&apos;s on your mind?&quot; to capture something
        </p>
      </TechnicalCard>
    );
  }

  const getUrgencyStyles = (urgency: ConcernUrgency, status: Concern['status']) => {
    if (status !== 'active') {
      return {
        border: 'border-slate-200',
        bg: 'bg-slate-50',
        labelColor: 'slate' as const,
      };
    }
    switch (urgency) {
      case 'need-soon':
        return {
          border: 'border-red-300',
          bg: 'bg-red-50',
          labelColor: 'red' as const,
        };
      case 'simmering':
        return {
          border: 'border-amber-300',
          bg: 'bg-amber-50',
          labelColor: 'amber' as const,
        };
      case 'can-wait':
      default:
        return {
          border: 'border-slate-300',
          bg: 'bg-white',
          labelColor: 'slate' as const,
        };
    }
  };

  const formatDate = (timestamp: { toDate: () => Date }) => {
    const date = timestamp.toDate();
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {sortedConcerns.map((concern) => {
        const styles = getUrgencyStyles(concern.urgency, concern.status);
        const isExpanded = expandedConcern === concern.concernId;
        const isConfirmingDelete = confirmDelete === concern.concernId;

        return (
          <div
            key={concern.concernId}
            className={`border-2 ${styles.border} ${styles.bg} transition-all`}
          >
            {/* Main row */}
            <button
              onClick={() => setExpandedConcern(isExpanded ? null : concern.concernId)}
              className="w-full p-4 text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <TechnicalLabel
                      variant="filled"
                      color={styles.labelColor}
                      size="sm"
                    >
                      {CONCERN_URGENCY_LABELS[concern.urgency].label}
                    </TechnicalLabel>
                    {concern.status !== 'active' && (
                      <TechnicalLabel variant="outline" color="slate" size="sm">
                        {concern.status === 'addressed' ? 'ADDRESSED' : 'DISMISSED'}
                      </TechnicalLabel>
                    )}
                    <span className="font-mono text-[10px] text-slate-400">
                      {formatDate(concern.createdAt)}
                    </span>
                  </div>
                  <p className={`text-sm ${concern.status === 'active' ? 'text-slate-800' : 'text-slate-500'}`}>
                    {concern.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {concern.involvedPersonNames.map((name, idx) => (
                      <span
                        key={idx}
                        className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="font-mono text-xs text-slate-400">
                  {isExpanded ? '▼' : '▶'}
                </span>
              </div>
            </button>

            {/* Expanded actions */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-2 border-t border-slate-200">
                {isConfirmingDelete ? (
                  <div className="p-3 bg-red-50 border border-red-200">
                    <p className="font-mono text-xs text-red-700 mb-3">
                      Delete this concern permanently?
                    </p>
                    <div className="flex gap-2">
                      <TechnicalButton
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          deleteConcern(concern.concernId);
                          setConfirmDelete(null);
                        }}
                      >
                        YES, DELETE
                      </TechnicalButton>
                      <TechnicalButton
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmDelete(null)}
                      >
                        CANCEL
                      </TechnicalButton>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {concern.status === 'active' && (
                      <>
                        {onMakeFocus && (
                          <TechnicalButton
                            variant="primary"
                            size="sm"
                            onClick={() => onMakeFocus(concern)}
                          >
                            MAKE THIS A FOCUS
                          </TechnicalButton>
                        )}
                        <TechnicalButton
                          variant="secondary"
                          size="sm"
                          onClick={() => markAddressed(concern.concernId)}
                        >
                          MARK ADDRESSED
                        </TechnicalButton>
                        <TechnicalButton
                          variant="outline"
                          size="sm"
                          onClick={() => dismissConcern(concern.concernId)}
                        >
                          DISMISS
                        </TechnicalButton>
                      </>
                    )}
                    <TechnicalButton
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDelete(concern.concernId)}
                    >
                      DELETE
                    </TechnicalButton>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ConcernsList;
