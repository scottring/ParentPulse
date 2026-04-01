'use client';

import { useMemo } from 'react';
import { OverallHealth, PerspectiveType } from '@/types/ring-scores';
import { DimensionDomain } from '@/config/relationship-dimensions';
import { scoreToColor } from '@/lib/scoring-engine';

interface ThreeRingDiagramProps {
  health: OverallHealth;
  onZoneClick?: (domain: DimensionDomain, perspective: PerspectiveType) => void;
}

// Filled pie wedge path
function describePieWedge(
  cx: number, cy: number,
  innerR: number, outerR: number,
  startAngle: number, endAngle: number,
): string {
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

function polarToCartesian(
  cx: number, cy: number,
  radius: number, angleDeg: number,
) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

// 3 domains, each 120°
const DOMAIN_LAYOUT: { domain: DimensionDomain; startAngle: number; label: string }[] = [
  { domain: 'self', startAngle: 0, label: 'SELF' },
  { domain: 'couple', startAngle: 120, label: 'SPOUSE' },
  { domain: 'parent_child', startAngle: 240, label: 'PARENT' },
];

// Within each 120° domain: Self ~40%, Spouse ~40%, Kids ~20%
const PERSPECTIVE_SPLITS: { perspective: PerspectiveType; fraction: number }[] = [
  { perspective: 'self', fraction: 0.4 },
  { perspective: 'spouse', fraction: 0.4 },
  { perspective: 'kids', fraction: 0.2 },
];

const PERSPECTIVE_LABELS: Record<PerspectiveType, string> = {
  self: 'Self',
  spouse: 'Spouse',
  kids: 'Kids',
};

export default function ThreeRingDiagram({ health, onZoneClick }: ThreeRingDiagramProps) {
  const cx = 300;
  const cy = 200;
  const outerRadius = 175;       // outer edge of perspective zones
  const middleRadius = 120;      // boundary between outer zones and middle ring
  const centerRadius = 70;       // boundary between middle ring and center (flush)
  const domainGap = 2;
  const perspGap = 0;

  // Build the 9 outer zones
  const outerZones = useMemo(() => {
    const zones: {
      domain: DimensionDomain;
      perspective: PerspectiveType;
      score: number;
      confidence: string;
      startAngle: number;
      endAngle: number;
    }[] = [];

    for (const layout of DOMAIN_LAYOUT) {
      const domainScore = health.domainScores.find((d) => d.domain === layout.domain);
      const perspZones = domainScore?.perspectiveZones || [];
      const domainSweep = 120 - domainGap;

      let offset = layout.startAngle + domainGap / 2;
      for (const split of PERSPECTIVE_SPLITS) {
        const sweep = domainSweep * split.fraction - perspGap;
        const zone = perspZones.find((z) => z.perspective === split.perspective);

        zones.push({
          domain: layout.domain,
          perspective: split.perspective,
          score: zone?.score || 0,
          confidence: zone?.confidence || 'low',
          startAngle: offset,
          endAngle: offset + sweep,
        });
        offset += sweep + perspGap;
      }
    }
    return zones;
  }, [health]);

  // Build middle ring (3 domain arcs)
  const middleArcs = useMemo(() => {
    return DOMAIN_LAYOUT.map((layout) => {
      const domainScore = health.domainScores.find((d) => d.domain === layout.domain);
      return {
        domain: layout.domain,
        score: domainScore?.score || 0,
        label: layout.label,
        startAngle: layout.startAngle + domainGap / 2,
        endAngle: layout.startAngle + 120 - domainGap / 2,
      };
    });
  }, [health]);

  const overallColor = scoreToColor(health.score);

  return (
    <div className="relative flex items-center justify-center w-full">
          <svg
            viewBox="0 0 600 400"
            className="w-full h-auto"
            style={{ maxHeight: '56vh' }}
          >
            <defs>
              <filter id="glow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.15)" />
              </filter>
              <filter id="softGlow">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.1)" />
              </filter>
            </defs>

            {/* LAYER 1 (outer): 9 perspective zones */}
            {outerZones.map((zone) => {
              const color = scoreToColor(zone.score);
              return (
                <g key={`${zone.domain}-${zone.perspective}`}>
                  <path
                    d={describePieWedge(cx, cy, middleRadius, outerRadius, zone.startAngle, zone.endAngle)}
                    fill={zone.score > 0 ? `${color}60` : 'rgba(44,44,44,0.04)'}
                    stroke={zone.score > 0 ? `${color}90` : 'rgba(44,44,44,0.12)'}
                    strokeWidth={1}
                    className={`cursor-pointer transition-all ${zone.score > 0 ? 'hover:brightness-125' : 'hover:fill-[rgba(44,44,44,0.08)]'}`}
                    onClick={() => onZoneClick?.(zone.domain, zone.perspective)}
                  >
                    <title>
                      {zone.score > 0
                        ? `${DOMAIN_LAYOUT.find((l) => l.domain === zone.domain)?.label} — ${PERSPECTIVE_LABELS[zone.perspective]}: ${zone.score.toFixed(1)}`
                        : zone.perspective === 'spouse'
                          ? `Waiting for spouse to share their perspective`
                          : `Add ${PERSPECTIVE_LABELS[zone.perspective].toLowerCase()} perspective for ${DOMAIN_LAYOUT.find((l) => l.domain === zone.domain)?.label.toLowerCase()}`
                      }
                    </title>
                  </path>
                  {/* Perspective label or "+" for empty */}
                  {(() => {
                    const midAngle = (zone.startAngle + zone.endAngle) / 2;
                    const labelR = (middleRadius + outerRadius) / 2;
                    const pos = polarToCartesian(cx, cy, labelR, midAngle);
                    if (zone.score === 0) {
                      return (
                        <text
                          x={pos.x} y={pos.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="rgba(44,44,44,0.3)"
                          fontSize="18"
                          fontFamily="monospace"
                          style={{ pointerEvents: 'none' }}
                        >
                          +
                        </text>
                      );
                    }
                    return (
                      <text
                        x={pos.x} y={pos.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={zone.score > 0 ? 'rgba(44,44,44,0.75)' : 'rgba(44,44,44,0.25)'}
                        fontSize="8"
                        fontFamily="monospace"
                        fontWeight="bold"
                        letterSpacing="0.5"
                        style={{ pointerEvents: 'none' }}
                      >
                        {PERSPECTIVE_LABELS[zone.perspective].toUpperCase()}
                      </text>
                    );
                  })()}
                </g>
              );
            })}

            {/* LAYER 2 (middle): 3 domain arcs — flush against center */}
            {middleArcs.map((arc) => {
              const color = scoreToColor(arc.score);
              return (
                <g key={`mid-${arc.domain}`}>
                  <path
                    d={describePieWedge(cx, cy, centerRadius, middleRadius, arc.startAngle, arc.endAngle)}
                    fill={arc.score > 0 ? `${color}40` : 'rgba(44,44,44,0.04)'}
                    stroke={arc.score > 0 ? `${color}70` : 'rgba(44,44,44,0.08)'}
                    strokeWidth={1}
                  />
                  {/* Domain label */}
                  {(() => {
                    const midAngle = (arc.startAngle + arc.endAngle) / 2;
                    const labelR = (centerRadius + middleRadius) / 2;
                    const pos = polarToCartesian(cx, cy, labelR, midAngle);
                    return (
                      <text
                        x={pos.x} y={pos.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="rgba(44,44,44,0.7)"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                        letterSpacing="1.5"
                      >
                        {arc.label}
                      </text>
                    );
                  })()}
                </g>
              );
            })}

            {/* Domain separator lines (through outer + middle rings) */}
            {DOMAIN_LAYOUT.map((layout) => {
              const p1 = polarToCartesian(cx, cy, centerRadius, layout.startAngle);
              const p2 = polarToCartesian(cx, cy, outerRadius + 2, layout.startAngle);
              return (
                <line
                  key={`sep-${layout.domain}`}
                  x1={p1.x} y1={p1.y}
                  x2={p2.x} y2={p2.y}
                  stroke="rgba(44,44,44,0.3)"
                  strokeWidth={2.5}
                />
              );
            })}

            {/* LAYER 3 (center): overall harmony — flush against middle ring */}
            <circle
              cx={cx} cy={cy} r={centerRadius}
              fill={`${overallColor}25`}
              stroke={overallColor}
              strokeWidth={2.5}
              filter="url(#softGlow)"
            />

            {/* User icon */}
            <circle cx={cx} cy={cy - 14} r={8} fill={`${overallColor}30`} stroke={overallColor} strokeWidth={1.5} />
            <path
              d={`M ${cx - 16} ${cy + 8} A 16 16 0 0 1 ${cx + 16} ${cy + 8}`}
              fill={`${overallColor}30`}
              stroke={overallColor}
              strokeWidth={1.5}
            />

            {/* Overall score */}
            <text
              x={cx} y={cy + 32}
              textAnchor="middle"
              dominantBaseline="central"
              fill={overallColor}
              fontSize="18"
              fontFamily="monospace"
              fontWeight="bold"
              filter="url(#glow)"
            >
              {health.score.toFixed(1)}
            </text>

            {/* Trend indicator */}
            <text
              x={cx} y={cy + 46}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#6B6B6B"
              fontSize="8"
              fontFamily="monospace"
            >
              {health.trend === 'improving' ? '▲ IMPROVING' :
                health.trend === 'declining' ? '▼ DECLINING' :
                  health.trend === 'stable' ? '● STABLE' : '○ GATHERING'}
            </text>
          </svg>
    </div>
  );
}
