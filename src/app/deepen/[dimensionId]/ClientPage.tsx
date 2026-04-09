'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useRingScores } from '@/hooks/useRingScores';
import { useWorkbook } from '@/hooks/useWorkbook';
import { useAssessmentNeeds } from '@/hooks/useAssessmentNeeds';
import {
  getDimension,
  type DimensionId,
  type AssessmentPromptTemplate,
} from '@/config/relationship-dimensions';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';
import AuraPhaseIndicator from '@/components/layout/AuraPhaseIndicator';
import { scoreToClimate } from '@/lib/climate-engine';
import type { ClimateState } from '@/lib/climate-engine';
import Link from 'next/link';

// ==================== Helpers ====================

function scoreToQualitativeBand(score: number): string {
  if (score >= 4.0) return 'Strong';
  if (score >= 3.5) return 'Steady';
  if (score >= 3.0) return 'Developing';
  if (score >= 2.0) return 'Needs attention';
  return 'Struggling';
}

function confidenceLabel(c: 'low' | 'medium' | 'high'): string {
  if (c === 'low') return 'Limited';
  if (c === 'medium') return 'Clearer';
  return 'Clear';
}

const LIKERT_OPTIONS = [
  { value: 1, label: 'Not at all' },
  { value: 2, label: 'A little' },
  { value: 3, label: 'Somewhat' },
  { value: 4, label: 'Quite a bit' },
  { value: 5, label: 'Very much' },
];

const FREQUENCY_OPTIONS = [
  { value: 1, label: 'Never' },
  { value: 2, label: 'Rarely' },
  { value: 3, label: 'Sometimes' },
  { value: 4, label: 'Often' },
  { value: 5, label: 'Always' },
];

// ==================== Main Component ====================

