'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { useManualOnboarding } from '@/hooks/useManualOnboarding';
import { useSaveManualContent } from '@/hooks/useSaveManualContent';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { PERSON_MANUAL_COLLECTIONS } from '@/types/person-manual';
import {
  getOnboardingSections,
  personalizeQuestions,
  getEstimatedTime
} from '@/config/onboarding-questions';
import { loadOnboardingProgress, clearOnboardingProgress } from '@/types/onboarding';
import { ContentReviewStep } from '@/components/manual/ContentReviewStep';

export default function ManualOnboardingPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading } = usePersonById(personId);
  const { manual, loading: manualLoading } = usePersonManual(personId);
  const {
    wizardState,
    goToNextStep,
    goToPreviousStep,
    goToNextSection,
    goToPreviousSection,
    updateSectionAnswers,
    generateContent,
    resetWizard,
    saveProgress
  } = useManualOnboarding();
  const { saveContent, saving: savingContent } = useSaveManualContent();

  const [sections, setSections] = useState<ReturnType<typeof getOnboardingSections>>([]);
  const [currentSectionAnswers, setCurrentSectionAnswers] = useState<Record<string, string>>({});
  const [hasResumedProgress, setHasResumedProgress] = useState(false);
  const [roleSectionId, setRoleSectionId] = useState<string | null>(null);

  // Check for auth
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Check if manual exists, if not redirect
  useEffect(() => {
    if (!manualLoading && !manual) {
      router.push(`/people/${personId}/create-manual`);
    }
  }, [manual, manualLoading, personId, router]);

  // Initialize sections and fetch role section ID
  useEffect(() => {
    if (person && manual) {
      const relationshipType = person.relationshipType || 'other';
      const sectionsForType = getOnboardingSections(relationshipType);
      const personalizedSections = personalizeQuestions(sectionsForType, person.name);
      setSections(personalizedSections);

      // Fetch the role section ID for this manual
      const fetchRoleSection = async () => {
        const q = query(
          collection(firestore, PERSON_MANUAL_COLLECTIONS.ROLE_SECTIONS),
          where('manualId', '==', manual.manualId)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setRoleSectionId(snapshot.docs[0].id);
        }
      };
      fetchRoleSection();

      // Try to load saved progress
      if (!hasResumedProgress) {
        const saved = loadOnboardingProgress(personId);
        if (saved && saved.manualId === manual.manualId) {
          // TODO: Restore progress from localStorage
          // For now, just mark that we checked
        }
        setHasResumedProgress(true);
      }
    }
  }, [person, manual, personId, hasResumedProgress]);

  // Auto-save progress
  useEffect(() => {
    if (person && manual && wizardState.currentStep === 'questions') {
      saveProgress(personId, manual.manualId, person.relationshipType || 'other');
    }
  }, [wizardState, person, manual, personId, saveProgress]);

  if (authLoading || personLoading || manualLoading || !user || !person || !manual) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  const currentSection = sections[wizardState.currentSectionIndex];
  const progress = sections.length > 0 ? ((wizardState.currentSectionIndex + 1) / sections.length) * 100 : 0;
  const estimatedTime = getEstimatedTime(person.relationshipType || 'other');

  const handleSectionComplete = () => {
    // Save current section answers
    if (currentSection) {
      updateSectionAnswers(currentSection.sectionId, currentSectionAnswers);
    }

    // Move to next section or processing
    if (wizardState.currentSectionIndex < sections.length - 1) {
      goToNextSection();
      setCurrentSectionAnswers({});
    } else {
      // All sections complete, start generating
      handleGenerate();
    }
  };

  const handleSkipSection = () => {
    if (wizardState.currentSectionIndex < sections.length - 1) {
      goToNextSection();
      setCurrentSectionAnswers({});
    } else {
      handleGenerate();
    }
  };

  const handleGenerate = async () => {
    await generateContent(
      personId,
      person.name,
      person.relationshipType || 'other'
    );
  };

  const handleComplete = async () => {
    if (!roleSectionId || !wizardState.generatedContent) {
      alert('Missing role section or generated content');
      return;
    }

    try {
      // Save generated content to Firestore
      await saveContent(roleSectionId, wizardState.generatedContent);

      // Clear saved progress
      clearOnboardingProgress(personId);

      // Redirect to manual view
      router.push(`/people/${personId}/manual`);
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
            <Link href={`/people/${personId}`} className="text-2xl transition-transform hover:scale-110">
              ←
            </Link>
            <div className="flex-1">
              <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                {person.name}'s Manual
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                {wizardState.currentStep === 'welcome' && 'Let\'s get started'}
                {wizardState.currentStep === 'questions' && `Section ${wizardState.currentSectionIndex + 1} of ${sections.length}`}
                {wizardState.currentStep === 'processing' && 'Generating content...'}
                {wizardState.currentStep === 'review' && 'Review & edit'}
                {wizardState.currentStep === 'complete' && 'All done!'}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          {wizardState.currentStep === 'questions' && (
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
        {wizardState.currentStep === 'welcome' && (
          <div className="animate-fade-in-up">
            <div className="parent-card p-8 text-center">
              <div className="text-6xl mb-6">👤</div>
              <h2 className="parent-heading text-3xl mb-4" style={{ color: 'var(--parent-text)' }}>
                Let's build {person.name}'s manual together
              </h2>
              <p className="text-lg mb-6" style={{ color: 'var(--parent-text-light)' }}>
                I'll ask you some questions to create initial content based on your experience with {person.name}.
              </p>
              <div className="flex items-center justify-center gap-2 mb-8" style={{ color: 'var(--parent-text-light)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Estimated time: {estimatedTime}</span>
              </div>
              <button
                onClick={goToNextStep}
                className="px-8 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
                style={{ backgroundColor: 'var(--parent-accent)' }}
              >
                Get Started
              </button>
            </div>
          </div>
        )}

        {/* Questions Step */}
        {wizardState.currentStep === 'questions' && currentSection && (
          <div className="animate-fade-in-up">
            <div className="parent-card p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-4xl">{currentSection.emoji}</div>
                <div>
                  <h2 className="parent-heading text-2xl" style={{ color: 'var(--parent-text)' }}>
                    {currentSection.sectionName}
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                    {currentSection.sectionDescription}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {currentSection.questions.map((question) => (
                  <div key={question.id}>
                    <label className="block font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                      {question.question}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <textarea
                      value={currentSectionAnswers[question.id] || ''}
                      onChange={(e) => setCurrentSectionAnswers(prev => ({
                        ...prev,
                        [question.id]: e.target.value
                      }))}
                      placeholder={question.placeholder}
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                      style={{
                        borderColor: 'var(--parent-border)',
                        backgroundColor: 'var(--parent-bg)',
                        color: 'var(--parent-text)'
                      }}
                    />
                    {question.helperText && (
                      <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                        {question.helperText}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <div className="flex gap-3">
                {wizardState.currentSectionIndex > 0 && (
                  <button
                    onClick={goToPreviousSection}
                    className="px-6 py-3 rounded-lg font-medium transition-all hover:shadow-md"
                    style={{ border: '1px solid var(--parent-border)', color: 'var(--parent-text-light)' }}
                  >
                    ← Previous
                  </button>
                )}
                {currentSection.skippable && (
                  <button
                    onClick={handleSkipSection}
                    className="px-6 py-3 rounded-lg font-medium transition-all hover:shadow-md"
                    style={{ border: '1px solid var(--parent-border)', color: 'var(--parent-text-light)' }}
                  >
                    Skip Section
                  </button>
                )}
              </div>
              <button
                onClick={handleSectionComplete}
                className="px-8 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
                style={{ backgroundColor: 'var(--parent-accent)' }}
              >
                {wizardState.currentSectionIndex < sections.length - 1 ? 'Continue' : 'Generate Content'}
              </button>
            </div>
          </div>
        )}

        {/* Processing Step */}
        {wizardState.currentStep === 'processing' && (
          <div className="animate-fade-in-up">
            <div className="parent-card p-12 text-center">
              <div className="w-16 h-16 spinner mx-auto mb-6"></div>
              <h2 className="parent-heading text-2xl mb-4" style={{ color: 'var(--parent-text)' }}>
                Analyzing your responses...
              </h2>
              <p style={{ color: 'var(--parent-text-light)' }}>
                Creating personalized content for {person.name}'s manual
              </p>
            </div>
          </div>
        )}

        {/* Review Step */}
        {wizardState.currentStep === 'review' && wizardState.generatedContent && (
          <div className="animate-fade-in-up">
            <div className="mb-6">
              <h2 className="parent-heading text-2xl mb-2" style={{ color: 'var(--parent-text)' }}>
                Review Generated Content
              </h2>
              <p className="mb-6" style={{ color: 'var(--parent-text-light)' }}>
                Review the content below before saving to {person.name}'s manual. You can edit these later.
              </p>
            </div>

            <ContentReviewStep content={wizardState.generatedContent} personName={person.name} />

            <div className="flex justify-between mt-8">
              <button
                onClick={() => goToStep('questions')}
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

        {/* Error Display */}
        {wizardState.error && (
          <div className="parent-card p-6 border-l-4 border-red-500 mb-6">
            <p className="font-semibold text-red-700">Error</p>
            <p className="text-sm text-red-600">{wizardState.error}</p>
          </div>
        )}
      </main>
    </div>
  );
}
