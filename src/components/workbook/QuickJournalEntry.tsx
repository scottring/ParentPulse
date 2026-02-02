'use client';

import { useState } from 'react';
import {
  TechnicalCard,
  TechnicalButton,
} from '@/components/technical';
import {
  XMarkIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import type { WeeklyJournalEntry, FocusArea } from '@/types/household-workbook';

// ==================== Types ====================

type JournalMood = 'positive' | 'neutral' | 'challenging';

interface QuickJournalEntryProps {
  focusAreas: FocusArea[];
  onSubmit: (entry: Omit<WeeklyJournalEntry, 'entryId' | 'timestamp'>) => void;
  onClose: () => void;
}

interface FloatingJournalButtonProps {
  onClick: () => void;
}

// ==================== Quick Journal Modal ====================

export default function QuickJournalEntry({
  focusAreas,
  onSubmit,
  onClose,
}: QuickJournalEntryProps) {
  const [content, setContent] = useState('');
  const [selectedFocusAreaId, setSelectedFocusAreaId] = useState<string | undefined>();
  const [mood, setMood] = useState<JournalMood>('neutral');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = () => {
    if (!content.trim()) return;

    onSubmit({
      content: content.trim(),
      relatedFocusAreaId: selectedFocusAreaId,
      mood,
      tags: tags.length > 0 ? tags : undefined,
    });

    onClose();
  };

  const handleAddTag = () => {
    const newTag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && tagInput) {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <TechnicalCard shadowSize="lg" className="w-full max-w-lg bg-white overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-mono font-bold text-sm uppercase tracking-wider text-slate-800">
            Quick Journal Entry
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Main Content */}
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What happened? What did you observe? How did it go?"
              className="w-full p-3 border-2 border-slate-200 font-mono text-sm resize-none focus:outline-none focus:border-slate-400"
              rows={4}
              autoFocus
            />
          </div>

          {/* Related Focus Area */}
          {focusAreas.length > 0 && (
            <div>
              <label className="block font-mono text-xs text-slate-500 mb-2">
                THIS RELATES TO:
              </label>
              <select
                value={selectedFocusAreaId || ''}
                onChange={(e) => setSelectedFocusAreaId(e.target.value || undefined)}
                className="w-full p-2 border-2 border-slate-200 font-mono text-sm focus:outline-none focus:border-slate-400"
              >
                <option value="">Not related to a specific area</option>
                {focusAreas.map((area) => (
                  <option key={area.focusAreaId} value={area.focusAreaId}>
                    {area.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mood Selection */}
          <div>
            <label className="block font-mono text-xs text-slate-500 mb-2">
              MOOD:
            </label>
            <div className="flex gap-2">
              {(['positive', 'neutral', 'challenging'] as JournalMood[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMood(m)}
                  className={`
                    flex-1 p-2 border-2 font-mono text-xs uppercase transition-colors
                    ${mood === m
                      ? m === 'positive'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : m === 'neutral'
                          ? 'border-slate-500 bg-slate-50 text-slate-700'
                          : 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-slate-200 hover:border-slate-300'
                    }
                  `}
                >
                  {m === 'positive' && '😊 Positive'}
                  {m === 'neutral' && '😐 Neutral'}
                  {m === 'challenging' && '😤 Challenging'}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block font-mono text-xs text-slate-500 mb-2">
              TAGS (OPTIONAL):
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 font-mono text-xs"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a tag..."
                className="flex-1 p-2 border-2 border-slate-200 font-mono text-sm focus:outline-none focus:border-slate-400"
              />
              <TechnicalButton
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
              >
                ADD
              </TechnicalButton>
            </div>
            {/* Suggested Tags */}
            <div className="flex flex-wrap gap-1 mt-2">
              {getSuggestedTags(focusAreas, selectedFocusAreaId).map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    if (!tags.includes(tag)) {
                      setTags([...tags, tag]);
                    }
                  }}
                  disabled={tags.includes(tag)}
                  className={`
                    px-2 py-0.5 font-mono text-[10px] border
                    ${tags.includes(tag)
                      ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                      : 'border-slate-200 text-slate-500 hover:border-slate-400'
                    }
                  `}
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <TechnicalButton variant="outline" onClick={onClose}>
            CANCEL
          </TechnicalButton>
          <TechnicalButton
            variant="primary"
            onClick={handleSubmit}
            disabled={!content.trim()}
          >
            SAVE ENTRY
          </TechnicalButton>
        </div>
      </TechnicalCard>
    </div>
  );
}

// ==================== Floating Button ====================

export function FloatingJournalButton({ onClick }: FloatingJournalButtonProps) {
  return (
    <button
      onClick={onClick}
      className="
        fixed bottom-6 right-6 z-40
        w-14 h-14 rounded-full
        bg-amber-500 hover:bg-amber-600
        text-white shadow-lg
        flex items-center justify-center
        transition-all hover:scale-105
      "
      aria-label="Add journal entry"
    >
      <PlusIcon className="w-6 h-6" />
    </button>
  );
}

// ==================== Helpers ====================

function getSuggestedTags(
  focusAreas: FocusArea[],
  selectedFocusAreaId?: string
): string[] {
  const suggestions: Set<string> = new Set();

  // Common tags
  suggestions.add('progress');
  suggestions.add('challenge');
  suggestions.add('win');

  // Add tags based on selected focus area
  if (selectedFocusAreaId) {
    const area = focusAreas.find((a) => a.focusAreaId === selectedFocusAreaId);
    if (area) {
      // Extract keywords from title
      const words = area.title.toLowerCase().split(/\s+/);
      words.forEach((word) => {
        if (word.length > 3) {
          suggestions.add(word.replace(/[^a-z]/g, ''));
        }
      });

      // Add source type as tag
      suggestions.add(area.sourceType);
    }
  }

  // Add focus area specific tags
  focusAreas.forEach((area) => {
    if (area.sourceType === 'boundary') suggestions.add('boundary-test');
    if (area.sourceType === 'trigger') suggestions.add('trigger-event');
    if (area.sourceType === 'strategy') suggestions.add('strategy-used');
    if (area.sourceType === 'ritual') suggestions.add('ritual');
  });

  return Array.from(suggestions).slice(0, 8);
}
