'use client';

import { ReactNode } from 'react';
import AuraPhaseIndicator, { AuraPhase } from '@/components/layout/AuraPhaseIndicator';
import { progressColor } from '@/utils/progress-color';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export interface AssessmentShellProps {
  // Context
  phase?: AuraPhase;
  personName: string;
  sectionName: string;
  sectionDescription: string;
  sectionIcon?: string;
  sectionEmoji?: string;

  // Header
  flowLabel: string; // e.g. "OBSERVER ONBOARDING", "SELF-ONBOARDING"
  flowTitle: string; // e.g. "About Iris", "Tell Us About Yourself"
  accentColor?: string; // e.g. 'blue' for observer, 'amber' for self, 'blue' for kid

  // Progress
  currentSection: number;
  totalSections: number;
  currentQuestion: number;
  totalQuestions: number;
  answeredQuestions: number;

  // Save status
  saveStatus?: SaveStatus;

  // Content
  children: ReactNode;

  // Navigation slots
  navigationSlot?: ReactNode;
  demoBannerSlot?: ReactNode;
  headerExtraSlot?: ReactNode;

  // First question hint
  firstQuestionHint?: string;

  // Actions
  onSaveAndExit?: () => void;
  onSkipSection?: () => void;
  canSkip?: boolean;

  // Variant
  variant?: 'adult' | 'kid';
}

const ACCENT_COLORS: Record<string, { bar: string; label: string; hint: { bg: string; border: string; text: string } }> = {
  blue: {
    bar: 'bg-blue-600',
    label: 'text-blue-600',
    hint: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
  },
  amber: {
    bar: 'bg-amber-600',
    label: 'text-amber-600',
    hint: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
  },
};

function saveStatusDot(status: SaveStatus) {
  const cls =
    status === 'saved' ? 'bg-green-500' :
    status === 'saving' ? 'bg-amber-500 animate-pulse' :
    status === 'error' ? 'bg-red-500' :
    'bg-amber-400';
  const title =
    status === 'saved' ? 'All changes saved' :
    status === 'saving' ? 'Saving...' :
    status === 'error' ? 'Save failed — will retry' :
    'Unsaved changes';
  return <span className={`inline-block w-2 h-2 rounded-full ${cls}`} title={title} />;
}

function estimateTimeRemaining(remainingQuestions: number): string {
  const minutes = Math.ceil(remainingQuestions * 1.5);
  if (minutes <= 1) return '~1 min left';
  if (minutes >= 60) return `~${Math.round(minutes / 60)} hr left`;
  return `~${minutes} min left`;
}

