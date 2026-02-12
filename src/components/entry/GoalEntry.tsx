'use client';

import type { GoalContent } from '@/types/entry';

interface GoalEntryProps {
  content: GoalContent;
}

export function GoalEntry({ content }: GoalEntryProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-600 leading-relaxed">{content.description}</p>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-stone-400">Progress</span>
          <span className="text-xs font-medium text-stone-600">{content.progress}%</span>
        </div>
        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-stone-700 rounded-full transition-all duration-300"
            style={{ width: `${content.progress}%` }}
          />
        </div>
      </div>

      {content.targetDate && (
        <p className="text-xs text-stone-400">
          Target: {new Date(content.targetDate).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
