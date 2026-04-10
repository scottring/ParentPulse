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

  const scalePoints = Array.from(
    { length: scale.max - scale.min + 1 },
    (_, i) => scale.min + i,
  );

  const getLabel = (point: number): string => {
    if (point === scale.min) return scale.minLabel;
    if (point === scale.max) return scale.maxLabel;
    if (scale.midLabel && point === Math.floor((scale.min + scale.max) / 2)) {
      return scale.midLabel;
    }
    return '';
  };

  return (
    <div>
      {/* Scale row — quiet, editorial, no chunky borders */}
      <div
        className="flex items-stretch justify-between"
        style={{ gap: 12, marginBottom: 22 }}
      >
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
              className="flex-1 transition-all"
              style={{
                background: 'transparent',
                border: 0,
                padding: '16px 8px 14px',
                borderBottom: `2px solid ${
                  isSelected
                    ? '#2D5F5D'
                    : isHovered
                      ? 'rgba(45,95,93,0.35)'
                      : 'rgba(200,190,172,0.55)'
                }`,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
              autoFocus={point === scale.min}
            >
              <div className="flex flex-col items-center" style={{ gap: 10 }}>
                {/* Number */}
                <span
                  style={{
                    fontFamily: 'var(--font-parent-display)',
                    fontStyle: 'italic',
                    fontSize: 24,
                    fontWeight: 300,
                    lineHeight: 1,
                    color: isSelected
                      ? '#2D5F5D'
                      : isHovered
                        ? '#5C5347'
                        : '#746856',
                    transition: 'color 0.18s ease',
                  }}
                >
                  {point}
                </span>
                {/* Label if present */}
                {label && (
                  <span
                    className="text-center"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: 13,
                      fontWeight: 600,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: isSelected
                        ? '#2D5F5D'
                        : isHovered
                          ? '#5C5347'
                          : '#6B6254',
                      lineHeight: 1.35,
                      transition: 'color 0.18s ease',
                    }}
                  >
                    {label}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile-only min/max labels */}
      <div
        className="flex sm:hidden justify-between press-marginalia"
        style={{ fontSize: 14, marginTop: 6 }}
      >
        <span>{scale.minLabel}</span>
        <span>{scale.maxLabel}</span>
      </div>

      {/* Selected value echo */}
      {value !== undefined && (
        <p
          className="press-body-italic"
          style={{
            fontSize: 14,
            textAlign: 'center',
            color: '#5C5347',
            marginTop: 4,
          }}
        >
          — {getLabel(value) || `selected: ${value}`}
        </p>
      )}
    </div>
  );
}
