'use client';

import {
  SparklesIcon,
  BookOpenIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  UserGroupIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';
import type { OnboardingProgress } from '@/types/onboarding-progress';
import { TechnicalButton, TechnicalCard } from '@/components/technical';

// ==================== Types ====================

interface GraduationCelebrationProps {
  progress: OnboardingProgress;
  personName?: string;
  onEnterLivingMode: () => void;
  onViewManual?: () => void;
}

interface GraduationStat {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}

// ==================== Sub-Components ====================

function StatCard({ stat }: { stat: GraduationStat }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-slate-200">
      <div className="w-10 h-10 bg-amber-100 border-2 border-amber-400 flex items-center justify-center text-amber-600">
        {stat.icon}
      </div>
      <div>
        <p className="font-mono text-lg font-bold text-slate-800">{stat.value}</p>
        <p className="font-mono text-xs text-slate-500">{stat.label}</p>
      </div>
    </div>
  );
}

// ==================== Main Component ====================

export default function GraduationCelebration({
  progress,
  personName = 'the Manual',
  onEnterLivingMode,
  onViewManual,
}: GraduationCelebrationProps) {
  // Calculate stats from progress
  const totalLayers = Object.keys(progress.layers).length;
  const milestonesAchieved = progress.milestones.filter((m) => m.achievedAt).length;

  // Count unique respondents
  const respondents = new Set<string>();
  for (const layer of Object.values(progress.layers)) {
    for (const respondent of layer.completedRespondents) {
      respondents.add(respondent);
    }
  }

  // Calculate total content items
  const totalContent = Object.values(progress.layers).reduce(
    (sum, layer) => sum + layer.completedItems,
    0
  );

  const stats: GraduationStat[] = [
    {
      label: 'Layers Complete',
      value: totalLayers,
      icon: <BookOpenIcon className="w-5 h-5" />,
    },
    {
      label: 'Milestones Achieved',
      value: milestonesAchieved,
      icon: <SparklesIcon className="w-5 h-5" />,
    },
    {
      label: 'Perspectives Collected',
      value: respondents.size,
      icon: <UserGroupIcon className="w-5 h-5" />,
    },
    {
      label: 'Insights Documented',
      value: totalContent,
      icon: <HeartIcon className="w-5 h-5" />,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 flex items-center justify-center">
      <TechnicalCard shadowSize="lg" className="max-w-2xl w-full p-0 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-amber-400 to-amber-500 p-8 text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-white border-4 border-slate-800 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-5xl">🎉</span>
          </div>
          <h1 className="font-mono text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
            Congratulations!
          </h1>
          <p className="font-mono text-lg text-slate-700">
            {personName}&apos;s Manual is Ready to Breathe
          </p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {stats.map((stat, idx) => (
              <StatCard key={idx} stat={stat} />
            ))}
          </div>

          {/* What You've Built */}
          <div className="mb-8">
            <h2 className="font-mono text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">
              What You&apos;ve Built
            </h2>
            <ul className="space-y-2">
              {[
                '6 layers of deep understanding',
                'Multiple family perspectives synthesized',
                'A living foundation for growth',
                'Documented strategies that work',
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="font-mono text-sm text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What Happens Next */}
          <div className="mb-8 p-4 bg-slate-100 border border-slate-200">
            <h2 className="font-mono text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">
              What Happens Next
            </h2>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <ArrowRightIcon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="font-mono text-sm text-slate-600">
                  Weekly workbooks will draw from this manual
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRightIcon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="font-mono text-sm text-slate-600">
                  AI will suggest updates based on your reflections
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRightIcon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="font-mono text-sm text-slate-600">
                  You can add, edit, and refine anytime
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRightIcon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="font-mono text-sm text-slate-600">
                  The manual grows with {personName}
                </span>
              </li>
            </ul>
          </div>

          {/* Quote */}
          <div className="mb-8 p-4 bg-amber-50 border-l-4 border-amber-500">
            <p className="font-mono text-sm text-slate-700 italic">
              &ldquo;A manual isn&apos;t something you finish.
              <br />
              It&apos;s something you begin.&rdquo;
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <TechnicalButton
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={onEnterLivingMode}
            >
              Enter Living Document Mode
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </TechnicalButton>
            {onViewManual && (
              <TechnicalButton
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={onViewManual}
              >
                <BookOpenIcon className="w-5 h-5 mr-2" />
                View Manual
              </TechnicalButton>
            )}
          </div>
        </div>
      </TechnicalCard>
    </div>
  );
}

export { GraduationCelebration };