export default function AssessmentShell({
  phase = 'assess',
  personName,
  sectionName,
  sectionDescription,
  sectionEmoji,
  flowLabel,
  flowTitle,
  accentColor = 'blue',
  currentSection,
  totalSections,
  currentQuestion,
  totalQuestions,
  answeredQuestions,
  saveStatus,
  children,
  navigationSlot,
  demoBannerSlot,
  headerExtraSlot,
  firstQuestionHint,
  onSaveAndExit,
  onSkipSection,
  canSkip = false,
  variant = 'adult',
}: AssessmentShellProps) {
  const accent = ACCENT_COLORS[accentColor] || ACCENT_COLORS.blue;
  const remainingQuestions = totalQuestions - answeredQuestions;
  const progressRatio = totalQuestions > 0 ? answeredQuestions / totalQuestions : 0;

  // Kid variant — simpler, more playful header
  if (variant === 'kid') {
    return (
      <div className="min-h-screen bg-blue-50">
        {/* Minimal header */}
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b-2 border-blue-200">
          <button
            onClick={onSaveAndExit}
            className="text-slate-400 hover:text-slate-600 text-2xl"
          >
            &times;
          </button>
          <div className="text-center">
            <span className="text-sm font-bold text-blue-600">
              {personName}&apos;s Answers
            </span>
            <div className="w-32 h-2 bg-blue-100 mt-1 mx-auto rounded-full">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${progressRatio * 100}%` }}
              />
            </div>
          </div>
          <span className="text-sm text-slate-400">
            {answeredQuestions}/{totalQuestions}
          </span>
        </div>

        {/* Phase indicator */}
        <div className="flex justify-center pt-4">
          <AuraPhaseIndicator phase={phase} compact />
        </div>

        {/* Demo banner */}
        {demoBannerSlot}

        {/* Section context */}
        <div className="max-w-lg mx-auto px-6 pt-4">
          {sectionEmoji && (
            <div className="text-center text-2xl mb-2">{sectionEmoji}</div>
          )}
          <p className="text-center text-sm text-slate-500 font-medium">
            {sectionDescription.replace(/\{\{personName\}\}/g, personName)}
          </p>
        </div>

        {/* Question content */}
        <div className="max-w-lg mx-auto px-6 py-6">
          {children}
        </div>
      </div>
    );
  }

  // Adult variant — full header with progress tracking
  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Header */}
      <div className="border-b-2 border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onSaveAndExit}
                className="text-slate-400 hover:text-slate-800 transition-colors"
                title="Save and exit"
              >
                <span className="text-xl">&larr;</span>
              </button>
              <div>
                <span className={`font-mono text-xs ${accent.label} font-bold tracking-wider`}>
                  {flowLabel}
                </span>
                <h1 className="font-mono font-bold text-lg text-slate-800">
                  {flowTitle}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-mono text-xs text-slate-500 flex items-center justify-end gap-2">
                  <span>{answeredQuestions} / {totalQuestions} ANSWERED</span>
                  {saveStatus && saveStatusDot(saveStatus)}
                </div>
                {/* Dual progress: section track + question track */}
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-32 h-2 bg-slate-200">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${progressRatio * 100}%`,
                        backgroundColor: progressColor(progressRatio),
                      }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap">
                    {estimateTimeRemaining(remainingQuestions)}
                  </span>
                </div>
              </div>
              {onSaveAndExit && (
                <button
                  onClick={onSaveAndExit}
                  className="px-4 py-2 border-2 border-slate-300 bg-white font-mono text-xs font-bold text-slate-600 hover:border-slate-800 hover:text-slate-800 transition-all"
                >
                  SAVE &amp; EXIT
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Phase indicator */}
      <div className="flex justify-center pt-4">
        <AuraPhaseIndicator phase={phase} compact />
      </div>

      {/* Demo banner */}
      {demoBannerSlot}

      {/* Section indicator bars */}
      <div className="max-w-3xl mx-auto px-6 pt-4">
        <div className="flex gap-2 mb-6">
          {Array.from({ length: totalSections }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 ${
                i <= currentSection ? accent.bar : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Section name + description */}
        <div className="flex items-center gap-2">
          {sectionEmoji && <span className="text-lg">{sectionEmoji}</span>}
          <span className={`font-mono text-xs ${accent.label} font-bold tracking-wider`}>
            {sectionName.toUpperCase()}
          </span>
        </div>
        <p className="font-mono text-sm text-slate-500 mt-1">
          {sectionDescription.replace(/\{\{personName\}\}/g, personName)}
        </p>

        {/* First question hint */}
        {firstQuestionHint && currentSection === 0 && currentQuestion === 0 && (
          <div className={`mt-4 p-3 ${accent.hint.bg} border ${accent.hint.border}`}>
            <p className={`font-mono text-xs ${accent.hint.text}`}>
              {firstQuestionHint}
            </p>
          </div>
        )}

        {/* Extra header content (e.g. AI-generated indicator) */}
        {headerExtraSlot}
      </div>

      {/* Question content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {children}

        {/* Navigation */}
        {navigationSlot}

        {/* Skip section */}
        {canSkip && currentQuestion === 0 && (
          <button
            onClick={onSkipSection}
            className="mt-4 font-mono text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            SKIP THIS SECTION &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
