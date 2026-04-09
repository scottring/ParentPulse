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
      <div className="relish-page">
        <div className="press-loading">Preparing the session&hellip;</div>
      </div>
    );
  }

  if (!user || !subject || !manual || !observerPerson) {
    return (
      <div className="relish-page">
        <div className="pt-[64px] pb-24">
          <div className="press-binder" style={{ maxWidth: 540 }}>
            <div className="press-empty" style={{ padding: '80px 20px' }}>
              <p className="press-empty-title">
                Something went wrong.
              </p>
              <p className="press-empty-body">
                Ask a grown-up for help.
              </p>
              <button
                onClick={() => router.push(`/people/${personId}/manual`)}
                className="press-link"
                style={{ background: 'transparent', cursor: 'pointer' }}
              >
                Return to the volume
                <span className="arrow">⟶</span>
              </button>
            </div>
          </div>
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
              <div style={{ fontSize: 52, marginBottom: 20 }}>🎉</div>
              <span
                className="press-chapter-label"
                style={{ display: 'block', textAlign: 'center' }}
              >
                Kept
              </span>
              <h2 className="press-empty-title mt-4" style={{ fontSize: 32 }}>
                Great work, {observerPerson.name}.
              </h2>
              <p className="press-empty-body">
                Thank you for telling us about {subject.name}. Your
                answers have been saved.
              </p>
              <div className="press-fleuron" style={{ fontSize: 18 }}>❦</div>
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
              <span>{observerPerson.name} on {subject.name}</span>
              <span className="sep">·</span>
              <span>A note for the grown-up</span>
            </div>

            <div style={{ padding: '40px 40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 44, marginBottom: 18 }}>💬</div>
              <span className="press-chapter-label">For the grown-up</span>
              <h1
                className="press-binder-title mt-2"
                style={{ fontSize: 'clamp(30px, 4.5vw, 38px)' }}
              >
                {isRevising
                  ? `${observerPerson.name} is revising`
                  : `${observerPerson.name}'s turn`}
              </h1>
              <p className="press-binder-sub">
                {isRevising
                  ? `Previous answers are loaded. Go through and change anything that needs updating.`
                  : `A session where ${observerPerson.name} shares what they see about ${subject.name}.`}
              </p>
            </div>

            <hr className="press-rule-short" style={{ margin: '0 auto 28px' }} />

            <div style={{ padding: '0 40px' }}>
              <p
                className="press-body-italic"
                style={{ fontSize: 17, textAlign: 'center', color: '#5C5347' }}
              >
                {isRevising
                  ? `The old answers will be kept in history as ${observerPerson.name} makes changes. Read the questions aloud if needed.`
                  : `Sit with ${observerPerson.name} and let them answer questions about ${subject.name}. Read the questions aloud if needed. There are ${totalQuestions} questions across ${sections.length} sections — about ten minutes altogether.`}
              </p>
              <p
                className="press-marginalia"
                style={{
                  fontSize: 15,
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
                  fontSize: 22,
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

  if (!currentSection || !currentQuestion) {
    return null;
  }

  const currentAnswer = answers[currentSection.id]?.[currentQuestion.id];

  return (
    <div className="relish-page">
      {/* Minimal header — press style */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '18px 32px',
          borderBottom: '1px solid rgba(200,190,172,0.5)',
          background: '#ECEAE5',
        }}
      >
        <button
          onClick={handleSaveAndExit}
          className="press-link-sm"
          style={{ background: 'transparent', cursor: 'pointer' }}
        >
          ⟵ Save and close
        </button>
        <div className="text-center">
          <span
            className="press-chapter-label"
            style={{ display: 'block' }}
          >
            {observerPerson.name} on {subject.name}
          </span>
          {/* Progress as thin hairline */}
          <div
            style={{
              width: 160,
              height: 1.5,
              margin: '10px auto 0',
              background: 'rgba(200,190,172,0.5)',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: 1.5,
                background: '#7C9082',
                width: `${(currentQuestionNumber / totalQuestions) * 100}%`,
                transition: 'width 0.35s ease',
              }}
            />
          </div>
        </div>
        <span
          className="press-marginalia"
          style={{ fontSize: 14 }}
        >
          {currentQuestionNumber} of {totalQuestions}
        </span>
      </div>

      {/* Child question display */}
      <div className="pb-24">
        <div className="press-binder" style={{ maxWidth: 680, paddingTop: 40 }}>
          <div style={{ padding: '0 48px' }}>
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
      </div>
    </div>
  );
}
