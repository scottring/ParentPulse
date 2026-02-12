'use client';

import type { ActivityContent } from '@/types/entry';

interface ActivityEntryProps {
  content: ActivityContent;
}

export function ActivityEntry({ content }: ActivityEntryProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-600 leading-relaxed">{content.instructions}</p>

      <div className="flex flex-wrap gap-2">
        {content.duration && (
          <span className="text-xs px-2 py-1 bg-stone-50 border border-stone-200 rounded-full text-stone-500">
            {content.duration}
          </span>
        )}
        {content.ageRange && (
          <span className="text-xs px-2 py-1 bg-stone-50 border border-stone-200 rounded-full text-stone-500">
            Ages {content.ageRange.min}&ndash;{content.ageRange.max}
          </span>
        )}
      </div>

      {content.materials && content.materials.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-stone-500 mb-1">Materials needed</h5>
          <ul className="flex flex-wrap gap-1.5">
            {content.materials.map((m, i) => (
              <li key={i} className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-lg">
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {content.completed && (
        <p className="text-xs text-emerald-600 font-medium">Completed!</p>
      )}
    </div>
  );
}
