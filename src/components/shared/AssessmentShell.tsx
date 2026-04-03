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
    bar: 'bg-[#7C9082]',
    label: 'text-[#7C9082]',
    hint: { bg: 'bg-[#7C9082]/10', border: 'border-[#7C9082]/30', text: 'text-[#3A3530]' },
  },
  amber: {
    bar: 'bg-[#7C9082]',
    label: 'text-[#7C9082]',
    hint: { bg: 'bg-[#7C9082]/10', border: 'border-[#7C9082]/30', text: 'text-[#3A3530]' },
  },
  sage: {
    bar: 'bg-[#7C9082]',
    label: 'text-[#7C9082]',
    hint: { bg: 'bg-[#7C9082]/10', border: 'border-[#7C9082]/30', text: 'text-[#3A3530]' },
  },
};

function saveStatusDot(status: SaveStatus) {
  const cls =
    status === 'saved' ? 'bg-green-500' :
    status === 'saving' ? 'bg-[#7C9082] animate-pulse' :
    status === 'error' ? 'bg-red-500' :
    'bg-[#7C9082]/70';
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
      <div className="min-h-screen">
        {/* Minimal header */}
        <div className="flex items-center justify-between px-6 py-3 glass-card" style={{ border: '1px solid rgba(255,255,255,0.4)' }}>
          <button
            onClick={onSaveAndExit}
            className="text-2xl" style={{ color: '#8A8078' }}
          >
            &times;
          </button>
          <div className="text-center">
            <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-parent-display)', color: '#7C9082' }}>
              {personName}&apos;s Answers
            </span>
            <div className="w-32 h-2 mt-1 mx-auto rounded-full" style={{ backgroundColor: 'rgba(124,144,130,0.15)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progressRatio * 100}%`, backgroundColor: '#7C9082' }}
              />
            </div>
          </div>
          <span className="text-sm" style={{ fontFamily: 'var(--font-parent-body)', color: '#8A8078' }}>
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
          <p className="text-center text-sm font-medium" style={{ fontFamily: 'var(--font-parent-body)', color: '#7C7468' }}>
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
    <div className="min-h-screen">
      {/* Header */}
      <div className="glass-card" style={{ border: '1px solid rgba(255,255,255,0.4)', borderRadius: 0 }}>
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onSaveAndExit}
                className="transition-colors"
                style={{ color: '#8A8078' }}
                title="Save and exit"
              >
                <span className="text-xl">&larr;</span>
              </button>
              <div>
                <span className={`text-xs ${accent.label} font-medium tracking-wider`} style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500 }}>
                  {flowLabel}
                </span>
                <h1 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '22px', color: '#3A3530', fontWeight: 600 }}>
                  {flowTitle}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs flex items-center justify-end gap-2" style={{ fontFamily: 'var(--font-parent-body)', color: '#7C7468' }}>
                  <span>{answeredQuestions} / {totalQuestions} answered</span>
                  {saveStatus && saveStatusDot(saveStatus)}
                </div>
                {/* Dual progress: section track + question track */}
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-32 h-2 rounded-full" style={{ backgroundColor: 'rgba(124,144,130,0.15)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${progressRatio * 100}%`,
                        backgroundColor: '#7C9082',
                      }}
                    />
                  </div>
                  <span className="text-[10px] whitespace-nowrap" style={{ fontFamily: 'var(--font-parent-body)', color: '#8A8078' }}>
                    {estimateTimeRemaining(remainingQuestions)}
                  </span>
                </div>
              </div>
              {onSaveAndExit && (
                <button
                  onClick={onSaveAndExit}
                  className="px-4 py-2 rounded-full text-xs font-medium transition-all"
                  style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, color: '#5C5347', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.3)' }}
                >
                  Save &amp; Exit
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
              className="h-1 flex-1 rounded-full"
              style={{ backgroundColor: i <= currentSection ? '#7C9082' : 'rgba(124,144,130,0.15)' }}
            />
          ))}
        </div>

        {/* Section name + description */}
        <div className="flex items-center gap-2">
          {sectionEmoji && <span className="text-lg">{sectionEmoji}</span>}
          <span className={`text-xs ${accent.label} font-medium tracking-wider`} style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500 }}>
            {sectionName.toUpperCase()}
          </span>
        </div>
        <p className="text-sm mt-1" style={{ fontFamily: 'var(--font-parent-body)', color: '#7C7468' }}>
          {sectionDescription.replace(/\{\{personName\}\}/g, personName)}
        </p>

        {/* First question hint */}
        {firstQuestionHint && currentSection === 0 && currentQuestion === 0 && (
          <div className={`mt-4 p-3 rounded-lg ${accent.hint.bg} border ${accent.hint.border}`}>
            <p className={`text-xs ${accent.hint.text}`} style={{ fontFamily: 'var(--font-parent-body)' }}>
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
            className="mt-4 text-xs transition-colors"
            style={{ fontFamily: 'var(--font-parent-body)', color: '#8A8078' }}
          >
            Skip this section &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
