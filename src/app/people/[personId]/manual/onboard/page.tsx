'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { useManualOnboarding } from '@/hooks/useManualOnboarding';
import { useSaveManualContent } from '@/hooks/useSaveManualContent';
import { getOnboardingSections, getNeurodivergenceSections, OnboardingSection } from '@/config/onboarding-questions';
import { DEMO_ONBOARDING_SECTIONS, DEMO_PREFILLED_ANSWERS } from '@/config/demo-onboarding-questions';
import { isDemoMode, isDemoUser } from '@/utils/demo';
import { RelationshipType } from '@/types/person-manual';
import { GeneratedTrigger, GeneratedStrategy, GeneratedBoundary, loadOnboardingProgress, QuestionAnswer } from '@/types/onboarding';
import { QuestionRenderer } from '@/components/onboarding/QuestionRenderer';
import { TagQuestionButton } from '@/components/onboarding/TagQuestionButton';

export default function AIOnboardingPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading } = usePersonById(personId);
  const { manual, loading: manualLoading } = usePersonManual(personId);
  const {
    wizardState,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    goToNextSection,
    goToPreviousSection,
    updateSectionAnswers,
    generateContent,
    updateGeneratedContent,
    resetWizard,
    setTotalSections,
    saveProgress
  } = useManualOnboarding();
  const { saveContent, saving, error: saveError } = useSaveManualContent();

  const [sections, setSections] = useState<OnboardingSection[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [progressRestored, setProgressRestored] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  // Detect demo mode on mount
  useEffect(() => {
    const demo = isDemoMode() || isDemoUser(user);
    setIsDemo(demo);
  }, [user]);

  // Restore saved progress on mount
  useEffect(() => {
    if (!progressRestored && manual?.manualId && person?.relationshipType) {
      const savedProgress = loadOnboardingProgress(personId);
      if (savedProgress && savedProgress.manualId === manual.manualId) {
        // Restore wizard state from saved progress
        if (savedProgress.answers && Object.keys(savedProgress.answers).length > 0) {
          // Restore answers
          Object.entries(savedProgress.answers).forEach(([sectionId, sectionAnswers]) => {
            if (sectionAnswers) {
              updateSectionAnswers(sectionId, sectionAnswers);
            }
          });

          // Restore position if they were in the middle of questions
          if (savedProgress.currentStep === 'questions') {
            goToStep('questions');
            // Note: currentSectionIndex will be managed by the wizard state
          }
        }
      }
      setProgressRestored(true);
    }
  }, [progressRestored, manual?.manualId, person?.relationshipType, personId, updateSectionAnswers, goToStep]);

  // Check auth
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Check if manual exists
  useEffect(() => {
    if (!manualLoading && !manual) {
      router.push(`/people/${personId}/create-manual`);
    }
  }, [manual, manualLoading, personId, router]);

  // Load sections based on relationship type and branching logic
  useEffect(() => {
    if (person?.relationshipType) {
      // Use demo sections if in demo mode
      const baseSections = isDemo
        ? DEMO_ONBOARDING_SECTIONS
        : getOnboardingSections(person.relationshipType as RelationshipType);

      // For child relationships, check if we need to add neurodivergence sections
      if (person.relationshipType === 'child') {
        const screeningAnswer = wizardState.answers['screening']?.['screening_level'];
        const screeningValue = typeof screeningAnswer === 'object' && screeningAnswer !== null && 'primary' in screeningAnswer
          ? screeningAnswer.primary
          : screeningAnswer;

        if (screeningValue && typeof screeningValue === 'string') {
          // Insert neurodivergence sections after screening but before universal sections
          const neurodivergenceSections = getNeurodivergenceSections(screeningValue);
          if (neurodivergenceSections.length > 0) {
            // Insert neurodivergence sections after screening (index 1) and before the rest
            const updatedSections = [
              baseSections[0], // Screening section
              ...neurodivergenceSections, // Neurodivergence sections
              ...baseSections.slice(1) // Rest of sections
            ];
            setSections(updatedSections);
            setTotalSections(updatedSections.length);
            return;
          }
        }
      }

      setSections(baseSections);
      setTotalSections(baseSections.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person?.relationshipType, wizardState.answers]);

  // Auto-save progress to localStorage whenever answers change
  useEffect(() => {
    if (manual?.manualId && person?.relationshipType && Object.keys(wizardState.answers).length > 0) {
      saveProgress(personId, manual.manualId, person.relationshipType as RelationshipType);
    }
  }, [wizardState.answers, manual?.manualId, person?.relationshipType, personId, saveProgress]);

  if (authLoading || personLoading || manualLoading || !user || !person || !manual || sections.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-800 border-t-amber-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 font-mono text-sm text-slate-600">LOADING...</p>
        </div>
      </div>
    );
  }

  const currentSection = sections[wizardState.currentSectionIndex];
  const currentQuestion = currentSection?.questions[currentQuestionIndex];

  // Personalize text
  const personalizeText = (text: string) => {
    return text.replace(/\{\{personName\}\}/g, person.name);
  };

  // Handle answer - auto-save to state and localStorage (supports all question types)
  const handleAnswer = (questionId: string, value: QuestionAnswer) => {
    const sectionAnswers = wizardState.answers[currentSection.sectionId] || {};
    updateSectionAnswers(currentSection.sectionId, {
      ...sectionAnswers,
      [questionId]: value
    });
  };

  // Navigation
  const handleNext = () => {
    if (currentQuestionIndex < currentSection.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (wizardState.currentSectionIndex < sections.length - 1) {
      goToNextSection();
      setCurrentQuestionIndex(0);
    } else {
      // All questions answered - generate content
      handleGenerate();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (wizardState.currentSectionIndex > 0) {
      goToPreviousSection();
      const prevSection = sections[wizardState.currentSectionIndex - 1];
      setCurrentQuestionIndex(prevSection.questions.length - 1);
    }
  };

  const handleGenerate = async () => {
    if (!manual?.manualId || !person.relationshipType) return;

    try {
      await generateContent(
        personId,
        person.name,
        person.relationshipType as RelationshipType
      );
    } catch (error) {
      console.error('Error generating content:', error);
    }
  };

  const handleSaveGeneratedContent = async () => {
    if (!manual?.manualId || !wizardState.generatedContent) return;

    try {
      await saveContent(manual.manualId, wizardState.generatedContent);
      goToStep('complete');
    } catch (error) {
      console.error('Error saving content:', error);
    }
  };

  const handleComplete = () => {
    router.push(`/people/${personId}/manual`);
  };

  // Calculate progress
  const totalQuestions = sections.reduce((sum, section) => sum + section.questions.length, 0);
  const answeredQuestions = Object.values(wizardState.answers).reduce((count, sectionAnswers) => {
    if (!sectionAnswers) return count;
    return count + Object.keys(sectionAnswers).length;
  }, 0);
  const progressPercent = (answeredQuestions / totalQuestions) * 100;

  // ==================== WELCOME SCREEN ====================
  if (wizardState.currentStep === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="blueprint-grid"></div>

        <div className="relative max-w-3xl w-full">
          <div className="relative bg-white border-4 border-slate-800 p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-amber-600"></div>
            <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-amber-600"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-amber-600"></div>
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-amber-600"></div>

            <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-6">
              AI-POWERED MANUAL GENERATION
            </div>

            <h1 className="font-mono text-5xl font-bold mb-6 text-slate-900">
              {person.name}'s Operating Manual
            </h1>

            <p className="font-mono text-lg text-slate-700 mb-4 leading-relaxed">
              I'll ask you a few conversational questions about {person.name}, then use AI to generate a structured operating manual with triggers, strategies, and boundaries.
            </p>

            <p className="font-mono text-base text-slate-600 mb-8 leading-relaxed">
              This takes about 10-15 minutes and you'll have a chance to review and edit everything before saving.
            </p>

            <div className="space-y-4 mb-10 p-6 bg-amber-50 border-2 border-amber-600">
              <div className="flex items-center gap-3 font-mono text-sm">
                <span className="text-3xl">🤖</span>
                <div>
                  <div className="font-bold text-slate-900">AI-GENERATED CONTENT:</div>
                  <div className="text-slate-700">Claude will analyze your answers and create structured content</div>
                </div>
              </div>
              <div className="flex items-center gap-3 font-mono text-sm">
                <span className="text-3xl">✏️</span>
                <div>
                  <div className="font-bold text-slate-900">REVIEW & EDIT:</div>
                  <div className="text-slate-700">You'll review everything before it's saved</div>
                </div>
              </div>
              <div className="flex items-center gap-3 font-mono text-sm">
                <span className="text-3xl">📋</span>
                <div>
                  <div className="font-bold text-slate-900">SECTIONS TO COMPLETE:</div>
                  <div className="text-slate-700">{sections.length} sections ({totalQuestions} questions total)</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => goToStep('questions')}
              className="w-full py-4 bg-slate-800 text-white font-mono font-bold text-lg hover:bg-amber-600 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1"
            >
              START QUESTIONNAIRE →
            </button>

            <div className="mt-6 text-center">
              <Link
                href={`/people/${personId}/manual`}
                className="font-mono text-sm text-slate-500 hover:text-slate-800 underline"
              >
                ← Skip and add content manually
              </Link>
            </div>
          </div>
        </div>

        <style jsx>{`
          .blueprint-grid {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image:
              linear-gradient(rgba(30, 58, 95, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(30, 58, 95, 0.03) 1px, transparent 1px);
            background-size: 20px 20px;
            pointer-events: none;
            z-index: 0;
          }
        `}</style>
      </div>
    );
  }

  // ==================== QUESTIONS SCREEN ====================
  if (wizardState.currentStep === 'questions' && currentQuestion) {
    const currentAnswer = wizardState.answers[currentSection.sectionId]?.[currentQuestion.id];

    // Check if answer is valid for required questions
    const hasValidAnswer = () => {
      if (!currentQuestion.required) return true;
      if (!currentAnswer) return false;

      // Handle structured answers
      if (typeof currentAnswer === 'object' && 'primary' in currentAnswer) {
        return currentAnswer.primary !== undefined && currentAnswer.primary !== null && currentAnswer.primary !== '';
      }

      // Handle string answers
      return typeof currentAnswer === 'string' && currentAnswer.trim().length > 0;
    };

    return (
      <div className="min-h-screen" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="blueprint-grid"></div>

        {/* Progress Bar */}
        <div className="fixed top-0 left-0 right-0 h-2 bg-slate-200 z-50">
          <div
            className="h-full bg-amber-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        {/* Header */}
        <header className="border-b-4 border-slate-800 bg-white shadow-[0px_4px_0px_0px_rgba(0,0,0,1)] pt-8 pb-6">
          <div className="max-w-4xl mx-auto px-6">
            <div className="inline-block px-3 py-1 bg-amber-600 text-white font-mono text-xs mb-3">
              SECTION {wizardState.currentSectionIndex + 1} OF {sections.length}: {currentSection.sectionName.toUpperCase()}
            </div>
            <p className="font-mono text-sm text-slate-600">
              {personalizeText(currentSection.sectionDescription)}
            </p>
          </div>
        </header>

        {/* Question Display */}
        <main className="relative max-w-4xl mx-auto px-6 py-16">
          <div className="relative bg-white border-4 border-slate-800 p-10 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
            {/* Question Number */}
            <div className="absolute -top-4 -left-4 w-16 h-16 bg-slate-800 text-white font-mono font-bold flex items-center justify-center text-2xl border-4 border-amber-600">
              {currentQuestionIndex + 1}
            </div>

            {/* Question */}
            <div className="mb-8">
              <h3 className="font-mono text-3xl font-bold text-slate-900 leading-snug mb-4">
                {personalizeText(currentQuestion.question)}
              </h3>
              {currentQuestion.helperText && (
                <p className="font-mono text-sm text-slate-600 p-4 bg-amber-50 border-l-4 border-amber-600">
                  💡 {personalizeText(currentQuestion.helperText)}
                </p>
              )}
            </div>

            {/* Answer Input - Using QuestionRenderer for all question types */}
            <div className="mb-8">
              <QuestionRenderer
                question={currentQuestion}
                value={currentAnswer}
                onChange={(value) => handleAnswer(currentQuestion.id, value)}
                personName={person.name}
                onKeyboardContinue={handleNext}
                demoMode={isDemo}
                demoAnswer={isDemo ? (DEMO_PREFILLED_ANSWERS as Record<string, Record<string, string>>)[currentSection.sectionId]?.[currentQuestion.id] : undefined}
              />
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-4">
              {(wizardState.currentSectionIndex > 0 || currentQuestionIndex > 0) && (
                <button
                  onClick={handlePrevious}
                  className="px-6 py-3 border-2 border-slate-300 bg-white font-mono font-bold text-slate-700 hover:border-slate-800 transition-all"
                  data-testid="previous-button"
                >
                  ← PREVIOUS
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={!hasValidAnswer()}
                className="flex-1 px-6 py-3 bg-slate-800 text-white font-mono font-bold hover:bg-amber-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-800"
                data-testid="continue-button"
              >
                {wizardState.currentSectionIndex === sections.length - 1 && currentQuestionIndex === currentSection.questions.length - 1
                  ? 'GENERATE MANUAL →'
                  : 'NEXT →'}
              </button>
            </div>

            {/* Skip Option (for non-required questions) */}
            {!currentQuestion.required && !hasValidAnswer() && (
              <div className="mt-4 text-center">
                <button
                  onClick={handleNext}
                  className="font-mono text-sm text-slate-500 hover:text-slate-800 underline"
                >
                  Skip this question
                </button>
              </div>
            )}

            {/* Tag Someone Option */}
            <div className="mt-4 flex justify-center">
              <TagQuestionButton
                personId={personId}
                personName={person.name}
                manualId={manual?.manualId}
                sectionId={currentSection.sectionId}
                questionId={currentQuestion.id}
                questionText={personalizeText(currentQuestion.question)}
                currentAnswer={currentAnswer}
                onTagAndSkip={handleNext}
              />
            </div>
          </div>

          {/* Section Progress */}
          <div className="mt-6 text-center font-mono text-sm text-slate-600">
            Question {currentQuestionIndex + 1} of {currentSection.questions.length} in this section
          </div>
        </main>

        <style jsx>{`
          .blueprint-grid {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image:
              linear-gradient(rgba(30, 58, 95, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(30, 58, 95, 0.03) 1px, transparent 1px);
            background-size: 20px 20px;
            pointer-events: none;
            z-index: 0;
          }
        `}</style>
      </div>
    );
  }

  // ==================== PROCESSING SCREEN ====================
  if (wizardState.currentStep === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="blueprint-grid"></div>

        <div className="relative max-w-3xl w-full">
          <div className="relative bg-white border-4 border-slate-800 p-12 text-center shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <div className="inline-block px-3 py-1 bg-amber-600 text-white font-mono text-xs mb-6">
              ⚙️ PROCESSING
            </div>

            <div className="mb-8">
              <div className="w-20 h-20 border-4 border-slate-800 border-t-amber-600 rounded-full animate-spin mx-auto"></div>
            </div>

            <h2 className="font-mono text-4xl font-bold mb-6 text-slate-900">
              Generating Manual...
            </h2>

            <p className="font-mono text-lg text-slate-700 mb-8">
              Claude AI is analyzing your answers and generating structured content. This takes about 30-60 seconds.
            </p>

            <div className="space-y-3 font-mono text-sm text-slate-600 max-w-md mx-auto">
              <div className="flex items-center gap-3 justify-start">
                <span className="text-green-600">✓</span>
                <span>Analyzing responses</span>
              </div>
              <div className="flex items-center gap-3 justify-start">
                <span className="text-amber-600">⋯</span>
                <span>Identifying triggers and patterns</span>
              </div>
              <div className="flex items-center gap-3 justify-start">
                <span className="text-slate-400">○</span>
                <span>Extracting strategies</span>
              </div>
              <div className="flex items-center gap-3 justify-start">
                <span className="text-slate-400">○</span>
                <span>Structuring boundaries</span>
              </div>
            </div>

            {wizardState.error && (
              <div className="mt-8 p-4 bg-red-50 border-2 border-red-600">
                <div className="font-mono text-sm text-red-900">
                  <div className="font-bold mb-2">❌ Generation Failed</div>
                  <div className="text-xs">{wizardState.error}</div>
                </div>
                <button
                  onClick={() => goToStep('questions')}
                  className="mt-4 px-6 py-2 bg-red-600 text-white font-mono text-sm font-bold hover:bg-red-700"
                >
                  ← Back to Questions
                </button>
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          .blueprint-grid {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image:
              linear-gradient(rgba(30, 58, 95, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(30, 58, 95, 0.03) 1px, transparent 1px);
            background-size: 20px 20px;
            pointer-events: none;
            z-index: 0;
          }
        `}</style>
      </div>
    );
  }

  // ==================== REVIEW SCREEN ====================
  if (wizardState.currentStep === 'review' && wizardState.generatedContent) {
    const content = wizardState.generatedContent;

    // Handler functions for editing content
    const handleEditTrigger = (index: number, updatedTrigger: GeneratedTrigger) => {
      const newTriggers = [...content.triggers];
      newTriggers[index] = updatedTrigger;
      updateGeneratedContent({ ...content, triggers: newTriggers });
    };

    const handleDeleteTrigger = (index: number) => {
      const newTriggers = content.triggers.filter((_, i) => i !== index);
      updateGeneratedContent({ ...content, triggers: newTriggers });
    };

    const handleEditWhatWorks = (index: number, updatedStrategy: GeneratedStrategy) => {
      const newStrategies = [...content.whatWorks];
      newStrategies[index] = updatedStrategy;
      updateGeneratedContent({ ...content, whatWorks: newStrategies });
    };

    const handleDeleteWhatWorks = (index: number) => {
      const newStrategies = content.whatWorks.filter((_, i) => i !== index);
      updateGeneratedContent({ ...content, whatWorks: newStrategies });
    };

    const handleEditWhatDoesntWork = (index: number, updatedStrategy: GeneratedStrategy) => {
      const newStrategies = [...content.whatDoesntWork];
      newStrategies[index] = updatedStrategy;
      updateGeneratedContent({ ...content, whatDoesntWork: newStrategies });
    };

    const handleDeleteWhatDoesntWork = (index: number) => {
      const newStrategies = content.whatDoesntWork.filter((_, i) => i !== index);
      updateGeneratedContent({ ...content, whatDoesntWork: newStrategies });
    };

    const handleEditBoundary = (index: number, updatedBoundary: GeneratedBoundary) => {
      const newBoundaries = [...content.boundaries];
      newBoundaries[index] = updatedBoundary;
      updateGeneratedContent({ ...content, boundaries: newBoundaries });
    };

    const handleDeleteBoundary = (index: number) => {
      const newBoundaries = content.boundaries.filter((_, i) => i !== index);
      updateGeneratedContent({ ...content, boundaries: newBoundaries });
    };

    return (
      <div className="min-h-screen pb-20" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="blueprint-grid"></div>

        {/* Header */}
        <header className="border-b-4 border-slate-800 bg-white shadow-[0px_4px_0px_0px_rgba(0,0,0,1)] py-8 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6">
            <div className="inline-block px-3 py-1 bg-green-600 text-white font-mono text-xs mb-3">
              ✓ GENERATION COMPLETE - REVIEW & EDIT
            </div>
            <h1 className="font-mono text-3xl font-bold text-slate-900 mb-2">
              Review Generated Manual
            </h1>
            <p className="font-mono text-sm text-slate-600">
              Hover over any card to edit or delete it. Make sure everything looks right before saving.
            </p>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-12">
          {/* Triggers Section */}
          {content.triggers && content.triggers.length > 0 && (
            <div className="mb-12">
              <div className="inline-block px-3 py-1 bg-red-600 text-white font-mono text-xs mb-4">
                ⚡ TRIGGERS ({content.triggers.length})
              </div>
              <div className="space-y-4">
                {content.triggers.map((trigger, index) => (
                  <TriggerCard
                    key={index}
                    trigger={trigger}
                    index={index}
                    onEdit={(updated) => handleEditTrigger(index, updated)}
                    onDelete={() => handleDeleteTrigger(index)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* What Works Section */}
          {content.whatWorks && content.whatWorks.length > 0 && (
            <div className="mb-12">
              <div className="inline-block px-3 py-1 bg-green-600 text-white font-mono text-xs mb-4">
                ✨ WHAT WORKS ({content.whatWorks.length})
              </div>
              <div className="space-y-4">
                {content.whatWorks.map((strategy, index) => (
                  <StrategyCard
                    key={index}
                    strategy={strategy}
                    index={index}
                    type="works"
                    onEdit={(updated) => handleEditWhatWorks(index, updated)}
                    onDelete={() => handleDeleteWhatWorks(index)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* What Doesn't Work Section */}
          {content.whatDoesntWork && content.whatDoesntWork.length > 0 && (
            <div className="mb-12">
              <div className="inline-block px-3 py-1 bg-orange-600 text-white font-mono text-xs mb-4">
                🚫 WHAT DOESN'T WORK ({content.whatDoesntWork.length})
              </div>
              <div className="space-y-4">
                {content.whatDoesntWork.map((strategy, index) => (
                  <StrategyCard
                    key={index}
                    strategy={strategy}
                    index={index}
                    type="doesnt-work"
                    onEdit={(updated) => handleEditWhatDoesntWork(index, updated)}
                    onDelete={() => handleDeleteWhatDoesntWork(index)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Boundaries Section */}
          {content.boundaries && content.boundaries.length > 0 && (
            <div className="mb-12">
              <div className="inline-block px-3 py-1 bg-amber-600 text-white font-mono text-xs mb-4">
                🛡️ BOUNDARIES ({content.boundaries.length})
              </div>
              <div className="space-y-4">
                {content.boundaries.map((boundary, index) => (
                  <BoundaryCard
                    key={index}
                    boundary={boundary}
                    index={index}
                    onEdit={(updated) => handleEditBoundary(index, updated)}
                    onDelete={() => handleDeleteBoundary(index)}
                  />
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Fixed Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-slate-800 py-6 shadow-[0px_-4px_0px_0px_rgba(0,0,0,1)]">
          <div className="max-w-5xl mx-auto px-6 flex gap-4">
            <button
              onClick={() => goToStep('questions')}
              className="px-6 py-3 border-2 border-slate-300 bg-white font-mono font-bold text-slate-700 hover:border-slate-800 transition-all"
            >
              ← BACK TO QUESTIONS
            </button>
            <button
              onClick={handleSaveGeneratedContent}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-green-600 text-white font-mono font-bold hover:bg-green-700 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="save-manual-button"
            >
              {saving ? 'SAVING...' : `SAVE MANUAL →`}
            </button>
          </div>
          {saveError && (
            <div className="max-w-5xl mx-auto px-6 mt-4">
              <div className="p-3 bg-red-50 border-2 border-red-600 font-mono text-sm text-red-900">
                ❌ Save failed: {saveError}
              </div>
            </div>
          )}
        </div>

        <style jsx>{`
          .blueprint-grid {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image:
              linear-gradient(rgba(30, 58, 95, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(30, 58, 95, 0.03) 1px, transparent 1px);
            background-size: 20px 20px;
            pointer-events: none;
            z-index: 0;
          }
        `}</style>
      </div>
    );
  }

  // ==================== COMPLETE SCREEN ====================
  if (wizardState.currentStep === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="blueprint-grid"></div>

        <div className="relative max-w-3xl w-full">
          <div className="relative bg-white border-4 border-green-600 p-12 shadow-[12px_12px_0px_0px_rgba(22,163,74,1)] text-center">
            <div className="inline-block px-3 py-1 bg-green-600 text-white font-mono text-xs mb-6">
              ✓ MANUAL CREATION COMPLETE
            </div>

            <div className="text-7xl mb-6">📖</div>

            <h1 className="font-mono text-5xl font-bold mb-6 text-slate-900">
              Manual Ready!
            </h1>

            <p className="font-mono text-lg text-slate-700 mb-10">
              {person.name}'s operating manual has been created with AI-generated triggers, strategies, and boundaries. You can now view and continue adding to it.
            </p>

            <button
              onClick={handleComplete}
              className="w-full py-4 bg-green-600 text-white font-mono font-bold text-lg hover:bg-green-700 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
              data-testid="view-manual-button"
            >
              VIEW MANUAL →
            </button>
          </div>
        </div>

        <style jsx>{`
          .blueprint-grid {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image:
              linear-gradient(rgba(30, 58, 95, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(30, 58, 95, 0.03) 1px, transparent 1px);
            background-size: 20px 20px;
            pointer-events: none;
            z-index: 0;
          }
        `}</style>
      </div>
    );
  }

  // Default fallback
  return null;
}

// ==================== REVIEW CARD COMPONENTS ====================

interface TriggerCardProps {
  trigger: GeneratedTrigger;
  index: number;
  onEdit: (updatedTrigger: GeneratedTrigger) => void;
  onDelete: () => void;
}

function TriggerCard({ trigger, index, onEdit, onDelete }: TriggerCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTrigger, setEditedTrigger] = useState(trigger);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = () => {
    onEdit(editedTrigger);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTrigger(trigger);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  if (isEditing) {
    return (
      <div className="relative bg-amber-50 border-2 border-amber-600 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="absolute -top-3 -left-3 w-10 h-10 bg-amber-600 text-white font-mono font-bold flex items-center justify-center border-2 border-slate-800">
          ✎
        </div>

        <div className="space-y-4">
          <div>
            <label className="block font-mono text-xs text-slate-600 uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={editedTrigger.description}
              onChange={(e) => setEditedTrigger({ ...editedTrigger, description: e.target.value })}
              className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:border-slate-800 focus:outline-none"
              rows={2}
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-slate-600 uppercase tracking-wider mb-1">Context</label>
            <textarea
              value={editedTrigger.context}
              onChange={(e) => setEditedTrigger({ ...editedTrigger, context: e.target.value })}
              className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:border-slate-800 focus:outline-none"
              rows={2}
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-slate-600 uppercase tracking-wider mb-1">Typical Response</label>
            <textarea
              value={editedTrigger.typicalResponse}
              onChange={(e) => setEditedTrigger({ ...editedTrigger, typicalResponse: e.target.value })}
              className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:border-slate-800 focus:outline-none"
              rows={2}
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-slate-600 uppercase tracking-wider mb-1">De-escalation Strategy</label>
            <textarea
              value={editedTrigger.deescalationStrategy || ''}
              onChange={(e) => setEditedTrigger({ ...editedTrigger, deescalationStrategy: e.target.value })}
              className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:border-slate-800 focus:outline-none"
              rows={2}
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-slate-600 uppercase tracking-wider mb-1">Severity</label>
            <select
              value={editedTrigger.severity}
              onChange={(e) => setEditedTrigger({ ...editedTrigger, severity: e.target.value as GeneratedTrigger['severity'] })}
              className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:border-slate-800 focus:outline-none"
            >
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="significant">Significant</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white font-mono text-xs font-bold hover:bg-green-700"
            >
              SAVE
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 border-2 border-slate-300 font-mono text-xs font-bold hover:border-slate-800"
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white border-2 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group">
      <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-red-600">
        {String(index + 1).padStart(2, '0')}
      </div>

      {/* Edit/Delete buttons */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsEditing(true)}
          className="p-2 bg-slate-100 hover:bg-amber-100 border border-slate-300 font-mono text-xs"
          title="Edit"
        >
          ✎
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-2 bg-slate-100 hover:bg-red-100 border border-slate-300 font-mono text-xs"
          title="Delete"
        >
          ✕
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-white/95 flex items-center justify-center z-10 border-2 border-red-600">
          <div className="text-center p-4">
            <p className="font-mono text-sm text-slate-800 mb-4">Delete this trigger?</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white font-mono text-xs font-bold hover:bg-red-700"
              >
                DELETE
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border-2 border-slate-300 font-mono text-xs font-bold hover:border-slate-800"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start gap-4 mb-4">
        <div
          className={`px-3 py-1 font-mono text-xs font-bold ${
            trigger.severity === 'significant' ? 'bg-red-600 text-white' :
            trigger.severity === 'moderate' ? 'bg-yellow-500 text-slate-900' :
            'bg-green-600 text-white'
          }`}
        >
          {trigger.severity.toUpperCase()}
        </div>
      </div>

      <h4 className="font-mono font-bold text-lg mb-4 text-slate-900 pr-16">
        {trigger.description}
      </h4>

      <div className="space-y-3">
        <div>
          <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">Context:</span>
          <p className="font-mono text-sm text-slate-700 mt-1">{trigger.context}</p>
        </div>

        <div>
          <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">Typical Response:</span>
          <p className="font-mono text-sm text-slate-700 mt-1">{trigger.typicalResponse}</p>
        </div>

        {trigger.deescalationStrategy && (
          <div>
            <span className="font-mono text-xs text-amber-600 uppercase tracking-wider font-bold">Recommended Action:</span>
            <p className="font-mono text-sm text-slate-700 mt-1">{trigger.deescalationStrategy}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface StrategyCardProps {
  strategy: GeneratedStrategy;
  index: number;
  type: 'works' | 'doesnt-work';
  onEdit: (updatedStrategy: GeneratedStrategy) => void;
  onDelete: () => void;
}

function StrategyCard({ strategy, index, type, onEdit, onDelete }: StrategyCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedStrategy, setEditedStrategy] = useState(strategy);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = () => {
    onEdit(editedStrategy);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedStrategy(strategy);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  if (isEditing) {
    return (
      <div className="relative bg-amber-50 border-2 border-amber-600 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="absolute -top-3 -left-3 w-10 h-10 bg-amber-600 text-white font-mono font-bold flex items-center justify-center border-2 border-slate-800">
          ✎
        </div>

        <div className="space-y-4">
          <div>
            <label className="block font-mono text-xs text-slate-600 uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={editedStrategy.description}
              onChange={(e) => setEditedStrategy({ ...editedStrategy, description: e.target.value })}
              className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:border-slate-800 focus:outline-none"
              rows={2}
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-slate-600 uppercase tracking-wider mb-1">Context</label>
            <textarea
              value={editedStrategy.context}
              onChange={(e) => setEditedStrategy({ ...editedStrategy, context: e.target.value })}
              className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:border-slate-800 focus:outline-none"
              rows={2}
            />
          </div>

          {type === 'works' && (
            <div>
              <label className="block font-mono text-xs text-slate-600 uppercase tracking-wider mb-1">Effectiveness (1-5)</label>
              <select
                value={editedStrategy.effectiveness || 3}
                onChange={(e) => setEditedStrategy({ ...editedStrategy, effectiveness: parseInt(e.target.value) as 1|2|3|4|5 })}
                className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:border-slate-800 focus:outline-none"
              >
                <option value={1}>1 - Rarely works</option>
                <option value={2}>2 - Sometimes works</option>
                <option value={3}>3 - Works moderately</option>
                <option value={4}>4 - Works well</option>
                <option value={5}>5 - Highly effective</option>
              </select>
            </div>
          )}

          <div>
            <label className="block font-mono text-xs text-slate-600 uppercase tracking-wider mb-1">Notes</label>
            <textarea
              value={editedStrategy.notes || ''}
              onChange={(e) => setEditedStrategy({ ...editedStrategy, notes: e.target.value })}
              className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:border-slate-800 focus:outline-none"
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white font-mono text-xs font-bold hover:bg-green-700"
            >
              SAVE
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 border-2 border-slate-300 font-mono text-xs font-bold hover:border-slate-800"
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white border-2 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group">
      <div className={`absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 ${
        type === 'works' ? 'border-green-600' : 'border-orange-600'
      }`}>
        {String(index + 1).padStart(2, '0')}
      </div>

      {/* Edit/Delete buttons */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsEditing(true)}
          className="p-2 bg-slate-100 hover:bg-amber-100 border border-slate-300 font-mono text-xs"
          title="Edit"
        >
          ✎
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-2 bg-slate-100 hover:bg-red-100 border border-slate-300 font-mono text-xs"
          title="Delete"
        >
          ✕
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-white/95 flex items-center justify-center z-10 border-2 border-red-600">
          <div className="text-center p-4">
            <p className="font-mono text-sm text-slate-800 mb-4">Delete this strategy?</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white font-mono text-xs font-bold hover:bg-red-700"
              >
                DELETE
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border-2 border-slate-300 font-mono text-xs font-bold hover:border-slate-800"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {strategy.effectiveness && type === 'works' && (
        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border-2 border-green-600 font-mono text-xs font-bold mb-4 inline-block">
          <span className="text-slate-600">EFFECTIVENESS:</span>
          <span className="text-green-700">{strategy.effectiveness}/5</span>
        </div>
      )}

      <h4 className="font-mono font-bold text-lg mb-4 text-slate-900 pr-16">
        {strategy.description}
      </h4>

      <div className="space-y-3">
        <div>
          <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">Context:</span>
          <p className="font-mono text-sm text-slate-700 mt-1">{strategy.context}</p>
        </div>

        {strategy.notes && (
          <div>
            <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">Notes:</span>
            <p className="font-mono text-sm text-slate-700 mt-1">{strategy.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface BoundaryCardProps {
  boundary: GeneratedBoundary;
  index: number;
  onEdit: (updatedBoundary: GeneratedBoundary) => void;
  onDelete: () => void;
}

function BoundaryCard({ boundary, index, onEdit, onDelete }: BoundaryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBoundary, setEditedBoundary] = useState(boundary);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = () => {
    onEdit(editedBoundary);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedBoundary(boundary);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  if (isEditing) {
    return (
      <div className="relative bg-amber-50 border-2 border-amber-600 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="absolute -top-3 -left-3 w-10 h-10 bg-amber-600 text-white font-mono font-bold flex items-center justify-center border-2 border-slate-800">
          ✎
        </div>

        <div className="space-y-4">
          <div>
            <label className="block font-mono text-xs text-slate-600 uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={editedBoundary.description}
              onChange={(e) => setEditedBoundary({ ...editedBoundary, description: e.target.value })}
              className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:border-slate-800 focus:outline-none"
              rows={2}
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-slate-600 uppercase tracking-wider mb-1">Category</label>
            <select
              value={editedBoundary.category}
              onChange={(e) => setEditedBoundary({ ...editedBoundary, category: e.target.value as GeneratedBoundary['category'] })}
              className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:border-slate-800 focus:outline-none"
            >
              <option value="immovable">Immovable (Non-negotiable)</option>
              <option value="negotiable">Negotiable</option>
              <option value="preference">Preference</option>
            </select>
          </div>

          <div>
            <label className="block font-mono text-xs text-slate-600 uppercase tracking-wider mb-1">Context</label>
            <textarea
              value={editedBoundary.context || ''}
              onChange={(e) => setEditedBoundary({ ...editedBoundary, context: e.target.value })}
              className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:border-slate-800 focus:outline-none"
              rows={2}
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-slate-600 uppercase tracking-wider mb-1">Consequences if Violated</label>
            <textarea
              value={editedBoundary.consequences || ''}
              onChange={(e) => setEditedBoundary({ ...editedBoundary, consequences: e.target.value })}
              className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:border-slate-800 focus:outline-none"
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white font-mono text-xs font-bold hover:bg-green-700"
            >
              SAVE
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 border-2 border-slate-300 font-mono text-xs font-bold hover:border-slate-800"
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white border-2 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group">
      <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-amber-600">
        {String(index + 1).padStart(2, '0')}
      </div>

      {/* Edit/Delete buttons */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsEditing(true)}
          className="p-2 bg-slate-100 hover:bg-amber-100 border border-slate-300 font-mono text-xs"
          title="Edit"
        >
          ✎
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-2 bg-slate-100 hover:bg-red-100 border border-slate-300 font-mono text-xs"
          title="Delete"
        >
          ✕
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-white/95 flex items-center justify-center z-10 border-2 border-red-600">
          <div className="text-center p-4">
            <p className="font-mono text-sm text-slate-800 mb-4">Delete this boundary?</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white font-mono text-xs font-bold hover:bg-red-700"
              >
                DELETE
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border-2 border-slate-300 font-mono text-xs font-bold hover:border-slate-800"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start gap-4 mb-4">
        <div
          className={`px-3 py-1 font-mono text-xs font-bold ${
            boundary.category === 'immovable' ? 'bg-red-600 text-white' :
            boundary.category === 'negotiable' ? 'bg-yellow-500 text-slate-900' :
            'bg-blue-600 text-white'
          }`}
        >
          {boundary.category.toUpperCase()}
        </div>
      </div>

      <h4 className="font-mono font-bold text-lg mb-4 text-slate-900 pr-16">
        {boundary.description}
      </h4>

      <div className="space-y-3">
        {boundary.context && (
          <div>
            <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">Context:</span>
            <p className="font-mono text-sm text-slate-700 mt-1">{boundary.context}</p>
          </div>
        )}

        {boundary.consequences && (
          <div>
            <span className="font-mono text-xs text-red-600 uppercase tracking-wider font-bold">If Violated:</span>
            <p className="font-mono text-sm text-slate-700 mt-1">{boundary.consequences}</p>
          </div>
        )}
      </div>
    </div>
  );
}
