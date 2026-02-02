'use client';

import {
  CheckCircleIcon,
  ClockIcon,
  LockClosedIcon,
  PlayIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import type { LayerOnboardingStatus } from '@/types/onboarding-progress';
import type { LayerId } from '@/types/assessment';
import { TechnicalCard } from '@/components/technical';
import { LAYER_DISPLAY_NAMES, LAYER_DESCRIPTIONS } from '@/types/onboarding-progress';

// ==================== Types ====================

interface LayerProgressProps {
  layer: LayerOnboardingStatus;
  isCurrentLayer: boolean;
  isLocked: boolean;
  onStart?: () => void;
  onContinue?: () => void;
  onView?: () => void;
}

// ==================== Sub-Components ====================

function ProgressBar({
  percentage,
  color = 'amber',
}: {
  percentage: number;
  color?: 'amber' | 'green' | 'blue';
}) {
  const colorClasses = {
    amber: 'bg-amber-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
  };

  return (
    <div className="w-full h-2 bg-slate-200 overflow-hidden">
      <div
        className={`h-full ${colorClasses[color]} transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: LayerOnboardingStatus['status'];
}) {
  const config = {
    not_started: {
      label: 'Not Started',
      bgColor: 'bg-slate-100',
      textColor: 'text-slate-600',
      icon: null,
    },
    in_progress: {
      label: 'In Progress',
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-700',
      icon: <ClockIcon className="w-3 h-3" />,
    },
    awaiting_input: {
      label: 'Awaiting Input',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      icon: <UserGroupIcon className="w-3 h-3" />,
    },
    synthesizing: {
      label: 'Synthesizing',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-700',
      icon: <ClockIcon className="w-3 h-3" />,
    },
    complete: {
      label: 'Complete',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      icon: <CheckCircleIcon className="w-3 h-3" />,
    },
  };

  const { label, bgColor, textColor, icon } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 ${bgColor} ${textColor} font-mono text-xs font-bold`}
    >
      {icon}
      {label}
    </span>
  );
}

// ==================== Main Component ====================

export default function LayerProgress({
  layer,
  isCurrentLayer,
  isLocked,
  onStart,
  onContinue,
  onView,
}: LayerProgressProps) {
  const layerName = LAYER_DISPLAY_NAMES[layer.layerId as LayerId] || layer.layerName;
  const layerDescription = LAYER_DESCRIPTIONS[layer.layerId as LayerId] || '';

  const overallPercentage = Math.round(
    (layer.contentPercentage + layer.perspectivePercentage) / 2
  );

  const handleAction = () => {
    if (isLocked) return;
    if (layer.status === 'complete' && onView) {
      onView();
    } else if (layer.status === 'not_started' && onStart) {
      onStart();
    } else if (onContinue) {
      onContinue();
    }
  };

  return (
    <TechnicalCard
      shadowSize={isCurrentLayer ? 'md' : 'sm'}
      className={`p-0 overflow-hidden transition-all ${
        isCurrentLayer
          ? 'border-amber-500 border-2'
          : isLocked
          ? 'opacity-60'
          : 'hover:border-slate-400'
      }`}
    >
      {/* Header */}
      <div
        className={`p-4 ${
          layer.status === 'complete'
            ? 'bg-green-50'
            : isCurrentLayer
            ? 'bg-amber-50'
            : 'bg-white'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-slate-500">
                L{layer.layerId}
              </span>
              {isLocked && (
                <LockClosedIcon className="w-3 h-3 text-slate-400" />
              )}
              <StatusBadge status={layer.status} />
            </div>
            <h4 className="font-mono font-bold text-sm text-slate-800 truncate">
              {layerName}
            </h4>
            <p className="font-mono text-xs text-slate-500 mt-0.5 line-clamp-2">
              {layerDescription}
            </p>
          </div>

          {/* Percentage Badge */}
          <div className="flex-shrink-0 text-right">
            <span
              className={`font-mono text-lg font-bold ${
                overallPercentage >= 100
                  ? 'text-green-600'
                  : overallPercentage > 0
                  ? 'text-amber-600'
                  : 'text-slate-400'
              }`}
            >
              {overallPercentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      {layer.status !== 'not_started' && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
          {/* Content Progress */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="font-mono text-xs text-slate-600">Content</span>
              <span className="font-mono text-xs text-slate-500">
                {layer.completedItems}/{layer.requiredItems}
              </span>
            </div>
            <ProgressBar
              percentage={layer.contentPercentage}
              color={layer.contentPercentage >= 100 ? 'green' : 'amber'}
            />
          </div>

          {/* Perspective Progress */}
          {layer.requiredRespondents.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-mono text-xs text-slate-600">
                  Perspectives
                </span>
                <span className="font-mono text-xs text-slate-500">
                  {layer.completedRespondents.length}/{layer.requiredRespondents.length}
                </span>
              </div>
              <ProgressBar
                percentage={layer.perspectivePercentage}
                color={layer.perspectivePercentage >= 100 ? 'green' : 'blue'}
              />
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {layer.requiredRespondents.map((respondent) => (
                  <span
                    key={respondent}
                    className={`px-1.5 py-0.5 font-mono text-xs ${
                      layer.completedRespondents.includes(respondent)
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {respondent}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      {!isLocked && (
        <button
          onClick={handleAction}
          className={`w-full p-3 font-mono text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
            layer.status === 'complete'
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : isCurrentLayer
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {layer.status === 'complete' ? (
            <>
              <CheckCircleIcon className="w-4 h-4" />
              View Completed
            </>
          ) : layer.status === 'not_started' ? (
            <>
              <PlayIcon className="w-4 h-4" />
              Start Layer
            </>
          ) : (
            <>
              <PlayIcon className="w-4 h-4" />
              Continue
            </>
          )}
        </button>
      )}

      {/* Locked State */}
      {isLocked && (
        <div className="p-3 bg-slate-100 border-t border-slate-200">
          <p className="font-mono text-xs text-slate-500 text-center flex items-center justify-center gap-1">
            <LockClosedIcon className="w-3 h-3" />
            Complete previous layers first
          </p>
        </div>
      )}
    </TechnicalCard>
  );
}

export { LayerProgress };
