'use client';

import { useState, useEffect, useCallback } from 'react';
import type { QuestionSection, Question } from '@/config/child-onboarding-questions';
import QuestionDisplay from './QuestionDisplay';

interface OnboardingWizardProps {
  child: {
    childId: string;
    name: string;
  };
  questions: QuestionSection[];
  onComplete: (answers: Record<string, any>) => void;
  onCancel: () => void;
}

type WizardStep = 'welcome' | 'questions' | 'generating' | 'complete';

export default function OnboardingWizard({
  child,
  questions,
  onComplete,
  onCancel,
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  // Calculate total questions and current progress
  const totalQuestions = questions.reduce((sum, section) => sum + section.questions.length, 0);
  const answeredQuestions = Object.keys(answers).length;
  const progressPercent = Math.round((answeredQuestions / totalQuestions) * 100);

  // Get current section and question
  const currentSection = questions[currentSectionIndex];
  const currentQuestion = currentSection?.questions[currentQuestionIndex];

  // Load saved answers from localStorage
  useEffect(() => {
    const savedAnswers = localStorage.getItem(`onboarding-${child.childId}`);
    if (savedAnswers) {
      try {
        const parsed = JSON.parse(savedAnswers);
        setAnswers(parsed);

        // If all questions are answered, automatically proceed to generation
        const answeredCount = Object.keys(parsed).length;
        if (answeredCount === totalQuestions && currentStep === 'welcome') {
          console.log('All questions already answered, proceeding to generation...');
          setCurrentStep('generating');
          localStorage.removeItem(`onboarding-${child.childId}`);
          onComplete(parsed);
        }
      } catch (err) {
        console.error('Failed to load saved answers:', err);
      }
    }
  }, [child.childId, totalQuestions, currentStep, onComplete]);

  // Save answers to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem(`onboarding-${child.childId}`, JSON.stringify(answers));
    }
  }, [answers, child.childId]);

  // Replace {{childName}} placeholder in text
  const replacePlaceholder = (text: string) => {
    return text.replace(/\{\{childName\}\}/g, child.name);
  };

  // Handle answer submission
  const handleAnswer = useCallback((questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  }, []);

  // Navigate to next question
  const handleNext = useCallback(() => {
    // Move to next question in current section
    if (currentQuestionIndex < currentSection.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
    // Move to next section
    else if (currentSectionIndex < questions.length - 1) {
      setCurrentSectionIndex((prev) => prev + 1);
      setCurrentQuestionIndex(0);
    }
    // Finished all questions
    else {
      setCurrentStep('generating');
      // Clear localStorage
      localStorage.removeItem(`onboarding-${child.childId}`);
      // Call completion handler
      onComplete(answers);
    }
  }, [currentQuestionIndex, currentSectionIndex, currentSection, questions, answers, child.childId, onComplete]);

  // Navigate to previous question
  const handleBack = useCallback(() => {
    // Move to previous question in current section
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
    // Move to previous section
    else if (currentSectionIndex > 0) {
      setCurrentSectionIndex((prev) => prev - 1);
      setCurrentQuestionIndex(questions[currentSectionIndex - 1].questions.length - 1);
    }
  }, [currentQuestionIndex, currentSectionIndex, questions]);

  // Skip current question
  const handleSkip = useCallback(() => {
    handleNext();
  }, [handleNext]);

  // Start the questionnaire
  const handleStart = () => {
    setCurrentStep('questions');
  };

  // Welcome screen
  if (currentStep === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-3xl w-full text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Let's Create {child.name}'s Manual
          </h1>
          <p className="text-2xl text-gray-700 mb-8">
            We'll ask you about 30 questions to understand {child.name} better. This will take about 10-15 minutes.
          </p>
          <p className="text-xl text-gray-600 mb-12">
            Your answers will help us create a personalized manual with strategies that work for your family.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleStart}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Let's Start
            </button>
            <button
              onClick={onCancel}
              className="bg-gray-300 text-gray-700 px-8 py-4 rounded-lg text-xl font-semibold hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
          {answeredQuestions > 0 && (
            <p className="mt-8 text-gray-600">
              You've already answered {answeredQuestions} questions. We'll pick up where you left off!
            </p>
          )}
        </div>
      </div>
    );
  }

  // Generating screen
  if (currentStep === 'generating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-8"></div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Creating {child.name}'s Manual...
          </h1>
          <p className="text-xl text-gray-700">
            Our AI is analyzing your answers and generating personalized strategies. This will take about 30-60 seconds.
          </p>
        </div>
      </div>
    );
  }

  // Questions screen
  if (currentStep === 'questions' && currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        {/* Progress bar */}
        <div className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Section {currentSectionIndex + 1} of {questions.length}: {replacePlaceholder(currentSection.title)}
              </span>
              <span className="text-sm font-medium text-gray-700">
                {answeredQuestions} / {totalQuestions} answered
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Question content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-3xl w-full">
            <QuestionDisplay
              question={currentQuestion}
              sectionDescription={replacePlaceholder(currentSection.description)}
              currentAnswer={answers[currentQuestion.id]}
              onAnswer={(value) => handleAnswer(currentQuestion.id, value)}
              onNext={handleNext}
              onBack={handleBack}
              onSkip={handleSkip}
              canGoBack={currentSectionIndex > 0 || currentQuestionIndex > 0}
              childName={child.name}
            />
          </div>
        </div>

        {/* Navigation hints */}
        <div className="bg-white border-t border-gray-200 py-3">
          <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-600">
            Press <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">Enter</kbd> to continue
            {!currentQuestion.required && (
              <> or <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">Tab</kbd> then <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">Enter</kbd> to skip</>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
