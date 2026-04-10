'use client';

import { useState } from 'react';
import type { WorkbookChapter, ArcPhase } from '@/types/workbook';
import { getExercisesForDimension } from '@/config/exercises';
import { getDimension } from '@/config/relationship-dimensions';
import { scoreToColor } from '@/lib/scoring-engine';
import { scoreToRelationshipPhrase } from '@/lib/climate-engine';
import { detectContradictions } from '@/lib/assessment-needs-engine';
import { recordContradiction } from '@/hooks/useAssessmentNeeds';
import ReflectionForm from './ReflectionForm';
import type { ReflectionRating, SuggestedManualEntry } from '@/types/workbook';

const PHASE_LABELS: Record<ArcPhase, string> = {
  awareness: 'Awareness',
  practice: 'Practice',
  integration: 'Integration',
};

const PHASE_COLORS: Record<ArcPhase, string> = {
  awareness: 'var(--aura-assess)',
  practice: 'var(--aura-respond)',
  integration: 'var(--aura-assimilate)',
};

interface WorkbookChapterCardProps {
  chapter: WorkbookChapter;
  onCompleteExercise: (
    chapterId: string,
    reflection: {
      exerciseId: string;
      rating: ReflectionRating;
      reflectionNotes: string;
      suggestedManualEntries?: SuggestedManualEntry[];
    }
  ) => Promise<void>;
  onPause: (chapterId: string) => Promise<void>;
  onResume: (chapterId: string) => Promise<void>;
}

