'use client';

import { useState } from 'react';
import type { Manual } from '@/types/manual';

interface CheckinQuestionProps {
  manual: Manual;
  onSubmit: (reflectionText: string, alignmentRating: number, driftNotes?: string) => void;
}

const RATING_LABELS = [
  { value: 1, label: 'Disconnected', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 2, label: 'Drifting', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 3, label: 'Okay', color: 'bg-stone-100 text-stone-700 border-stone-200' },
  { value: 4, label: 'Aligned', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 5, label: 'Thriving', color: 'bg-emerald-200 text-emerald-800 border-emerald-300' },
];

export function CheckinQuestion({ manual, onSubmit }: CheckinQuestionProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [reflection, setReflection] = useState('');
  const [driftNotes, setDriftNotes] = useState('');
  const [showDrift, setShowDrift] = useState(false);

  const handleSubmit = () => {
    if (rating === null) return;
    onSubmit(reflection, rating, driftNotes || undefined);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Manual reference */}
      <div>
        <h3 className="text-lg font-semibold text-stone-900 heading">{manual.title}</h3>
        <p className="text-sm text-stone-400 mt-1">
          How aligned did this part of your life feel this week?
        </p>
      </div>

      {/* Rating */}
      <div>
        <div className="flex gap-2">
          {RATING_LABELS.map(r => (
            <button
              key={r.value}
              onClick={() => setRating(r.value)}
              className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                rating === r.value
                  ? r.color + ' scale-105 shadow-sm'
                  : 'bg-white border-stone-200 text-stone-400 hover:border-stone-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reflection */}
      <div>
        <label className="block text-sm font-medium text-stone-600 mb-2">
          A quick reflection — what stood out this week?
        </label>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="No pressure — even a sentence helps..."
          rows={3}
          className="w-full px-4 py-3 border border-stone-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent text-sm leading-relaxed"
        />
      </div>

      {/* Drift notes (optional, expandable) */}
      {rating !== null && rating <= 3 && (
        <div>
          {!showDrift ? (
            <button
              onClick={() => setShowDrift(true)}
              className="text-sm text-stone-400 hover:text-stone-600 underline"
            >
              Notice any drift? (optional)
            </button>
          ) : (
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-2">
                What feels off?
              </label>
              <textarea
                value={driftNotes}
                onChange={(e) => setDriftNotes(e.target.value)}
                placeholder="Something shifted, and it might be..."
                rows={2}
                className="w-full px-4 py-3 border border-stone-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent text-sm leading-relaxed"
              />
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={rating === null}
        className="w-full py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed font-medium transition-colors"
      >
        Next
      </button>
    </div>
  );
}
