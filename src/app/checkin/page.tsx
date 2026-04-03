'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useWorkbook } from '@/hooks/useWorkbook';
import { useDashboard } from '@/hooks/useDashboard';
import { useRingScores } from '@/hooks/useRingScores';
import { scoreToClimate, scoreToRelationshipPhrase } from '@/lib/climate-engine';
import { getDimension, type DimensionId, type AssessmentPromptTemplate } from '@/config/relationship-dimensions';
import { getExercisesForDimension } from '@/config/exercises';
import { computeAssessmentNeeds } from '@/lib/assessment-needs-engine';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';
import WeatherBackground from '@/components/dashboard/WeatherBackground';
import AuraPhaseIndicator from '@/components/layout/AuraPhaseIndicator';
import type { AuraPhase } from '@/components/layout/AuraPhaseIndicator';
import type { ClimateState } from '@/lib/climate-engine';
import type { WorkbookChapter } from '@/types/workbook';
import type { DimensionAssessment } from '@/types/growth-arc';
import Link from 'next/link';

// ==================== Types ====================

type CheckInStep = 'assess' | 'understand' | 'respond' | 'assimilate';

interface DimensionCheckIn {
  chapter: WorkbookChapter;
  dimensionName: string;
  prompts: AssessmentPromptTemplate[];
  answers: Record<string, number>; // promptId → value (1-5)
  previousScore: number;
  previousLabel: string;
}

// ==================== Helpers ====================

function scoreToQualitativeBand(score: number): string {
  if (score >= 4.0) return 'Strong';
  if (score >= 3.5) return 'Steady';
  if (score >= 3.0) return 'Developing';
  if (score >= 2.0) return 'Needs attention';
  return 'Struggling';
}

function trendArrow(prev: number, current: number): { symbol: string; label: string; color: string } {
  const diff = current - prev;
  if (diff > 0.3) return { symbol: '\u2197', label: 'Getting better', color: '#16a34a' };
  if (diff < -0.3) return { symbol: '\u2198', label: 'Needs attention', color: '#dc2626' };
  return { symbol: '\u2192', label: 'Holding steady', color: '#d97706' };
}

function selectPromptsForDimension(
  dimensionId: string,
  assessment: DimensionAssessment | undefined,
  assessmentNeeds?: ReturnType<typeof computeAssessmentNeeds>,
): AssessmentPromptTemplate[] {
  // If the assessment-needs engine has a high-priority need for this dimension,
  // use its curated prompts instead of generic selection
  if (assessmentNeeds) {
    const need = assessmentNeeds.find(
      (n) => n.dimensionId === dimensionId && n.priority === 'high',
    );
    if (need && need.suggestedPrompts.length > 0) {
      return need.suggestedPrompts.slice(0, 2);
    }
  }

  const dim = getDimension(dimensionId as DimensionId);
  if (!dim) return [];

  const answered = assessment?.assessmentProgress?.promptsAnswered || [];
  const available = dim.assessmentPrompts.filter(
    (p) => !answered.includes(p.promptId)
  );

  // Sort by weight descending, take top 2
  const sorted = [...available].sort((a, b) => b.weight - a.weight);
  return sorted.slice(0, 2);
}

// ==================== Likert options ====================

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

