'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useChildren } from '@/hooks/useChildren';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { COLLECTIONS } from '@/types';
import { childQuestionnaire, getAgeAppropriateQuestions } from '@/config/child-questionnaire';
import type { ChildQuestionSection } from '@/config/child-questionnaire';
import ChildQuestionDisplay from '@/components/onboarding/ChildQuestionDisplay';

type WizardStep = 'welcome' | 'questions' | 'saving' | 'complete';

export default function ChildQuestionnairePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { children } = useChildren();
  const childId = params.childId as string;

  const [child, setChild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [questions, setQuestions] = useState<ChildQuestionSection[]>([]);

  // Load child and age-appropriate questions
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (children.length > 0) {
      const foundChild = children.find((c) => c.childId === childId);
      if (foundChild) {
        setChild(foundChild);
        // Get age-appropriate questions
        const ageQuestions = foundChild.age
          ? getAgeAppropriateQuestions(foundChild.age)
          : childQuestionnaire;
        setQuestions(ageQuestions);
      } else {
        router.push('/test');
      }
      setLoading(false);
    }
  }, [user, children, childId, router]);

  // Calculate progress
  const totalQuestions = questions.reduce((sum, section) => sum + section.questions.length, 0);
  const answeredQuestions = Object.keys(answers).length;
  const progressPercent = Math.round((answeredQuestions / totalQuestions) * 100);

  // Get current section and question
  const currentSection = questions[currentSectionIndex];
  const currentQuestion = currentSection?.questions[currentQuestionIndex];

  // Handle answer submission
  const handleAnswer = useCallback((questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  }, []);

  // Navigate to next question
  const handleNext = useCallback(() => {
    if (currentQuestionIndex < currentSection.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else if (currentSectionIndex < questions.length - 1) {
      setCurrentSectionIndex((prev) => prev + 1);
      setCurrentQuestionIndex(0);
    } else {
      // Finished all questions
      saveChildPerspective();
    }
  }, [currentQuestionIndex, currentSectionIndex, currentSection, questions]);

  // Navigate to previous question
  const handleBack = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    } else if (currentSectionIndex > 0) {
      setCurrentSectionIndex((prev) => prev - 1);
      setCurrentQuestionIndex(questions[currentSectionIndex - 1].questions.length - 1);
    }
  }, [currentQuestionIndex, currentSectionIndex, questions]);

  // Skip current question
  const handleSkip = useCallback(() => {
    handleNext();
  }, [handleNext]);

  // Save child's perspective to the manual
  const saveChildPerspective = async () => {
    if (!child?.manualId) {
      alert('No manual found for this child. Please complete parent onboarding first.');
      router.push('/test');
      return;
    }

    if (!user) {
      alert('User not authenticated');
      router.push('/login');
      return;
    }

    try {
      setCurrentStep('saving');

      // Update the child_manuals document with child's perspective
      const manualRef = doc(firestore, COLLECTIONS.CHILD_MANUALS, child.manualId);
      await updateDoc(manualRef, {
        childPerspective: {
          answers: answers,
          completedAt: Timestamp.now(),
          completedBy: user.userId,
        },
        lastUpdatedAt: Timestamp.now(),
        lastUpdatedBy: user.userId,
      });

      console.log('Child perspective saved successfully!');
      setCurrentStep('complete');
    } catch (err) {
      console.error('Error saving child perspective:', err);
      alert(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setCurrentStep('questions');
    }
  };

  // Start questionnaire
  const handleStart = () => {
    setCurrentStep('questions');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Child not found</p>
        </div>
      </div>
    );
  }

  // Welcome screen
  if (currentStep === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 flex items-center justify-center p-4">
        <div className="max-w-3xl w-full text-center bg-white rounded-3xl shadow-2xl p-8 sm:p-12">
          <div className="text-8xl mb-6">🌈</div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Hi {child.name}! 👋
          </h1>
          <p className="text-2xl sm:text-3xl text-gray-700 mb-6">
            Let's talk about YOU!
          </p>
          <p className="text-xl sm:text-2xl text-gray-600 mb-8">
            We're going to ask you some questions about your feelings, what you like, and what you're good at.
          </p>
          <p className="text-lg sm:text-xl text-gray-600 mb-12">
            There are no wrong answers! We just want to understand you better. 💙
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleStart}
              className="bg-gradient-to-r from-green-400 to-blue-500 text-white px-12 py-5 rounded-2xl text-2xl font-bold hover:from-green-500 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg"
            >
              Let's Go! 🚀
            </button>
            <button
              onClick={() => router.push('/test')}
              className="bg-gray-300 text-gray-700 px-12 py-5 rounded-2xl text-2xl font-bold hover:bg-gray-400 transition-all shadow-lg"
            >
              Maybe Later
            </button>
          </div>
          <p className="mt-8 text-lg text-gray-500">
            📝 About {totalQuestions} questions • Takes about 10-15 minutes
          </p>
        </div>
      </div>
    );
  }

  // Saving screen
  if (currentStep === 'saving') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-8"></div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Saving Your Answers...
          </h1>
          <p className="text-xl text-gray-700">
            Just a moment! ⏳
          </p>
        </div>
      </div>
    );
  }

  // Complete screen
  if (currentStep === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 flex items-center justify-center p-4">
        <div className="max-w-3xl w-full text-center bg-white rounded-3xl shadow-2xl p-8 sm:p-12">
          <div className="text-8xl mb-6">🎉</div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Awesome Job, {child.name}!
          </h1>
          <p className="text-2xl sm:text-3xl text-gray-700 mb-8">
            You did amazing! 🌟
          </p>
          <p className="text-xl text-gray-600 mb-12">
            Thank you for helping us understand you better. Your answers will help your family know the best ways to support you!
          </p>
          <button
            onClick={() => router.push('/test')}
            className="bg-gradient-to-r from-green-400 to-blue-500 text-white px-12 py-5 rounded-2xl text-2xl font-bold hover:from-green-500 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg"
          >
            All Done! 🏠
          </button>
        </div>
      </div>
    );
  }

  // Questions screen
  if (currentStep === 'questions' && currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex flex-col">
        {/* Progress bar - colorful and fun */}
        <div className="bg-white shadow-md">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-bold text-purple-600">
                {currentSection.emoji} {currentSection.title}
              </span>
              <span className="text-lg font-bold text-blue-600">
                {answeredQuestions} / {totalQuestions} done! 🎯
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Question content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <ChildQuestionDisplay
            question={currentQuestion}
            sectionEmoji={currentSection.emoji}
            sectionDescription={currentSection.description}
            currentAnswer={answers[currentQuestion.id]}
            onAnswer={(value) => handleAnswer(currentQuestion.id, value)}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
            canGoBack={currentSectionIndex > 0 || currentQuestionIndex > 0}
            childName={child.name}
          />
        </div>

        {/* Fun footer */}
        <div className="bg-white border-t border-gray-200 py-4">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <p className="text-lg text-gray-600">
              🌟 Take your time! There are no wrong answers! 🌟
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
