'use client';

import InstrumentBezel from './InstrumentBezel';

interface PerspectiveLightProps {
  label: string;
  active: boolean;
  count?: number;
}

function StatusLight({ label, active, count }: PerspectiveLightProps) {
  const color = active ? '#16a34a' : '#4A4238';
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
        className="text-[11px] tracking-wide"
        style={{ fontFamily: 'var(--font-parent-body)', color: active ? '#2C2C2C' : '#5F564B' }}
      >
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span
          className="text-[9px] ml-auto"
          style={{ fontFamily: 'var(--font-parent-body)', color: '#5F564B' }}
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
