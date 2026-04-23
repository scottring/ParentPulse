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
 * Typography matches the editorial language of the rest of the page:
 * Cormorant italic for the central number and per-segment percents,
 * DM Sans small-caps eyebrows for the labels and the word "percent".
 */
export function FamilyCompletenessRing({ completeness, dark }: Props) {
  const { overallPercent, coverage, freshness, depth } = completeness;
  const values = { coverage, freshness, depth };

  const size = 132;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gapAngle = 10; // degrees between segments
  const totalGap = gapAngle * 3;
  const availableDegrees = 360 - totalGap;
  const segmentDegrees = availableDegrees / 3;

  let currentAngle = -90; // start from top

  const inkColor = dark ? 'rgba(255,255,255,0.95)' : 'var(--r-ink, #3A3530)';
  const eyebrowColor = dark ? 'rgba(255,255,255,0.55)' : 'var(--r-text-4, #6B6254)';
  const trackColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(60,48,28,0.05)';

  return (
    <div
      className="flex items-center"
      style={{ gap: 28 }}
    >
      {/* Ring */}
      <div
        className="relative flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
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
                style={{
                  opacity: value > 0 ? 1 : 0.18,
                  transition: 'stroke-dasharray 0.6s ease',
                }}
              />
            );
          })}
        </svg>

        {/* Center label — big numeral in Cormorant italic, eyebrow below. */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            style={{
              fontFamily: 'var(--r-serif, var(--font-parent-display))',
              fontStyle: 'italic',
              fontSize: 38,
              fontWeight: 400,
              color: inkColor,
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            {overallPercent}
          </span>
          <span
            style={{
              fontFamily: 'var(--r-sans, var(--font-parent-body))',
              fontSize: 9,
              fontWeight: 700,
              color: eyebrowColor,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              marginTop: 6,
            }}
          >
            percent
          </span>
        </div>
      </div>

      {/* Legend — small-caps eyebrow labels with Cormorant italic
          percentages, vertically aligned against the ring. */}
      <div className="flex flex-col" style={{ gap: 10 }}>
        {SEGMENTS.map((seg) => {
          const value = values[seg.key];
          const percent = Math.round(value * 100);
          return (
            <div
              key={seg.key}
              className="flex items-baseline"
              style={{ gap: 12 }}
            >
              <span
                className="flex-shrink-0"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: seg.color,
                  opacity: value > 0 ? 1 : 0.3,
                  transform: 'translateY(-1px)',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--r-sans, var(--font-parent-body))',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: eyebrowColor,
                  flex: 1,
                  minWidth: 72,
                }}
              >
                {seg.label}
              </span>
              <span
                style={{
                  fontFamily: 'var(--r-serif, var(--font-parent-display))',
                  fontStyle: 'italic',
                  fontSize: 17,
                  fontWeight: 400,
                  color: inkColor,
                  lineHeight: 1,
                  letterSpacing: '-0.01em',
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
