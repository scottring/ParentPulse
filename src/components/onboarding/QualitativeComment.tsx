'use client';

import { useState } from 'react';

interface QualitativeCommentProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function QualitativeComment({
  value,
  onChange,
  placeholder,
}: QualitativeCommentProps) {
  const [isExpanded, setIsExpanded] = useState(!!value);

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="press-link-sm"
        style={{
          background: 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: 14,
        }}
      >
        — add a specific example or note ⟶
      </button>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="press-chapter-label">
          A specific example or note
        </span>
        <button
          type="button"
          onClick={() => {
            setIsExpanded(false);
            onChange('');
          }}
          className="press-marginalia"
          style={{
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
            fontSize: 15,
            color: '#7A6E5C',
          }}
        >
          clear
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'A situation, a moment, or a detail that clarifies your answer…'}
        rows={3}
        className="w-full focus:outline-none"
        style={{
          fontFamily: 'var(--font-parent-display)',
          fontSize: 17,
          fontStyle: 'italic',
          color: '#3A3530',
          background: 'transparent',
          border: 0,
          borderBottom: '1px solid rgba(200, 190, 172, 0.6)',
          padding: '8px 2px 10px',
          resize: 'none',
          lineHeight: 1.55,
        }}
        autoFocus
      />
    </div>
  );
}
