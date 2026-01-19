/**
 * useManualOnboarding Hook
 *
 * Manages the onboarding wizard state, API calls, and saving generated content
 */

'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  WizardState,
  WizardAnswers,
  WizardStep,
  GeneratedManualContent,
  GenerateManualContentRequest,
  GenerateManualContentResponse,
  QuestionAnswer,
  saveOnboardingProgress,
  clearOnboardingProgress
} from '@/types/onboarding';
import { RelationshipType } from '@/types/person-manual';

interface UseManualOnboardingReturn {
  // State
  wizardState: WizardState;

  // Navigation
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  goToStep: (step: WizardStep) => void;

  // Section navigation
  goToNextSection: () => void;
  goToPreviousSection: () => void;
  setTotalSections: (total: number) => void;

  // Answer management
  updateSectionAnswers: (sectionId: string, answers: Record<string, QuestionAnswer>) => void;

  // Generation
  generateContent: (personId: string, personName: string, relationshipType: RelationshipType) => Promise<void>;

  // Edit generated content
  updateGeneratedContent: (content: GeneratedManualContent) => void;

  // Reset
  resetWizard: () => void;

  // Progress
  saveProgress: (personId: string, manualId: string, relationshipType: RelationshipType) => void;
}

const initialWizardState: WizardState = {
  currentStep: 'welcome',
  currentSectionIndex: 0,
  totalSections: 0,
  answers: {},
  generatedContent: null,
  error: null,
  isLoading: false
};

export function useManualOnboarding(): UseManualOnboardingReturn {
  const { user } = useAuth();
  const [wizardState, setWizardState] = useState<WizardState>(initialWizardState);

  // Navigation
  const goToStep = (step: WizardStep) => {
    setWizardState(prev => ({ ...prev, currentStep: step, error: null }));
  };

  const goToNextStep = () => {
    setWizardState(prev => {
      const stepOrder: WizardStep[] = ['welcome', 'questions', 'processing', 'review', 'complete'];
      const currentIndex = stepOrder.indexOf(prev.currentStep);
      const nextStep = stepOrder[Math.min(currentIndex + 1, stepOrder.length - 1)];
      return { ...prev, currentStep: nextStep, error: null };
    });
  };

  const goToPreviousStep = () => {
    setWizardState(prev => {
      const stepOrder: WizardStep[] = ['welcome', 'questions', 'processing', 'review', 'complete'];
      const currentIndex = stepOrder.indexOf(prev.currentStep);
      const previousStep = stepOrder[Math.max(currentIndex - 1, 0)];
      return { ...prev, currentStep: previousStep, error: null };
    });
  };

  // Section navigation
  const goToNextSection = () => {
    setWizardState(prev => ({
      ...prev,
      currentSectionIndex: Math.min(prev.currentSectionIndex + 1, prev.totalSections - 1),
      error: null
    }));
  };

  const goToPreviousSection = () => {
    setWizardState(prev => ({
      ...prev,
      currentSectionIndex: Math.max(prev.currentSectionIndex - 1, 0),
      error: null
    }));
  };

  const setTotalSections = (total: number) => {
    setWizardState(prev => ({
      ...prev,
      totalSections: total
    }));
  };

  // Answer management
  const updateSectionAnswers = (sectionId: string, answers: Record<string, QuestionAnswer>) => {
    setWizardState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [sectionId]: {
          ...(prev.answers[sectionId] || {}),
          ...answers
        }
      }
    }));
  };

  // Generate content using Cloud Function
  const generateContent = async (
    personId: string,
    personName: string,
    relationshipType: RelationshipType
  ): Promise<void> => {
    if (!user?.familyId) {
      setWizardState(prev => ({
        ...prev,
        error: 'User must be authenticated',
        isLoading: false
      }));
      return;
    }

    setWizardState(prev => ({
      ...prev,
      currentStep: 'processing',
      isLoading: true,
      error: null
    }));

    try {
      // Call Cloud Function
      const generateManualContent = httpsCallable<
        GenerateManualContentRequest,
        GenerateManualContentResponse
      >(functions, 'generateInitialManualContent');

      const result = await generateManualContent({
        familyId: user.familyId,
        personId,
        personName,
        relationshipType,
        answers: wizardState.answers
      });

      if (result.data.success && result.data.content) {
        setWizardState(prev => ({
          ...prev,
          generatedContent: result.data.content || null,
          currentStep: 'review',
          isLoading: false,
          error: null
        }));
      } else {
        throw new Error(result.data.error || 'Failed to generate content');
      }
    } catch (error) {
      console.error('Error generating manual content:', error);
      setWizardState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to generate content',
        isLoading: false,
        currentStep: 'questions' // Go back to questions on error
      }));
    }
  };

  // Update generated content (for editing in review step)
  const updateGeneratedContent = (content: GeneratedManualContent) => {
    setWizardState(prev => ({
      ...prev,
      generatedContent: content
    }));
  };

  // Reset wizard
  const resetWizard = () => {
    setWizardState(initialWizardState);
  };

  // Save progress to localStorage
  const saveProgress = (personId: string, manualId: string, relationshipType: RelationshipType) => {
    saveOnboardingProgress({
      personId,
      manualId,
      relationshipType,
      currentStep: wizardState.currentStep,
      currentSectionIndex: wizardState.currentSectionIndex,
      answers: wizardState.answers,
      timestamp: Date.now()
    });
  };

  return {
    wizardState,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    goToNextSection,
    goToPreviousSection,
    setTotalSections,
    updateSectionAnswers,
    generateContent,
    updateGeneratedContent,
    resetWizard,
    saveProgress
  };
}

/**
 * Helper to set total sections for wizard
 */
export function useSetTotalSections() {
  return (totalSections: number) => {
    // This would be called when wizard initializes with the section count
    // Implementation depends on how you want to structure the state management
  };
}
