'use client';

import { useState } from 'react';
import type { DomainId } from '@/types/user';
import { DOMAIN_NAMES } from '@/types/manual';
import { DomainDataView } from './DomainDataView';
import { EditableDomainView } from './EditableDomainView';

interface DomainRefreshReviewProps {
  domainId: DomainId;
  summary: string;
  structuredData: Record<string, unknown>;
  onApprove: (editedData?: Record<string, unknown>) => void;
  isLoading?: boolean;
}

export function DomainRefreshReview({
  domainId,
  summary,
  structuredData,
  onApprove,
  isLoading,
}: DomainRefreshReviewProps) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>(() =>
    JSON.parse(JSON.stringify(structuredData))
  );

  const domainData = (editData[domainId] as Record<string, unknown>) || {};

  const handleApprove = () => {
    onApprove(editing ? editData : undefined);
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Summary */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-2">
          What changed — {DOMAIN_NAMES[domainId]}
        </h3>
        <p className="text-stone-700 leading-relaxed">{summary}</p>
      </div>

      {/* Domain data */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wider">
            Updated {DOMAIN_NAMES[domainId]}
          </h3>
          {editing && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md">Editing</span>
          )}
        </div>
        {editing ? (
          <EditableDomainView
            domainId={domainId}
            data={domainData}
            onChange={(d) => setEditData({ ...editData, [domainId]: d })}
          />
        ) : (
          <DomainDataView domainId={domainId} data={domainData} />
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
