'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
    } else if (!user.onboardingStatus?.introCompleted) {
      router.replace('/intro');
    } else if ((user.onboardingStatus?.phasesCompleted?.length ?? 0) < 2) {
      router.replace('/onboarding');
    } else {
      router.replace('/bookshelf');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-stone-400 text-lg">Loading...</div>
    </div>
  );
}
