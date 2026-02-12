'use client';

import { useState } from 'react';
import type { Entry } from '@/types/entry';
import type { Yearbook } from '@/types/yearbook';
import { EntryCard } from '../entry/EntryCard';

interface YearbookViewProps {
  yearbook: Yearbook;
  entries: Entry[];
  personId: string;
  onUpdateEntry?: (entryId: string, updates: Partial<Entry>) => void;
  onGenerate?: () => void;
  isGenerating?: boolean;
}

type FilterType = 'all' | 'story' | 'activity' | 'checklist' | 'reflection' | 'discussion' | 'goal' | 'milestone';

export function YearbookView({
  yearbook,
  entries,
  personId,
  onUpdateEntry,
  onGenerate,
  isGenerating,
}: YearbookViewProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredEntries = filter === 'all'
    ? entries
    : entries.filter(e => e.type === filter);

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'story', label: 'Stories' },
    { value: 'activity', label: 'Activities' },
    { value: 'checklist', label: 'Checklists' },
    { value: 'reflection', label: 'Reflections' },
    { value: 'discussion', label: 'Discussions' },
    { value: 'goal', label: 'Goals' },
    { value: 'milestone', label: 'Milestones' },
  ];

  return (
    <div className="space-y-6">
      {/* Year + generate */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-700 heading">{yearbook.year}</h2>
        {onGenerate && (
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="px-4 py-2 bg-stone-900 text-white text-sm rounded-xl hover:bg-stone-800 disabled:opacity-50 transition-colors"
          >
            {isGenerating ? 'Generating...' : 'Generate new content'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {filterOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
              filter === opt.value
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Entries */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-stone-400 text-sm">
            {filter === 'all'
              ? 'No entries yet. Generate some content to get started.'
              : `No ${filter} entries yet.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map(entry => (
            <EntryCard
              key={entry.entryId}
              entry={entry}
              personId={personId}
              onUpdate={onUpdateEntry}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}