export default function WorkbookChapterCard({
  chapter,
  onCompleteExercise,
  onPause,
  onResume,
}: WorkbookChapterCardProps) {
  const [showReflection, setShowReflection] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const dimension = getDimension(chapter.dimensionId);
  const dimensionName = dimension?.name || chapter.dimensionId;
  const domain = dimension?.domain || 'couple';

  // Find the current exercise from the library
  const allExercises = getExercisesForDimension(chapter.dimensionId);
  const currentExercise = allExercises.find(
    (e) => e.exerciseId === chapter.currentExerciseId
  );

  // Qualitative score bands
  const startLabel = scoreToRelationshipPhrase(chapter.startingScore, domain);
  const currentLabel = scoreToRelationshipPhrase(chapter.currentScore, domain);
  const phaseColor = PHASE_COLORS[chapter.currentPhase];
  const scoreColor = scoreToColor(chapter.currentScore);

  // Progress: completed exercises in this chapter
  const completedCount = chapter.completions.length;
  const totalInPhase = getExercisesForDimension(
    chapter.dimensionId,
    chapter.currentPhase
  ).length;

  const handleSubmitReflection = async (reflection: {
    rating: ReflectionRating;
    reflectionNotes: string;
    suggestedManualEntries?: SuggestedManualEntry[];
  }) => {
    if (!currentExercise) return;
    setSubmitting(true);
    try {
      await onCompleteExercise(chapter.chapterId, {
        exerciseId: currentExercise.exerciseId,
        ...reflection,
      });

      // Check for contradiction between reflection rating and current score
      if (detectContradictions(chapter.dimensionId, reflection.rating, chapter.currentScore)) {
        recordContradiction(chapter.dimensionId);
      }

      setShowReflection(false);
    } catch (err) {
      console.error('Failed to submit reflection:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const isPaused = chapter.status === 'paused';

  return (
    <>
      <div className="glass-card-strong overflow-hidden">
        <div className="p-5 sm:p-6">
          {/* Header: dimension + person */}
          <div className="flex items-start justify-between">
            <div>
              <h3
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: '25px',
                  fontWeight: 500,
                  color: 'var(--parent-text)',
                  letterSpacing: '-0.01em',
                }}
              >
                {dimensionName}
              </h3>
              <span
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '19px',
                  color: 'var(--parent-text-light)',
                }}
              >
                with {chapter.personName}
              </span>
            </div>

            {/* Phase badge */}
            <div
              className="px-3 py-1 rounded-full"
              style={{
                background: `color-mix(in srgb, ${phaseColor} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${phaseColor} 25%, transparent)`,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '17px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: phaseColor,
                }}
              >
                {PHASE_LABELS[chapter.currentPhase]}
              </span>
            </div>
          </div>

          {/* Score context: qualitative bands */}
          <div className="flex items-center gap-2 mt-3">
            <span
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: '19px',
                color: 'var(--parent-text-light)',
              }}
            >
              {startLabel}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: '19px',
                color: 'var(--parent-text-light)',
              }}
            >
              &rarr;
            </span>
            <span
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: '19px',
                fontWeight: 500,
                color: scoreColor,
              }}
            >
              {currentLabel}
            </span>
          </div>

          {/* Current exercise */}
          {currentExercise && (
            <div className="mt-4">
              {/* THIS WEEK micro label */}
              <span
                className="block mb-2"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '17px',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--parent-text-light)',
                  opacity: 0.6,
                }}
              >
                This week
              </span>

              <div
                className="rounded-2xl p-4"
                style={{
                  background: 'rgba(255,255,255,0.45)',
                  border: '1px solid rgba(255,255,255,0.5)',
                }}
              >
                {/* Exercise title in display font, quoted */}
                <h4
                  style={{
                    fontFamily: 'var(--font-parent-display)',
                    fontSize: '22px',
                    fontWeight: 400,
                    fontStyle: 'italic',
                    color: 'var(--parent-text)',
                    lineHeight: 1.35,
                  }}
                >
                  &ldquo;{currentExercise.title}&rdquo;
                </h4>
                <p
                  className="mt-2"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: '17px',
                    color: 'var(--parent-text-light)',
                    lineHeight: 1.55,
                  }}
                >
                  {currentExercise.description.length > 160
                    ? currentExercise.description.slice(0, 157) + '...'
                    : currentExercise.description}
                </p>
                {/* Time + timing */}
                <p
                  className="mt-2"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: '21px',
                    color: 'var(--parent-text-light)',
                  }}
                >
                  ~{currentExercise.durationMinutes} min &middot; {currentExercise.suggestedTiming}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-4">
            {!isPaused ? (
              <button
                onClick={() => setShowReflection(true)}
                className="inline-flex items-center px-5 py-2 rounded-full text-[18px] font-medium text-white hover:opacity-90"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  background: 'var(--parent-primary)',
                  letterSpacing: '0.01em',
                }}
              >
                Mark complete &#10003;
              </button>
            ) : (
              <button
                onClick={() => onResume(chapter.chapterId)}
                className="inline-flex items-center px-5 py-2 rounded-full text-[18px] font-medium text-white hover:opacity-90"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  background: 'var(--parent-primary)',
                  letterSpacing: '0.01em',
                }}
              >
                Resume
              </button>
            )}

            {!isPaused && (
              <button
                onClick={() => onPause(chapter.chapterId)}
                className="text-[16px] hover:opacity-70"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontWeight: 500,
                  color: 'var(--parent-text-light)',
                }}
              >
                Pause this chapter
              </button>
            )}
          </div>

          {/* Progress dots */}
          {totalInPhase > 0 && (
            <div className="flex items-center gap-1.5 mt-4">
              {Array.from({ length: totalInPhase }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-full"
                  style={{
                    width: 6,
                    height: 6,
                    background:
                      i < completedCount
                        ? scoreColor
                        : 'rgba(0,0,0,0.08)',
                    transition: 'background 0.3s ease',
                  }}
                />
              ))}
              <span
                className="ml-1.5"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '17px',
                  color: 'var(--parent-text-light)',
                }}
              >
                {completedCount}/{totalInPhase} in {PHASE_LABELS[chapter.currentPhase].toLowerCase()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Reflection modal */}
      {showReflection && currentExercise && (
        <ReflectionForm
          exercise={currentExercise}
          personName={chapter.personName}
          submitting={submitting}
          onSubmit={handleSubmitReflection}
          onClose={() => setShowReflection(false)}
        />
      )}
    </>
  );
}
