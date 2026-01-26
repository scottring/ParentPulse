'use client';

import { useMemo } from 'react';
import {
  calculateHexagonPoints,
  calculateDataPoints,
  pointsToSvgString,
  generateGridCircles,
  calculateLabelPosition,
} from '@/lib/spiderDiagramUtils';
import { PERSON_MANUAL_LAYERS } from '@/types';
import type { LayerId } from '@/types/assessment';

interface SpiderDiagramProps {
  /** 6 scores, one per layer (1-10 scale) */
  scores: number[];
  /** Optional baseline scores for comparison */
  baselineScores?: number[];
  /** Size of the diagram in pixels */
  size?: number;
  /** Whether to show layer labels */
  showLabels?: boolean;
  /** Whether to show score values on axes */
  showScoreValues?: boolean;
  /** Custom class name */
  className?: string;
}

export function SpiderDiagram({
  scores,
  baselineScores,
  size = 280,
  showLabels = true,
  showScoreValues = false,
  className = '',
}: SpiderDiagramProps) {
  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size / 2 - (showLabels ? 50 : 20);

  // Calculate all diagram elements
  const hexagonPoints = useMemo(
    () => calculateHexagonPoints(centerX, centerY, maxRadius),
    [centerX, centerY, maxRadius]
  );

  const dataPoints = useMemo(
    () => calculateDataPoints(scores, centerX, centerY, maxRadius),
    [scores, centerX, centerY, maxRadius]
  );

  const baselineDataPoints = useMemo(
    () =>
      baselineScores
        ? calculateDataPoints(baselineScores, centerX, centerY, maxRadius)
        : null,
    [baselineScores, centerX, centerY, maxRadius]
  );

  const gridCircles = useMemo(
    () => generateGridCircles(centerX, centerY, maxRadius, 5),
    [centerX, centerY, maxRadius]
  );

  const labelPositions = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) =>
        calculateLabelPosition(i, centerX, centerY, maxRadius, 25)
      ),
    [centerX, centerY, maxRadius]
  );

  // Get friendly layer names
  const layerNames = Object.values(PERSON_MANUAL_LAYERS).map((l: { friendly: string }) => l.friendly);

  // Calculate average score
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full"
        style={{ maxWidth: size, maxHeight: size }}
      >
        {/* Grid circles (background) */}
        {gridCircles.map((circle, i) => (
          <g key={i}>
            {/* Hexagonal grid */}
            <polygon
              points={pointsToSvgString(
                calculateHexagonPoints(centerX, centerY, circle.radius)
              )}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray={i === gridCircles.length - 1 ? '0' : '3,3'}
            />
            {/* Grid value label (only on rightmost point) */}
            {showScoreValues && (
              <text
                x={centerX + circle.radius + 4}
                y={centerY}
                fontSize="9"
                fill="#94a3b8"
                fontFamily="monospace"
              >
                {Math.round(circle.value)}
              </text>
            )}
          </g>
        ))}

        {/* Axis lines from center to each vertex */}
        {hexagonPoints.map((point, i) => (
          <line
            key={i}
            x1={centerX}
            y1={centerY}
            x2={point.x}
            y2={point.y}
            stroke="#cbd5e1"
            strokeWidth="1"
          />
        ))}

        {/* Baseline data polygon (if provided) */}
        {baselineDataPoints && (
          <polygon
            points={pointsToSvgString(baselineDataPoints)}
            fill="rgba(148, 163, 184, 0.2)"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="4,4"
          />
        )}

        {/* Current data polygon */}
        <polygon
          points={pointsToSvgString(dataPoints)}
          fill="rgba(217, 119, 6, 0.25)"
          stroke="#d97706"
          strokeWidth="2"
        />

        {/* Data points */}
        {dataPoints.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#d97706"
            stroke="white"
            strokeWidth="2"
          />
        ))}

        {/* Labels */}
        {showLabels &&
          labelPositions.map((pos, i) => (
            <text
              key={i}
              x={pos.x}
              y={pos.y}
              textAnchor={pos.anchor}
              fontSize="10"
              fontFamily="monospace"
              fontWeight="600"
              fill="#334155"
            >
              {layerNames[i]}
            </text>
          ))}

        {/* Center circle with average */}
        <circle
          cx={centerX}
          cy={centerY}
          r="18"
          fill="#1e293b"
          stroke="#d97706"
          strokeWidth="2"
        />
        <text
          x={centerX}
          y={centerY + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="11"
          fontFamily="monospace"
          fontWeight="bold"
          fill="white"
        >
          {avgScore.toFixed(1)}
        </text>
      </svg>
    </div>
  );
}

/**
 * Compact version of spider diagram for cards/thumbnails
 */
export function SpiderDiagramCompact({
  scores,
  size = 80,
  className = '',
}: {
  scores: number[];
  size?: number;
  className?: string;
}) {
  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size / 2 - 8;

  const hexagonPoints = useMemo(
    () => calculateHexagonPoints(centerX, centerY, maxRadius),
    [centerX, centerY, maxRadius]
  );

  const dataPoints = useMemo(
    () => calculateDataPoints(scores, centerX, centerY, maxRadius),
    [scores, centerX, centerY, maxRadius]
  );

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ width: size, height: size }}
    >
      {/* Outer hexagon */}
      <polygon
        points={pointsToSvgString(hexagonPoints)}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="1"
      />

      {/* Data polygon */}
      <polygon
        points={pointsToSvgString(dataPoints)}
        fill="rgba(217, 119, 6, 0.3)"
        stroke="#d97706"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default SpiderDiagram;
