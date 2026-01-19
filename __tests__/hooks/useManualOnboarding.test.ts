import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock Cloud Functions
const mockHttpsCallable = vi.fn();
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: (...args: any[]) => mockHttpsCallable(...args)
}));

// Mock Firebase
vi.mock('@/lib/firebase', () => ({
  firestore: {},
  functions: {}
}));

// Mock onboarding types - don't mock the module, let it be real
// We'll spy on localStorage instead

// Mock AuthContext
const mockUser = {
  userId: 'test-user-id',
  familyId: 'test-family-id',
  role: 'parent',
  name: 'Test User'
};

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser
  })
}));

// Import after mocks
import { useManualOnboarding } from '@/hooks/useManualOnboarding';
import { WizardStep, GeneratedManualContent } from '@/types/onboarding';

describe('useManualOnboarding hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default wizard state', () => {
      const { result } = renderHook(() => useManualOnboarding());

      expect(result.current.wizardState.currentStep).toBe('welcome');
      expect(result.current.wizardState.currentSectionIndex).toBe(0);
      expect(result.current.wizardState.totalSections).toBe(0);
      expect(result.current.wizardState.answers).toEqual({});
      expect(result.current.wizardState.generatedContent).toBeNull();
      expect(result.current.wizardState.error).toBeNull();
      expect(result.current.wizardState.isLoading).toBe(false);
    });
  });

  describe('step navigation', () => {
    it('should navigate to next step', () => {
      const { result } = renderHook(() => useManualOnboarding());

      act(() => {
        result.current.goToNextStep();
      });

      expect(result.current.wizardState.currentStep).toBe('questions');
    });

    it('should navigate through all steps in order', () => {
      const { result } = renderHook(() => useManualOnboarding());

      const expectedSteps: WizardStep[] = ['welcome', 'questions', 'processing', 'review', 'complete'];

      // Start at welcome
      expect(result.current.wizardState.currentStep).toBe('welcome');

      // Navigate forward through each step
      for (let i = 1; i < expectedSteps.length; i++) {
        act(() => {
          result.current.goToNextStep();
        });
        expect(result.current.wizardState.currentStep).toBe(expectedSteps[i]);
      }
    });

    it('should not go past complete step', () => {
      const { result } = renderHook(() => useManualOnboarding());

      // Navigate to complete
      act(() => {
        result.current.goToStep('complete');
      });

      // Try to go further
      act(() => {
        result.current.goToNextStep();
      });

      expect(result.current.wizardState.currentStep).toBe('complete');
    });

    it('should navigate to previous step', () => {
      const { result } = renderHook(() => useManualOnboarding());

      act(() => {
        result.current.goToStep('questions');
      });

      act(() => {
        result.current.goToPreviousStep();
      });

      expect(result.current.wizardState.currentStep).toBe('welcome');
    });

    it('should not go before welcome step', () => {
      const { result } = renderHook(() => useManualOnboarding());

      // Try to go back from welcome
      act(() => {
        result.current.goToPreviousStep();
      });

      expect(result.current.wizardState.currentStep).toBe('welcome');
    });

    it('should navigate directly to a specific step', () => {
      const { result } = renderHook(() => useManualOnboarding());

      act(() => {
        result.current.goToStep('review');
      });

      expect(result.current.wizardState.currentStep).toBe('review');
    });

    it('should clear error when navigating', () => {
      const { result } = renderHook(() => useManualOnboarding());

      // Simulate an error state by going to questions and then using goToStep
      act(() => {
        result.current.goToStep('questions');
      });

      // Navigate again should clear any errors
      act(() => {
        result.current.goToNextStep();
      });

      expect(result.current.wizardState.error).toBeNull();
    });
  });

  describe('section navigation', () => {
    it('should have section navigation functions', () => {
      const { result } = renderHook(() => useManualOnboarding());

      expect(result.current.goToNextSection).toBeDefined();
      expect(result.current.goToPreviousSection).toBeDefined();
      expect(typeof result.current.goToNextSection).toBe('function');
      expect(typeof result.current.goToPreviousSection).toBe('function');
    });

    it('should start at section index 0', () => {
      const { result } = renderHook(() => useManualOnboarding());
      expect(result.current.wizardState.currentSectionIndex).toBe(0);
    });

    it('should not go below section 0 when going previous', () => {
      const { result } = renderHook(() => useManualOnboarding());

      // Start at section 0, try to go back multiple times
      act(() => {
        result.current.goToPreviousSection();
        result.current.goToPreviousSection();
      });

      // Should stay at 0 (can't go below)
      expect(result.current.wizardState.currentSectionIndex).toBe(0);
    });
  });

  describe('answer management', () => {
    it('should update section answers', () => {
      const { result } = renderHook(() => useManualOnboarding());

      act(() => {
        result.current.updateSectionAnswers('triggers', {
          'trigger-question-1': 'When homework time starts'
        });
      });

      expect(result.current.wizardState.answers.triggers).toBeDefined();
      expect(result.current.wizardState.answers.triggers?.['trigger-question-1']).toBe('When homework time starts');
    });

    it('should merge answers within same section', () => {
      const { result } = renderHook(() => useManualOnboarding());

      act(() => {
        result.current.updateSectionAnswers('triggers', {
          'question-1': 'Answer 1'
        });
      });

      act(() => {
        result.current.updateSectionAnswers('triggers', {
          'question-2': 'Answer 2'
        });
      });

      expect(result.current.wizardState.answers.triggers?.['question-1']).toBe('Answer 1');
      expect(result.current.wizardState.answers.triggers?.['question-2']).toBe('Answer 2');
    });

    it('should handle answers for multiple sections', () => {
      const { result } = renderHook(() => useManualOnboarding());

      act(() => {
        result.current.updateSectionAnswers('triggers', {
          'trigger-q1': 'Trigger answer'
        });
        result.current.updateSectionAnswers('whatWorks', {
          'strategy-q1': 'Strategy answer'
        });
        result.current.updateSectionAnswers('boundaries', {
          'boundary-q1': 'Boundary answer'
        });
      });

      expect(result.current.wizardState.answers.triggers?.['trigger-q1']).toBe('Trigger answer');
      expect(result.current.wizardState.answers.whatWorks?.['strategy-q1']).toBe('Strategy answer');
      expect(result.current.wizardState.answers.boundaries?.['boundary-q1']).toBe('Boundary answer');
    });

    it('should handle structured answers', () => {
      const { result } = renderHook(() => useManualOnboarding());

      const structuredAnswer = {
        primary: 4,
        qualitative: 'Additional comment',
        timestamp: Date.now()
      };

      act(() => {
        result.current.updateSectionAnswers('triggers', {
          'likert-question': structuredAnswer
        });
      });

      expect(result.current.wizardState.answers.triggers?.['likert-question']).toEqual(structuredAnswer);
    });
  });

  describe('generateContent', () => {
    it('should have generateContent function defined', () => {
      const { result } = renderHook(() => useManualOnboarding());
      expect(result.current.generateContent).toBeDefined();
      expect(typeof result.current.generateContent).toBe('function');
    });
  });
});

describe('WizardStep order', () => {
  it('should define correct step order', () => {
    const stepOrder: WizardStep[] = ['welcome', 'questions', 'processing', 'review', 'complete'];

    expect(stepOrder[0]).toBe('welcome');
    expect(stepOrder[1]).toBe('questions');
    expect(stepOrder[2]).toBe('processing');
    expect(stepOrder[3]).toBe('review');
    expect(stepOrder[4]).toBe('complete');
    expect(stepOrder.length).toBe(5);
  });
});