export default function CheckInPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { activeChapters, loading: wbLoading } = useWorkbook();
  const { assessments, roles } = useDashboard();
  const { health } = useRingScores(assessments);

  const [step, setStep] = useState<CheckInStep>('assess');
  const [currentDimIdx, setCurrentDimIdx] = useState(0);
  const [checkIns, setCheckIns] = useState<DimensionCheckIn[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  // Climate for background
  const climateState: ClimateState = useMemo(() => {
    if (health) return scoreToClimate(health.score, health.trend).state;
    return 'mostly_sunny';
  }, [health]);

  // Compute assessment needs to prioritize check-in questions
  const assessmentNeeds = useMemo(() => {
    const activeDimIds = activeChapters
      .filter((c) => c.status === 'active')
      .map((c) => c.dimensionId);
    return computeAssessmentNeeds(assessments, activeDimIds);
  }, [assessments, activeChapters]);

  // Initialize check-in data from active chapters
  useEffect(() => {
    if (initialized || wbLoading || !activeChapters.length) return;

    const active = activeChapters.filter((c) => c.status === 'active');
    if (active.length === 0) return;

    const items: DimensionCheckIn[] = active.map((chapter) => {
      const dim = getDimension(chapter.dimensionId);
      const assessment = assessments.find((a) => a.dimensionId === chapter.dimensionId);
      const prompts = selectPromptsForDimension(chapter.dimensionId, assessment, assessmentNeeds);
      const domain = dim?.domain || 'couple';

      return {
        chapter,
        dimensionName: dim?.name || chapter.dimensionId,
        prompts,
        answers: {},
        previousScore: chapter.currentScore,
        previousLabel: scoreToRelationshipPhrase(chapter.currentScore, domain),
      };
    });

    setCheckIns(items);
    setInitialized(true);
  }, [activeChapters, assessments, wbLoading, initialized]);

  // Current phase for the AURA indicator
  const auraPhase: AuraPhase = step;

  // Handle answer selection
  const handleAnswer = useCallback(
    (promptId: string, value: number) => {
      setCheckIns((prev) =>
        prev.map((ci, idx) =>
          idx === currentDimIdx
            ? { ...ci, answers: { ...ci.answers, [promptId]: value } }
            : ci
        )
      );
    },
    [currentDimIdx]
  );

  // Navigation
  const currentCheckIn = checkIns[currentDimIdx];
  const allPromptsAnswered = currentCheckIn
    ? currentCheckIn.prompts.every((p) => currentCheckIn.answers[p.promptId] !== undefined)
    : false;

  const handleNextDimension = useCallback(() => {
    if (currentDimIdx < checkIns.length - 1) {
      setCurrentDimIdx((prev) => prev + 1);
    } else {
      // All dimensions answered, move to Understand step
      setStep('understand');
    }
  }, [currentDimIdx, checkIns.length]);

  const handleToRespond = useCallback(() => setStep('respond'), []);
  const handleToAssimilate = useCallback(() => setStep('assimilate'), []);

  // Loading state
  if (authLoading || wbLoading) {
    return (
      <WeatherBackground climate="mostly_sunny">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 rounded-full border-2 border-t-transparent border-white/40" />
        </div>
      </WeatherBackground>
    );
  }

  if (!user) return null;

  // No active chapters — redirect message
  const active = activeChapters.filter((c) => c.status === 'active');
  if (active.length === 0) {
    return (
      <WeatherBackground climate={climateState}>
        <Navigation />
        <SideNav />
        <div className="min-h-screen pt-[60px]">
          <div className="max-w-xl mx-auto px-5 sm:px-8 pt-10 pb-12">
            <div className="glass-card-strong p-6 text-center">
              <p
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '14px',
                  color: 'var(--parent-text-light)',
                  lineHeight: 1.6,
                }}
              >
                No active workbook chapters to check in on. Start working on a dimension first.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center mt-4 px-6 py-2.5 rounded-full text-[13px] font-medium text-white hover:opacity-90"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  background: 'var(--parent-primary)',
                }}
              >
                Go to dashboard
              </Link>
            </div>
          </div>
        </div>
      </WeatherBackground>
    );
  }

  return (
    <WeatherBackground climate={climateState}>
      <Navigation />
      <SideNav />

      <div className="min-h-screen pt-[60px]">
        <div className="max-w-xl mx-auto px-5 sm:px-8 pt-10 pb-12">
          {/* Phase indicator */}
          <div className="mb-6 flex justify-center">
            <AuraPhaseIndicator phase={auraPhase} />
          </div>

          {/* Step content */}
          {step === 'assess' && currentCheckIn && (
            <AssessStep
              checkIn={currentCheckIn}
              dimensionIndex={currentDimIdx}
              totalDimensions={checkIns.length}
              onAnswer={handleAnswer}
              onNext={handleNextDimension}
              allAnswered={allPromptsAnswered}
            />
          )}

          {step === 'understand' && (
            <UnderstandStep
              checkIns={checkIns}
              assessments={assessments}
              onNext={handleToRespond}
            />
          )}

          {step === 'respond' && (
            <RespondStep
              checkIns={checkIns}
              onNext={handleToAssimilate}
            />
          )}

          {step === 'assimilate' && (
            <AssimilateStep
              checkIns={checkIns}
              assessments={assessments}
            />
          )}
        </div>
      </div>
    </WeatherBackground>
  );
}

// ==================== Step 1: Micro-Assess ====================

