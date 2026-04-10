'use client';

import { useState } from 'react';
import type { Exercise, ReflectionRating, SuggestedManualEntry } from '@/types/workbook';

const RATING_OPTIONS: { value: ReflectionRating; label: string; emoji: string }[] = [
  { value: 'didnt_try', label: "Didn't try", emoji: '\uD83D\uDE10' },
  { value: 'tried_hard', label: 'Tried but hard', emoji: '\uD83D\uDE15' },
  { value: 'went_okay', label: 'Went okay', emoji: '\uD83D\uDE42' },
  { value: 'went_well', label: 'Went well', emoji: '\uD83D\uDE0A' },
];

interface ReflectionFormProps {
  exercise: Exercise;
  personName: string;
  submitting: boolean;
  onSubmit: (reflection: {
    rating: ReflectionRating;
    reflectionNotes: string;
    suggestedManualEntries?: SuggestedManualEntry[];
  }) => void;
  onClose: () => void;
}

export default function ReflectionForm({
  exercise,
  personName,
  submitting,
  onSubmit,
  onClose,
}: ReflectionFormProps) {
  const [rating, setRating] = useState<ReflectionRating | null>(null);
  const [promptAnswers, setPromptAnswers] = useState<Record<number, string>>({});
  const [discoveryNote, setDiscoveryNote] = useState('');
  const [manualEntries, setManualEntries] = useState<SuggestedManualEntry[]>(() =>
    generateSuggestedEntries(exercise, personName)
  );

  const handleAcceptEntry = (id: string) => {
    setManualEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, accepted: true } : e))
    );
  };

  const handleDismissEntry = (id: string) => {
    setManualEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, accepted: false } : e))
    );
  };

  const handleSubmit = () => {
    if (!rating) return;

    const notes = [
      ...Object.entries(promptAnswers)
        .filter(([, v]) => v.trim())
        .map(([i, v]) => `${exercise.reflectionPrompts[Number(i)]}: ${v}`),
      discoveryNote.trim() ? `Discovery: ${discoveryNote}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const acceptedEntries = manualEntries.filter((e) => e.accepted);

    onSubmit({
      rating,
      reflectionNotes: notes,
      suggestedManualEntries: acceptedEntries.length > 0 ? acceptedEntries : undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.15)',
        }}
      >
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: '28px',
                  fontWeight: 500,
                  color: 'var(--parent-text)',
                }}
              >
                How did it go?
              </h2>
              <p
                className="mt-1"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '21px',
                  color: 'var(--parent-text-light)',
                  fontStyle: 'italic',
                }}
              >
                &ldquo;{exercise.title}&rdquo;
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5"
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: '25px',
                color: 'var(--parent-text-light)',
              }}
            >
              &times;
            </button>
          </div>

          {/* Rating — emoji-forward per spec */}
          <div className="mb-6">
            <div className="flex justify-center gap-3">
              {RATING_OPTIONS.map((opt) => {
                const selected = rating === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setRating(opt.value)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all"
                    style={{
                      background: selected
                        ? 'color-mix(in srgb, var(--parent-primary) 10%, white)'
                        : 'rgba(0,0,0,0.03)',
                      border: `1.5px solid ${
                        selected ? 'var(--parent-primary)' : 'rgba(0,0,0,0.06)'
                      }`,
                      minWidth: 72,
                    }}
                  >
                    <span style={{ fontSize: '33px' }}>{opt.emoji}</span>
                    <span
                      className="text-[14px] font-medium"
                      style={{
                        fontFamily: 'var(--font-parent-body)',
                        color: selected ? 'var(--parent-primary)' : 'var(--parent-text-light)',
                      }}
                    >
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reflection prompts */}
          {exercise.reflectionPrompts.map((prompt, i) => (
            <div key={i} className="mb-4">
              <label
                className="block mb-1.5"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '21px',
                  fontWeight: 500,
                  color: 'var(--parent-text)',
                }}
              >
                {prompt}
              </label>
              <textarea
                value={promptAnswers[i] || ''}
                onChange={(e) =>
                  setPromptAnswers((prev) => ({ ...prev, [i]: e.target.value }))
                }
                rows={2}
                className="w-full rounded-2xl px-4 py-3 text-sm resize-none"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  background: 'rgba(0,0,0,0.03)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  color: 'var(--parent-text)',
                }}
                placeholder="Optional"
              />
            </div>
          ))}

          {/* Discovery note */}
          <div className="mb-6">
            <label
              className="block mb-1.5"
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: '21px',
                fontWeight: 500,
                color: 'var(--parent-text)',
              }}
            >
              What did you discover?
            </label>
            <textarea
              value={discoveryNote}
              onChange={(e) => setDiscoveryNote(e.target.value)}
              rows={3}
              className="w-full rounded-2xl px-4 py-3 text-sm resize-none"
              style={{
                fontFamily: 'var(--font-parent-body)',
                background: 'rgba(0,0,0,0.03)',
                border: '1px solid rgba(0,0,0,0.06)',
                color: 'var(--parent-text)',
              }}
              placeholder="Anything that surprised you or felt important..."
            />
          </div>

          {/* Suggested manual entries */}
          {manualEntries.length > 0 && (
            <div className="mb-6">
              <div
                className="mb-4"
                style={{
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.06), transparent)',
                }}
              />
              <h3
                className="mb-3"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '17px',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--parent-text)',
                }}
              >
                Add to {personName}&apos;s manual?
              </h3>
              <div className="space-y-2">
                {manualEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 rounded-2xl"
                    style={{
                      background: entry.accepted
                        ? 'color-mix(in srgb, var(--parent-primary) 6%, white)'
                        : 'rgba(0,0,0,0.02)',
                      border: `1px solid ${
                        entry.accepted
                          ? 'color-mix(in srgb, var(--parent-primary) 20%, transparent)'
                          : 'rgba(0,0,0,0.05)'
                      }`,
                    }}
                  >
                    <div className="flex-1">
                      <p
                        className="text-[17px] leading-relaxed"
                        style={{
                          fontFamily: 'var(--font-parent-body)',
                          color: 'var(--parent-text)',
                        }}
                      >
                        {entry.content}
                      </p>
                      <span
                        className="text-[14px] mt-0.5 block"
                        style={{
                          fontFamily: 'var(--font-parent-body)',
                          color: 'var(--parent-text-light)',
                          fontStyle: 'italic',
                        }}
                      >
                        &rarr; {entry.targetSection.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleAcceptEntry(entry.id)}
                        className="px-2.5 py-1 rounded-full text-[14px] font-medium hover:opacity-80"
                        style={{
                          fontFamily: 'var(--font-parent-body)',
                          background: entry.accepted
                            ? 'var(--parent-primary)'
                            : 'rgba(0,0,0,0.06)',
                          color: entry.accepted ? 'white' : 'var(--parent-text)',
                        }}
                      >
                        {entry.accepted ? 'Added' : 'Add'}
                      </button>
                      {!entry.accepted && (
                        <button
                          onClick={() => handleDismissEntry(entry.id)}
                          className="px-2.5 py-1 rounded-full text-[14px] font-medium hover:opacity-80"
                          style={{
                            fontFamily: 'var(--font-parent-body)',
                            background: 'transparent',
                            color: 'var(--parent-text-light)',
                          }}
                        >
                          Skip
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!rating || submitting}
            className="w-full py-3 rounded-full text-[19px] font-medium text-white hover:opacity-90 disabled:opacity-40"
            style={{
              fontFamily: 'var(--font-parent-body)',
              background: 'var(--parent-primary)',
            }}
          >
            {submitting ? 'Saving...' : 'Save reflection \u2192'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Generate template-based suggested manual entries from the exercise's success indicators.
 */
function generateSuggestedEntries(
  exercise: Exercise,
  _personName: string
): SuggestedManualEntry[] {
  const entries: SuggestedManualEntry[] = [];

  // Use the exercise's success indicators to suggest "what works" entries
  exercise.successIndicators.forEach((indicator, i) => {
    entries.push({
      id: `sug_${exercise.exerciseId}_${i}`,
      targetSection: 'what_works',
      content: indicator.replace("You'll know this is working when ", '').replace("You'll know it's landed when ", ''),
      accepted: false,
    });
  });

  return entries;
}
