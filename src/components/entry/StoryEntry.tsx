'use client';

import type { StoryContent } from '@/types/entry';

interface StoryEntryProps {
  content: StoryContent;
}

export function StoryEntry({ content }: StoryEntryProps) {
  return (
    <div className="space-y-3">
      {content.theme && (
        <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-full">
          {content.theme}
        </span>
      )}
      <div className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">
        {content.body}
      </div>
      {content.characterName && (
        <p className="text-xs text-stone-400 italic">
          Featuring: {content.characterName}
        </p>
      )}
    </div>
  );
}
