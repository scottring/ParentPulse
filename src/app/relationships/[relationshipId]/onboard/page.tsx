'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  getRelationshipOnboardingSections,
  personalizeRelationshipQuestions,
  getRelationshipEstimatedTime
} from '@/config/relationship-onboarding-questions';
import type { OnboardingSection } from '@/config/onboarding-questions';
import type { QuestionAnswer } from '@/types/onboarding';
import {
  saveRelationshipOnboardingProgress,
  loadRelationshipOnboardingProgress,
  clearRelationshipOnboardingProgress
} from '@/types/onboarding';
import { QuestionRenderer } from '@/components/onboarding/QuestionRenderer';
import { RelationshipContentReview } from '@/components/manual/RelationshipContentReview';
import { useSaveRelationshipContent } from '@/hooks/useSaveRelationshipContent';
import type { GeneratedRelationshipManualContent } from '@/hooks/useSaveRelationshipContent';

type WizardStep = 'welcome' | 'questions' | 'processing' | 'review' | 'complete';

export default function RelationshipOnboardingPage({ params }: { params: Promise<{ relationshipId: string }> }) {
  const { relationshipId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { saveContent, saving: savingContent } = useSaveRelationshipContent();

  // Relationship data
  const [relationship, setRelationship] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [sections, setSections] = useState<OnboardingSection[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentSectionAnswers, setCurrentSectionAnswers] = useState<Record<string, QuestionAnswer>>({});
  const [allAnswers, setAllAnswers] = useState<Record<string, Record<string, QuestionAnswer>>>({});

  // Generated content
  const [generatedContent, setGeneratedContent] = useState<GeneratedRelationshipManualContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch relationship data
  useEffect(() => {
    const fetchRelationship = async () => {
      if (!user?.familyId) return;

      try {
        const relationshipDoc = await getDoc(doc(firestore, 'relationship_manuals', relationshipId));

        if (!relationshipDoc.exists()) {
          router.push('/relationships/create');
          return;
        }

        const relationshipData = relationshipDoc.data();
        setRelationship({ relationshipId: relationshipDoc.id, ...relationshipData });

        // Initialize sections based on relationship type
        const relationshipType = relationshipData.relationshipType || 'other';
        const participantCount = relationshipData.participantNames?.length || 2;
        const sectionsForType = getRelationshipOnboardingSections(relationshipType, participantCount);
        const personalizedSections = personalizeRelationshipQuestions(
          sectionsForType,
          relationshipData.participantNames || []
        );
        setSections(personalizedSections);

        // Load saved progress if available
        const savedProgress = loadRelationshipOnboardingProgress(relationshipId);
        if (savedProgress) {
          console.log('Restoring saved progress:', savedProgress);
          setCurrentStep(savedProgress.currentStep);
          setCurrentSectionIndex(savedProgress.currentSectionIndex);
          setCurrentQuestionIndex(savedProgress.currentQuestionIndex);
          setAllAnswers(savedProgress.answers as Record<string, Record<string, QuestionAnswer>>);
          // Restore current section answers
          const currentSectionId = personalizedSections[savedProgress.currentSectionIndex]?.sectionId;
          if (currentSectionId && savedProgress.answers[currentSectionId]) {
            setCurrentSectionAnswers(savedProgress.answers[currentSectionId]);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching relationship:', error);
        setError('Failed to load relationship');
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchRelationship();
    }
  }, [user, authLoading, relationshipId, router]);

  // Check for auth
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Auto-save progress to localStorage
  useEffect(() => {
    if (currentStep === 'questions' && sections.length > 0) {
      const mergedAnswers = {
        ...allAnswers,
        [sections[currentSectionIndex]?.sectionId]: currentSectionAnswers
      };

      saveRelationshipOnboardingProgress({
        relationshipId,
        currentStep,
        currentSectionIndex,
        currentQuestionIndex,
        answers: mergedAnswers,
        timestamp: Date.now()
      });
    }
  }, [relationshipId, currentStep, currentSectionIndex, currentQuestionIndex, currentSectionAnswers, allAnswers, sections]);

  // Keyboard navigation for welcome screen
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (currentStep === 'welcome' && e.key === 'Enter') {
        setCurrentStep('questions');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentStep]);

  if (authLoading || loading || !user || !relationship) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  const currentSection = sections[currentSectionIndex];
  const currentQuestion = currentSection?.questions[currentQuestionIndex];
  const totalQuestionsAcrossSections = sections.reduce((sum, section) => sum + section.questions.length, 0);
  const completedQuestions = sections.slice(0, currentSectionIndex).reduce((sum, section) => sum + section.questions.length, 0) + currentQuestionIndex;
  const progress = totalQuestionsAcrossSections > 0 ? (completedQuestions / totalQuestionsAcrossSections) * 100 : 0;
  const estimatedTime = getRelationshipEstimatedTime(relationship.relationshipType || 'other', relationship.participantNames?.length || 2);
  const namesString = relationship.participantNames?.join(' & ') || 'Your Relationship';

  const handleNextQuestion = () => {
    if (!currentSection) return;

    // If there are more questions in this section
    if (currentQuestionIndex < currentSection.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // End of section - save answers
      setAllAnswers(prev => ({
        ...prev,
        [currentSection.sectionId]: currentSectionAnswers
      }));

      if (currentSectionIndex < sections.length - 1) {
        // Move to next section
        setCurrentSectionIndex(currentSectionIndex + 1);
        setCurrentSectionAnswers({});
        setCurrentQuestionIndex(0);
      } else {
        // All sections complete, start generating
        handleGenerate();
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
      const prevSection = sections[currentSectionIndex - 1];
      setCurrentQuestionIndex(prevSection.questions.length - 1);
      // Restore previous section answers
      setCurrentSectionAnswers(allAnswers[prevSection.sectionId] || {});
    }
  };

  const handleSkipQuestion = () => {
    handleNextQuestion();
  };

  const handleGenerate = async () => {
    setCurrentStep('processing');

    // Collect all answers including current section
    const finalAnswers = {
      ...allAnswers,
      [currentSection.sectionId]: currentSectionAnswers
    };

    try {
      const functions = getFunctions();
      const generateContent = httpsCallable(functions, 'generateRelationshipManualContent');

      const response = await generateContent({
        familyId: user.familyId,
        relationshipId: relationship.relationshipId,
        relationshipType: relationship.relationshipType,
        participantNames: relationship.participantNames,
        answers: finalAnswers
      });

      const data = response.data as any;

      if (data.success) {
        setGeneratedContent(data.content);
        setCurrentStep('review');
      } else {
        setError(data.error || 'Failed to generate content');
        setCurrentStep('questions');
      }
    } catch (error: any) {
      console.error('Error generating content:', error);
      setError(error.message || 'Failed to generate content');
      setCurrentStep('questions');
    }
  };

  const handleComplete = async () => {
    if (!generatedContent) {
      alert('No generated content to save');
      return;
    }

    try {
      await saveContent(relationshipId, generatedContent);
      setCurrentStep('complete');

      // Clear saved progress since we've successfully completed
      clearRelationshipOnboardingProgress(relationshipId);

      // Redirect to relationship view
      setTimeout(() => {
        router.push(`/relationships/${relationshipId}`);
      }, 1500);
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Failed to save content. Please try again.');
    }
  };

  return (
    <div className="min-h-screen parent-page">
      {/* Header */}
      <header className="border-b paper-texture" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link href={`/relationships/${relationshipId}`} className="text-2xl transition-transform hover:scale-110">
              ←
            </Link>
            <div className="flex-1">
              <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                {namesString}'s Relationship Manual
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                {currentStep === 'welcome' && 'Let\'s get started'}
                {currentStep === 'questions' && `Question ${completedQuestions + 1} of ${totalQuestionsAcrossSections}`}
                {currentStep === 'processing' && 'Generating content...'}
                {currentStep === 'review' && 'Review & edit'}
                {currentStep === 'complete' && 'All done!'}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          {currentStep === 'questions' && (
            <div className="mt-4">
              <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--parent-border)' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ backgroundColor: 'var(--parent-accent)', width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-12">
        {/* Welcome Step */}
        {currentStep === 'welcome' && (
          <div className="min-h-[60vh] flex flex-col justify-center animate-fade-in-up">
            <div className="max-w-3xl">
              <div className="text-7xl sm:text-8xl mb-8">💕</div>
              <h2 className="parent-heading text-4xl sm:text-5xl lg:text-6xl mb-6 leading-tight" style={{ color: 'var(--parent-text)' }}>
                Let's build {namesString}'s relationship manual together
              </h2>
              <p className="text-xl sm:text-2xl mb-8 leading-relaxed" style={{ color: 'var(--parent-text-light)' }}>
                I'll ask you some questions to create initial content for your relationship manual.
              </p>
              <div className="flex items-center gap-3 mb-12 text-lg" style={{ color: 'var(--parent-text-light)' }}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Estimated time: {estimatedTime}</span>
              </div>
              <button
                onClick={() => setCurrentStep('questions')}
                className="px-10 py-4 rounded-lg font-semibold text-white transition-all hover:shadow-lg text-lg sm:text-xl"
                style={{ backgroundColor: 'var(--parent-accent)' }}
              >
                Get Started →
              </button>
              <p className="text-sm mt-4" style={{ color: 'var(--parent-text-light)' }}>
                Press <kbd className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--parent-border)' }}>Enter</kbd> to continue
              </p>
            </div>
          </div>
        )}

        {/* Questions Step */}
        {currentStep === 'questions' && currentSection && currentQuestion && (
          <div className="min-h-[60vh] flex flex-col justify-center animate-fade-in-up">
            {/* Section indicator */}
            <div className="flex items-center gap-2 mb-8 opacity-60">
              <span className="text-2xl">{currentSection.emoji}</span>
              <span className="text-sm font-medium" style={{ color: 'var(--parent-text-light)' }}>
                {currentSection.sectionName}
              </span>
            </div>

            {/* Question */}
            <div className="mb-8">
              <label className="block parent-heading text-3xl sm:text-4xl lg:text-5xl mb-4 leading-tight" style={{ color: 'var(--parent-text)' }}>
                {currentQuestion.question}
                {currentQuestion.required && <span className="text-red-500 ml-2">*</span>}
              </label>
              {currentQuestion.helperText && (
                <p className="text-lg sm:text-xl mb-6" style={{ color: 'var(--parent-text-light)' }}>
                  {currentQuestion.helperText}
                </p>
              )}
            </div>

            {/* Answer Input */}
            <div className="mb-8">
              <QuestionRenderer
                question={currentQuestion}
                value={currentSectionAnswers[currentQuestion.id]}
                onChange={(value) => setCurrentSectionAnswers(prev => ({
                  ...prev,
                  [currentQuestion.id]: value
                }))}
                personName={namesString}
                onKeyboardContinue={handleNextQuestion}
              />
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-4">
              <div className="flex gap-3">
                {(currentQuestionIndex > 0 || currentSectionIndex > 0) && (
                  <button
                    onClick={handlePreviousQuestion}
                    className="px-6 py-3 rounded-lg font-medium transition-all hover:shadow-md text-base sm:text-lg"
                    style={{ border: '1px solid var(--parent-border)', color: 'var(--parent-text-light)' }}
                  >
                    ↑ Previous
                  </button>
                )}
                {!currentQuestion.required && (
                  <button
                    onClick={handleSkipQuestion}
                    className="px-6 py-3 rounded-lg font-medium transition-all hover:shadow-md text-base sm:text-lg"
                    style={{ border: '1px solid var(--parent-border)', color: 'var(--parent-text-light)' }}
                  >
                    Skip
                  </button>
                )}
              </div>
              <button
                onClick={handleNextQuestion}
                className="px-8 py-4 rounded-lg font-semibold text-white transition-all hover:shadow-lg text-base sm:text-lg"
                style={{ backgroundColor: 'var(--parent-accent)' }}
              >
                {currentQuestionIndex === currentSection.questions.length - 1 && currentSectionIndex === sections.length - 1
                  ? 'Generate Content →'
                  : 'Continue ↓'}
              </button>
            </div>
          </div>
        )}

        {/* Processing Step */}
        {currentStep === 'processing' && (
          <div className="min-h-[60vh] flex flex-col justify-center items-center animate-fade-in-up">
            <div className="text-center max-w-2xl">
              <div className="w-20 h-20 spinner mx-auto mb-8"></div>
              <h2 className="parent-heading text-3xl sm:text-4xl lg:text-5xl mb-6 leading-tight" style={{ color: 'var(--parent-text)' }}>
                Analyzing your responses...
              </h2>
              <p className="text-xl sm:text-2xl" style={{ color: 'var(--parent-text-light)' }}>
                Creating personalized content for {namesString}'s relationship manual
              </p>
            </div>
          </div>
        )}

        {/* Review Step */}
        {currentStep === 'review' && generatedContent && (
          <div className="animate-fade-in-up">
            <div className="mb-8">
              <h2 className="parent-heading text-3xl sm:text-4xl mb-4 leading-tight" style={{ color: 'var(--parent-text)' }}>
                Review Generated Content
              </h2>
              <p className="text-lg sm:text-xl mb-8" style={{ color: 'var(--parent-text-light)' }}>
                Review the content below before saving to {namesString}'s relationship manual. You can edit these later.
              </p>
            </div>

            <RelationshipContentReview content={generatedContent} participantNames={relationship.participantNames || []} />

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setCurrentStep('questions')}
                disabled={savingContent}
                className="px-6 py-3 rounded-lg font-medium transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ border: '1px solid var(--parent-border)', color: 'var(--parent-text-light)' }}
              >
                ← Back to Questions
              </button>
              <button
                onClick={handleComplete}
                disabled={savingContent}
                className="px-8 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--parent-accent)' }}
              >
                {savingContent ? 'Saving...' : 'Save to Manual'}
              </button>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {currentStep === 'complete' && (
          <div className="min-h-[60vh] flex flex-col justify-center items-center animate-fade-in-up">
            <div className="text-center max-w-2xl">
              <div className="text-7xl mb-8">✅</div>
              <h2 className="parent-heading text-3xl sm:text-4xl lg:text-5xl mb-6 leading-tight" style={{ color: 'var(--parent-text)' }}>
                All done!
              </h2>
              <p className="text-xl sm:text-2xl" style={{ color: 'var(--parent-text-light)' }}>
                Your relationship manual has been created. Redirecting...
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="parent-card p-6 border-l-4 border-red-500 mb-6">
            <p className="font-semibold text-red-700">Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </main>
    </div>
  );
}
