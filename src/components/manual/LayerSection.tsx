'use client';

import type { DomainId } from '@/types/user';
import type { FreshnessLabel } from '@/types/manual';
import { DOMAIN_NAMES, DOMAIN_DESCRIPTIONS, DOMAIN_ORDER } from '@/types/manual';
import { DomainDataView } from './DomainDataView';
import { EditableDomainView } from './EditableDomainView';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DomainData = Record<string, any>;

const FRESHNESS_COLORS: Record<FreshnessLabel, string> = {
  fresh: 'bg-emerald-400',
  aging: 'bg-amber-400',
  stale: 'bg-stone-300',
};

interface DomainSectionProps {
  domainId: DomainId;
  data: DomainData;
  isExpanded?: boolean;
  onToggle?: () => void;
  freshnessLabel?: FreshnessLabel;
  onRefresh?: () => void;
  onEdit?: () => void;
  editing?: boolean;
  editData?: DomainData;
  onEditChange?: (data: DomainData) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
}

export function DomainSection({
  domainId, data, isExpanded = false, onToggle,
  freshnessLabel, onRefresh, onEdit,
  editing, editData, onEditChange, onSaveEdit, onCancelEdit,
}: DomainSectionProps) {
  const isEmpty = !data || Object.values(data).every(v =>
    Array.isArray(v) ? v.length === 0 : typeof v === 'string' ? !v : !v
  );
  const domainIndex = DOMAIN_ORDER.indexOf(domainId) + 1;

  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-stone-50 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-sm font-semibold text-stone-600 shrink-0 relative">
          {domainIndex}
          {freshnessLabel && (
            <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${FRESHNESS_COLORS[freshnessLabel]}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-stone-900 heading">{DOMAIN_NAMES[domainId]}</h3>
          <p className="text-xs text-stone-400">{DOMAIN_DESCRIPTIONS[domainId]}</p>
        </div>
        {isEmpty ? (
          <span className="text-xs text-stone-300 px-2 py-1 border border-stone-200 rounded-full">Empty</span>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-5 h-5 text-stone-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          >
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {isExpanded && !isEmpty && (
        <div className="px-5 pb-5 pt-1 border-t border-stone-100">
          {editing && editData && onEditChange ? (
            <>
              <EditableDomainView
                domainId={domainId}
                data={editData}
                onChange={onEditChange}
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={onSaveEdit}
                  className="px-4 py-2 bg-stone-900 text-white text-sm rounded-lg hover:bg-stone-800"
                >
                  Save
                </button>
                <button
                  onClick={onCancelEdit}
                  className="px-4 py-2 border border-stone-300 text-stone-600 text-sm rounded-lg hover:bg-stone-50"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <DomainDataView domainId={domainId} data={data} />
              {(onRefresh || onEdit) && (
                <div className="flex gap-2 mt-4 pt-3 border-t border-stone-100">
                  {onRefresh && (
                    <button
                      onClick={onRefresh}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-500 border border-stone-200 rounded-lg hover:bg-stone-50 hover:text-stone-700 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                        <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z" clipRule="evenodd" />
                      </svg>
                      Refresh with AI
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={onEdit}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-500 border border-stone-200 rounded-lg hover:bg-stone-50 hover:text-stone-700 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474Z" />
                        <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9A.75.75 0 0 1 14 9v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
                      </svg>
                      Edit directly
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
