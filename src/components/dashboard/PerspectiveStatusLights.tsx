'use client';

import InstrumentBezel from './InstrumentBezel';

interface PerspectiveLightProps {
  label: string;
  active: boolean;
  count?: number;
}

function StatusLight({ label, active, count }: PerspectiveLightProps) {
  const color = active ? '#16a34a' : '#6b7280';
  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <div
        className="w-2.5 h-2.5 rounded-full"
        style={{
          background: color,
          boxShadow: active ? `0 0 6px ${color}, 0 0 12px ${color}40` : 'none',
        }}
      />
      <span
        className="font-mono text-[11px] tracking-wide"
        style={{ color: active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)' }}
      >
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span
          className="font-mono text-[9px] ml-auto"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

interface PerspectiveStatusLightsProps {
  selfActive: boolean;
  spouseActive: boolean;
  kidsActive: boolean;
  selfCount?: number;
  spouseCount?: number;
  kidsCount?: number;
}

export default function PerspectiveStatusLights({
  selfActive, spouseActive, kidsActive,
  selfCount, spouseCount, kidsCount,
}: PerspectiveStatusLightsProps) {
  return (
    <InstrumentBezel title="PERSPECTIVES" compact>
      <div className="py-1">
        <StatusLight label="SELF" active={selfActive} count={selfCount} />
        <StatusLight label="SPOUSE" active={spouseActive} count={spouseCount} />
        <StatusLight label="KIDS" active={kidsActive} count={kidsCount} />
      </div>
    </InstrumentBezel>
  );
}
