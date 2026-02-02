'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  TechnicalCard,
  TechnicalButton,
  TechnicalLabel,
} from '@/components/technical';
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
  BoltIcon,
  HeartIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import type { ManualProgressStatus } from '@/hooks/useIndividualManualProgress';
import { LAYER_NAMES, getRequirementSectionPath } from '@/hooks/useIndividualManualProgress';
import type { LayerId } from '@/types/household-workbook';

// ==================== Types ====================

interface ManualProgressCardProps {
  personId: string;
  personName: string;
  manualType: 'child' | 'marriage' | 'person';
  progress: ManualProgressStatus;
  onGenerateWorkbook?: () => void;
  isGenerating?: boolean;
  compact?: boolean;
}

// ==================== Icon Map ====================

const LayerIcons: Record<LayerId, React.ComponentType<{ className?: string }>> = {
  1: BoltIcon,
  2: HeartIcon,
  3: ShieldCheckIcon,
  4: SparklesIcon,
  5: ArrowTrendingUpIcon,
  6: StarIcon,
};

// ==================== Component ====================

export default function ManualProgressCard({
  personId,
  personName,
  manualType,
  progress,
  onGenerateWorkbook,
  isGenerating,
  compact = false,
}: ManualProgressCardProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);

  const isComplete = progress.completionPercentage === 100;
  const isReadyForWorkbook = progress.isReadyForWorkbook;

  // Get layers that have requirements
  const activeLayers = Object.entries(progress.layerProgress)
    .filter(([_, data]) => data.total > 0)
    .map(([layerId, data]) => ({
      layerId: Number(layerId) as LayerId,
      ...data,
    }));

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 flex items-center justify-center ${
              isComplete
                ? 'bg-green-100 text-green-600'
                : isReadyForWorkbook
                ? 'bg-amber-100 text-amber-600'
                : 'bg-slate-200 text-slate-500'
            }`}
          >
            {isComplete ? (
              <CheckCircleIcon className="w-5 h-5" />
            ) : (
              <span className="font-mono font-bold text-sm">
                {progress.completionPercentage}%
              </span>
            )}
          </div>
          <div>
            <p className="font-mono font-bold text-sm text-slate-800">
              Manual Progress
            </p>
            <p className="text-xs text-slate-500">
              {progress.metRequirements}/{progress.totalRequirements} requirements met
            </p>
          </div>
        </div>
        {isReadyForWorkbook && onGenerateWorkbook && (
          <TechnicalButton
            variant="primary"
            size="sm"
            onClick={onGenerateWorkbook}
            disabled={isGenerating}
          >
            {isGenerating ? 'GENERATING...' : 'GENERATE'}
          </TechnicalButton>
        )}
      </div>
    );
  }

  return (
    <TechnicalCard shadowSize="md" className="p-0 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Progress Circle */}
          <div className="relative w-14 h-14">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="24"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-slate-200"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${(progress.completionPercentage / 100) * 150.8} 150.8`}
                className={
                  isComplete
                    ? 'text-green-500'
                    : isReadyForWorkbook
                    ? 'text-amber-500'
                    : 'text-slate-400'
                }
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {isComplete ? (
                <CheckCircleIcon className="w-6 h-6 text-green-500" />
              ) : (
                <span className="font-mono font-bold text-sm text-slate-700">
                  {progress.completionPercentage}%
                </span>
              )}
            </div>
          </div>

          <div className="text-left">
            <h3 className="font-mono font-bold text-sm text-slate-800">
              {personName}&apos;s Manual Progress
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isComplete
                ? 'All requirements met'
                : `${progress.missingRequirements.length} requirement${
                    progress.missingRequirements.length === 1 ? '' : 's'
                  } remaining`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isReadyForWorkbook && (
            <TechnicalLabel variant="filled" color="green" size="sm">
              READY
            </TechnicalLabel>
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
          {/* Layer Progress Bars */}
          <div className="p-4 space-y-3">
            <p className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">
              Layer Progress
            </p>
            {activeLayers.map(({ layerId, met, total, percentage }) => {
              const Icon = LayerIcons[layerId];
              const isLayerComplete = met === total;

              return (
                <div key={layerId} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 flex items-center justify-center ${
                      isLayerComplete
                        ? 'bg-green-100 text-green-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-slate-700">
                        L{layerId} {LAYER_NAMES[layerId]}
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        {percentage}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200">
                      <div
                        className={`h-full transition-all ${
                          isLayerComplete ? 'bg-green-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Missing Requirements */}
          {progress.missingRequirements.length > 0 && (
            <div className="p-4 bg-amber-50 border-t border-amber-100">
              <div className="flex items-start gap-2 mb-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="font-mono text-xs text-amber-800">
                  Complete these for workbook generation:
                </p>
              </div>
              <ul className="space-y-2">
                {progress.missingRequirements.map((req) => (
                  <li key={req.requirementId}>
                    <Link
                      href={getRequirementSectionPath(req.requirementId, personId, manualType)}
                      className="flex items-center justify-between p-2 bg-white border border-amber-200 hover:border-amber-400 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-amber-600 font-bold">
                          L{req.layerId}
                        </span>
                        <span className="text-sm text-slate-700 group-hover:text-slate-900">
                          {req.description}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        GO →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Generate Workbook Button */}
          {onGenerateWorkbook && (
            <div className="p-4 bg-slate-50 border-t border-slate-200">
              <TechnicalButton
                variant={isReadyForWorkbook ? 'primary' : 'outline'}
                size="md"
                onClick={onGenerateWorkbook}
                disabled={!isReadyForWorkbook || isGenerating}
                className="w-full"
              >
                {isGenerating
                  ? 'GENERATING WORKBOOK...'
                  : isReadyForWorkbook
                  ? 'GENERATE WEEKLY WORKBOOK'
                  : 'COMPLETE BASELINE FIRST'}
              </TechnicalButton>
              {!isReadyForWorkbook && (
                <p className="text-xs text-slate-500 text-center mt-2">
                  Complete at least {progress.totalRequirements - 1} requirements
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </TechnicalCard>
  );
}
