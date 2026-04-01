'use client';

import { use, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { useContribution } from '@/hooks/useContribution';
import { childQuestionnaire, ChildQuestionSection } from '@/config/child-questionnaire';
import ChildQuestionDisplay from '@/components/onboarding/ChildQuestionDisplay';
import { getDemoAnswer } from '@/config/demo-answers';

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

  // Load existing draft
  useEffect(() => {
    if (!manual || !user || draftLoaded) return;

    (async () => {
      // Check for draft first, then completed contribution
      const draft = await findDraft(manual.manualId, 'self');
      if (draft && draft.relationshipToSubject === 'child-session') {
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
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !person || !manual) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <p className="text-xl text-slate-600">Something went wrong. Ask a grown-up for help.</p>
      </div>
    );
  }

  // Completion screen
  if (isComplete) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">&#127881;</div>
          <h2 className="text-3xl font-bold text-green-800">Great job, {person.name}!</h2>
          <p className="text-lg text-green-700">Your answers have been saved. Thank you for sharing!</p>
        </div>
      </div>
    );
  }

  // Start screen (parent-facing)
  if (!started) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-6">
        <div className="max-w-lg text-center space-y-6">
          <div className="text-6xl">&#128218;</div>
          <h1 className="text-2xl font-bold text-slate-800">
            {person.name}&apos;s Portrait Session
          </h1>
          <p className="text-lg text-slate-700 font-medium">
            Help {person.name} share how they see themselves and the family.
          </p>
          <p className="text-slate-600">
            Sit with {person.name} and let them answer these questions.
            Read the questions aloud if needed. There are {totalQuestions} questions
            across {sections.length} sections — it takes about 10 minutes.
          </p>
          <p className="text-sm text-slate-500">
            Answers save automatically. You can stop anytime and come back later.
          </p>
          <button
            onClick={() => setStarted(true)}
            className="px-8 py-4 bg-blue-600 text-white text-xl font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg"
          >
            Let&apos;s Go!
          </button>
          <div>
            <button
              onClick={() => router.push(`/people/${personId}/manual`)}
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentAnswer = answers[currentSection.id]?.[currentQuestion.id];

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Minimal header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b-2 border-blue-200">
        <button
          onClick={handleSaveAndExit}
          className="text-slate-400 hover:text-slate-600 text-2xl"
        >
          &times;
        </button>
        <div className="text-center">
          <span className="text-sm font-bold text-blue-600">
            {person.name}&apos;s Answers
          </span>
          <div className="w-32 h-2 bg-blue-100 mt-1 mx-auto rounded-full">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${(answeredQuestions / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
        <span className="text-sm text-slate-400">
          {answeredQuestions}/{totalQuestions}
        </span>
      </div>

      {/* Demo context banner */}
      {isDemo && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div
            className="flex items-center justify-between px-4 py-2 rounded-lg font-mono text-[11px]"
            style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)' }}
          >
            <div className="flex items-center gap-3">
              <span style={{ color: '#A3510B', fontWeight: 700 }}>DEMO</span>
              <span style={{ color: '#6B6B6B' }}>
                Parent <strong style={{ color: '#2C2C2C' }}>{user?.name}</strong> supervising{' '}
                <strong style={{ color: '#3B82F6' }}>{person.name}</strong>&apos;s session
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

      {/* Child question display */}
      <div className="max-w-2xl mx-auto px-4 py-6">
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
      </div>
    </div>
  );
}
