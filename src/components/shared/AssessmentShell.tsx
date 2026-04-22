'use client';

import { ReactNode } from 'react';


export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export interface AssessmentShellProps {
  // Context
  phase?: string;
  personName: string;
  sectionName: string;
  sectionDescription: string;
  sectionIcon?: string;
  sectionEmoji?: string;

  // Header
  flowLabel: string;
  flowTitle: string;
  accentColor?: string;

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

function saveStatusLabel(status: SaveStatus): string {
  switch (status) {
    case 'saved': return 'saved';
    case 'saving': return 'saving…';
    case 'error': return 'save failed — will retry';
    default: return 'unsaved';
  }
}

function saveStatusColor(status: SaveStatus): string {
  switch (status) {
    case 'saved': return '#7C9082';
    case 'saving': return '#C4A265';
    case 'error': return '#C08070';
    default: return '#7A6E5C';
  }
}

function estimateTimeRemaining(remainingQuestions: number): string {
  const minutes = Math.ceil(remainingQuestions * 1.5);
  if (minutes <= 1) return 'about a minute';
  if (minutes >= 60) return `about ${Math.round(minutes / 60)} hours`;
  return `about ${minutes} minutes`;
}

export default function AssessmentShell({
  personName,
  sectionName,
  sectionDescription,
  flowLabel,
  flowTitle,
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
  const remainingQuestions = totalQuestions - answeredQuestions;

  // ==============================================================
  // Kid variant — simpler, warmer
  // ==============================================================
  if (variant === 'kid') {
    return (
      <div className="relish-page">


        <div className="pt-[64px] pb-24">
          {/* Wide, low-padding container — Typeform-style.
              Override .press-binder's CSS horizontal padding so the
              question + options can stretch nearly edge-to-edge. */}
          <div
            className="press-binder"
            style={{ maxWidth: 860, padding: '0 16px' }}
          >

            {/* Running header */}
            <div className="press-running-header" style={{ paddingTop: 28 }}>
              <span>{personName}&rsquo;s session</span>
              <span className="sep">·</span>
              <span>{answeredQuestions} of {totalQuestions}</span>
            </div>

            {/* Close */}
            <div style={{ textAlign: 'center', paddingTop: 14, paddingBottom: 12 }}>
              <button
                onClick={onSaveAndExit}
                className="press-link-sm"
                style={{ background: 'transparent', cursor: 'pointer' }}
              >
                ⟵ Save and close
              </button>
            </div>

            {/* Title — Cormorant italic so the page stays part of the
                library. Description stays in DM Sans for readability. */}
            <div
              className="press-binder-head"
              style={{ paddingBottom: 20 }}
            >
              <h1
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: 'clamp(36px, 5vw, 48px)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  color: '#3A3530',
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                {sectionName}
              </h1>
              <p
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: 18,
                  fontStyle: 'normal',
                  fontWeight: 500,
                  color: '#5C5347',
                  marginTop: 12,
                  letterSpacing: 0,
                }}
              >
                {sectionDescription.replace(/\{\{personName\}\}/g, personName)}
              </p>
            </div>

            {demoBannerSlot}

            <div style={{ padding: '24px 0 40px' }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================
  // Adult variant — press-styled, editorial
  // ==============================================================
  return (
    <div className="relish-page">

      <div className="pt-[64px] pb-24">
        <div className="press-binder" style={{ maxWidth: 720 }}>

          {/* Running header */}
          <div className="press-running-header" style={{ paddingTop: 28 }}>
            <span>{flowLabel.toLowerCase()}</span>
            <span className="sep">·</span>
            <span>{flowTitle}</span>
            <span className="sep">·</span>
            <span>
              Section {currentSection + 1} of {totalSections}
            </span>
          </div>

          {/* Save & exit */}
          <div style={{ textAlign: 'center', paddingTop: 14, paddingBottom: 6 }}>
            <button
              onClick={onSaveAndExit}
              className="press-link-sm"
              style={{ background: 'transparent', cursor: 'pointer' }}
            >
              ⟵ Save and close
            </button>
          </div>

          {/* Section indicator — a row of thin hairlines, one per section */}
          <div
            className="flex gap-1.5"
            style={{ padding: '20px 56px 16px' }}
          >
            {Array.from({ length: totalSections }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 1.5,
                  background: i < currentSection
                    ? '#7C9082'
                    : i === currentSection
                      ? 'linear-gradient(to right, #7C9082 60%, rgba(124,144,130,0.25))'
                      : 'rgba(200,190,172,0.4)',
                }}
              />
            ))}
          </div>

          {/* Section name + progress line */}
          <div style={{ padding: '0 56px 12px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <span className="press-chapter-label">
                Chapter {currentSection + 1}
              </span>
              <h2
                className="press-display-md mt-1"
                style={{ fontSize: 26 }}
              >
                {sectionName}
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div
                className="press-marginalia"
                style={{ fontSize: 13 }}
              >
                {answeredQuestions} of {totalQuestions} kept
              </div>
              {saveStatus && (
                <div
                  className="press-marginalia mt-1"
                  style={{ fontSize: 14, color: saveStatusColor(saveStatus) }}
                >
                  — {saveStatusLabel(saveStatus)}
                </div>
              )}
              {remainingQuestions > 0 && (
                <div
                  className="press-marginalia mt-1"
                  style={{ fontSize: 14 }}
                >
                  {estimateTimeRemaining(remainingQuestions)} left
                </div>
              )}
            </div>
          </div>

          {/* Section description */}
          <div style={{ padding: '0 56px' }}>
            <p className="press-body-italic" style={{ fontSize: 14 }}>
              {sectionDescription.replace(/\{\{personName\}\}/g, personName)}
            </p>
          </div>

          {/* Demo banner */}
          {demoBannerSlot && (
            <div style={{ padding: '16px 56px 0' }}>
              {demoBannerSlot}
            </div>
          )}

          {/* First question hint */}
          {firstQuestionHint && currentSection === 0 && currentQuestion === 0 && (
            <div style={{ padding: '20px 56px 0' }}>
              <div
                className="press-marginalia"
                style={{
                  fontSize: 14,
                  fontStyle: 'italic',
                  padding: '14px 18px',
                  borderLeft: '2px solid rgba(124,144,130,0.45)',
                  background: 'rgba(124,144,130,0.05)',
                }}
              >
                {firstQuestionHint}
              </div>
            </div>
          )}

          {/* Extra header content */}
          {headerExtraSlot && (
            <div style={{ padding: '16px 56px 0' }}>
              {headerExtraSlot}
            </div>
          )}

          <hr className="press-rule" style={{ margin: '28px 56px 20px', width: 'auto' }} />

          {/* Question content */}
          <div style={{ padding: '12px 56px 40px' }}>
            {children}
            {navigationSlot}
            {canSkip && currentQuestion === 0 && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <button
                  onClick={onSkipSection}
                  className="press-link-sm"
                  style={{ background: 'transparent', cursor: 'pointer' }}
                >
                  Skip this chapter ⟶
                </button>
              </div>
            )}
          </div>

          <div className="press-fleuron">❦</div>
        </div>
      </div>
    </div>
  );
}
