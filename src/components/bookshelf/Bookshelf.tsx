'use client';

import type { Manual } from '@/types/manual';
import { ManualSpine } from './ManualSpine';

interface BookshelfProps {
  manuals: Manual[];
  onAddManual?: () => void;
}

export function Bookshelf({ manuals, onAddManual }: BookshelfProps) {
  return (
    <div className="animate-fade-in">
      {/* Shelf */}
      <div className="relative">
        {/* Book row */}
        <div className="flex items-end gap-4 px-4 pb-3 min-h-[220px] overflow-x-auto">
          {manuals.map((manual) => (
            <ManualSpine key={manual.manualId} manual={manual} />
          ))}

          {/* Add manual button */}
          {onAddManual && (
            <button
              onClick={onAddManual}
              className="w-[100px] h-[180px] rounded-lg border-2 border-dashed border-stone-300
                flex flex-col items-center justify-center gap-2 text-stone-400
                hover:border-stone-400 hover:text-stone-500 transition-colors shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              <span className="text-xs">Add manual</span>
            </button>
          )}
        </div>

        {/* Shelf surface */}
        <div className="h-3 bg-gradient-to-b from-amber-800/30 to-amber-900/20 rounded-b-sm" />
        <div className="h-1 bg-amber-900/10" />
      </div>

      {manuals.length === 0 && (
        <div className="text-center mt-8">
          <p className="text-stone-400 text-sm">
            Your bookshelf is empty. Complete onboarding to create your first manual.
          </p>
        </div>
      )}
    </div>
  );
}
