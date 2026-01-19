'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { CoachChat } from '@/components/coach/CoachChat';

export default function PersonCoachPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading } = usePersonById(personId);

  // Check auth
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || personLoading || !user || !person) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-800 border-t-amber-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 font-mono text-sm text-slate-600">LOADING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFF8F0' }}>
      {/* Blueprint grid background */}
      <div className="blueprint-grid"></div>

      {/* Back link */}
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-8">
        <Link
          href={`/people/${personId}/manual`}
          className="inline-block font-mono text-sm text-slate-600 hover:text-slate-900 underline mb-6"
        >
          ← Back to {person.name}'s Manual
        </Link>
      </div>

      {/* Chat Container */}
      <main className="relative max-w-5xl mx-auto px-6 lg:px-8 pb-12">
        <div className="h-[calc(100vh-200px)] min-h-[600px]">
          <CoachChat
            personId={personId}
            personName={person.name}
          />
        </div>
      </main>

      {/* Blueprint grid CSS */}
      <style jsx>{`
        .blueprint-grid {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image:
            linear-gradient(rgba(30, 58, 95, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(30, 58, 95, 0.03) 1px, transparent 1px);
          background-size: 20px 20px;
          pointer-events: none;
          z-index: 0;
        }
      `}</style>
    </div>
  );
}
