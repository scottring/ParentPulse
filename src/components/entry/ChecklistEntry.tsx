'use client';

import type { ChecklistContent } from '@/types/entry';

interface ChecklistEntryProps {
  content: ChecklistContent;
  onToggle?: (itemId: string, checked: boolean) => void;
}

export function ChecklistEntry({ content, onToggle }: ChecklistEntryProps) {
  return (
    <div className="space-y-2">
      {content.frequency && (
        <span className="text-xs text-stone-400 uppercase tracking-wider">{content.frequency}</span>
      )}
      <ul className="space-y-1.5">
        {content.items.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <button
              onClick={() => onToggle?.(item.id, !item.checked)}
              disabled={!onToggle}
              className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                item.checked
                  ? 'bg-stone-900 border-stone-900 text-white'
                  : 'border-stone-300 hover:border-stone-400'
              } ${!onToggle ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {item.checked && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <span className={`text-sm ${item.checked ? 'text-stone-400 line-through' : 'text-stone-600'}`}>
                {item.label}
              </span>
              {item.time && (
                <span className="text-xs text-stone-400 ml-2">{item.time}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
