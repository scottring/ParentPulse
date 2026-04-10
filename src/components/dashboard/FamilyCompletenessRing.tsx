'use client';

import { FamilyCompleteness } from '@/lib/freshness-engine';

interface Props {
  completeness: FamilyCompleteness;
  dark?: boolean;
}

const SEGMENTS = [
  { key: 'coverage', label: 'Coverage', color: '#7C9082' },
  { key: 'freshness', label: 'Freshness', color: '#D4A574' },
  { key: 'depth', label: 'Depth', color: '#2D5F5D' },
] as const;

/**
 * SVG donut ring showing family data completeness across 3 dimensions.
 */
export function FamilyCompletenessRing({ completeness, dark }: Props) {
  const { overallPercent, coverage, freshness, depth } = completeness;
  const values = { coverage, freshness, depth };

  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gapAngle = 8; // degrees between segments
  const totalGap = gapAngle * 3;
  const availableDegrees = 360 - totalGap;
  const segmentDegrees = availableDegrees / 3;

  let currentAngle = -90; // start from top

  const textColor = dark ? 'rgba(255,255,255,0.95)' : '#3A3530';
  const textSecondary = dark ? 'rgba(255,255,255,0.5)' : '#5F564B';
  const trackColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';

  return (
    <div className="flex items-center gap-5">
      {/* Ring */}
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />

          {/* Segments */}
          {SEGMENTS.map((seg) => {
            const value = values[seg.key];
            const segLength = (segmentDegrees / 360) * circumference;
            const filledLength = segLength * Math.min(value, 1);
            const dashArray = `${filledLength} ${circumference - filledLength}`;
            const rotation = currentAngle;
            currentAngle += segmentDegrees + gapAngle;

            return (
              <circle
                key={seg.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={dashArray}
                strokeDashoffset={0}
                transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
                style={{ opacity: value > 0 ? 1 : 0.2, transition: 'stroke-dasharray 0.6s ease' }}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          <span
            style={{
              fontFamily: 'var(--font-parent-display)',
              fontSize: '33px',
              fontWeight: 400,
              color: textColor,
              lineHeight: 1,
            }}
          >
            {overallPercent}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-parent-body)',
              fontSize: '13px',
              fontWeight: 500,
              color: textSecondary,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            percent
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {SEGMENTS.map((seg) => {
          const value = values[seg.key];
          const percent = Math.round(value * 100);
          return (
            <div key={seg.key} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: seg.color, opacity: value > 0 ? 1 : 0.3 }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '19px',
                  color: textSecondary,
                }}
              >
                {seg.label}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '19px',
                  fontWeight: 600,
                  color: textColor,
                }}
              >
                {percent}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
