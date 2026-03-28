'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { useContribution } from '@/hooks/useContribution';
import { getSelfOnboardingSections } from '@/config/self-questions';
import { OnboardingSection, OnboardingQuestion } from '@/config/onboarding-questions';
import { QuestionAnswer } from '@/types/onboarding';
import { QuestionRenderer } from '@/components/onboarding/QuestionRenderer';
import { TopicCategory } from '@/types/person-manual';

export default function SelfOnboardPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading } = usePersonById(personId);
  const { manual, loading: manualLoading } = usePersonManual(personId);
  const { createContribution } = useContribution();

  const [sections] = useState<OnboardingSection[]>(getSelfOnboardingSections());
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, QuestionAnswer>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const storageKey = `self-onboard-${personId}`;

  // Restore saved progress on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.answers) setAnswers(parsed.answers);
        if (typeof parsed.sectionIndex === 'number') setCurrentSectionIndex(parsed.sectionIndex);
        if (typeof parsed.questionIndex === 'number') setCurrentQuestionIndex(parsed.questionIndex);
      }
    } catch {
      // ignore parse errors
    }
  }, [storageKey]);

  const currentSection = sections[currentSectionIndex];
  const currentQuestion = currentSection?.questions[currentQuestionIndex];

  // Count total and answered questions
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const answeredQuestions = Object.values(answers).reduce(
    (sum, sectionAnswers) => sum + Object.keys(sectionAnswers).length,
    0
  );

  // Auto-save progress to localStorage
  useEffect(() => {
    if (answeredQuestions > 0) {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          answers,
          sectionIndex: currentSectionIndex,
          questionIndex: currentQuestionIndex,
        })
      );
    }
  }, [answers, currentSectionIndex, currentQuestionIndex, answeredQuestions, storageKey]);

  const handleAnswer = useCallback((questionId: string, value: QuestionAnswer) => {
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

    if (currentQuestionIndex < currentSection.questions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
    } else if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex((i) => i + 1);
      setCurrentQuestionIndex(0);
    } else {
      // All questions done — submit
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
      // Create one contribution per section that has answers
      for (const [sectionId, sectionAnswers] of Object.entries(answers)) {
        if (Object.keys(sectionAnswers).length === 0) continue;

        // Map section ID to topic category
        const topicCategory = mapSectionToTopic(sectionId);

        await createContribution({
          manualId: manual.manualId,
          personId: person.personId,
          perspectiveType: 'self',
          relationshipToSubject: 'self',
          topicCategory,
          answers: sectionAnswers,
        });
      }

      localStorage.removeItem(storageKey);
      setIsComplete(true);
    } catch (err) {
      console.error('Failed to save self-onboarding:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndExit = () => {
    // Progress is already auto-saved to localStorage
    router.push(`/people/${personId}/manual`);
  };

  // Redirect after completion
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        router.push(`/people/${personId}/manual`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, personId, router]);

  // Loading states
  if (authLoading || personLoading || manualLoading) {
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

  // Completion screen
  if (isComplete) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl">&#10003;</div>
          <h2 className="font-mono font-bold text-2xl text-slate-800">YOUR PERSPECTIVE IS SAVED</h2>
          <p className="font-mono text-slate-600">Redirecting to your manual...</p>
        </div>
      </div>
    );
  }

  const isLastQuestion =
    currentSectionIndex === sections.length - 1 &&
    currentQuestionIndex === currentSection.questions.length - 1;

  const currentAnswer = answers[currentSection.sectionId]?.[currentQuestion.id];

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Header */}
      <div className="border-b-2 border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-xs text-amber-600 font-bold tracking-wider">
                SELF-ONBOARDING
              </span>
              <h1 className="font-mono font-bold text-lg text-slate-800">
                Tell Us About Yourself
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-mono text-xs text-slate-500">
                  {answeredQuestions} / {totalQuestions} ANSWERED
                </div>
                <div className="w-32 h-2 bg-slate-200 mt-1">
                  <div
                    className="h-full bg-amber-600 transition-all"
                    style={{ width: `${(answeredQuestions / totalQuestions) * 100}%` }}
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

      {/* Section indicator */}
      <div className="max-w-3xl mx-auto px-6 pt-6">
        <div className="flex gap-2 mb-6">
          {sections.map((section, i) => (
            <div
              key={section.sectionId}
              className={`h-1 flex-1 ${
                i <= currentSectionIndex ? 'bg-amber-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
        <span className="font-mono text-xs text-amber-600 font-bold tracking-wider">
          {currentSection.sectionName.toUpperCase()}
        </span>
        <p className="font-mono text-sm text-slate-500 mt-1">
          {currentSection.sectionDescription}
        </p>
      </div>

      {/* Question */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="border-2 border-slate-200 bg-white p-8">
          <QuestionRenderer
            question={currentQuestion}
            value={currentAnswer}
            onChange={(value) => handleAnswer(currentQuestion.id, value)}
            personName={user.name}
            onKeyboardContinue={handleNext}
          />
        </div>

        {/* Navigation */}
        <div className="flex gap-4 mt-6">
          {(currentSectionIndex > 0 || currentQuestionIndex > 0) && (
            <button
              onClick={handlePrevious}
              className="px-6 py-3 border-2 border-slate-300 bg-white font-mono font-bold text-slate-700 hover:border-slate-800 transition-all"
            >
              &larr; PREVIOUS
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

        {/* Skip section */}
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

function mapSectionToTopic(sectionId: string): TopicCategory {
  switch (sectionId) {
    case 'overview':
      return 'overview';
    case 'triggers':
      return 'triggers';
    case 'what_works':
      return 'what_works';
    case 'boundaries':
      return 'boundaries';
    case 'communication':
      return 'communication';
    default:
      return 'overview';
  }
}
