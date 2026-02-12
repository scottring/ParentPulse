'use client';

import { useState } from 'react';
import type { OnboardingPhaseId } from '@/types/user';
import { PHASE_NAMES, DOMAIN_NAMES, PHASE_DOMAINS } from '@/types/manual';
import { DomainDataView } from '@/components/manual/DomainDataView';
import { EditableDomainView } from '@/components/manual/EditableDomainView';

interface SynthesisReviewProps {
  phaseId: OnboardingPhaseId;
  summary: string;
  structuredData: Record<string, unknown>;
  onApprove: (editedData?: Record<string, unknown>) => void;
  onEdit: () => void;
  isLoading?: boolean;
}

export function SynthesisReview({
  phaseId,
  summary,
  structuredData,
  onApprove,
  isLoading,
}: SynthesisReviewProps) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>(() =>
    JSON.parse(JSON.stringify(structuredData))
  );

  const handleApprove = () => {
    onApprove(editing ? editData : undefined);
  };

  const [domain1, domain2] = PHASE_DOMAINS[phaseId];

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Summary */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-2">
          What I heard — {PHASE_NAMES[phaseId]}
        </h3>
        <p className="text-stone-700 leading-relaxed">{summary}</p>
      </div>

      {/* Domain 1 */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wider">
            {DOMAIN_NAMES[domain1]}
          </h3>
          {editing && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md">Editing</span>
          )}
        </div>
        {editing ? (
          <EditableDomainView
            domainId={domain1}
            data={(editData[domain1] as Record<string, unknown>) || {}}
            onChange={(d) => setEditData({ ...editData, [domain1]: d })}
          />
        ) : (
          <DomainDataView domainId={domain1} data={(editData[domain1] as Record<string, unknown>) || {}} />
        )}
      </div>

      {/* Domain 2 */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wider">
            {DOMAIN_NAMES[domain2]}
          </h3>
        </div>
        {editing ? (
          <EditableDomainView
            domainId={domain2}
            data={(editData[domain2] as Record<string, unknown>) || {}}
            onChange={(d) => setEditData({ ...editData, [domain2]: d })}
          />
        ) : (
          <DomainDataView domainId={domain2} data={(editData[domain2] as Record<string, unknown>) || {}} />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleApprove}
          disabled={isLoading}
          className="flex-1 py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 disabled:opacity-50 font-medium"
        >
          {isLoading ? 'Saving...' : editing ? 'Save adjustments' : 'This looks right'}
        </button>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            disabled={isLoading}
            className="px-6 py-3 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 disabled:opacity-50"
          >
            Let me adjust
          </button>
        )}
        {editing && (
          <button
            onClick={() => {
              setEditData(JSON.parse(JSON.stringify(structuredData)));
              setEditing(false);
            }}
            disabled={isLoading}
            className="px-6 py-3 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
