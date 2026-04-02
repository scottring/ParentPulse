import type { ClimateState } from '@/lib/climate-engine';

interface ClimateIconProps {
  state: ClimateState;
  size?: number;
  className?: string;
}

export function ClimateIcon({ state, size = 48, className = '' }: ClimateIconProps) {
  const s = size;
  const mid = s / 2;

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {state === 'clear' && <SunIcon mid={mid} s={s} />}
      {state === 'mostly_sunny' && <MostlySunnyIcon mid={mid} s={s} />}
      {state === 'partly_cloudy' && <PartlyCloudyIcon mid={mid} s={s} />}
      {state === 'overcast' && <OvercastIcon mid={mid} s={s} />}
      {state === 'stormy' && <StormyIcon mid={mid} s={s} />}
    </svg>
  );
}

function SunIcon({ mid, s }: { mid: number; s: number }) {
  const r = s * 0.2;
  return (
    <g>
      {/* Rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = mid + Math.cos(rad) * (r + 4);
        const y1 = mid + Math.sin(rad) * (r + 4);
        const x2 = mid + Math.cos(rad) * (r + 8);
        const y2 = mid + Math.sin(rad) * (r + 8);
        return (
          <line
            key={angle}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#D4A574"
            strokeWidth={2}
            strokeLinecap="round"
          />
        );
      })}
      {/* Sun body */}
      <circle cx={mid} cy={mid} r={r} fill="#D4A574" opacity={0.9} />
    </g>
  );
}

function MostlySunnyIcon({ mid, s }: { mid: number; s: number }) {
  const sunR = s * 0.16;
  const sunX = mid - 4;
  const sunY = mid - 4;
  return (
    <g>
      {/* Sun behind */}
      {[0, 60, 120, 180, 240, 300].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = sunX + Math.cos(rad) * (sunR + 3);
        const y1 = sunY + Math.sin(rad) * (sunR + 3);
        const x2 = sunX + Math.cos(rad) * (sunR + 6);
        const y2 = sunY + Math.sin(rad) * (sunR + 6);
        return (
          <line
            key={angle}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#D4A574"
            strokeWidth={1.5}
            strokeLinecap="round"
            opacity={0.6}
          />
        );
      })}
      <circle cx={sunX} cy={sunY} r={sunR} fill="#D4A574" opacity={0.8} />
      {/* Small cloud */}
      <CloudShape cx={mid + 6} cy={mid + 6} scale={0.5} s={s} opacity={0.7} />
    </g>
  );
}

function PartlyCloudyIcon({ mid, s }: { mid: number; s: number }) {
  const sunR = s * 0.12;
  return (
    <g>
      {/* Dim sun */}
      <circle cx={mid - 8} cy={mid - 8} r={sunR} fill="#D4A574" opacity={0.5} />
      {/* Cloud */}
      <CloudShape cx={mid + 2} cy={mid + 4} scale={0.7} s={s} opacity={0.8} />
    </g>
  );
}

function OvercastIcon({ mid, s }: { mid: number; s: number }) {
  return (
    <g>
      <CloudShape cx={mid - 4} cy={mid - 2} scale={0.6} s={s} opacity={0.5} />
      <CloudShape cx={mid + 2} cy={mid + 4} scale={0.75} s={s} opacity={0.7} />
    </g>
  );
}

function StormyIcon({ mid, s }: { mid: number; s: number }) {
  return (
    <g>
      <CloudShape cx={mid} cy={mid - 2} scale={0.8} s={s} opacity={0.7} />
      {/* Rain drops */}
      {[-6, 0, 6].map((offset) => (
        <line
          key={offset}
          x1={mid + offset}
          y1={mid + 10}
          x2={mid + offset - 2}
          y2={mid + 16}
          stroke="#7C9082"
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.5}
        />
      ))}
    </g>
  );
}

function CloudShape({ cx, cy, scale, s, opacity }: { cx: number; cy: number; scale: number; s: number; opacity: number }) {
  const w = s * 0.4 * scale;
  const h = s * 0.2 * scale;
  return (
    <g opacity={opacity}>
      <ellipse cx={cx} cy={cy} rx={w * 0.5} ry={h * 0.5} fill="#B8C5B5" />
      <ellipse cx={cx - w * 0.3} cy={cy + h * 0.1} rx={w * 0.35} ry={h * 0.4} fill="#B8C5B5" />
      <ellipse cx={cx + w * 0.3} cy={cy + h * 0.1} rx={w * 0.35} ry={h * 0.4} fill="#B8C5B5" />
    </g>
  );
}