function AssessStep({
  checkIn,
  dimensionIndex,
  totalDimensions,
  onAnswer,
  onNext,
  allAnswered,
}: {
  checkIn: DimensionCheckIn;
  dimensionIndex: number;
  totalDimensions: number;
  onAnswer: (promptId: string, value: number) => void;
  onNext: () => void;
  allAnswered: boolean;
}) {
  return (
    <div className="animate-fade-in-up">
      {/* Section header */}
      <div className="mb-6">
        <span
          className="block mb-1"
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--aura-assess)',
          }}
        >
          Quick check &middot; {dimensionIndex + 1} of {totalDimensions}
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
          {checkIn.dimensionName}
        </h2>
        <p
          className="mt-1"
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontSize: '13px',
            color: 'var(--parent-text-light)',
          }}
        >
          with {checkIn.chapter.personName}
        </p>
      </div>

      {/* Questions */}
      <div className="space-y-5">
        {checkIn.prompts.map((prompt) => {
          const options =
            prompt.responseType === 'frequency' ? FREQUENCY_OPTIONS : LIKERT_OPTIONS;
          const selected = checkIn.answers[prompt.promptId];

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
                    onClick={() => onAnswer(prompt.promptId, opt.value)}
                    className="px-4 py-2 rounded-full text-[12.5px] font-medium transition-all"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      background:
                        selected === opt.value
                          ? 'var(--aura-assess)'
                          : 'rgba(255,255,255,0.5)',
                      color:
                        selected === opt.value ? '#fff' : 'var(--parent-text)',
                      border:
                        selected === opt.value
                          ? '1px solid var(--aura-assess)'
                          : '1px solid rgba(0,0,0,0.06)',
                      transform: selected === opt.value ? 'scale(1.02)' : 'scale(1)',
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

      {/* No prompts available */}
      {checkIn.prompts.length === 0 && (
        <div className="glass-card-strong p-5 text-center">
          <p
            style={{
              fontFamily: 'var(--font-parent-body)',
              fontSize: '13px',
              color: 'var(--parent-text-light)',
            }}
          >
            No new questions for {checkIn.dimensionName} right now.
          </p>
        </div>
      )}

      {/* Next button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={onNext}
          disabled={!allAnswered && checkIn.prompts.length > 0}
          className="inline-flex items-center px-6 py-2.5 rounded-full text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
          style={{
            fontFamily: 'var(--font-parent-body)',
            background: 'var(--aura-assess)',
          }}
        >
          {dimensionIndex < totalDimensions - 1 ? 'Next dimension' : 'See results'}
        </button>
      </div>
    </div>
  );
}

// ==================== Step 2: Micro-Understand ====================

function UnderstandStep({
  checkIns,
  assessments,
  onNext,
}: {
  checkIns: DimensionCheckIn[];
  assessments: DimensionAssessment[];
  onNext: () => void;
}) {
  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <span
          className="block mb-1"
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--aura-understand)',
          }}
        >
          What we&apos;re seeing
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
          Your check-in snapshot
        </h2>
      </div>

      <div className="space-y-4">
        {checkIns.map((ci) => {
          // Compute a "new" score from answers as a simple average
          const answerValues = Object.values(ci.answers);
          const avgAnswer =
            answerValues.length > 0
              ? answerValues.reduce((s, v) => s + v, 0) / answerValues.length
              : ci.previousScore;

          // Blend with previous score (weighted: 70% existing, 30% new signal)
          const blendedScore = ci.previousScore * 0.7 + avgAnswer * 0.3;
          const newLabel = scoreToQualitativeBand(blendedScore);
          const prevLabel = scoreToQualitativeBand(ci.previousScore);
          const trend = trendArrow(ci.previousScore, blendedScore);
          const dim = getDimension(ci.chapter.dimensionId);
          const domain = dim?.domain || 'couple';

          return (
            <div key={ci.chapter.chapterId} className="glass-card-strong p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-parent-display)',
                      fontSize: '16px',
                      fontWeight: 500,
                      color: 'var(--parent-text)',
                    }}
                  >
                    {ci.dimensionName}
                  </h3>
                  <span
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '12px',
                      color: 'var(--parent-text-light)',
                    }}
                  >
                    with {ci.chapter.personName}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '20px',
                    color: trend.color,
                  }}
                >
                  {trend.symbol}
                </span>
              </div>

              {/* Score transition */}
              <div className="flex items-center gap-2 mt-3">
                <span
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: '13px',
                    color: 'var(--parent-text-light)',
                  }}
                >
                  {prevLabel}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: '13px',
                    color: 'var(--parent-text-light)',
                  }}
                >
                  &rarr;
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: trend.color,
                  }}
                >
                  {newLabel}
                </span>
              </div>

              {/* Narrative context */}
              <p
                className="mt-2"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '12.5px',
                  color: 'var(--parent-text-light)',
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                }}
              >
                {blendedScore >= ci.previousScore + 0.3
                  ? `Things are shifting in a positive direction for ${ci.dimensionName.toLowerCase()}.`
                  : blendedScore <= ci.previousScore - 0.3
                    ? `${ci.dimensionName} feels harder right now. That\u2019s okay \u2014 awareness is the first step.`
                    : `${ci.dimensionName} is holding steady. Consistency matters.`}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onNext}
          className="inline-flex items-center px-6 py-2.5 rounded-full text-[13px] font-medium text-white hover:opacity-90"
          style={{
            fontFamily: 'var(--font-parent-body)',
            background: 'var(--aura-understand)',
          }}
        >
          See your exercises
        </button>
      </div>
    </div>
  );
}

