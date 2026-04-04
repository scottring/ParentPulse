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
import { doc, updateDoc, arrayUnion, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { Contribution, PERSON_MANUAL_COLLECTIONS } from '@/types/person-manual';
import { useEquivalentManualIds } from '@/hooks/useEquivalentManualIds';

export function KidObserverSessionPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const searchParams = useSearchParams();
  const observerPersonId = searchParams.get('observer');
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { person: subject, loading: subjectLoading } = usePersonById(personId);
  const { people, loading: peopleLoading } = usePerson();
  const { manual, loading: manualLoading } = usePersonManual(personId);
  const equivalentManualIds = useEquivalentManualIds(personId, people);
  const { saveDraft, completeDraft, updateContribution, contributions } = useContribution(manual?.manualId, equivalentManualIds);

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

  // Load existing draft/contribution for this specific kid-observer pairing
  useEffect(() => {
    if (!manual || !user || draftLoaded || !observerPersonId || !observerPerson) return;

    (async () => {
      // Query Firestore directly for this kid's child-observer contributions (draft or complete)
      // Don't rely on the contributions state array which may not be loaded yet
      const q = query(
        collection(firestore, PERSON_MANUAL_COLLECTIONS.CONTRIBUTIONS),
        where('manualId', '==', manual.manualId),
        where('familyId', '==', user.familyId),
        where('contributorId', '==', user.userId),
        where('relationshipToSubject', '==', 'child-observer')
      );
      const snapshot = await getDocs(q);

      // Filter to this specific kid by contributorName
      // Sort: drafts first, then by answer completeness (most filled answers wins), then newest
      const countAnswers = (c: Contribution): number => {
        if (!c.answers) return 0;
        let count = 0;
        for (const section of Object.values(c.answers)) {
          if (section && typeof section === 'object') {
            for (const val of Object.values(section as Record<string, any>)) {
              if (val != null && val !== '' && !(Array.isArray(val) && val.length === 0)) count++;
            }
          }
        }
        return count;
      };

      const matches = snapshot.docs
        .map(d => ({ ...d.data(), contributionId: d.id }) as Contribution)
        .filter(c => c.contributorName === observerPerson.name)
        .sort((a, b) => {
          // Drafts first
          if (a.status === 'draft' && b.status !== 'draft') return -1;
          if (b.status === 'draft' && a.status !== 'draft') return 1;
          // Then by answer completeness (more filled answers = better)
          const aCount = countAnswers(a);
          const bCount = countAnswers(b);
          if (aCount !== bCount) return bCount - aCount;
          // Then by updatedAt descending
          return (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0);
        });

      const existing = matches[0];
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
      setDraftLoaded(true);
    })();
  }, [manual, user, draftLoaded, observerPersonId, observerPerson]);

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 rounded-full" style={{ border: '3px solid #7C9082', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!user || !subject || !manual || !observerPerson) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '18px', color: '#5C5347' }}>Something went wrong. Ask a grown-up for help.</p>
          <button
            onClick={() => router.push(`/people/${personId}/manual`)}
            className="px-6 py-3 rounded-full text-white text-sm"
            style={{ fontFamily: 'var(--font-parent-body)', fontWeight: 500, backgroundColor: '#7C9082' }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Completion screen
  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">&#127881;</div>
          <h2 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '28px', fontWeight: 700, color: '#3A3530' }}>Great job, {observerPerson.name}!</h2>
          <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '18px', color: '#5C5347' }}>
            Thanks for telling us about {subject.name}! Your answers have been saved.
          </p>
        </div>
      </div>
    );
  }

  // Start screen (parent-facing)
  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg text-center space-y-6">
          <div className="text-6xl">&#128172;</div>
          <h1 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '24px', fontWeight: 700, color: '#3A3530' }}>
            {isRevising
              ? `${observerPerson.name} Wants to Revise Answers About ${subject.name}`
              : `${observerPerson.name}'s Turn to Talk About ${subject.name}`}
          </h1>
          <p style={{ fontFamily: 'var(--font-parent-body)', color: '#5C5347' }}>
            {isRevising
              ? `${observerPerson.name}'s previous answers are loaded. Go through and change anything that needs updating — the old answers will be saved in history.`
              : `Sit with ${observerPerson.name} and let them answer questions about ${subject.name}. Read the questions aloud if needed. There are ${totalQuestions} questions across ${sections.length} sections — it takes about 10 minutes.`}
          </p>
          <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#7C7468' }}>
            Answers save automatically. You can stop anytime and come back later.
          </p>
          <button
            onClick={() => setStarted(true)}
            className="px-8 py-4 text-white text-xl font-bold rounded-full hover:opacity-90 transition-all shadow-lg"
            style={{ fontFamily: 'var(--font-parent-body)', backgroundColor: '#7C9082' }}
          >
            Let&apos;s Go!
          </button>
          <div>
            <button
              onClick={() => router.push(`/people/${personId}/manual`)}
              style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#8A8078' }}
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
    <div className="min-h-screen">
      {/* Minimal header */}
      <div className="flex items-center justify-between px-6 py-3 glass-card" style={{ border: '1px solid rgba(255,255,255,0.4)', borderRadius: 0 }}>
        <button
          onClick={handleSaveAndExit}
          className="text-2xl" style={{ color: '#8A8078' }}
        >
          &times;
        </button>
        <div className="text-center">
          <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-parent-display)', color: '#7C9082' }}>
            {observerPerson.name} on {subject.name}
          </span>
          <div className="w-32 h-2 mt-1 mx-auto rounded-full" style={{ backgroundColor: 'rgba(124,144,130,0.15)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(currentQuestionNumber / totalQuestions) * 100}%`, backgroundColor: '#7C9082' }}
            />
          </div>
        </div>
        <span className="text-sm" style={{ fontFamily: 'var(--font-parent-body)', color: '#8A8078' }}>
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
