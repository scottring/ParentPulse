'use client';

import { use, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AssessmentShell from '@/components/shared/AssessmentShell';
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
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

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
  const [previousAnswers, setPreviousAnswers] = useState<Record<string, any> | null>(null);

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
        if (data.answers) {
          setAnswers(data.answers);
          // Snapshot current answers for revision history
          setPreviousAnswers(JSON.parse(JSON.stringify(data.answers)));
        }
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
      await completeDraft(id, manual.manualId, previousAnswers ?? undefined);
      setIsComplete(true);

      // Trigger dimension assessment scoring in the background
      try {
        const seedAssessments = httpsCallable(functions, 'seedDimensionAssessments');
        await seedAssessments({});
      } catch (assessErr) {
        console.warn('Assessment scoring after onboarding failed (non-critical):', assessErr);
      }
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
        const demo = getDemoAnswer(q.id, person?.relationshipType === 'child' ? 'observer_child' : 'observer');
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

  const demoBanner = isDemo ? (
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
  ) : null;

  const navigation = (
    <>
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
        {!isLastQuestion && (
          <button
            onClick={() => {
              saveNow();
              const lastSection = sections[sections.length - 1];
              setCurrentSectionIndex(sections.length - 1);
              setCurrentQuestionIndex(lastSection.questions.length - 1);
            }}
            className="px-4 py-3 border-2 border-slate-300 bg-white font-mono text-xs font-bold text-slate-500 hover:border-slate-800 hover:text-slate-700 transition-all"
          >
            SKIP TO END &raquo;
          </button>
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
    </>
  );

  return (
    <AssessmentShell
      phase="assess"
      personName={person.name}
      sectionName={currentSection.sectionName}
      sectionDescription={currentSection.sectionDescription}
      flowLabel="OBSERVER ONBOARDING"
      flowTitle={`About ${person.name}`}
      accentColor="blue"
      currentSection={currentSectionIndex}
      totalSections={sections.length}
      currentQuestion={currentQuestionIndex}
      totalQuestions={totalQuestions}
      answeredQuestions={answeredQuestions}
      saveStatus={saveStatus}
      onSaveAndExit={handleSaveAndExit}
      canSkip={!!currentSection.skippable}
      onSkipSection={() => {
        if (currentSectionIndex < sections.length - 1) {
          setCurrentSectionIndex((i) => i + 1);
          setCurrentQuestionIndex(0);
        } else {
          handleSubmit();
        }
      }}
      firstQuestionHint={`Share what you've observed about ${person.name}. Keep it brief — this is a living document. You can come back to expand or edit anytime. ${person.name} can also add their own perspective later.`}
      demoBannerSlot={demoBanner}
      navigationSlot={navigation}
    >
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
    </AssessmentShell>
  );
}
