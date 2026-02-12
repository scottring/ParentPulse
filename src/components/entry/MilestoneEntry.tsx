'use client';

import type { MilestoneContent } from '@/types/entry';

interface MilestoneEntryProps {
  content: MilestoneContent;
}

export function MilestoneEntry({ content }: MilestoneEntryProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-600 leading-relaxed">{content.description}</p>

      {content.achievedDate && (
        <p className="text-xs text-stone-400">
          Achieved: {new Date(content.achievedDate).toLocaleDateString()}
        </p>
      )}

      {content.celebrationNote && (
        <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
          <p className="text-sm text-amber-800">{content.celebrationNote}</p>
        </div>
      )}
    </div>
  );
}
