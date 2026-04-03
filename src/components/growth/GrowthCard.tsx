'use client';

import { useState } from 'react';
import { GrowthItem, FeedbackReaction, ImpactRating } from '@/types/growth';

interface GrowthCardProps {
  item: GrowthItem;
  onFeedback: (
    itemId: string,
    reaction: FeedbackReaction,
    impactRating?: ImpactRating,
    note?: string,
  ) => Promise<void>;
}

const REACTIONS: { reaction: FeedbackReaction; emoji: string; label: string }[] = [
  { reaction: 'loved_it', emoji: '\u2764\uFE0F', label: 'Loved it' },
  { reaction: 'tried_it', emoji: '\u2705', label: 'Tried it' },
  { reaction: 'not_now', emoji: '\uD83D\uDD52', label: 'Not now' },
  { reaction: 'doesnt_fit', emoji: '\u2716\uFE0F', label: "Doesn't fit" },
];

const IMPACT_LABELS: { value: ImpactRating; label: string }[] = [
  { value: 1, label: 'Slight' },
  { value: 2, label: 'Noticeable' },
  { value: 3, label: 'Breakthrough' },
];

export default function GrowthCard({ item, onFeedback }: GrowthCardProps) {
  const [feedbackState, setFeedbackState] = useState<
    'idle' | 'reacted' | 'submitting' | 'done'
  >('idle');
  const [selectedReaction, setSelectedReaction] = useState<FeedbackReaction | null>(null);
  const [selectedImpact, setSelectedImpact] = useState<ImpactRating | null>(null);

  const isCompleted = item.status === 'completed' || item.status === 'skipped';
  const isPositive = selectedReaction === 'loved_it' || selectedReaction === 'tried_it';

  const handleReaction = async (reaction: FeedbackReaction) => {
    setSelectedReaction(reaction);

    // For negative/neutral reactions, submit immediately
    if (reaction === 'not_now' || reaction === 'doesnt_fit') {
      setFeedbackState('submitting');
      await onFeedback(item.growthItemId, reaction);
      setFeedbackState('done');
      return;
    }

    // For positive reactions, show impact selector
    setFeedbackState('reacted');

    // Auto-submit with default impact after 5 seconds
    setTimeout(() => {
      setFeedbackState((prev) => {
        if (prev === 'reacted') {
          onFeedback(item.growthItemId, reaction, 2); // default: noticeable
          return 'done';
        }
        return prev;
      });
    }, 5000);
  };

  const handleImpact = async (impact: ImpactRating) => {
    if (!selectedReaction) return;
    setSelectedImpact(impact);
    setFeedbackState('submitting');
    await onFeedback(item.growthItemId, selectedReaction, impact);
    setFeedbackState('done');
  };

  // Completed card (faded)
  if (isCompleted) {
    const feedback = item.feedback;
    const impactLabel = feedback?.impactRating
      ? IMPACT_LABELS.find((l) => l.value === feedback.impactRating)?.label
      : null;

    return (
      <div
        className="rounded-xl p-4 opacity-60"
        style={{
          background: 'rgba(0,0,0,0.02)',
          border: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div className="flex items-start gap-3">
          <span className="text-lg">{item.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-sm line-through"
                style={{ fontFamily: 'var(--font-parent-body)', color: '#8A8078' }}
              >
                {item.title}
              </span>
              {feedback && (
                <span
                  className="text-xs"
                  style={{ fontFamily: 'var(--font-parent-body)', color: '#8A8078' }}
                >
                  {feedback.reaction === 'loved_it' ? '\u2764\uFE0F' : '\u2705'}
                  {impactLabel && ` ${impactLabel.toLowerCase()}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Relational level badge
  const levelBadge = item.relationalLevel && item.relationalLevel !== 'individual' ? (
    <span
      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{
        fontFamily: 'var(--font-parent-body)',
        background: item.relationalLevel === 'couple'
          ? 'rgba(200,107,122,0.1)'
          : 'rgba(59,130,246,0.08)',
        color: item.relationalLevel === 'couple'
          ? '#c86b7a'
          : '#3b82f6',
      }}
    >
      {item.relationalLevel === 'couple' ? 'Couple' : 'Family'}
    </span>
  ) : null;

  return (
    <div
      className="rounded-xl p-5 transition-all"
      style={{
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.4)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">{item.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {levelBadge}
            <span
              className="text-[10px]"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#8A8078' }}
            >
              {item.speed === 'ambient' ? 'Today' : 'This week'}
            </span>
            {item.estimatedMinutes && (
              <span
                className="text-[10px]"
                style={{ fontFamily: 'var(--font-parent-body)', color: '#8A8078' }}
              >
                ~{item.estimatedMinutes} min
              </span>
            )}
          </div>
          <h3
            className="text-sm leading-tight"
            style={{
              fontFamily: 'var(--font-parent-display)',
              fontWeight: 500,
              color: '#3A3530',
            }}
          >
            {item.title}
          </h3>
        </div>
      </div>

      {/* Body */}
      <p
        className="text-sm leading-relaxed mb-4 pl-9"
        style={{ fontFamily: 'var(--font-parent-body)', color: '#5C5347' }}
      >
        {item.body}
      </p>

      {/* Target people */}
      {item.targetPersonNames.length > 0 && (
        <div className="pl-9 mb-4">
          <span
            className="text-[10px]"
            style={{ fontFamily: 'var(--font-parent-body)', color: '#8A8078' }}
          >
            About: {item.targetPersonNames.join(' & ')}
          </span>
        </div>
      )}

      {/* Feedback area */}
      {feedbackState === 'idle' && (
        <div className="flex gap-2 pl-9">
          {REACTIONS.map(({ reaction, emoji, label }) => (
            <button
              key={reaction}
              onClick={() => handleReaction(reaction)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-black/[0.03] transition-all text-xs"
              style={{
                fontFamily: 'var(--font-parent-body)',
                color: '#5C5347',
                border: '1px solid rgba(255,255,255,0.4)',
                background: 'rgba(255,255,255,0.5)',
              }}
              title={label}
            >
              <span>{emoji}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Impact selector (after positive reaction) */}
      {feedbackState === 'reacted' && isPositive && (
        <div className="pl-9">
          <p
            className="text-[10px] mb-2"
            style={{ fontFamily: 'var(--font-parent-body)', color: '#8A8078' }}
          >
            How much impact?
          </p>
          <div className="flex gap-2">
            {IMPACT_LABELS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleImpact(value)}
                className="px-3 py-2 rounded-full text-xs transition-all"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  background: selectedImpact === value
                    ? '#3A3530'
                    : 'rgba(255,255,255,0.5)',
                  color: selectedImpact === value
                    ? '#FFFFFF'
                    : '#5C5347',
                  border: `1px solid ${
                    selectedImpact === value
                      ? '#3A3530'
                      : 'rgba(255,255,255,0.4)'
                  }`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Submitting / Done states */}
      {feedbackState === 'submitting' && (
        <div className="pl-9">
          <span
            className="text-xs"
            style={{ fontFamily: 'var(--font-parent-body)', color: '#8A8078' }}
          >
            Saving...
          </span>
        </div>
      )}

      {feedbackState === 'done' && (
        <div className="pl-9">
          <span
            className="text-xs font-medium"
            style={{ fontFamily: 'var(--font-parent-body)', color: '#16a34a' }}
          >
            {selectedReaction === 'not_now' ? 'Saved for later' : 'Got it, thanks!'}
          </span>
        </div>
      )}
    </div>
  );
}
