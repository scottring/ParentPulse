'use client';

import type { DiscussionContent } from '@/types/entry';

interface DiscussionEntryProps {
  content: DiscussionContent;
}

const AUDIENCE_LABELS = {
  family: 'For the whole family',
  couple: 'For the couple',
  'parent-child': 'Parent & child',
};

export function DiscussionEntry({ content }: DiscussionEntryProps) {
  return (
    <div className="space-y-4">
      <div>
        <span className="text-xs text-stone-400 uppercase tracking-wider">
          {AUDIENCE_LABELS[content.targetAudience]}
        </span>
        <p className="text-sm text-stone-700 font-medium mt-1">{content.prompt}</p>
      </div>

      {content.suggestedScript && (
        <div className="bg-stone-50 rounded-lg p-4">
          <h5 className="text-xs font-medium text-stone-500 mb-1">Conversation starter</h5>
          <p className="text-sm text-stone-600 italic leading-relaxed">{content.suggestedScript}</p>
        </div>
      )}

      {content.responses && content.responses.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-stone-500">Responses</h5>
          {content.responses.map((r, i) => (
            <div key={i} className="pl-3 border-l-2 border-stone-200">
              <p className="text-xs font-medium text-stone-500">{r.personName}</p>
              <p className="text-sm text-stone-600">{r.response}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
