'use client';

import { use, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AssessmentShell from '@/components/shared/AssessmentShell';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { useContribution } from '@/hooks/useContribution';
import { childQuestionnaire, ChildQuestionSection } from '@/config/child-questionnaire';
import ChildQuestionDisplay from '@/components/onboarding/ChildQuestionDisplay';
import { getDemoAnswer } from '@/config/demo-answers';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { isKidSessionEligible } from '@/utils/age';

export function KidSessionPage({ params }: { params: Promise<{ personId: string }> }) {
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

  const [sections] = useState<ChildQuestionSection[]>(childQuestionnaire);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, any>>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [started, setStarted] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Route guard: only block when we have positive evidence the person
  // is the wrong audience for kid-session. Missing dateOfBirth is
  // common — many child records were created before DOB was tracked —
  // and must NOT trigger a redirect, otherwise the link from the
  // manual page bounces straight back here in a loop.
  useEffect(() => {
    if (personLoading || !person) return;
    // Adults are blocked outright.
    if (person.relationshipType && person.relationshipType !== 'child') {
      router.replace(`/people/${personId}/manual`);
      return;
    }
    // Children with a *known* DOB outside the 6–17 band are blocked.
    // Children without a DOB are allowed through.
    if (person.dateOfBirth && !isKidSessionEligible(person.dateOfBirth)) {
      router.replace(`/people/${personId}/manual`);
    }
  }, [person, personLoading, personId, router]);

  // Load existing draft
  useEffect(() => {
    if (!manual || !user || draftLoaded) return;

    (async () => {
      // Scope the draft lookup to child-session so we don't cross-match
      // a self-onboard draft (perspectiveType=self, relationshipToSubject=self)
      // that may exist on the same manual. Previously the page called
      // findDraft without the third argument, which returned any self
      // draft at random, so valid child-session progress was silently
      // dropped on resume.
      const draft = await findDraft(manual.manualId, 'self', 'child-session');
      if (draft) {
        setDraftId(draft.contributionId);
        if (draft.answers) setAnswers(draft.answers);
        if (draft.draftProgress) {
          setCurrentSectionIndex(draft.draftProgress.sectionIndex);
          setCurrentQuestionIndex(draft.draftProgress.questionIndex);
        }
        setStarted(true);
      }
      setDraftLoaded(true);
    })();
  }, [manual, user, draftLoaded, findDraft]);

  const currentSection = sections[currentSectionIndex];
  const currentQuestion = currentSection?.questions[currentQuestionIndex];

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const answeredQuestions = Object.values(answers).reduce(
    (sum, sectionAnswers) => sum + Object.keys(sectionAnswers).filter(k => sectionAnswers[k] != null).length,
    0
  );

  // Debounced auto-save
  const triggerSave = useCallback(() => {
    if (!manual || !person) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const id = await saveDraft({
          manualId: manual.manualId,
          personId: person.personId,
          perspectiveType: 'self',
          relationshipToSubject: 'child-session',
          answers,
          sectionIndex: currentSectionIndex,
          questionIndex: currentQuestionIndex,
        });
        setDraftId(id);
      } catch (err) {
        console.error('Kid session auto-save failed:', err);
      }
    }, 2000);
  }, [manual, person, answers, currentSectionIndex, currentQuestionIndex, saveDraft]);

  useEffect(() => {
    if (answeredQuestions > 0 && draftLoaded && started) {
      triggerSave();
    }
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [answers, currentSectionIndex, currentQuestionIndex, answeredQuestions, draftLoaded, started, triggerSave]);

  const handleAnswer = useCallback((value: any) => {
    if (!currentSection) return;
    setAnswers((prev) => ({
      ...prev,
      [currentSection.id]: {
        ...prev[currentSection.id],
        [currentQuestion.id]: value,
      },
    }));
  }, [currentSection?.id, currentQuestion?.id]);

  const handleNext = useCallback(() => {
    if (!currentSection) return;
    if (currentQuestionIndex < currentSection.questions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
    } else if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex((i) => i + 1);
      setCurrentQuestionIndex(0);
    } else {
      handleSubmit();
    }
  }, [currentQuestionIndex, currentSectionIndex, currentSection, sections.length]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((i) => i - 1);
    } else if (currentSectionIndex > 0) {
      const prevSection = sections[currentSectionIndex - 1];
      setCurrentSectionIndex((i) => i - 1);
      setCurrentQuestionIndex(prevSection.questions.length - 1);
    }
  }, [currentQuestionIndex, currentSectionIndex, sections]);

  const handleSubmit = async () => {
    if (!user || !manual || !person) return;
    setIsSubmitting(true);
    try {
      const id = draftId || await saveDraft({
        manualId: manual.manualId,
        personId: person.personId,
        perspectiveType: 'self',
        relationshipToSubject: 'child-session',
        answers,
        sectionIndex: currentSectionIndex,
        questionIndex: currentQuestionIndex,
      });
      await completeDraft(id, manual.manualId);
      setIsComplete(true);

      // Trigger dimension assessment scoring in the background
      try {
        const seedAssessments = httpsCallable(functions, 'seedDimensionAssessments');
        await seedAssessments({});
      } catch (assessErr) {
        console.warn('Assessment scoring after onboarding failed (non-critical):', assessErr);
      }
    } catch (err) {
      console.error('Failed to save kid session:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndExit = async () => {
    if (manual && person && answeredQuestions > 0) {
      try {
        await saveDraft({
          manualId: manual.manualId,
          personId: person.personId,
          perspectiveType: 'self',
          relationshipToSubject: 'child-session',
          answers,
          sectionIndex: currentSectionIndex,
          questionIndex: currentQuestionIndex,
        });
      } catch (err) {
        console.error('Save before exit failed:', err);
      }
    }
    router.push(`/people/${personId}/manual`);
  };

  const handleFillAll = useCallback(() => {
    const filled: Record<string, Record<string, any>> = { ...answers };
    for (const section of sections) {
      if (!filled[section.id]) filled[section.id] = {};
      for (const q of section.questions) {
        const demo = getDemoAnswer(q.id, 'kid');
        if (demo !== undefined) {
          filled[section.id][q.id] = demo;
        }
      }
    }
    setAnswers(filled);
  }, [answers, sections]);

  // Redirect after completion
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => router.push(`/people/${personId}/manual`), 3000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, personId, router]);

  // Loading
  if (authLoading || personLoading || manualLoading || !draftLoaded) {
    return (
      <div className="relish-page">
        <div className="press-loading">Preparing the session&hellip;</div>
      </div>
    );
  }

  if (!user || !person || !manual) {
    return (
      <div className="relish-page">
        <div className="press-loading">
          Something went wrong — ask a grown-up for help.
        </div>
      </div>
    );
  }

  // Completion screen
  if (isComplete) {
    return (
      <div className="relish-page">
        <div className="pt-[64px] pb-24">
          <div className="press-binder" style={{ maxWidth: 540 }}>
            <div className="press-empty" style={{ padding: '80px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 20 }}>🎉</div>
              <span
                className="press-chapter-label"
                style={{ display: 'block', textAlign: 'center' }}
              >
                Kept
              </span>
              <h2
                className="press-empty-title mt-4"
                style={{ fontSize: 31 }}
              >
                Great work, {person.name}.
              </h2>
              <p className="press-empty-body">
                Your answers have been saved. Thank you for sharing.
              </p>
              <div className="press-fleuron" style={{ fontSize: 17 }}>
                ❦
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Start screen (parent-facing briefing)
  if (!started) {
    return (
      <div className="relish-page">
        <div className="pt-[64px] pb-24">
          <div className="press-binder" style={{ maxWidth: 640 }}>
            <div className="press-running-header" style={{ paddingTop: 28 }}>
              <span>{person.name}&rsquo;s session</span>
              <span className="sep">·</span>
              <span>A note for the grown-up</span>
            </div>

            <div style={{ padding: '40px 40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 18 }}>📖</div>
              <span className="press-chapter-label">For the grown-up</span>
              <h1
                className="press-binder-title mt-2"
                style={{ fontSize: 'clamp(34px, 5vw, 44px)' }}
              >
                {person.name}&rsquo;s session
              </h1>
              <p className="press-binder-sub">
                Help {person.name} share how they see themselves and
                the people in the family.
              </p>
            </div>

            <hr className="press-rule-short" style={{ margin: '0 auto 28px' }} />

            <div style={{ padding: '0 40px' }}>
              <p
                className="press-body-italic"
                style={{ fontSize: 16, textAlign: 'center', color: '#5C5347' }}
              >
                Sit with {person.name} and let them answer in their
                own words. Read the questions aloud if they need it.
                There are {totalQuestions} questions across{' '}
                {sections.length} sections — about ten minutes
                altogether.
              </p>
              <p
                className="press-marginalia"
                style={{
                  fontSize: 14,
                  textAlign: 'center',
                  marginTop: 20,
                  color: '#746856',
                }}
              >
                Answers save automatically. You can stop any time and
                come back later.
              </p>
            </div>

            <hr className="press-rule" style={{ margin: '36px 40px 24px' }} />

            <div
              className="flex flex-col items-center"
              style={{ gap: 20, padding: '0 20px 40px' }}
            >
              <button
                onClick={() => setStarted(true)}
                className="press-link"
                style={{
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 20,
                }}
              >
                Begin the session
                <span className="arrow">⟶</span>
              </button>
              <button
                onClick={() => router.push(`/people/${personId}/manual`)}
                className="press-link-sm"
                style={{ background: 'transparent', cursor: 'pointer' }}
              >
                Not now
              </button>
            </div>

            <div className="press-fleuron">❦</div>
          </div>
        </div>
      </div>
    );
  }

  const currentAnswer = answers[currentSection.id]?.[currentQuestion.id];

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
        Grown-up{' '}
        <strong
          style={{ color: '#3A3530', fontStyle: 'normal', fontWeight: 500 }}
        >
          {user?.name}
        </strong>{' '}
        supervising{' '}
        <strong
          style={{ color: '#2D5F5D', fontStyle: 'normal', fontWeight: 500 }}
        >
          {person.name}
        </strong>
        &rsquo;s session
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

  return (
    <AssessmentShell
      phase="assess"
      personName={person.name}
      sectionName={currentSection.title}
      sectionDescription={currentSection.description}
      sectionEmoji={currentSection.emoji}
      flowLabel="KID SESSION"
      flowTitle={`${person.name}'s Answers`}
      accentColor="blue"
      currentSection={currentSectionIndex}
      totalSections={sections.length}
      currentQuestion={currentQuestionIndex}
      totalQuestions={totalQuestions}
      answeredQuestions={answeredQuestions}
      onSaveAndExit={handleSaveAndExit}
      demoBannerSlot={demoBanner}
      variant="kid"
    >
      <ChildQuestionDisplay
        question={currentQuestion}
        sectionEmoji={currentSection.emoji}
        sectionDescription={currentSection.description}
        currentAnswer={currentAnswer}
        onAnswer={handleAnswer}
        onNext={handleNext}
        onBack={handlePrevious}
        onSkip={() => {
          handleAnswer(null);
          handleNext();
        }}
        canGoBack={currentSectionIndex > 0 || currentQuestionIndex > 0}
        childName={person.name}
        isDemo={isDemo}
      />
    </AssessmentShell>
  );
}
