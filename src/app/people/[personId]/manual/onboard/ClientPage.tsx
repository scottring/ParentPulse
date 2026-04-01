'use client';

import { use, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { progressColor } from '@/utils/progress-color';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { useContribution } from '@/hooks/useContribution';
import { getOnboardingSections, OnboardingSection } from '@/config/onboarding-questions';
import { QuestionAnswer } from '@/types/onboarding';
import { QuestionRenderer } from '@/components/onboarding/QuestionRenderer';
import { getDemoAnswer } from '@/config/demo-answers';
import { RelationshipType } from '@/types/person-manual';
import { computeAge } from '@/utils/age';

export function ObserverOnboardPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isDemo = useMemo(() => {
    if (user?.isDemo) return true;
    if (typeof window !== 'undefined') return new URLSearchParams(window.location.search).get('demo') === 'true';
    return false;
  }, [user?.isDemo]);
  const { person, loading: personLoading } = usePersonById(personId);
  const { manual, loading: manualLoading } = usePersonManual(personId);
  const { saveDraft, completeDraft, findDraft } = useContribution();

  const [sections, setSections] = useState<OnboardingSection[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, QuestionAnswer>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Refs to always have latest values for saves (avoids stale closures)
  const answersRef = useRef(answers);
  const sectionIndexRef = useRef(currentSectionIndex);
  const questionIndexRef = useRef(currentQuestionIndex);
  answersRef.current = answers;
  sectionIndexRef.current = currentSectionIndex;
  questionIndexRef.current = currentQuestionIndex;

  // Load sections based on relationship type (with age-appropriate placeholders for children)
  const personRelType = person?.relationshipType;
  const personDob = person?.dateOfBirth;
  useEffect(() => {
    if (personRelType) {
      const childAge = personRelType === 'child' && personDob
        ? computeAge(personDob)
        : undefined;
      const s = getOnboardingSections(personRelType as RelationshipType, childAge);
      setSections(s);
    }
  }, [personRelType, personDob]);

  // Load existing draft OR completed contribution from Firestore
  useEffect(() => {
    if (!manual || !user || draftLoaded) return;

    (async () => {
      // First check for an in-progress draft
      const draft = await findDraft(manual.manualId, 'observer');
      if (draft) {
        setDraftId(draft.contributionId);
        if (draft.answers) setAnswers(draft.answers);
        if (draft.draftProgress) {
          setCurrentSectionIndex(draft.draftProgress.sectionIndex);
          setCurrentQuestionIndex(draft.draftProgress.questionIndex);
        }
        setDraftLoaded(true);
        return;
      }

      // No draft — check for a completed contribution to resume from
      const { query: fsQuery, collection: fsCollection, where, getDocs } = await import('firebase/firestore');
      const { firestore } = await import('@/lib/firebase');
      const { PERSON_MANUAL_COLLECTIONS } = await import('@/types/person-manual');
      const q = fsQuery(
        fsCollection(firestore, PERSON_MANUAL_COLLECTIONS.CONTRIBUTIONS),
        where('familyId', '==', user.familyId),
        where('manualId', '==', manual.manualId),
        where('contributorId', '==', user.userId),
        where('perspectiveType', '==', 'observer'),
        where('status', '==', 'complete')
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const existing = snap.docs[0];
        const data = existing.data();
        if (data.answers) setAnswers(data.answers);
        // Set draftId to the existing contribution so updates go there
        setDraftId(existing.id);
      }
      setDraftLoaded(true);
    })();
  }, [manual, user, draftLoaded, findDraft]);

  const currentSection = sections[currentSectionIndex];
  const currentQuestion = currentSection?.questions[currentQuestionIndex];

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const answeredQuestions = Object.values(answers).reduce(
    (sum, sectionAnswers) => sum + Object.keys(sectionAnswers).length,
    0
  );

  // Immediate save — used on navigation and exit. Reads from refs for latest data.
  const saveNow = useCallback(async () => {
    if (!manual || !person) return;
    // Cancel any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setSaveStatus('saving');
    try {
      const id = await saveDraft({
        manualId: manual.manualId,
        personId: person.personId,
        perspectiveType: 'observer',
        relationshipToSubject: person.relationshipType || 'other',
        answers: answersRef.current,
        sectionIndex: sectionIndexRef.current,
        questionIndex: questionIndexRef.current,
      });
      setDraftId(id);
      setSaveStatus('saved');
      return id;
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('error');
      return null;
    }
  }, [manual, person, saveDraft]);

  // Debounced save — used for typing within a question
  const triggerDebouncedSave = useCallback(() => {
    if (!manual || !person) return;
    setSaveStatus('unsaved');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveNow();
    }, 1500);
  }, [manual, person, saveNow]);

  // Auto-save when answers change (debounced for typing)
  useEffect(() => {
    if (answeredQuestions > 0 && draftLoaded) {
      triggerDebouncedSave();
    }
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [answers, answeredQuestions, draftLoaded, triggerDebouncedSave]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved' || saveStatus === 'saving') {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  const handleAnswer = useCallback((questionId: string, value: QuestionAnswer) => {
    if (!currentSection) return;
    setAnswers((prev) => ({
      ...prev,
      [currentSection.sectionId]: {
        ...prev[currentSection.sectionId],
        [questionId]: value,
      },
    }));
  }, [currentSection?.sectionId]);

  const handleNext = useCallback(() => {
    if (!currentSection) return;

    // Save immediately on navigation
    saveNow();

    if (currentQuestionIndex < currentSection.questions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
    } else if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex((i) => i + 1);
      setCurrentQuestionIndex(0);
    } else {
      handleSubmit();
    }
  }, [currentQuestionIndex, currentSectionIndex, currentSection, sections.length, saveNow]);

  const handlePrevious = useCallback(() => {
    // Save immediately on navigation
    saveNow();

    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((i) => i - 1);
    } else if (currentSectionIndex > 0) {
      const prevSection = sections[currentSectionIndex - 1];
      setCurrentSectionIndex((i) => i - 1);
      setCurrentQuestionIndex(prevSection.questions.length - 1);
    }
  }, [currentQuestionIndex, currentSectionIndex, sections, saveNow]);

  const handleSubmit = async () => {
    if (!user || !manual || !person) return;

    setIsSubmitting(true);
    try {
      // Always save latest answers before completing
      const id = await saveNow();
      if (!id) throw new Error('Save failed before completion');
      await completeDraft(id, manual.manualId);
      setIsComplete(true);
    } catch (err) {
      console.error('Failed to save observer onboarding:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndExit = async () => {
    if (manual && person && answeredQuestions > 0) {
      await saveNow();
    }
    router.push('/dashboard');
  };

  const handleFillAll = useCallback(() => {
    const filled: Record<string, Record<string, QuestionAnswer>> = { ...answers };
    for (const section of sections) {
      if (!filled[section.sectionId]) filled[section.sectionId] = {};
      for (const q of section.questions) {
        const demo = getDemoAnswer(q.id, person.relationshipType === 'child' ? 'observer_child' : 'observer');
        if (demo !== undefined) {
          filled[section.sectionId][q.id] = demo;
        }
      }
    }
    setAnswers(filled);
    setSaveStatus('unsaved');
  }, [answers, sections]);

  // Redirect after completion
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, personId, router]);

  // Loading
  if (authLoading || personLoading || manualLoading || !draftLoaded || sections.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !person || !manual) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <p className="font-mono text-slate-600">Unable to load. Please try again.</p>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl">&#10003;</div>
          <h2 className="font-mono font-bold text-2xl text-slate-800">YOUR OBSERVATIONS ARE SAVED</h2>
          <p className="font-mono text-slate-600">Redirecting to {person.name}&apos;s manual...</p>
        </div>
      </div>
    );
  }

  const isLastQuestion =
    currentSectionIndex === sections.length - 1 &&
    currentQuestionIndex === currentSection.questions.length - 1;

  const currentAnswer = answers[currentSection.sectionId]?.[currentQuestion.id];

  // Replace {{personName}} in question text
  const displayQuestion = currentQuestion.question.replace(/\{\{personName\}\}/g, person.name);
  const displayHelper = currentQuestion.helperText?.replace(/\{\{personName\}\}/g, person.name);
  const displayPlaceholder = currentQuestion.placeholder?.replace(/\{\{personName\}\}/g, person.name);

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Header */}
      <div className="border-b-2 border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveAndExit}
                className="text-slate-400 hover:text-slate-800 transition-colors"
                title="Back to manual"
              >
                <span className="text-xl">&larr;</span>
              </button>
              <div>
                <span className="font-mono text-xs text-blue-600 font-bold tracking-wider">
                  OBSERVER ONBOARDING
                </span>
                <h1 className="font-mono font-bold text-lg text-slate-800">
                  About {person.name}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-mono text-xs text-slate-500 flex items-center justify-end gap-2">
                  <span>{answeredQuestions} / {totalQuestions} ANSWERED</span>
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    saveStatus === 'saved' ? 'bg-green-500' :
                    saveStatus === 'saving' ? 'bg-amber-500 animate-pulse' :
                    saveStatus === 'error' ? 'bg-red-500' :
                    'bg-amber-400'
                  }`} title={
                    saveStatus === 'saved' ? 'All changes saved' :
                    saveStatus === 'saving' ? 'Saving...' :
                    saveStatus === 'error' ? 'Save failed — will retry' :
                    'Unsaved changes'
                  } />
                </div>
                <div className="w-32 h-2 bg-slate-200 mt-1">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${(answeredQuestions / totalQuestions) * 100}%`,
                      backgroundColor: progressColor(answeredQuestions / totalQuestions),
                    }}
                  />
                </div>
              </div>
              <button
                onClick={handleSaveAndExit}
                className="px-4 py-2 border-2 border-slate-300 bg-white font-mono text-xs font-bold text-slate-600 hover:border-slate-800 hover:text-slate-800 transition-all"
              >
                SAVE &amp; EXIT
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Demo context banner */}
      {isDemo && (
        <div className="max-w-3xl mx-auto px-6 pt-4">
          <div
            className="flex items-center justify-between px-4 py-2 rounded-lg font-mono text-[11px]"
            style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)' }}
          >
            <div className="flex items-center gap-3">
              <span style={{ color: '#A3510B', fontWeight: 700 }}>DEMO</span>
              <span style={{ color: '#6B6B6B' }}>
                <strong style={{ color: '#2C2C2C' }}>{user?.name}</strong> sharing observations about{' '}
                <strong style={{ color: '#3B82F6' }}>{person.name}</strong>
                {person.relationshipType && <> ({person.relationshipType})</>}
              </span>
            </div>
            <button
              type="button"
              onClick={handleFillAll}
              className="px-3 py-1 rounded font-bold transition-all hover:scale-105"
              style={{ background: '#d97706', color: 'white', fontSize: '10px' }}
            >
              FILL ALL
            </button>
          </div>
        </div>
      )}

      {/* Section indicator */}
      <div className="max-w-3xl mx-auto px-6 pt-6">
        <div className="flex gap-2 mb-6">
          {sections.map((section, i) => (
            <div
              key={section.sectionId}
              className={`h-1 flex-1 ${
                i <= currentSectionIndex ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
        <span className="font-mono text-xs text-blue-600 font-bold tracking-wider">
          {currentSection.sectionName.toUpperCase()}
        </span>
        <p className="font-mono text-sm text-slate-500 mt-1">
          {currentSection.sectionDescription.replace(/\{\{personName\}\}/g, person.name)}
        </p>
        {currentSectionIndex === 0 && currentQuestionIndex === 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200">
            <p className="font-mono text-xs text-blue-800">
              Share what you&apos;ve observed about {person.name}. Keep it brief — this is a living document. You can come back to expand or edit anytime. {person.name} can also add their own perspective later.
            </p>
          </div>
        )}
      </div>

      {/* Question */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="border-2 border-slate-200 bg-white p-8">
          <h2 className="font-mono font-bold text-lg text-slate-800 mb-2">
            {displayQuestion}
          </h2>
          {displayHelper && (
            <p className="font-mono text-sm text-slate-500 mb-6">
              {displayHelper}
            </p>
          )}

          <QuestionRenderer
            question={{ ...currentQuestion, placeholder: displayPlaceholder }}
            value={currentAnswer}
            onChange={(value) => handleAnswer(currentQuestion.id, value)}
            personName={person.name}
            onKeyboardContinue={handleNext}
            isDemo={isDemo}
            demoPerspective={person.relationshipType === 'child' ? 'observer_child' : 'observer'}
          />
        </div>

        {/* Navigation */}
        <div className="flex gap-4 mt-6">
          {(currentSectionIndex > 0 || currentQuestionIndex > 0) && (
            <>
              <button
                onClick={() => { setCurrentSectionIndex(0); setCurrentQuestionIndex(0); }}
                className="px-4 py-3 border-2 border-slate-300 bg-white font-mono text-xs font-bold text-slate-500 hover:border-slate-800 hover:text-slate-700 transition-all"
              >
                &laquo; START
              </button>
              <button
                onClick={handlePrevious}
                className="px-6 py-3 border-2 border-slate-300 bg-white font-mono font-bold text-slate-700 hover:border-slate-800 transition-all"
              >
                &larr; PREVIOUS
              </button>
            </>
          )}
          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className="px-6 py-3 border-2 border-slate-800 bg-slate-800 text-white font-mono font-bold hover:bg-slate-700 transition-all disabled:opacity-50 ml-auto"
          >
            {isSubmitting
              ? 'SAVING...'
              : isLastQuestion
              ? 'COMPLETE'
              : 'NEXT \u2192'}
          </button>
        </div>

        {currentSection.skippable && currentQuestionIndex === 0 && (
          <button
            onClick={() => {
              if (currentSectionIndex < sections.length - 1) {
                setCurrentSectionIndex((i) => i + 1);
                setCurrentQuestionIndex(0);
              } else {
                handleSubmit();
              }
            }}
            className="mt-4 font-mono text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            SKIP THIS SECTION &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
