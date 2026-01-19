'use client';

import { ScaleConfig } from '@/config/onboarding-questions';
import { useState } from 'react';

interface LikertScaleQuestionProps {
  scale: ScaleConfig;
  value: number | undefined;
  onChange: (value: number) => void;
}

export function LikertScaleQuestion({ scale, value, onChange }: LikertScaleQuestionProps) {
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
    if (scale.midLabel && point === Math.floor((scale.min + scale.max) / 2)) {
      return scale.midLabel;
    }
    return scale.type === 'numeric' ? point.toString() : '';
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Scale buttons - LARGE and prominent */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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
                flex-1 px-4 sm:px-6 py-4 sm:py-6 rounded-xl border-2 transition-all duration-200
                ${isSelected ? 'scale-105 shadow-lg' : 'hover:scale-105'}
                ${isSelected || isHovered ? 'shadow-md' : ''}
              `}
              style={{
                borderColor: isSelected ? 'var(--parent-accent)' : 'var(--parent-border)',
                backgroundColor: isSelected ? 'var(--parent-card)' : 'transparent',
                color: isSelected ? 'var(--parent-accent)' : 'var(--parent-text)'
              }}
              autoFocus={point === scale.min}
            >
              <div className="flex flex-col items-center gap-2">
                {/* Number or dot */}
                <div
                  className={`
                    w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center
                    text-xl sm:text-2xl font-bold transition-all
                  `}
                  style={{
                    backgroundColor: isSelected
                      ? 'var(--parent-accent)'
                      : isHovered
                      ? 'var(--parent-border)'
                      : 'transparent',
                    color: isSelected ? 'white' : 'var(--parent-text)',
                    border: `2px solid ${isSelected ? 'var(--parent-accent)' : 'var(--parent-border)'}`
                  }}
                >
                  {scale.type === 'numeric' ? point : '●'}
                </div>

                {/* Label (if exists) */}
                {label && label !== point.toString() && (
                  <span className="text-sm sm:text-base font-medium text-center leading-tight">
                    {label}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Min/Max labels below scale (for mobile) */}
      <div className="flex sm:hidden justify-between text-sm" style={{ color: 'var(--parent-text-light)' }}>
        <span>{scale.minLabel}</span>
        <span>{scale.maxLabel}</span>
      </div>

      {/* Selected value indicator */}
      {value !== undefined && (
        <div className="text-center text-lg font-medium animate-fade-in" style={{ color: 'var(--parent-accent)' }}>
          {getLabel(value) || `Selected: ${value}`}
        </div>
      )}
    </div>
  );
}
