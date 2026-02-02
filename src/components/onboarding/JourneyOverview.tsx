'use client';

import { useMemo } from 'react';
import {
  BookOpenIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import type { OnboardingProgress } from '@/types/onboarding-progress';
import type { LayerId } from '@/types/assessment';
import { DEFAULT_LAYER_ORDER } from '@/types/onboarding-progress';
import { TechnicalCard, TechnicalButton } from '@/components/technical';
import LayerProgress from './LayerProgress';
import MilestoneCard, { MilestoneProgressBar } from './MilestoneCard';

// ==================== Types ====================

interface JourneyOverviewProps {
  progress: OnboardingProgress;
  personName?: string;
  onStartLayer: (layerId: LayerId) => void;
  onContinueLayer: (layerId: LayerId) => void;
  onViewLayer: (layerId: LayerId) => void;
  onGraduate?: () => void;
  onAcknowledgeMilestone: (milestoneId: string) => void;
}

// ==================== Sub-Components ====================

function ProgressHeader({
  progress,
  personName,
}: {
  progress: OnboardingProgress;
  personName?: string;
}) {
  return (
    <TechnicalCard shadowSize="md" className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <BookOpenIcon className="w-6 h-6 text-amber-600" />
        <h1 className="font-mono text-xl font-bold text-slate-800">
          {personName ? `${personName}'s ` : ''}Manual Journey
        </h1>
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-mono text-sm text-slate-600">Overall Progress</span>
          <span className="font-mono text-lg font-bold text-amber-600">
            {progress.overallPercentage}%
          </span>
        </div>
        <div className="w-full h-3 bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-500"
            style={{ width: `${progress.overallPercentage}%` }}
          />
        </div>
      </div>

      {/* Layer Count */}
      <div className="flex items-center gap-4 text-sm">
        <span className="font-mono text-slate-500">
          <strong className="text-slate-700">{progress.completedLayers.length}</strong> of{' '}
          <strong className="text-slate-700">6</strong> layers complete
        </span>
        {progress.completedLayers.length === 6 && (
          <span className="flex items-center gap-1 text-green-600 font-mono">
            <CheckCircleIcon className="w-4 h-4" />
            Ready for graduation!
          </span>
        )}
      </div>
    </TechnicalCard>
  );
}

function MilestonesSection({
  progress,
  onAcknowledgeMilestone,
}: {
  progress: OnboardingProgress;
  onAcknowledgeMilestone: (milestoneId: string) => void;
}) {
  const achieved = progress.milestones.filter((m) => m.achievedAt).length;
  const total = progress.milestones.length;

  // Find milestones that need celebration
  const unshownMilestones = progress.milestones.filter(
    (m) => m.achievedAt && !m.celebrationShown
  );

  return (
    <TechnicalCard shadowSize="sm" className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <SparklesIcon className="w-5 h-5 text-amber-600" />
        <h2 className="font-mono text-sm font-bold text-slate-700 uppercase tracking-wider">
          Milestones
        </h2>
      </div>

      {/* Progress Bar */}
      <MilestoneProgressBar
        achieved={achieved}
        total={total}
        milestones={progress.milestones}
      />

      {/* Milestone List */}
      <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
        {progress.milestones.map((milestone) => (
          <MilestoneCard
            key={milestone.milestoneId}
            milestone={milestone}
            isAchieved={!!milestone.achievedAt}
            showCelebration={unshownMilestones.some(
              (m) => m.milestoneId === milestone.milestoneId
            )}
            onAcknowledge={() => onAcknowledgeMilestone(milestone.milestoneId)}
          />
        ))}
      </div>
    </TechnicalCard>
  );
}

// ==================== Main Component ====================

export default function JourneyOverview({
  progress,
  personName,
  onStartLayer,
  onContinueLayer,
  onViewLayer,
  onGraduate,
  onAcknowledgeMilestone,
}: JourneyOverviewProps) {
  // Sort layers by the default order (L6 first)
  const sortedLayers = useMemo(() => {
    return DEFAULT_LAYER_ORDER.map((layerId) => ({
      layerId,
      status: progress.layers[layerId],
    })).filter((l) => l.status);
  }, [progress.layers]);

  // Determine which layers are locked
  const isLayerLocked = (layerId: LayerId): boolean => {
    const layerIndex = DEFAULT_LAYER_ORDER.indexOf(layerId);
    if (layerIndex === 0) return false; // First layer never locked

    // Check if all previous layers are complete
    for (let i = 0; i < layerIndex; i++) {
      if (!progress.completedLayers.includes(DEFAULT_LAYER_ORDER[i])) {
        return true;
      }
    }
    return false;
  };

  const canGraduate = progress.completedLayers.length === 6 && !progress.graduatedAt;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header with Progress */}
      <ProgressHeader progress={progress} personName={personName} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Layers Column (2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-sm font-bold text-slate-700 uppercase tracking-wider">
              Layers (Top-Down: Values → Triggers)
            </h2>
          </div>

          {sortedLayers.map(({ layerId, status }) => (
            <LayerProgress
              key={layerId}
              layer={status}
              isCurrentLayer={progress.currentLayer === layerId}
              isLocked={isLayerLocked(layerId)}
              onStart={() => onStartLayer(layerId)}
              onContinue={() => onContinueLayer(layerId)}
              onView={() => onViewLayer(layerId)}
            />
          ))}
        </div>

        {/* Sidebar (1/3 width on large screens) */}
        <div className="space-y-6">
          {/* Milestones */}
          <MilestonesSection
            progress={progress}
            onAcknowledgeMilestone={onAcknowledgeMilestone}
          />

          {/* Graduation CTA */}
          {canGraduate && onGraduate && (
            <TechnicalCard shadowSize="md" className="p-4 bg-green-50 border-green-200">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-green-100 border-2 border-green-400 flex items-center justify-center">
                  <span className="text-3xl">🎉</span>
                </div>
                <h3 className="font-mono font-bold text-green-800 mb-2">
                  Ready to Graduate!
                </h3>
                <p className="font-mono text-xs text-green-700 mb-4">
                  All 6 layers complete. Your manual is ready to become a living document.
                </p>
                <TechnicalButton
                  variant="primary"
                  size="md"
                  className="w-full bg-green-600 hover:bg-green-700 border-green-700"
                  onClick={onGraduate}
                >
                  Graduate
                  <ArrowRightIcon className="w-4 h-4 ml-2" />
                </TechnicalButton>
              </div>
            </TechnicalCard>
          )}

          {/* Help Text */}
          <div className="p-4 bg-slate-50 border border-slate-200">
            <h3 className="font-mono text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              How It Works
            </h3>
            <ul className="space-y-2">
              <li className="font-mono text-xs text-slate-500">
                • Complete layers from top (Values) to bottom (Triggers)
              </li>
              <li className="font-mono text-xs text-slate-500">
                • Each layer needs content + perspectives
              </li>
              <li className="font-mono text-xs text-slate-500">
                • Earn milestones as you progress
              </li>
              <li className="font-mono text-xs text-slate-500">
                • Graduate when all 6 layers are complete
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export { JourneyOverview };
