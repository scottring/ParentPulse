'use client';

import { useState } from 'react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  LightBulbIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import type {
  MultiPerspectiveItem,
  ManualInput,
  PerspectiveDiscrepancy,
} from '@/types/multi-perspective';

// ==================== Types ====================

interface PerspectiveViewProps {
  item: MultiPerspectiveItem;
  title: string;
  onEdit?: () => void;
  onAddObservation?: () => void;
  compact?: boolean;
}

interface InputCardProps {
  input: ManualInput;
  isAgreement?: boolean;
}

interface DiscrepancyCardProps {
  discrepancy: PerspectiveDiscrepancy;
}

// ==================== Sub-Components ====================

function InputCard({ input, isAgreement }: InputCardProps) {
  return (
    <div
      className={`p-3 border ${
        isAgreement
          ? 'border-green-200 bg-green-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`px-2 py-0.5 font-mono text-xs font-bold ${
            input.respondentType === 'self'
              ? 'bg-blue-100 text-blue-700'
              : input.respondentType === 'parent'
              ? 'bg-amber-100 text-amber-700'
              : input.respondentType === 'partner'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {input.respondentName}
        </span>
        <span className="font-mono text-xs text-slate-400">
          ({input.respondentType})
        </span>
      </div>
      <p className="font-mono text-sm text-slate-700 leading-relaxed">
        {typeof input.response === 'string'
          ? input.response
          : Array.isArray(input.response)
          ? input.response.join(', ')
          : String(input.response)}
      </p>
    </div>
  );
}

function DiscrepancyCard({ discrepancy }: DiscrepancyCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-amber-200 bg-amber-50 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-amber-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChatBubbleLeftRightIcon className="w-4 h-4 text-amber-600" />
          <span className="font-mono text-sm font-bold text-amber-800">
            {discrepancy.topic}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="w-4 h-4 text-amber-600" />
        ) : (
          <ChevronDownIcon className="w-4 h-4 text-amber-600" />
        )}
      </button>

      {isExpanded && (
        <div className="p-3 border-t border-amber-200 space-y-3">
          {/* Individual perspectives */}
          {Object.entries(discrepancy.perspectives).map(([name, view]) => (
            <div key={name} className="flex gap-2">
              <span className="font-mono text-xs font-bold text-amber-700 min-w-[60px]">
                {name}:
              </span>
              <p className="font-mono text-xs text-slate-700">{view}</p>
            </div>
          ))}

          {/* AI note explaining discrepancy */}
          {discrepancy.note && (
            <div className="mt-3 p-2 bg-white border border-amber-300 flex gap-2">
              <LightBulbIcon className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="font-mono text-xs text-slate-600 italic">
                {discrepancy.note}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== Main Component ====================

export default function PerspectiveView({
  item,
  title,
  onEdit,
  onAddObservation,
  compact = false,
}: PerspectiveViewProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);

  const hasSynthesis = !!item.synthesis;
  const hasDiscrepancies = (item.synthesis?.discrepancies?.length ?? 0) > 0;
  const confidenceLevel = item.synthesis?.confidence ?? 0;

  // Confidence display
  const confidenceColor =
    confidenceLevel >= 0.8
      ? 'text-green-600'
      : confidenceLevel >= 0.5
      ? 'text-amber-600'
      : 'text-red-600';
  const confidenceLabel =
    confidenceLevel >= 0.8
      ? 'High Agreement'
      : confidenceLevel >= 0.5
      ? 'Moderate Agreement'
      : 'Mixed Views';

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-3">
          <UserGroupIcon className="w-5 h-5 text-slate-500" />
          <div>
            <p className="font-mono font-bold text-sm text-slate-800">{title}</p>
            <p className="text-xs text-slate-500">
              {item.inputs.length} perspective{item.inputs.length !== 1 ? 's' : ''}
              {hasSynthesis && ` • ${confidenceLabel}`}
            </p>
          </div>
        </div>
        {hasDiscrepancies && (
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <UserGroupIcon className="w-5 h-5 text-slate-600" />
          <div className="text-left">
            <h4 className="font-mono font-bold text-sm text-slate-800">{title}</h4>
            <p className="text-xs text-slate-500">
              {item.inputs.length} perspective{item.inputs.length !== 1 ? 's' : ''} collected
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasSynthesis && (
            <div className="flex items-center gap-2">
              <span className={`font-mono text-xs font-bold ${confidenceColor}`}>
                {Math.round(confidenceLevel * 100)}%
              </span>
              {hasDiscrepancies ? (
                <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
              ) : (
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
              )}
            </div>
          )}
          {isExpanded ? (
            <ChevronUpIcon className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-200">
          {/* Synthesis Summary */}
          {hasSynthesis && item.synthesis?.summary && (
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <p className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-2">
                Synthesized Understanding
              </p>
              <p className="font-mono text-sm text-slate-700 leading-relaxed">
                {item.synthesis.summary}
              </p>
            </div>
          )}

          {/* Agreements */}
          {hasSynthesis && (item.synthesis?.agreements?.length ?? 0) > 0 && (
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircleIcon className="w-4 h-4 text-green-600" />
                <p className="font-mono text-xs text-slate-500 uppercase tracking-wider">
                  All Agree
                </p>
              </div>
              <ul className="space-y-2">
                {item.synthesis?.agreements.map((agreement, idx) => (
                  <li
                    key={idx}
                    className="font-mono text-sm text-slate-700 pl-4 border-l-2 border-green-400"
                  >
                    {agreement}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Discrepancies */}
          {hasDiscrepancies && (
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <ChatBubbleLeftRightIcon className="w-4 h-4 text-amber-600" />
                <p className="font-mono text-xs text-slate-500 uppercase tracking-wider">
                  Different Observations
                </p>
              </div>
              <div className="space-y-2">
                {item.synthesis?.discrepancies.map((discrepancy, idx) => (
                  <DiscrepancyCard key={idx} discrepancy={discrepancy} />
                ))}
              </div>
            </div>
          )}

          {/* Raw Inputs */}
          <div className="p-4">
            <p className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">
              Individual Perspectives
            </p>
            <div className="space-y-2">
              {item.inputs.map((input) => (
                <InputCard key={input.inputId} input={input} />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-4 py-2 border-2 border-slate-300 bg-white font-mono text-xs font-bold text-slate-700 hover:border-slate-800 transition-all"
              >
                Edit Synthesis
              </button>
            )}
            {onAddObservation && (
              <button
                onClick={onAddObservation}
                className="px-4 py-2 border-2 border-amber-300 bg-amber-50 font-mono text-xs font-bold text-amber-700 hover:border-amber-600 transition-all"
              >
                + Add My Observation
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== Status Indicator Component ====================

interface PerspectiveStatusProps {
  inputs: ManualInput[];
  requiredRespondents: string[];
  className?: string;
}

export function PerspectiveStatus({
  inputs,
  requiredRespondents,
  className = '',
}: PerspectiveStatusProps) {
  const respondentTypes = new Set(inputs.map((i) => i.respondentType));
  const missingRequired = requiredRespondents.filter(
    (r) => !respondentTypes.has(r as any)
  );

  if (missingRequired.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <CheckCircleIcon className="w-4 h-4 text-green-600" />
        <span className="font-mono text-xs text-green-700">
          All perspectives collected
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
      <span className="font-mono text-xs text-amber-700">
        Waiting for: {missingRequired.join(', ')}
      </span>
    </div>
  );
}
