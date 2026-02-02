'use client';

import { useState } from 'react';
import {
  CheckCircleIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { OnboardingMilestone } from '@/types/onboarding-progress';
import { getCelebrationMessage } from '@/config/onboarding-milestones';
import { TechnicalCard, TechnicalButton } from '@/components/technical';

// ==================== Types ====================

interface MilestoneCardProps {
  milestone: OnboardingMilestone;
  isAchieved: boolean;
  showCelebration?: boolean;
  onAcknowledge?: () => void;
}

interface MilestoneCelebrationModalProps {
  milestone: OnboardingMilestone;
  onClose: () => void;
}

interface MilestoneProgressBarProps {
  achieved: number;
  total: number;
  milestones: OnboardingMilestone[];
}

// ==================== Celebration Modal ====================

export function MilestoneCelebrationModal({
  milestone,
  onClose,
}: MilestoneCelebrationModalProps) {
  const celebration = getCelebrationMessage(milestone.milestoneId);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border-4 border-slate-800 p-6 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-amber-100 border-4 border-amber-500 flex items-center justify-center text-4xl">
            {milestone.icon || '🎉'}
          </div>
        </div>

        {/* Title */}
        <h2 className="font-mono text-xl font-bold text-slate-800 text-center mb-2">
          {celebration.title}
        </h2>

        {/* Message */}
        <p className="font-mono text-sm text-slate-600 text-center mb-4">
          {celebration.message}
        </p>

        {/* Encouragement */}
        <div className="bg-slate-50 border border-slate-200 p-3 mb-6">
          <p className="font-mono text-xs text-slate-500 text-center italic">
            {celebration.encouragement}
          </p>
        </div>

        {/* Continue Button */}
        <TechnicalButton
          variant="primary"
          size="md"
          className="w-full"
          onClick={onClose}
        >
          Continue Journey
          <SparklesIcon className="w-4 h-4 ml-2" />
        </TechnicalButton>
      </div>

      <style jsx>{`
        @keyframes bounce-in {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          50% {
            transform: scale(1.02);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// ==================== Milestone Card ====================

export default function MilestoneCard({
  milestone,
  isAchieved,
  showCelebration = false,
  onAcknowledge,
}: MilestoneCardProps) {
  const [showModal, setShowModal] = useState(showCelebration && !milestone.celebrationShown);

  const handleCloseModal = () => {
    setShowModal(false);
    if (onAcknowledge) {
      onAcknowledge();
    }
  };

  return (
    <>
      <div
        className={`flex items-center gap-3 p-3 border transition-all ${
          isAchieved
            ? 'border-green-200 bg-green-50'
            : 'border-slate-200 bg-white'
        }`}
      >
        {/* Icon */}
        <div
          className={`w-10 h-10 flex items-center justify-center text-lg ${
            isAchieved
              ? 'bg-green-100 border-2 border-green-400'
              : 'bg-slate-100 border-2 border-slate-300'
          }`}
        >
          {isAchieved ? (
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
          ) : (
            <span className="opacity-50">{milestone.icon || '○'}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4
            className={`font-mono font-bold text-sm ${
              isAchieved ? 'text-green-800' : 'text-slate-600'
            }`}
          >
            {milestone.name}
          </h4>
          <p
            className={`font-mono text-xs ${
              isAchieved ? 'text-green-600' : 'text-slate-400'
            } truncate`}
          >
            {milestone.description}
          </p>
        </div>

        {/* Status */}
        {isAchieved && milestone.achievedAt && (
          <span className="font-mono text-xs text-green-600">✓</span>
        )}
      </div>

      {/* Celebration Modal */}
      {showModal && (
        <MilestoneCelebrationModal
          milestone={milestone}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}

// ==================== Milestone Progress Bar ====================

export function MilestoneProgressBar({
  achieved,
  total,
  milestones,
}: MilestoneProgressBarProps) {
  return (
    <div className="space-y-2">
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-slate-500">
          {achieved}/{total} milestones
        </span>
        <div className="flex-1 h-1.5 bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-500"
            style={{ width: `${(achieved / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Milestone dots */}
      <div className="flex justify-between">
        {milestones.slice(0, 6).map((milestone) => (
          <div
            key={milestone.milestoneId}
            className={`w-6 h-6 flex items-center justify-center text-xs ${
              milestone.achievedAt
                ? 'bg-green-100 border-2 border-green-400'
                : 'bg-slate-100 border-2 border-slate-300'
            }`}
            title={milestone.name}
          >
            {milestone.achievedAt ? (
              <CheckCircleIcon className="w-3 h-3 text-green-600" />
            ) : (
              <span className="text-slate-400">○</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export { MilestoneCard };
