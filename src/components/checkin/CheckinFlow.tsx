'use client';

import { useState, useCallback } from 'react';
import type { Manual } from '@/types/manual';
import type { CheckinResponse } from '@/types/checkin';
import { CheckinQuestion } from './CheckinQuestion';
import { PatternSummary } from './PatternSummary';
import type { SystemObservation } from '@/types/checkin';

interface CheckinFlowProps {
  manuals: Manual[];
  onComplete: (responses: Record<string, CheckinResponse>) => Promise<string>;
  onGenerateObservations: (checkinId: string) => Promise<void>;
  observations: SystemObservation[];
  observationsLoading: boolean;
}

type FlowState = 'questions' | 'submitting' | 'complete';

export function CheckinFlow({
  manuals,
  onComplete,
  onGenerateObservations,
  observations,
  observationsLoading,
}: CheckinFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, CheckinResponse>>({});
  const [flowState, setFlowState] = useState<FlowState>('questions');

  const currentManual = manuals[currentIndex];
  const isLastManual = currentIndex === manuals.length - 1;

  const handleQuestionSubmit = useCallback(async (
    reflectionText: string,
    alignmentRating: number,
    driftNotes?: string
  ) => {
    const response: CheckinResponse = {
      manualId: currentManual.manualId,
      reflectionText,
      alignmentRating,
      driftNotes,
    };

    const updatedResponses = {
      ...responses,
      [currentManual.manualId]: response,
    };
    setResponses(updatedResponses);

    if (isLastManual) {
      setFlowState('submitting');
      try {
        const checkinId = await onComplete(updatedResponses);
        setFlowState('complete');
        await onGenerateObservations(checkinId);
      } catch (err) {
        console.error('Failed to submit check-in:', err);
        setFlowState('questions');
      }
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentManual, responses, isLastManual, onComplete, onGenerateObservations]);

  if (manuals.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-stone-400">No manuals to check in on yet.</p>
        <p className="text-stone-400 text-sm mt-1">Complete onboarding first to create your family manual.</p>
      </div>
    );
  }

  if (flowState === 'submitting') {
    return (
      <div className="text-center py-12 animate-fade-in">
        <div className="animate-pulse text-stone-400 mb-2">Saving your check-in...</div>
      </div>
    );
  }

  if (flowState === 'complete') {
    return (
      <div className="space-y-8 animate-fade-in-up">
        {/* Completion message */}
        <div className="text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-emerald-600">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-stone-900 heading">Check-in complete</h3>
          <p className="text-sm text-stone-500 mt-1">Thank you for taking a moment to reflect.</p>
        </div>

        {/* Rating summary */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h4 className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-3">This week</h4>
          <div className="space-y-2">
            {manuals.map(manual => {
              const response = responses[manual.manualId];
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

        {/* AI observations */}
        <div>
          <h4 className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-3">
            Patterns we notice
          </h4>
          <PatternSummary observations={observations} loading={observationsLoading} />
        </div>
      </div>
    );
  }

  // Questions flow
  return (
    <div>
      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-8">
        {manuals.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < currentIndex ? 'bg-stone-700' :
              i === currentIndex ? 'bg-stone-400' :
              'bg-stone-200'
            }`}
          />
        ))}
      </div>

      <CheckinQuestion
        key={currentManual.manualId}
        manual={currentManual}
        onSubmit={handleQuestionSubmit}
      />
    </div>
  );
}
