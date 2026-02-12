'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useManual } from '@/hooks/useManual';
import { useCheckin } from '@/hooks/useCheckin';
import { useCoherence } from '@/hooks/useCoherence';
import { CheckinFlow } from '@/components/checkin/CheckinFlow';
import { PatternSummary } from '@/components/checkin/PatternSummary';

export default function CheckinPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { manuals, loading: manualsLoading } = useManual();
  const {
    currentCheckin,
    hasCheckedInThisWeek,
    currentWeek,
    loading: checkinLoading,
    submitCheckin,
  } = useCheckin();
  const { observations, loading: obsLoading, generateObservations } = useCoherence();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user || manualsLoading || checkinLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-stone-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      <div className="max-w-xl mx-auto">
        {/* Back link */}
        <button
          onClick={() => router.push('/bookshelf')}
          className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 mb-6 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.22 8.53a.75.75 0 0 1 0-1.06l3.5-3.5a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Bookshelf
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-900 heading">Weekly Check-in</h1>
          <p className="text-stone-500 text-sm mt-1">Week {currentWeek}</p>
        </div>

        {hasCheckedInThisWeek && currentCheckin ? (
          /* Already checked in — show summary */
          <div className="space-y-8 animate-fade-in">
            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-600">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-stone-900">Already checked in</h3>
                  <p className="text-sm text-stone-400">You completed this week&apos;s check-in.</p>
                </div>
              </div>

              {/* Rating summary */}
              <div className="space-y-2">
                {manuals.map(manual => {
                  const response = currentCheckin.responses[manual.manualId];
                  if (!response) return null;
                  return (
                    <div key={manual.manualId} className="flex items-center justify-between">
                      <span className="text-sm text-stone-600">{manual.title}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <div
                            key={n}
                            className={`w-2 h-2 rounded-full ${
                              n <= response.alignmentRating ? 'bg-stone-700' : 'bg-stone-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Observations */}
            {currentCheckin.systemObservations?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-3">
                  Patterns we noticed
                </h4>
                <PatternSummary
                  observations={currentCheckin.systemObservations}
                  loading={false}
                />
              </div>
            )}
          </div>
        ) : (
          /* New check-in flow */
          <CheckinFlow
            manuals={manuals}
            onComplete={submitCheckin}
            onGenerateObservations={generateObservations}
            observations={observations}
            observationsLoading={obsLoading}
          />
        )}
      </div>
    </div>
  );
}
