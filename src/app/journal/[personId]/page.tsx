'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useWorkbook } from '@/hooks/useWorkbook';
import { useDashboard } from '@/hooks/useDashboard';
import { getExercisesForDimension } from '@/config/exercises';
import { getDimension } from '@/config/relationship-dimensions';
import { detectContradictions } from '@/lib/assessment-needs-engine';
import { recordContradiction } from '@/hooks/useAssessmentNeeds';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';
import Link from 'next/link';
import type { WorkbookChapter, ArcPhase, ReflectionRating } from '@/types/workbook';
import type { DimensionId } from '@/config/relationship-dimensions';

const PHASE_ORDER: ArcPhase[] = ['awareness', 'practice', 'integration'];
const PHASE_LABELS: Record<ArcPhase, string> = {
  awareness: 'Awareness',
  practice: 'Practice',
  integration: 'Integration',
};

export default function WorkbookPersonPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const personId = params.personId as string;

  const { activeChapters, loading: wbLoading, completeExercise, pauseChapter, resumeChapter, startChapter } = useWorkbook();
  const { people, roles } = useDashboard();

  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [reflectionNotes, setReflectionNotes] = useState('');
  const [reflectionRating, setReflectionRating] = useState<ReflectionRating | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const person = people.find((p) => p.personId === personId);
  const personName = person?.name || 'Unknown';

  // Active chapter for this person
  const chapter = useMemo(
    () => activeChapters.find((c) => c.personId === personId && c.status === 'active') || null,
    [activeChapters, personId],
  );

  // Paused chapters for this person
  const pausedChapters = useMemo(
    () => activeChapters.filter((c) => c.personId === personId && c.status === 'paused'),
    [activeChapters, personId],
  );

  // Current exercise
  const currentExercise = useMemo(() => {
    if (!chapter) return null;
    return getExercisesForDimension(chapter.dimensionId)
      .find((e) => e.exerciseId === chapter.currentExerciseId) || null;
  }, [chapter]);

  // Dimension info
  const dimension = chapter ? getDimension(chapter.dimensionId) : null;
  const dimensionName = dimension?.name || chapter?.dimensionId || '';

  // Progress
  const completedCount = chapter?.completions.length || 0;
  const totalInPhase = chapter
    ? getExercisesForDimension(chapter.dimensionId, chapter.currentPhase).length
    : 0;

  // Days into the chapter
  const daysIn = chapter
    ? Math.max(1, Math.floor((Date.now() - chapter.createdAt.toMillis()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Progress percentage (completions across all phases)
  const allExercises = chapter ? getExercisesForDimension(chapter.dimensionId) : [];
  const progressPercent = allExercises.length > 0
    ? Math.round((completedCount / allExercises.length) * 100)
    : 0;

  // Recent completions for this person
  const recentCompletions = useMemo(() => {
    if (!chapter) return [];
    return [...chapter.completions]
      .sort((a, b) => (b.completedAt?.toMillis() || 0) - (a.completedAt?.toMillis() || 0))
      .slice(0, 5)
      .map((c) => {
        const ex = getExercisesForDimension(chapter.dimensionId)
          .find((e) => e.exerciseId === c.exerciseId);
        const date = c.completedAt?.toDate?.();
        return {
          id: c.completionId,
          title: ex?.title || c.exerciseId,
          date: date
            ? date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            : '',
        };
      });
  }, [chapter]);

  // Suggested dimensions to start (lowest-scoring first, excluding active/paused chapters)
  const suggestedDimensions = useMemo(() => {
    const role = roles.find((r) => r.otherPerson.personId === personId);
    if (!role || role.assessments.length === 0) return [];

    const activeIds = new Set(activeChapters.map((c) => c.dimensionId));
    const seen = new Set<string>();
    return [...role.assessments]
      .filter((a) => !activeIds.has(a.dimensionId as DimensionId))
      .sort((a, b) => a.currentScore - b.currentScore)
      .filter((a) => {
        if (seen.has(a.dimensionId)) return false;
        seen.add(a.dimensionId);
        return true;
      })
      .slice(0, 3)
      .map((a) => {
        const dim = getDimension(a.dimensionId as DimensionId);
        const exercises = getExercisesForDimension(a.dimensionId as DimensionId, 'awareness');
        return {
          dimensionId: a.dimensionId as DimensionId,
          name: dim?.name || a.dimensionId,
          score: a.currentScore,
          firstExerciseId: exercises[0]?.exerciseId || null,
        };
      })
      .filter((d) => d.firstExerciseId);
  }, [roles, personId, activeChapters]);

  const handleStartChapter = async (dimId: DimensionId, firstExerciseId: string, score: number) => {
    setStarting(true);
    try {
      await startChapter({
        dimensionId: dimId,
        personId,
        personName,
        startingScore: score,
        targetScore: Math.min(5, score + 1),
        firstExerciseId,
      });
    } catch (err) {
      console.error('Failed to start chapter:', err);
    } finally {
      setStarting(false);
    }
  };

  const handleMarkDone = async () => {
    if (!chapter || !currentExercise || !reflectionRating) return;
    setSubmitting(true);
    try {
      await completeExercise(chapter.chapterId, {
        exerciseId: currentExercise.exerciseId,
        rating: reflectionRating,
        reflectionNotes,
      });
      if (detectContradictions(chapter.dimensionId, reflectionRating, chapter.currentScore)) {
        recordContradiction(chapter.dimensionId);
      }
      setReflectionNotes('');
      setReflectionRating(null);
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 3000);
    } catch (err) {
      console.error('Failed to complete exercise:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || wbLoading) {
    return (
      <div className="relish-page flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-2 border-t-transparent" style={{ borderColor: '#7C9082', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relish-page">
      <Navigation />
      <SideNav />

      <div className="pt-[60px]">
        <div className="relish-container" style={{ maxWidth: 720 }}>
          {/* Back to Journal */}
          <div className="pt-4 pb-6">
            <Link
              href="/journal"
              className="inline-flex items-center gap-1 text-[18px] hover:opacity-70"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#5F564B' }}
            >
              &larr; Back to Journal
            </Link>
          </div>

          {chapter && currentExercise ? (
            <div className="relish-panel" style={{ padding: '32px 36px' }}>
              {/* Arc header */}
              <div className="flex items-start gap-4 mb-2">
                <div
                  className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(124,144,130,0.12)' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C9082" strokeWidth="1.5">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                </div>
                <div>
                  <h1
                    style={{
                      fontFamily: 'var(--font-parent-display)',
                      fontSize: 'clamp(1.5rem, 4vw, 1.85rem)',
                      fontWeight: 500,
                      color: '#3A3530',
                      lineHeight: 1.2,
                    }}
                  >
                    {dimensionName} with {personName}
                  </h1>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '21px', color: '#746856' }}>
                      Day {daysIn}
                    </span>
                    <span style={{ color: '#D8D3CA' }}>&middot;</span>
                    <span
                      className="px-2 py-0.5 rounded-full"
                      style={{
                        fontFamily: 'var(--font-parent-body)',
                        fontSize: '21px',
                        fontWeight: 500,
                        color: '#7C9082',
                        background: 'rgba(124,144,130,0.1)',
                        border: '1px solid rgba(124,144,130,0.2)',
                      }}
                    >
                      {PHASE_LABELS[chapter.currentPhase]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 mb-8">
                <div className="growth-bar-track">
                  <div className="growth-bar-fill" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="flex justify-end mt-1">
                  <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '19px', color: '#746856' }}>
                    {progressPercent}%
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: '#E5E0D8', marginBottom: 28 }} />

              {/* TODAY'S PRACTICE */}
              <div className="mb-8">
                <span className="relish-label">Today&apos;s Practice</span>
                <div className="one-thing-card mt-3">
                  <h2
                    style={{
                      fontFamily: 'var(--font-parent-display)',
                      fontSize: '28px',
                      fontWeight: 400,
                      color: '#3A3530',
                      lineHeight: 1.3,
                    }}
                  >
                    {currentExercise.title}
                  </h2>
                  <p
                    className="mt-2"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '19px',
                      color: '#5F564B',
                      lineHeight: 1.6,
                    }}
                  >
                    {currentExercise.description}
                  </p>

                  {/* Prompts */}
                  {currentExercise.reflectionPrompts.length > 0 && (
                    <div className="mt-4">
                      <span className="relish-label">Try these prompts</span>
                      <ul className="mt-2 space-y-1.5">
                        {currentExercise.reflectionPrompts.map((prompt, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2"
                            style={{ fontFamily: 'var(--font-parent-body)', fontSize: '19px', color: '#3A3530' }}
                          >
                            <span style={{ color: '#7C9082', marginTop: 1 }}>&bull;</span>
                            {prompt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Mark as done */}
                  <div className="mt-5">
                    {justCompleted ? (
                      <span
                        style={{ fontFamily: 'var(--font-parent-body)', fontSize: '19px', color: '#7C9082', fontWeight: 500 }}
                      >
                        &#10003; Done
                      </span>
                    ) : (
                      <button
                        onClick={reflectionRating ? handleMarkDone : undefined}
                        disabled={!reflectionRating || submitting}
                        className="one-thing-cta disabled:opacity-40"
                      >
                        {submitting ? 'Saving...' : '\u25CB Mark as done'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* REFLECTION — inline */}
              <div className="mb-8">
                <span className="relish-label">Reflection</span>
                <p
                  className="mt-2 mb-3"
                  style={{ fontFamily: 'var(--font-parent-body)', fontSize: '19px', color: '#5F564B' }}
                >
                  What did you notice? How did it go?
                </p>

                {/* Rating */}
                <div className="flex gap-2 mb-3">
                  {([
                    { value: 'didnt_try' as ReflectionRating, label: "Didn't try", emoji: '\uD83D\uDE10' },
                    { value: 'tried_hard' as ReflectionRating, label: 'Tried but hard', emoji: '\uD83D\uDE15' },
                    { value: 'went_okay' as ReflectionRating, label: 'Went okay', emoji: '\uD83D\uDE42' },
                    { value: 'went_well' as ReflectionRating, label: 'Went well', emoji: '\uD83D\uDE0A' },
                  ]).map((opt) => {
                    const selected = reflectionRating === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setReflectionRating(opt.value)}
                        className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all flex-1"
                        style={{
                          background: selected ? 'rgba(124,144,130,0.08)' : 'rgba(0,0,0,0.02)',
                          border: `1.5px solid ${selected ? '#7C9082' : '#E5E0D8'}`,
                        }}
                      >
                        <span style={{ fontSize: '28px' }}>{opt.emoji}</span>
                        <span
                          style={{
                            fontFamily: 'var(--font-parent-body)',
                            fontSize: '17px',
                            fontWeight: selected ? 500 : 400,
                            color: selected ? '#7C9082' : '#746856',
                          }}
                        >
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <textarea
                  value={reflectionNotes}
                  onChange={(e) => setReflectionNotes(e.target.value)}
                  rows={4}
                  placeholder="Write your reflection here..."
                  className="w-full rounded-xl px-4 py-3 text-sm resize-none"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: '19px',
                    background: '#F7F5F0',
                    border: '1px solid #E5E0D8',
                    color: '#3A3530',
                  }}
                />
              </div>

              {/* RECENT PRACTICE */}
              {recentCompletions.length > 0 && (
                <div>
                  <div style={{ height: 1, background: '#E5E0D8', marginBottom: 28 }} />
                  <span className="relish-label">Recent Practice</span>
                  <div className="mt-3 space-y-2">
                    {recentCompletions.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl"
                        style={{ background: '#F7F5F0' }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C9082" strokeWidth="1.5">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M8 12l3 3 5-5" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <span
                            className="block"
                            style={{ fontFamily: 'var(--font-parent-body)', fontSize: '19px', color: '#3A3530' }}
                          >
                            {item.title}
                          </span>
                          <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '19px', color: '#746856' }}>
                            {item.date}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pause */}
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => pauseChapter(chapter.chapterId)}
                  className="text-[17px] hover:opacity-70"
                  style={{ fontFamily: 'var(--font-parent-body)', color: '#746856' }}
                >
                  Pause this practice
                </button>
              </div>
            </div>
          ) : (
            /* No active chapter — offer to start one */
            <div className="relish-panel" style={{ padding: '32px 36px' }}>
              <h1
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: 'clamp(1.5rem, 4vw, 1.85rem)',
                  fontWeight: 500,
                  color: '#3A3530',
                  marginBottom: 4,
                }}
              >
                You & {personName}
              </h1>
              <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '19px', color: '#746856', lineHeight: 1.6, marginBottom: 24 }}>
                Choose an area to begin practicing together.
              </p>

              {suggestedDimensions.length > 0 ? (
                <div className="space-y-3">
                  <span className="relish-label">Suggested areas</span>
                  {suggestedDimensions.map((dim) => {
                    const dimDetail = getDimension(dim.dimensionId);
                    return (
                      <div
                        key={dim.dimensionId}
                        className="one-thing-card"
                      >
                        <h3
                          style={{
                            fontFamily: 'var(--font-parent-display)',
                            fontSize: '25px',
                            fontWeight: 500,
                            color: '#3A3530',
                          }}
                        >
                          {dim.name}
                        </h3>
                        {dimDetail?.shortDescription && (
                          <p
                            className="mt-1"
                            style={{
                              fontFamily: 'var(--font-parent-body)',
                              fontSize: '21px',
                              color: '#5F564B',
                              lineHeight: 1.5,
                            }}
                          >
                            {dimDetail.shortDescription}
                          </p>
                        )}
                        <button
                          onClick={() => handleStartChapter(dim.dimensionId, dim.firstExerciseId!, dim.score)}
                          disabled={starting}
                          className="one-thing-cta mt-3 disabled:opacity-40"
                        >
                          {starting ? 'Starting...' : 'Begin practice'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '19px', color: '#746856', textAlign: 'center' }}>
                  Complete assessments first to unlock growth areas.
                </p>
              )}

              {/* Paused chapters */}
              {pausedChapters.length > 0 && (
                <div className="mt-8">
                  <span className="relish-label" style={{ opacity: 0.6 }}>Paused</span>
                  <div className="mt-2 space-y-2">
                    {pausedChapters.map((ch) => {
                      const dim = getDimension(ch.dimensionId);
                      return (
                        <div key={ch.chapterId} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: '#F7F5F0' }}>
                          <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '21px', color: '#5F564B' }}>
                            {dim?.name || ch.dimensionId}
                          </span>
                          <button
                            onClick={() => resumeChapter(ch.chapterId)}
                            className="text-[17px] hover:opacity-70"
                            style={{ fontFamily: 'var(--font-parent-body)', color: '#7C9082', fontWeight: 500 }}
                          >
                            Resume
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pb-16" />
        </div>
      </div>
    </div>
  );
}
