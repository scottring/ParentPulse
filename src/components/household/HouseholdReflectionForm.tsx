'use client';

import React, { useState } from 'react';
import { TechnicalCard, TechnicalButton, TechnicalLabel } from '../technical';

interface HouseholdReflectionFormProps {
  onSubmit: (reflection: {
    weekHighlight: string;
    weekChallenge: string;
    nextWeekFocus: string;
    familyMoodRating: 1 | 2 | 3 | 4 | 5;
  }) => Promise<void>;
  className?: string;
}

export function HouseholdReflectionForm({
  onSubmit,
  className = '',
}: HouseholdReflectionFormProps) {
  const [weekHighlight, setWeekHighlight] = useState('');
  const [weekChallenge, setWeekChallenge] = useState('');
  const [nextWeekFocus, setNextWeekFocus] = useState('');
  const [familyMoodRating, setFamilyMoodRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!weekHighlight || !weekChallenge || !nextWeekFocus || !familyMoodRating) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        weekHighlight,
        weekChallenge,
        nextWeekFocus,
        familyMoodRating,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = weekHighlight && weekChallenge && nextWeekFocus && familyMoodRating;

  const moodLabels = ['Rough', 'Challenging', 'Okay', 'Good', 'Great'];

  return (
    <TechnicalCard cornerBrackets shadowSize="md" className={`p-6 ${className}`}>
      <h3 className="font-mono font-bold text-lg text-slate-800 mb-6">
        WEEKLY REFLECTION
      </h3>

      <div className="space-y-6">
        {/* Week highlight */}
        <div>
          <label className="block font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            WHAT WENT WELL THIS WEEK?
          </label>
          <textarea
            value={weekHighlight}
            onChange={(e) => setWeekHighlight(e.target.value)}
            placeholder="Share a highlight or win from this week..."
            className="
              w-full p-3 border-2 border-slate-300 font-mono text-sm
              focus:outline-none focus:border-slate-800
              resize-none
            "
            rows={3}
          />
        </div>

        {/* Week challenge */}
        <div>
          <label className="block font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            WHAT WAS CHALLENGING?
          </label>
          <textarea
            value={weekChallenge}
            onChange={(e) => setWeekChallenge(e.target.value)}
            placeholder="What didn't go as planned? What was hard?"
            className="
              w-full p-3 border-2 border-slate-300 font-mono text-sm
              focus:outline-none focus:border-slate-800
              resize-none
            "
            rows={3}
          />
        </div>

        {/* Next week focus */}
        <div>
          <label className="block font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            WHAT DO YOU WANT TO FOCUS ON NEXT WEEK?
          </label>
          <textarea
            value={nextWeekFocus}
            onChange={(e) => setNextWeekFocus(e.target.value)}
            placeholder="What's one thing you want to improve or continue?"
            className="
              w-full p-3 border-2 border-slate-300 font-mono text-sm
              focus:outline-none focus:border-slate-800
              resize-none
            "
            rows={2}
          />
        </div>

        {/* Family mood rating */}
        <div>
          <label className="block font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
            HOW WOULD YOU RATE THE FAMILY MOOD THIS WEEK?
          </label>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as const).map((rating) => (
              <button
                key={rating}
                onClick={() => setFamilyMoodRating(rating)}
                className={`
                  flex-1 p-3 border-2 font-mono text-center transition-colors
                  ${familyMoodRating === rating
                    ? 'border-slate-800 bg-slate-800 text-white'
                    : 'border-slate-300 text-slate-600 hover:border-slate-400'
                  }
                `}
              >
                <div className="text-2xl mb-1">
                  {rating === 1 && '\u2639\uFE0F'}
                  {rating === 2 && '\u{1F615}'}
                  {rating === 3 && '\u{1F610}'}
                  {rating === 4 && '\u{1F642}'}
                  {rating === 5 && '\u{1F60A}'}
                </div>
                <div className="text-xs">{moodLabels[rating - 1]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Submit button */}
        <TechnicalButton
          variant="primary"
          fullWidth
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? 'SUBMITTING...' : 'SUBMIT REFLECTION'}
        </TechnicalButton>
      </div>
    </TechnicalCard>
  );
}

export default HouseholdReflectionForm;
