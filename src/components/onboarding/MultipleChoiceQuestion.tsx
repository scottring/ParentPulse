'use client';

import { QuestionOption } from '@/config/onboarding-questions';
import { useState } from 'react';

interface MultipleChoiceQuestionProps {
  options: QuestionOption[];
  value: string | undefined;
  onChange: (value: string) => void;
}

export function MultipleChoiceQuestion({
  options,
  value,
  onChange,
}: MultipleChoiceQuestionProps) {
  const [hoveredValue, setHoveredValue] = useState<string | null>(null);

  return (
    <div>
      {options.map((option, i) => {
        const isSelected = value === String(option.value);
        const isHovered = hoveredValue === String(option.value);

        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(String(option.value))}
            onMouseEnter={() => setHoveredValue(String(option.value))}
            onMouseLeave={() => setHoveredValue(null)}
            className="w-full text-left"
            style={{
              background: 'transparent',
              border: 0,
              padding: '18px 0',
              borderBottom:
                i === options.length - 1
                  ? 'none'
                  : '1px solid rgba(200,190,172,0.4)',
              cursor: 'pointer',
              paddingLeft: isSelected || isHovered ? 14 : 0,
              transition: 'padding-left 0.18s ease',
            }}
            autoFocus={option.value === options[0].value}
          >
            <div className="flex items-baseline" style={{ gap: 16 }}>
              {/* Number marker */}
              <span
                className="press-chapter-label"
                style={{
                  width: 24,
                  flexShrink: 0,
                  color: isSelected ? '#2D5F5D' : '#6B6254',
                }}
              >
                {i + 1}.
              </span>

              {/* Label + description */}
              <div className="flex-1">
                <h3
                  style={{
                    fontFamily: 'var(--font-parent-display)',
                    fontSize: 20,
                    fontStyle: 'italic',
                    color: isSelected ? '#3A3530' : '#5C5347',
                    fontWeight: isSelected ? 500 : 400,
                    lineHeight: 1.2,
                    margin: 0,
                  }}
                >
                  {option.label}
                </h3>
                {option.description && (
                  <p
                    className="press-marginalia mt-1"
                    style={{ fontSize: 14, lineHeight: 1.5 }}
                  >
                    {option.description}
                  </p>
                )}
              </div>

              {/* Selected marker */}
              {isSelected && (
                <span
                  style={{
                    fontFamily: 'var(--font-parent-display)',
                    fontStyle: 'italic',
                    color: '#2D5F5D',
                    fontSize: 17,
                    flexShrink: 0,
                  }}
                >
                  ✓
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
