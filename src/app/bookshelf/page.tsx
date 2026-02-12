'use client';

import { useAuth } from '@/context/AuthContext';
import { useManual } from '@/hooks/useManual';
import { useCheckin } from '@/hooks/useCheckin';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Bookshelf } from '@/components/bookshelf/Bookshelf';
import { ONBOARDING_PHASES, PHASE_NAMES, DOMAIN_NAMES, DOMAIN_ORDER } from '@/types/manual';
import type { DomainId } from '@/types/user';

export default function BookshelfPage() {
  const { user, loading, logout } = useAuth();
  const { manuals, loading: manualsLoading } = useManual();
  const { recentDriftSignals } = useCheckin();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user || manualsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-stone-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 heading">Your Bookshelf</h1>
            <p className="text-stone-500 text-sm">{user.displayName}&apos;s family library</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/settings')}
              className="text-sm text-stone-400 hover:text-stone-600"
            >
              Settings
            </button>
            <button
              onClick={() => logout().then(() => router.push('/login'))}
              className="text-sm text-stone-400 hover:text-stone-600"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Bookshelf */}
        <Bookshelf manuals={manuals} />

        {/* Continue onboarding prompt */}
        {(() => {
          const completed = user.onboardingStatus?.phasesCompleted ?? [];
          const remaining = ONBOARDING_PHASES.filter(p => !completed.includes(p.id));
          if (remaining.length === 0) return null;

          const nextPhase = remaining[0];
          return (
            <div className="mt-8 bg-white border border-stone-200 rounded-xl p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-stone-800">
                    Continue building your manual
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {remaining.length} {remaining.length === 1 ? 'conversation' : 'conversations'} remaining &mdash; the more you share, the richer your yearbook gets
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/onboarding/${nextPhase.id}`)}
                  className="shrink-0 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm hover:bg-stone-800"
                >
                  {PHASE_NAMES[nextPhase.id]}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Drift signal suggestions */}
        {recentDriftSignals.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-stone-500 mb-3">Worth revisiting</h3>
            <div className="space-y-2">
              {recentDriftSignals.map(signal => {
                const domainId = DOMAIN_ORDER.includes(signal.domain as DomainId)
                  ? (signal.domain as DomainId)
                  : null;
                return (
                  <button
                    key={signal.id}
                    onClick={() => {
                      if (domainId) {
                        router.push(`/manual/${signal.manualId}/refresh/${domainId}`);
                      }
                    }}
                    className="w-full text-left bg-white border border-stone-200 rounded-xl p-4 hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                        signal.severity === 'notable' ? 'bg-amber-400' : 'bg-stone-300'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-700">{signal.description}</p>
                        {domainId && (
                          <span className="inline-block mt-1.5 text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded">
                            {DOMAIN_NAMES[domainId]}
                          </span>
                        )}
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-stone-300 shrink-0 mt-0.5">
                        <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick links below shelf */}
        {manuals.length > 0 && (
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => router.push('/checkin')}
              className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Weekly check-in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
