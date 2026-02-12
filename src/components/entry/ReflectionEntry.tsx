'use client';

import type { ReflectionContent } from '@/types/entry';

interface ReflectionEntryProps {
  content: ReflectionContent;
}

const SENTIMENT_STYLES = {
  positive: 'bg-emerald-50 text-emerald-700',
  neutral: 'bg-stone-50 text-stone-500',
  difficult: 'bg-amber-50 text-amber-700',
};

export function ReflectionEntry({ content }: ReflectionEntryProps) {
  return (
    <div className="space-y-3">
      <div className="bg-stone-50 rounded-lg p-4">
        <p className="text-sm text-stone-700 italic">&ldquo;{content.prompt}&rdquo;</p>
      </div>

      {content.response ? (
        <p className="text-sm text-stone-600 leading-relaxed">{content.response}</p>
      ) : (
        <p className="text-sm text-stone-400 italic">No response yet. Take a moment to reflect.</p>
      )}

      {content.sentiment && (
        <span className={`inline-block text-xs px-2 py-1 rounded-full ${SENTIMENT_STYLES[content.sentiment]}`}>
          {content.sentiment}
        </span>
      )}
    </div>
  );
}
