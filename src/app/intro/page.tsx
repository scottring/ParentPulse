'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function IntroPage() {
  const { user, loading, updateUserProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  const handleBegin = async () => {
    if (!user) return;
    await updateUserProfile({
      onboardingStatus: {
        ...user.onboardingStatus,
        introCompleted: true,
        currentPhase: 'foundation',
      },
    });
    router.push('/onboarding');
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-stone-400">Loading...</div>
    </div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-lg text-center animate-fade-in-up">
        <h1 className="text-4xl font-bold text-stone-900 heading mb-4">
          Welcome to Relish
        </h1>
        <p className="text-lg text-stone-600 mb-2">
          Your family has a story. Let&apos;s build the operating manual.
        </p>
        <p className="text-stone-500 mb-8 leading-relaxed">
          Relish helps your family get organized across every domain that matters &mdash;
          your values, communication, connections, roles, spaces, and more.
          We&apos;ll diagnose what&apos;s working and build a plan for what isn&apos;t.
        </p>
        <div className="mb-8 flex justify-center gap-6 text-sm text-stone-400">
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-semibold">1</div>
            <span>Foundation</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-semibold">2</div>
            <span>Relationships</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-semibold">3</div>
            <span>Operations</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-semibold">4</div>
            <span>Strategy</span>
          </div>
        </div>
        <p className="text-stone-400 text-sm mb-6">
          We&apos;ll start with a conversation about your values and how you communicate.
          It takes about 10 minutes.
        </p>
        <button
          onClick={handleBegin}
          className="px-8 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 text-lg font-medium"
        >
          Let&apos;s begin
        </button>
      </div>
    </div>
  );
}
