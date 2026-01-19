'use client';

import { QuestionOption } from '@/config/onboarding-questions';
import { useState } from 'react';

interface MultipleChoiceQuestionProps {
  options: QuestionOption[];
  value: string | undefined;
  onChange: (value: string) => void;
}

export function MultipleChoiceQuestion({ options, value, onChange }: MultipleChoiceQuestionProps) {
  const [hoveredValue, setHoveredValue] = useState<string | null>(null);

  return (
    <div className="space-y-3 animate-fade-in-up">
      {options.map((option) => {
        const isSelected = value === option.value;
        const isHovered = hoveredValue === option.value;

        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(String(option.value))}
            onMouseEnter={() => setHoveredValue(String(option.value))}
            onMouseLeave={() => setHoveredValue(null)}
            className={`
              w-full text-left px-6 py-5 rounded-xl border-2 transition-all duration-200
              ${isSelected ? 'scale-[1.02] shadow-lg' : 'hover:scale-[1.02]'}
              ${isSelected || isHovered ? 'shadow-md' : ''}
            `}
            style={{
              borderColor: isSelected ? 'var(--parent-accent)' : 'var(--parent-border)',
              backgroundColor: isSelected ? 'var(--parent-card)' : 'transparent',
            }}
            autoFocus={option.value === options[0].value}
          >
            <div className="flex items-start gap-4">
              {/* Radio indicator */}
              <div
                className={`
                  mt-1 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                  transition-all
                `}
                style={{
                  backgroundColor: isSelected ? 'var(--parent-accent)' : 'transparent',
                  border: `2px solid ${isSelected ? 'var(--parent-accent)' : 'var(--parent-border)'}`,
                }}
              >
                {isSelected && (
                  <div className="w-3 h-3 rounded-full bg-white"></div>
                )}
              </div>

              {/* Label and description */}
              <div className="flex-1">
                <div
                  className="text-lg font-semibold mb-1"
                  style={{ color: isSelected ? 'var(--parent-accent)' : 'var(--parent-text)' }}
                >
                  {option.label}
                </div>
                {option.description && (
                  <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                    {option.description}
                  </div>
                )}
              </div>

              {/* Selection checkmark */}
              {isSelected && (
                <div className="flex-shrink-0" style={{ color: 'var(--parent-accent)' }}>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
