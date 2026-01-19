'use client';

import { ScaleConfig } from '@/config/onboarding-questions';
import { useState } from 'react';

interface FrequencyQuestionProps {
  scale: ScaleConfig;
  value: number | undefined;
  onChange: (value: number) => void;
}

export function FrequencyQuestion({ scale, value, onChange }: FrequencyQuestionProps) {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);

  // Generate scale points
  const scalePoints = Array.from(
    { length: scale.max - scale.min + 1 },
    (_, i) => scale.min + i
  );

  // Get label for a scale point
  const getLabel = (point: number): string => {
    if (point === scale.min) return scale.minLabel;
    if (point === scale.max) return scale.maxLabel;
    // For frequency scales, typically: Never(0), Rarely(1), Sometimes(2), Often(3), Always(4)
    if (scale.type === 'semantic') {
      const labels = [scale.minLabel];
      const steps = scale.max - scale.min;
      if (steps === 4) {
        // 5-point scale
        labels.push('Rarely', 'Sometimes', 'Often', scale.maxLabel);
      } else if (steps === 3) {
        // 4-point scale
        labels.push('Occasionally', 'Frequently', scale.maxLabel);
      } else if (steps === 2) {
        // 3-point scale
        labels.push('Sometimes', scale.maxLabel);
      }
      return labels[point - scale.min] || point.toString();
    }
    return point.toString();
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Frequency options - LARGE vertical buttons on mobile, horizontal on desktop */}
      <div className="flex flex-col sm:flex-row gap-3">
        {scalePoints.map((point) => {
          const label = getLabel(point);
          const isSelected = value === point;
          const isHovered = hoveredValue === point;

          return (
            <button
              key={point}
              type="button"
              onClick={() => onChange(point)}
              onMouseEnter={() => setHoveredValue(point)}
              onMouseLeave={() => setHoveredValue(null)}
              className={`
                flex-1 px-6 py-5 sm:py-6 rounded-xl border-2 transition-all duration-200
                ${isSelected ? 'scale-105 shadow-lg' : 'hover:scale-105'}
                ${isSelected || isHovered ? 'shadow-md' : ''}
              `}
              style={{
                borderColor: isSelected ? 'var(--parent-accent)' : 'var(--parent-border)',
                backgroundColor: isSelected ? 'var(--parent-card)' : 'transparent',
              }}
              autoFocus={point === scale.min}
            >
              <div className="flex flex-col items-center gap-2">
                {/* Label - LARGE text */}
                <span
                  className="text-xl sm:text-2xl font-semibold text-center leading-tight"
                  style={{ color: isSelected ? 'var(--parent-accent)' : 'var(--parent-text)' }}
                >
                  {label}
                </span>

                {/* Selection indicator */}
                {isSelected && (
                  <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--parent-accent)' }}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="font-medium">Selected</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