// ==================== Step 3: Micro-Respond ====================

function RespondStep({
  checkIns,
  onNext,
}: {
  checkIns: DimensionCheckIn[];
  onNext: () => void;
}) {
  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <span
          className="block mb-1"
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--aura-respond)',
          }}
        >
          Your practice
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
          What you&apos;re working on
        </h2>
      </div>

      <div className="space-y-4">
        {checkIns.map((ci) => {
          const allExercises = getExercisesForDimension(
            ci.chapter.dimensionId,
            ci.chapter.currentPhase
          );
          const currentExercise = allExercises.find(
            (e) => e.exerciseId === ci.chapter.currentExerciseId
          );
          const completedCount = ci.chapter.completions.length;
          const isComplete = completedCount > 0 && !currentExercise;

          // Find next exercise if current is done
          const nextExercise = isComplete
            ? allExercises.find(
                (e) =>
                  !ci.chapter.completions.some(
                    (c) => c.exerciseId === e.exerciseId
                  )
              )
            : null;

          return (
            <div key={ci.chapter.chapterId} className="glass-card-strong p-5">
              <h3
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: '16px',
                  fontWeight: 500,
                  color: 'var(--parent-text)',
                }}
              >
                {ci.dimensionName}
              </h3>
              <span
                className="block mb-3"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '12px',
                  color: 'var(--parent-text-light)',
                }}
              >
                with {ci.chapter.personName}
              </span>

              {currentExercise && (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: 'rgba(255,255,255,0.45)',
                    border: '1px solid rgba(255,255,255,0.5)',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '13px',
                      color: 'var(--parent-text-light)',
                      fontStyle: 'italic',
                      marginBottom: '6px',
                    }}
                  >
                    Still working on:
                  </p>
                  <h4
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--parent-text)',
                    }}
                  >
                    {currentExercise.title}
                  </h4>
                  <p
                    className="mt-1"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '12.5px',
                      color: 'var(--parent-text-light)',
                      lineHeight: 1.5,
                    }}
                  >
                    {currentExercise.suggestedTiming} &middot; ~{currentExercise.durationMinutes}min
                  </p>
                  <p
                    className="mt-2"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '12.5px',
                      color: 'var(--parent-text-light)',
                      lineHeight: 1.5,
                    }}
                  >
                    Take your time. No rush.
                  </p>
                </div>
              )}

              {nextExercise && (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: 'rgba(255,255,255,0.45)',
                    border: '1px solid rgba(255,255,255,0.5)',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '13px',
                      color: 'var(--aura-respond)',
                      fontWeight: 500,
                      marginBottom: '6px',
                    }}
                  >
                    Up next:
                  </p>
                  <h4
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--parent-text)',
                    }}
                  >
                    {nextExercise.title}
                  </h4>
                  <p
                    className="mt-1"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '12.5px',
                      color: 'var(--parent-text-light)',
                      lineHeight: 1.5,
                    }}
                  >
                    {nextExercise.description.length > 140
                      ? nextExercise.description.slice(0, 137) + '...'
                      : nextExercise.description}
                  </p>
                </div>
              )}

              {!currentExercise && !nextExercise && (
                <p
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: '13px',
                    color: 'var(--parent-text-light)',
                    fontStyle: 'italic',
                  }}
                >
                  All exercises in this phase are done. Nice work.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-between items-center">
        <Link
          href="/workbook"
          className="text-[12px] hover:opacity-70"
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontWeight: 500,
            color: 'var(--parent-text-light)',
          }}
        >
          Open workbook
        </Link>
        <button
          onClick={onNext}
          className="inline-flex items-center px-6 py-2.5 rounded-full text-[13px] font-medium text-white hover:opacity-90"
          style={{
            fontFamily: 'var(--font-parent-body)',
            background: 'var(--aura-respond)',
          }}
        >
          Wrap up
        </button>
      </div>
    </div>
  );
}

