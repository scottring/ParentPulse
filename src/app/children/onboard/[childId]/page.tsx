'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useChildProfile } from '@/hooks/useChildProfile';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, User, ChildBaselineProfile, LearningStyle, ChildChallenge } from '@/types';
import ChallengesStep from '@/components/onboarding/ChallengesStep';
import StrengthsStep from '@/components/onboarding/StrengthsStep';
import EnvironmentStep from '@/components/onboarding/EnvironmentStep';
import StrategiesStep from '@/components/onboarding/StrategiesStep';

interface OnboardingData {
  // Step 1: Challenges
  challenges: ChildChallenge[];

  // Step 2: Strengths & Interests
  strengths: string[];
  interests: string[];
  learningStyle: LearningStyle;

  // Step 3: Environment
  schoolInfo?: {
    grade?: string;
    specialServices?: string[];
    iepOrFiveOFour?: boolean;
  };

  // Step 4: Strategies
  whatWorks: Array<{ description: string; effectiveness: 1 | 2 | 3 | 4 | 5; context: string }>;
  whatDoesntWork: Array<{ description: string; context: string }>;
}

export default function OnboardingPage() {
  const router = useRouter();
  const params = useParams();
  const childId = params.childId as string;
  const { user, loading: authLoading } = useAuth();
  const { createProfile, loading: profileLoading } = useChildProfile();

  const [child, setChild] = useState<User | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    challenges: [],
    strengths: [],
    interests: [],
    learningStyle: 'mixed',
    whatWorks: [],
    whatDoesntWork: []
  });

  const totalSteps = 4;

  // Fetch child data
  useEffect(() => {
    if (!childId || !user?.familyId) return;

    const fetchChild = async () => {
      const childDoc = await getDoc(doc(db, COLLECTIONS.USERS, childId));
      if (childDoc.exists()) {
        setChild({ userId: childDoc.id, ...childDoc.data() } as User);
      }
    };

    fetchChild();
  }, [childId, user?.familyId]);

  if (authLoading || !child) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  const handleStepComplete = (stepData: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...stepData }));

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      // Convert onboardingData to profile format
      const profileData: Omit<ChildBaselineProfile, 'profileId' | 'createdAt' | 'updatedAt' | 'version'> = {
        familyId: user!.familyId,
        childId: child.userId,
        challenges: onboardingData.challenges,
        strengths: onboardingData.strengths,
        interests: onboardingData.interests,
        learningStyle: onboardingData.learningStyle,
        triggers: [],
        whatWorks: onboardingData.whatWorks.map((s, idx) => ({
          id: `strategy_${Date.now()}_${idx}`,
          description: s.description,
          effectiveness: s.effectiveness,
          context: s.context,
          sourceType: 'parent_discovery' as const,
          addedDate: new Date() as any // Will be converted to Timestamp in hook
        })),
        whatDoesntWork: onboardingData.whatDoesntWork.map((s, idx) => ({
          id: `strategy_nowork_${Date.now()}_${idx}`,
          description: s.description,
          effectiveness: 1,
          context: s.context,
          sourceType: 'parent_discovery' as const,
          addedDate: new Date() as any
        })),
        schoolInfo: onboardingData.schoolInfo,
        emergingPatterns: [],
        progressNotes: [],
        relatedJournalEntries: [],
        relatedKnowledgeIds: []
      };

      const createdProfile = await createProfile(profileData);

      // Navigate to child profile or trigger plan generation
      router.push(`/children/${childId}/profile?newProfile=true`);
    } catch (error) {
      console.error('Error creating profile:', error);
      alert('Failed to create profile. Please try again.');
    }
  };

  return (
    <div className="min-h-screen parent-page">
      {/* Header */}
      <header className="border-b paper-texture" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl">📋</div>
            <div>
              <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                Creating {child.name}'s Profile
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                Step {currentStep} of {totalSteps}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-4">
        <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--parent-bg)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${(currentStep / totalSteps) * 100}%`,
              backgroundColor: 'var(--parent-accent)'
            }}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-8">
        {currentStep === 1 && (
          <ChallengesStep
            childName={child.name}
            initialChallenges={onboardingData.challenges}
            onComplete={(challenges) => handleStepComplete({ challenges })}
            onBack={null}
          />
        )}

        {currentStep === 2 && (
          <StrengthsStep
            childName={child.name}
            initialData={{
              strengths: onboardingData.strengths,
              interests: onboardingData.interests,
              learningStyle: onboardingData.learningStyle
            }}
            onComplete={(data) => handleStepComplete(data)}
            onBack={handleBack}
          />
        )}

        {currentStep === 3 && (
          <EnvironmentStep
            childName={child.name}
            initialData={onboardingData.schoolInfo}
            onComplete={(schoolInfo) => handleStepComplete({ schoolInfo })}
            onBack={handleBack}
            onSkip={handleSkipStep}
          />
        )}

        {currentStep === 4 && (
          <StrategiesStep
            childName={child.name}
            initialData={{
              whatWorks: onboardingData.whatWorks,
              whatDoesntWork: onboardingData.whatDoesntWork
            }}
            onComplete={(data) => {
              handleStepComplete(data);
              handleComplete();
            }}
            onBack={handleBack}
            onSkip={handleComplete}
          />
        )}
      </main>

      {/* Loading Overlay */}
      {profileLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="w-16 h-16 spinner mx-auto mb-4"></div>
            <p className="text-lg font-medium">Creating {child.name}'s profile...</p>
          </div>
        </div>
      )}
    </div>
  );
}
