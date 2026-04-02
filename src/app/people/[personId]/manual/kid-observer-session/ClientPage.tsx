'use client';

import { use, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePersonById, usePerson } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { useContribution } from '@/hooks/useContribution';
import { getChildObserverQuestions } from '@/config/child-observer-questionnaire';
import { ChildQuestionSection } from '@/config/child-questionnaire';
import ChildQuestionDisplay from '@/components/onboarding/ChildQuestionDisplay';
import { httpsCallable } from 'firebase/functions';
import { functions, firestore } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { PERSON_MANUAL_COLLECTIONS } from '@/types/person-manual';

export function KidObserverSessionPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const searchParams = useSearchParams();
  const observerPersonId = searchParams.get('observer');
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { person: subject, loading: subjectLoading } = usePersonById(personId);
  const { people, loading: peopleLoading } = usePerson();
  const { manual, loading: manualLoading } = usePersonManual(personId);
  const { saveDraft, completeDraft, findDraft, updateContribution, contributions } = useContribution(manual?.manualId);

  const observerPerson = people.find(p => p.personId === observerPersonId);

  const [sections, setSections] = useState<ChildQuestionSection[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, any>>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [started, setStarted] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [previousAnswers, setPreviousAnswers] = useState<Record<string, any> | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Build personalized questions once we have the subject name
  useEffect(() => {
    if (subject?.name) {
      setSections(getChildObserverQuestions(subject.name));
    }
  }, [subject?.name]);

  // Load existing draft for this specific kid-observer pairing
  useEffect(() => {
    if (!manual || !user || draftLoaded || !observerPersonId) return;

    (async () => {
      // Look for an existing draft from this parent's account with child-observer relationship
      const draft = await findDraft(manual.manualId, 'observer');
      // Check if this draft is specifically for this kid (by contributorName match)
      if (draft && draft.relationshipToSubject === 'child-observer' && observerPerson &&
          draft.contributorName === observerPerson.name) {
        setDraftId(draft.contributionId);
        if (draft.answers) setAnswers(draft.answers);
        if (draft.draftProgress) {
          setCurrentSectionIndex(draft.draftProgress.sectionIndex);
          setCurrentQuestionIndex(draft.draftProgress.questionIndex);
        }
        setStarted(true);
      } else {
        // Also check all contributions for an existing child-observer from this kid (draft or complete)
        const existing = contributions.find(
          c => c.relationshipToSubject === 'child-observer' &&
               c.contributorName === observerPerson?.name &&
               (c.status === 'draft' || c.status === 'complete')
        );
        if (existing) {
          setDraftId(existing.contributionId);
          if (existing.answers) setAnswers(existing.answers);
          if (existing.status === 'draft' && existing.draftProgress) {
            setCurrentSectionIndex(existing.draftProgress.sectionIndex);
            setCurrentQuestionIndex(existing.draftProgress.questionIndex);
          }
          if (existing.status === 'complete') {
            setIsRevising(true);
            setPreviousAnswers(JSON.parse(JSON.stringify(existing.answers)));
          }
          setStarted(true);
        }
      }
      setDraftLoaded(true);
    })();
  }, [manual, user, draftLoaded, observerPersonId, observerPerson, findDraft, contributions]);

  const currentSection = sections[currentSectionIndex];
  const currentQuestion = currentSection?.questions[currentQuestionIndex];

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const answeredQuestions = Object.values(answers).reduce(
    (sum, sectionAnswers) => sum + Object.keys(sectionAnswers).filter(k => sectionAnswers[k] != null).length,
    0
  );
  const currentQuestionNumber = sections.slice(0, currentSectionIndex).reduce((sum, s) => sum + s.questions.length, 0) + currentQuestionIndex + 1;

  // Debounced auto-save
  const triggerSave = useCallback(() => {
    if (!manual || !subject || !observerPerson) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // If revising a completed contribution, update it directly (saveDraft only finds drafts)
        if (isRevising && draftId) {
          await updateContribution(draftId, { answers });
          return;
        }
        const id = await saveDraft({
          manualId: manual.manualId,
          personId: subject.personId,
          perspectiveType: 'observer',
          relationshipToSubject: 'child-observer',
          answers,
          sectionIndex: currentSectionIndex,
          questionIndex: currentQuestionIndex,
          contributorName: observerPerson.name,
        });
        setDraftId(id);
      } catch (err) {
        console.error('Kid observer auto-save failed:', err);
      }
    }, 2000);
  }, [manual, subject, observerPerson, answers, currentSectionIndex, currentQuestionIndex, saveDraft, isRevising, draftId, updateContribution]);

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
    if (!user || !manual || !subject || !observerPerson) return;
    setIsSubmitting(true);
    try {
      const id = draftId || await saveDraft({
        manualId: manual.manualId,
        personId: subject.personId,
        perspectiveType: 'observer',
        relationshipToSubject: 'child-observer',
        answers,
        sectionIndex: currentSectionIndex,
        questionIndex: currentQuestionIndex,
        contributorName: observerPerson.name,
      });

      // If revising, snapshot previous answers into revision history
      if (isRevising && previousAnswers) {
        const contribRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.CONTRIBUTIONS, id);
        await updateDoc(contribRef, {
          revisionHistory: arrayUnion({
            answers: previousAnswers,
            revisedAt: Timestamp.now(),
          }),
        });
      }

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
      console.error('Failed to save kid observer session:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndExit = async () => {
    if (manual && subject && observerPerson && answeredQuestions > 0) {
      try {
        await saveDraft({
          manualId: manual.manualId,
          personId: subject.personId,
          perspectiveType: 'observer',
          relationshipToSubject: 'child-observer',
          answers,
          sectionIndex: currentSectionIndex,
          questionIndex: currentQuestionIndex,
          contributorName: observerPerson.name,
        });
      } catch (err) {
        console.error('Save before exit failed:', err);
      }
    }
    router.push(`/people/${personId}/manual`);
  };

  // Redirect after completion
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => router.push(`/people/${personId}/manual`), 3000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, personId, router]);

  // Loading
  if (authLoading || subjectLoading || peopleLoading || manualLoading || !draftLoaded) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !subject || !manual || !observerPerson) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-xl text-slate-600">Something went wrong. Ask a grown-up for help.</p>
          <button
            onClick={() => router.push(`/people/${personId}/manual`)}
            className="px-6 py-3 bg-slate-800 text-white font-mono text-sm font-bold"
          >
            GO BACK
          </button>
        </div>
      </div>
    );
  }

  // Completion screen
  if (isComplete) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">&#127881;</div>
          <h2 className="text-3xl font-bold text-green-800">Great job, {observerPerson.name}!</h2>
          <p className="text-lg text-green-700">
            Thanks for telling us about {subject.name}! Your answers have been saved.
          </p>
        </div>
      </div>
    );
  }

  // Start screen (parent-facing)
  if (!started) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center p-6">
        <div className="max-w-lg text-center space-y-6">
          <div className="text-6xl">&#128172;</div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isRevising
              ? `${observerPerson.name} Wants to Revise Answers About ${subject.name}`
              : `${observerPerson.name}'s Turn to Talk About ${subject.name}`}
          </h1>
          <p className="text-slate-600">
            {isRevising
              ? `${observerPerson.name}'s previous answers are loaded. Go through and change anything that needs updating — the old answers will be saved in history.`
              : `Sit with ${observerPerson.name} and let them answer questions about ${subject.name}. Read the questions aloud if needed. There are ${totalQuestions} questions across ${sections.length} sections — it takes about 10 minutes.`}
          </p>
          <p className="text-sm text-slate-500">
            Answers save automatically. You can stop anytime and come back later.
          </p>
          <button
            onClick={() => setStarted(true)}
            className="px-8 py-4 bg-purple-600 text-white text-xl font-bold rounded-2xl hover:bg-purple-700 transition-all shadow-lg"
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

  if (!currentSection || !currentQuestion) {
    return null;
  }

  const currentAnswer = answers[currentSection.id]?.[currentQuestion.id];

  return (
    <div className="min-h-screen bg-purple-50">
      {/* Minimal header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b-2 border-purple-200">
        <button
          onClick={handleSaveAndExit}
          className="text-slate-400 hover:text-slate-600 text-2xl"
        >
          &times;
        </button>
        <div className="text-center">
          <span className="text-sm font-bold text-purple-600">
            {observerPerson.name} on {subject.name}
          </span>
          <div className="w-32 h-2 bg-purple-100 mt-1 mx-auto rounded-full">
            <div
              className="h-full bg-purple-500 rounded-full transition-all"
              style={{ width: `${(currentQuestionNumber / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
        <span className="text-sm text-slate-400">
          {currentQuestionNumber}/{totalQuestions}
        </span>
      </div>

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
          childName={observerPerson.name}
        />
      </div>
    </div>
  );
}
