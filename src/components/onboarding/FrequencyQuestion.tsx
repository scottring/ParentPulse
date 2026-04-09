'use client';

import { ScaleConfig } from '@/config/onboarding-questions';
import { useState } from 'react';

interface FrequencyQuestionProps {
  scale: ScaleConfig;
  value: number | undefined;
  onChange: (value: number) => void;
}

function toRoman(n: number): string {
  if (n < 1) return '0';
  const map: Array<[number, string]> = [
    [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i'],
  ];
  let result = '';
  let num = n;
  for (const [value, numeral] of map) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
}

export function FrequencyQuestion({ scale, value, onChange }: FrequencyQuestionProps) {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);

  const scalePoints = Array.from(
    { length: scale.max - scale.min + 1 },
    (_, i) => scale.min + i,
  );

  const getLabel = (point: number): string => {
    if (point === scale.min) return scale.minLabel;
    if (point === scale.max) return scale.maxLabel;
    if (scale.type === 'semantic') {
      const labels = [scale.minLabel];
      const steps = scale.max - scale.min;
      if (steps === 4) {
        labels.push('Rarely', 'Sometimes', 'Often', scale.maxLabel);
      } else if (steps === 3) {
        labels.push('Occasionally', 'Frequently', scale.maxLabel);
      } else if (steps === 2) {
        labels.push('Sometimes', scale.maxLabel);
      }
      return labels[point - scale.min] || point.toString();
    }
    return point.toString();
  };

  return (
    <div>
      {/* Frequency options — vertical list of quiet italic choices */}
      <div>
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
              className="w-full text-left"
              style={{
                background: 'transparent',
                border: 0,
                padding: '18px 0',
                borderBottom: '1px solid rgba(200,190,172,0.4)',
                cursor: 'pointer',
                paddingLeft: isSelected || isHovered ? 14 : 0,
                transition: 'padding-left 0.18s ease',
              }}
              autoFocus={point === scale.min}
            >
              <div className="flex items-baseline" style={{ gap: 16 }}>
                {/* Roman numeral marker */}
                <span
                  className="press-chapter-label"
                  style={{
                    width: 24,
                    flexShrink: 0,
                    color: isSelected ? '#2D5F5D' : '#6B6254',
                  }}
                >
                  {toRoman(point - scale.min + 1)}.
                </span>

                {/* Label */}
                <span
                  style={{
                    fontFamily: 'var(--font-parent-display)',
                    fontSize: 22,
                    fontStyle: 'italic',
                    color: isSelected ? '#3A3530' : '#5C5347',
                    fontWeight: isSelected ? 500 : 400,
                    lineHeight: 1.2,
                    flex: 1,
                  }}
                >
                  {label}
                </span>

                {/* Selected marker */}
                {isSelected && (
                  <span
                    style={{
                      fontFamily: 'var(--font-parent-display)',
                      fontStyle: 'italic',
                      color: '#2D5F5D',
                      fontSize: 18,
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
    </div>
  );
}