// ==================== Step 4: Micro-Assimilate ====================

function AssimilateStep({
  checkIns,
  assessments,
}: {
  checkIns: DimensionCheckIn[];
  assessments: DimensionAssessment[];
}) {
  // Calculate summary stats
  const improving = checkIns.filter((ci) => {
    const vals = Object.values(ci.answers);
    if (vals.length === 0) return false;
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    return avg * 0.3 + ci.previousScore * 0.7 > ci.previousScore + 0.2;
  });

  const declining = checkIns.filter((ci) => {
    const vals = Object.values(ci.answers);
    if (vals.length === 0) return false;
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    return avg * 0.3 + ci.previousScore * 0.7 < ci.previousScore - 0.2;
  });

  const totalCompletions = checkIns.reduce(
    (sum, ci) => sum + ci.chapter.completions.length,
    0
  );

  const hasImprovement = improving.length > 0;
  const hasDecline = declining.length > 0 && improving.length === 0;

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <span
          className="block mb-1"
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--aura-assimilate)',
          }}
        >
          This week
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
          {hasImprovement
            ? 'Things are moving'
            : hasDecline
              ? 'Tough weeks happen'
              : 'Holding steady'}
        </h2>
      </div>

      <div className="glass-card-strong p-6">
        {/* Summary message */}
        <p
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontSize: '14px',
            color: 'var(--parent-text)',
            lineHeight: 1.65,
          }}
        >
          {hasImprovement && improving.length === 1 && (
            <>
              <strong>{improving[0].dimensionName}</strong> is trending up. The work you&apos;re putting in is showing.
            </>
          )}
          {hasImprovement && improving.length > 1 && (
            <>
              {improving.map((ci) => ci.dimensionName).join(' and ')}{' '}
              are both trending up. Real progress.
            </>
          )}
          {hasDecline && (
            <>
              Some areas feel harder this week. That&apos;s part of the process.
              You&apos;re still here, and that matters more than a perfect score.
            </>
          )}
          {!hasImprovement && !hasDecline && (
            <>
              Things are holding steady across the board. Consistency is its own
              kind of progress.
            </>
          )}
        </p>

        {/* Stats */}
        {totalCompletions > 0 && (
          <div
            className="mt-4 pt-4"
            style={{
              borderTop: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: '12px',
                color: 'var(--parent-text-light)',
              }}
            >
              {totalCompletions} exercise{totalCompletions === 1 ? '' : 's'} completed across{' '}
              {checkIns.length} dimension{checkIns.length === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </div>

      {/* Celebration moment */}
      {hasImprovement && (
        <div
          className="mt-4 glass-card-strong p-5 text-center"
          style={{
            background: 'rgba(22,163,106,0.06)',
            border: '1px solid rgba(22,163,106,0.15)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-parent-display)',
              fontSize: '18px',
              fontWeight: 400,
              fontStyle: 'italic',
              color: '#16a34a',
            }}
          >
            Keep going. You&apos;re building something real.
          </p>
        </div>
      )}

      {/* Compassionate framing for decline */}
      {hasDecline && (
        <div
          className="mt-4 glass-card-strong p-5 text-center"
          style={{
            background: 'rgba(186,117,23,0.06)',
            border: '1px solid rgba(186,117,23,0.15)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-parent-display)',
              fontSize: '18px',
              fontWeight: 400,
              fontStyle: 'italic',
              color: '#BA7517',
            }}
          >
            Growth isn&apos;t linear. You showed up today.
          </p>
        </div>
      )}

      {/* Navigation links */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <Link
          href="/workbook"
          className="inline-flex items-center px-6 py-2.5 rounded-full text-[13px] font-medium text-white hover:opacity-90"
          style={{
            fontFamily: 'var(--font-parent-body)',
            background: 'var(--aura-assimilate)',
          }}
        >
          Back to workbook
        </Link>
        <Link
          href="/dashboard"
          className="text-[12px] hover:opacity-70"
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontWeight: 500,
            color: 'var(--parent-text-light)',
          }}
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
