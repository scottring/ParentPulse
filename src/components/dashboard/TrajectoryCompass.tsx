'use client';

import { ScoreTrend } from '@/types/ring-scores';
import InstrumentBezel from './InstrumentBezel';

interface TrajectoryCompassProps {
  trend: ScoreTrend;
  primaryDimension?: string;
}

const TREND_CONFIG: Record<ScoreTrend, { rotation: number; label: string; color: string }> = {
  improving: { rotation: -45, label: 'IMPROVING', color: '#16a34a' },
  stable: { rotation: 0, label: 'STABLE', color: '#d97706' },
  declining: { rotation: 45, label: 'DECLINING', color: '#dc2626' },
  insufficient_data: { rotation: 0, label: 'GATHERING', color: '#6b7280' },
};

export default function TrajectoryCompass({ trend, primaryDimension }: TrajectoryCompassProps) {
  const config = TREND_CONFIG[trend];

  return (
    <InstrumentBezel title="TRAJECTORY" compact>
      <div className="flex flex-col items-center py-3 px-4">
        {/* Compass */}
        <div className="relative w-16 h-16 mb-2">
          {/* Compass ring */}
          <svg viewBox="0 0 64 64" className="w-full h-full">
            <circle
              cx="32" cy="32" r="28"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="2"
            />
            {/* Tick marks */}
            {[0, 90, 180, 270].map((angle) => {
              const rad = ((angle - 90) * Math.PI) / 180;
              const x1 = 32 + 24 * Math.cos(rad);
              const y1 = 32 + 24 * Math.sin(rad);
              const x2 = 32 + 28 * Math.cos(rad);
              const y2 = 32 + 28 * Math.sin(rad);
              return (
                <line
                  key={angle}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1.5"
                />
              );
            })}
            {/* Needle */}
            <g
              style={{
                transform: `rotate(${config.rotation}deg)`,
                transformOrigin: '32px 32px',
                transition: 'transform 1s ease-in-out',
              }}
            >
              <line
                x1="32" y1="32" x2="32" y2="10"
                stroke={config.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{
                  filter: `drop-shadow(0 0 3px ${config.color})`,
                }}
              />
              <circle
                cx="32" cy="32" r="3"
                fill={config.color}
                style={{
                  filter: `drop-shadow(0 0 4px ${config.color})`,
                }}
              />
            </g>
          </svg>
        </div>

        {/* Label */}
        <span
          className="font-mono text-[10px] font-bold tracking-widest"
          style={{ color: config.color }}
        >
          {config.label}
        </span>

        {/* Current focus dimension */}
        {primaryDimension && (
          <span
            className="font-mono text-[9px] mt-1 text-center"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            {primaryDimension}
          </span>
        )}
      </div>
    </InstrumentBezel>
  );
}
