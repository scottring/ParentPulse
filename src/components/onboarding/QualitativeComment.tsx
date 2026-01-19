'use client';

import { useState } from 'react';

interface QualitativeCommentProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function QualitativeComment({ value, onChange, placeholder }: QualitativeCommentProps) {
  const [isExpanded, setIsExpanded] = useState(!!value);

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="w-full px-6 py-4 rounded-lg border-2 border-dashed transition-all hover:shadow-md text-left"
        style={{
          borderColor: 'var(--parent-border)',
          color: 'var(--parent-text-light)'
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-base sm:text-lg">
            ✍️ Add specific examples or context (optional)
          </span>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-2 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium" style={{ color: 'var(--parent-text)' }}>
          ✍️ Add specific examples or context (optional)
        </label>
        <button
          type="button"
          onClick={() => {
            setIsExpanded(false);
            onChange('');
          }}
          className="text-sm px-3 py-1 rounded transition-all hover:shadow-sm"
          style={{
            border: '1px solid var(--parent-border)',
            color: 'var(--parent-text-light)'
          }}
        >
          Clear
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Describe specific situations, examples, or additional context...'}
        rows={4}
        className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-4 transition-all text-base sm:text-lg"
        style={{
          borderColor: 'var(--parent-border)',
          backgroundColor: 'var(--parent-bg)',
          color: 'var(--parent-text)',
          resize: 'vertical'
        }}
        autoFocus
      />
    </div>
  );
}