export default function DeepenPage() {
  const params = useParams();
  const dimensionId = params.dimensionId as DimensionId;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { assessments, state } = useDashboard();
  const { health } = useRingScores(assessments);
  const { activeChapters } = useWorkbook();

  const activeWorkbookDimIds = useMemo(
    () =>
      activeChapters
        .filter((c) => c.status === 'active')
        .map((c) => c.dimensionId),
    [activeChapters],
  );

  const { allNeeds } = useAssessmentNeeds(assessments, activeWorkbookDimIds);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  // Get the dimension definition
  const dimension = useMemo(() => getDimension(dimensionId), [dimensionId]);

  // Get the need for this dimension (if any)
  const need = useMemo(
    () => allNeeds.find((n) => n.dimensionId === dimensionId),
    [allNeeds, dimensionId],
  );

  // Get the assessment for this dimension
  const assessment = useMemo(
    () => assessments.find((a) => a.dimensionId === dimensionId),
    [assessments, dimensionId],
  );

  // Prompts to show: from the need, or fallback to unanswered prompts
  const prompts: AssessmentPromptTemplate[] = useMemo(() => {
    if (need) return need.suggestedPrompts;
    if (!dimension) return [];
    const answered = assessment?.assessmentProgress?.promptsAnswered || [];
    return dimension.assessmentPrompts
      .filter((p) => !answered.includes(p.promptId))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 2);
  }, [need, dimension, assessment]);

  // Climate for background
  const climateState: ClimateState = useMemo(() => {
    if (health) return scoreToClimate(health.score, health.trend).state;
    return 'mostly_sunny';
  }, [health]);

  // Check if the workbook has a chapter for this dimension
  const workbookChapter = useMemo(
    () =>
      activeChapters.find(
        (c) => c.dimensionId === dimensionId && c.status === 'active',
      ),
    [activeChapters, dimensionId],
  );

  const allAnswered = prompts.every((p) => answers[p.promptId] !== undefined);

  const handleAnswer = useCallback((promptId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [promptId]: value }));
  }, []);

  const handleComplete = useCallback(() => {
    // In a full implementation, this would write the answers to Firestore
    // and update the assessment's promptsAnswered + score.
    // For now, show the micro-understand moment.
    setCompleted(true);
  }, []);

  // Loading
  if (authLoading || state === 'loading') {
    return (
      <div className="relish-page">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 rounded-full border-2 border-t-transparent border-white/40" />
        </div>
      </div>
    );
  }

  if (!user || !dimension) {
    return (
      <div className="relish-page">
        <Navigation />
        <SideNav />
        <div className="min-h-screen pt-[60px] flex items-center justify-center">
          <div className="glass-card-strong p-8 text-center max-w-md">
            <h2
              style={{
                fontFamily: 'var(--font-parent-display)',
                fontSize: '1.5rem',
                fontWeight: 500,
                color: 'var(--parent-text)',
              }}
            >
              Dimension not found
            </h2>
            <Link
              href="/dashboard"
              className="inline-flex items-center mt-4 px-6 py-2.5 rounded-full text-[13px] font-medium text-white hover:opacity-90"
              style={{
                fontFamily: 'var(--font-parent-body)',
                background: 'var(--parent-primary)',
              }}
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const prevConfidence = assessment?.confidence || 'low';
  // Simulate new confidence based on having answered more prompts
  const answeredCount =
    (assessment?.assessmentProgress?.promptsAnswered?.length || 0) +
    Object.keys(answers).length;
  const newConfidence: 'low' | 'medium' | 'high' =
    answeredCount >= 6 ? 'high' : answeredCount >= 3 ? 'medium' : 'low';

  const prevLabel = scoreToQualitativeBand(assessment?.currentScore || 0);
  // Simulate score update from answers
  const answerValues = Object.values(answers);
  const avgAnswer =
    answerValues.length > 0
      ? answerValues.reduce((s, v) => s + v, 0) / answerValues.length
      : 0;
  const existingScore = assessment?.currentScore || 3.0;
  const blendedScore =
    answerValues.length > 0 ? existingScore * 0.7 + avgAnswer * 0.3 : existingScore;
  const newLabel = scoreToQualitativeBand(blendedScore);

  return (
    <div className="relish-page">
      <Navigation />
      <SideNav />

      <div className="min-h-screen pt-[60px]">
        <div className="max-w-xl mx-auto px-5 sm:px-8 pt-10 pb-16">
          {/* Phase indicator */}
          <div className="mb-6 flex justify-center">
            <AuraPhaseIndicator phase={completed ? 'understand' : 'assess'} />
          </div>

          {!completed ? (
            /* ===== QUESTION PHASE ===== */
            <div className="animate-fade-in-up">
              {/* Header */}
              <div className="mb-6">
                <span
                  className="block mb-1"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--aura-assess)',
                  }}
                >
                  Deepen &middot; {dimension.name}
                </span>
                <h2
                  style={{
                    fontFamily: 'var(--font-parent-display)',
                    fontSize: 'clamp(1.5rem, 4vw, 1.85rem)',
                    fontWeight: 300,
                    fontStyle: 'italic',
                    color: 'var(--parent-text)',
                    lineHeight: 1.2,
                  }}
                >
                  {need?.contextMessage ||
                    `Let\u2019s sharpen the picture on ${dimension.name}.`}
                </h2>
              </div>

              {/* Questions */}
              <div className="space-y-5">
                {prompts.map((prompt) => {
                  const options =
                    prompt.responseType === 'frequency'
                      ? FREQUENCY_OPTIONS
                      : LIKERT_OPTIONS;
                  const selected = answers[prompt.promptId];

                  return (
                    <div key={prompt.promptId} className="glass-card-strong p-5">
                      <p
                        className="mb-4"
                        style={{
                          fontFamily: 'var(--font-parent-body)',
                          fontSize: '14px',
                          color: 'var(--parent-text)',
                          lineHeight: 1.55,
                        }}
                      >
                        {prompt.questionText}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {options.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() =>
                              handleAnswer(prompt.promptId, opt.value)
                            }
                            className="px-4 py-2 rounded-full text-[12.5px] font-medium transition-all"
                            style={{
                              fontFamily: 'var(--font-parent-body)',
                              background:
                                selected === opt.value
                                  ? 'var(--aura-assess)'
                                  : 'rgba(255,255,255,0.5)',
                              color:
                                selected === opt.value
                                  ? '#fff'
                                  : 'var(--parent-text)',
                              border:
                                selected === opt.value
                                  ? '1px solid var(--aura-assess)'
                                  : '1px solid rgba(0,0,0,0.06)',
                              transform:
                                selected === opt.value
                                  ? 'scale(1.02)'
                                  : 'scale(1)',
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* No prompts left */}
              {prompts.length === 0 && (
                <div className="glass-card-strong p-5 text-center">
                  <p
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '14px',
                      color: 'var(--parent-text-light)',
                      lineHeight: 1.6,
                    }}
                  >
                    You&rsquo;ve answered all available questions for{' '}
                    {dimension.name}. Maximum confidence reached.
                  </p>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center mt-4 px-6 py-2.5 rounded-full text-[13px] font-medium text-white hover:opacity-90"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      background: 'var(--parent-primary)',
                    }}
                  >
                    Back to dashboard
                  </Link>
                </div>
              )}

              {/* Submit */}
              {prompts.length > 0 && (
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleComplete}
                    disabled={!allAnswered}
                    className="inline-flex items-center px-6 py-2.5 rounded-full text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      background: 'var(--aura-assess)',
                    }}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ===== MICRO-UNDERSTAND MOMENT ===== */
            <div className="animate-fade-in-up">
              <div className="glass-card-strong p-6 text-center">
                <h3
                  style={{
                    fontFamily: 'var(--font-parent-display)',
                    fontSize: '1.35rem',
                    fontWeight: 400,
                    fontStyle: 'italic',
                    color: 'var(--parent-text)',
                    marginBottom: 12,
                  }}
                >
                  Picture sharpened.
                </h3>

                {/* Confidence change */}
                {prevConfidence !== newConfidence && (
                  <p
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '14px',
                      color: 'var(--parent-text)',
                      lineHeight: 1.6,
                    }}
                  >
                    {dimension.name} confidence:{' '}
                    <span style={{ color: 'var(--parent-text-light)' }}>
                      {confidenceLabel(prevConfidence)}
                    </span>{' '}
                    &rarr;{' '}
                    <span style={{ color: 'var(--aura-assess)', fontWeight: 600 }}>
                      {confidenceLabel(newConfidence)}
                    </span>
                  </p>
                )}

                {/* Score change */}
                {prevLabel !== newLabel && (
                  <p
                    className="mt-2"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '14px',
                      color: 'var(--parent-text)',
                      lineHeight: 1.6,
                    }}
                  >
                    Score updated:{' '}
                    <span style={{ color: 'var(--parent-text-light)' }}>
                      {prevLabel}
                    </span>{' '}
                    &rarr;{' '}
                    <span style={{ fontWeight: 600 }}>{newLabel}</span>
                  </p>
                )}

                {/* If neither changed */}
                {prevConfidence === newConfidence && prevLabel === newLabel && (
                  <p
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '14px',
                      color: 'var(--parent-text-light)',
                      lineHeight: 1.6,
                    }}
                  >
                    Your answers align with what we already see for{' '}
                    <strong>{dimension.name}</strong>. The picture is getting clearer.
                  </p>
                )}
              </div>

              {/* Navigation */}
              <div className="mt-6 flex flex-col items-center gap-3">
                {workbookChapter ? (
                  <Link
                    href="/workbook"
                    className="inline-flex items-center px-6 py-2.5 rounded-full text-[13px] font-medium text-white hover:opacity-90"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      background: 'var(--aura-respond)',
                    }}
                  >
                    Continue in workbook
                  </Link>
                ) : (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center px-6 py-2.5 rounded-full text-[13px] font-medium text-white hover:opacity-90"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      background: 'var(--parent-primary)',
                    }}
                  >
                    Back to dashboard
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="text-[12px] hover:opacity-70 transition-opacity"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontWeight: 500,
                    color: 'var(--parent-text-light)',
                  }}
                >
                  {workbookChapter ? 'Or back to dashboard' : 'Or explore the workbook'}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
