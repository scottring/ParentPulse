'use client';

import { use, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import EditorialShell from '@/components/shared/EditorialShell';
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
      // First check for an in-progress draft. Scope to the person's
      // relationship type so we don't accidentally match a
      // kid-observer-session draft (which uses the same perspectiveType
      // 'observer' but `relationshipToSubject='child-observer'`) on the
      // same manual.
      const draft = await findDraft(
        manual.manualId,
        'observer',
        person?.relationshipType || 'other',
      );
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
  }, [manual, user, person, draftLoaded, findDraft]);

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
    router.push('/journal');
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
        router.push('/journal');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, personId, router]);

  // Loading
  const loadingShell = (msg: string) => (
    <main
      style={{
        minHeight: '100vh',
        background: '#fafaf7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontStyle: 'italic',
        fontSize: 18,
        color: '#6b6b68',
      }}
    >
      {msg}
    </main>
  );
  if (authLoading || personLoading || manualLoading || !draftLoaded || sections.length === 0) {
    return loadingShell('Preparing the page…');
  }
  if (!user || !person || !manual) {
    return loadingShell('Unable to open the volume.');
  }

  if (isComplete) {
    return (
      <main
        style={{
          minHeight: '100vh',
          background: '#fafaf7',
          color: '#0f0f0d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div style={{ maxWidth: 560, textAlign: 'center' }}>
          <p
            style={{
              fontFamily: "-apple-system, 'Helvetica Neue', sans-serif",
              fontSize: 11,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: '#6b6b68',
              margin: '0 0 18px',
            }}
          >
            Saved
          </p>
          <h1
            style={{
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(32px, 4vw, 48px)',
              lineHeight: 1.1,
              letterSpacing: '-0.015em',
              margin: '0 0 16px',
            }}
          >
            Your observations are kept.
          </h1>
          <p style={{ fontSize: 16, color: '#3d3d39', margin: 0 }}>
            Returning to {person.name}&rsquo;s volume&hellip;
          </p>
        </div>
      </main>
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
    <div
      className="flex items-center justify-between"
      style={{
        padding: '12px 18px',
        borderLeft: '2px solid rgba(124,144,130,0.5)',
        background: 'rgba(124,144,130,0.05)',
      }}
    >
      <p className="press-marginalia" style={{ fontSize: 13 }}>
        <span className="press-sc" style={{ fontSize: 13 }}>DEMO</span> &nbsp;
        <strong style={{ color: '#3A3530', fontStyle: 'normal', fontWeight: 500 }}>{user?.name}</strong>
        {' '}sharing observations about{' '}
        <strong style={{ color: '#2D5F5D', fontStyle: 'normal', fontWeight: 500 }}>{person.name}</strong>
      </p>
      <button
        type="button"
        onClick={handleFillAll}
        className="press-link-sm"
        style={{ background: 'transparent', cursor: 'pointer' }}
      >
        Fill all ⟶
      </button>
    </div>
  ) : null;

  const canGoBack = currentSectionIndex > 0 || currentQuestionIndex > 0;
  const navigation = (
    <div className="ed-nav">
      <div className="ed-nav-left">
        {canGoBack && (
          <button onClick={handlePrevious} className="ed-link">
            ← Previous
          </button>
        )}
      </div>
      <button
        onClick={handleNext}
        disabled={isSubmitting}
        className="ed-continue"
      >
        <span>
          {isSubmitting ? 'Saving…' : isLastQuestion ? 'Complete' : 'Continue'}
        </span>
        {!isSubmitting && <span className="arrow" aria-hidden="true">→</span>}
      </button>
      <style jsx>{`
        .ed-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 24px;
          border-top: 1px solid rgba(10, 10, 8, 0.1);
        }
        .ed-nav-left {
          min-width: 120px;
        }
        .ed-link {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 11px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #6b6b68;
          background: transparent;
          border: 0;
          padding: 0;
          cursor: pointer;
          transition: color 160ms ease;
        }
        .ed-link:hover {
          color: #0a0a08;
        }
        .ed-continue {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 11px;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: #0a0a08;
          background: transparent;
          border: 0;
          padding: 12px 0;
          border-bottom: 1px solid #0a0a08;
          cursor: pointer;
          transition: gap 180ms ease;
        }
        .ed-continue:hover {
          gap: 18px;
        }
        .ed-continue:disabled {
          opacity: 0.5;
          cursor: wait;
        }
        .arrow {
          transition: transform 180ms ease;
        }
        .ed-continue:hover .arrow {
          transform: translateX(2px);
        }
      `}</style>
    </div>
  );

  return (
    <EditorialShell
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
      <div>
        <h2>{displayQuestion}</h2>
        {displayHelper && <p>{displayHelper}</p>}

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
    </EditorialShell>
  );
}
