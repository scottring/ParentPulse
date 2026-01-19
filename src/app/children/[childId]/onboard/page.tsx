'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useChildren } from '@/hooks/useChildren';
import { useChildManualGeneration } from '@/hooks/useChildManualGeneration';
import { childOnboardingQuestions } from '@/config/child-onboarding-questions';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';

export default function ChildOnboardingPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { children } = useChildren();
  const { generateManual, loading: generating, error: generateError } = useChildManualGeneration();
  const childId = params.childId as string;

  const [child, setChild] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (children.length > 0) {
      const foundChild = children.find((c) => c.childId === childId);
      if (foundChild) {
        setChild(foundChild);
      } else {
        router.push('/children');
      }
      setLoading(false);
    }
  }, [user, children, childId, router]);

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

  return (
    <OnboardingWizard
      child={child}
      questions={childOnboardingQuestions}
      onComplete={async (answers) => {
        try {
          console.log('Onboarding complete! Generating manual...', answers);

          // Call Cloud Function to generate manual content
          const generatedContent = await generateManual({
            childId: child.childId,
            childName: child.name,
            childAge: child.age,
            answers: answers,
          });

          console.log('Manual generated successfully:', generatedContent);

          // Store generated content in localStorage for review page
          localStorage.setItem(`manual-generated-${child.childId}`, JSON.stringify(generatedContent));

          // Navigate to review page
          router.push(`/children/${childId}/review`);
        } catch (err) {
          console.error('Failed to generate manual:', err);
          alert(`Failed to generate manual: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }}
      onCancel={() => {
        router.push(`/test`);
      }}
    />
  );
}
