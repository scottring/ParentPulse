'use client';

import type { RitualCadence } from '@/types/couple-ritual';

const OPTIONS: { value: RitualCadence; label: string; sub: string }[] = [
  { value: 'weekly', label: 'Weekly', sub: 'Most couples land here.' },
  { value: 'biweekly', label: 'Every two weeks', sub: 'A lighter cadence.' },
  { value: 'monthly', label: 'Monthly', sub: 'A deeper quarterly check-in pace.' },
];

export default function CadencePicker({
  value, onChange,
}: { value: RitualCadence; onChange: (v: RitualCadence) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`text-left px-5 py-4 rounded-xl border transition-colors ${
            value === o.value
              ? 'border-[#7C9082] bg-[#F3F1EC]'
              : 'border-[rgba(120,100,70,0.18)] hover:bg-black/[0.02]'
          }`}
          style={{ fontFamily: 'var(--font-parent-body)', color: '#3A3530' }}
        >
          <div style={{ fontSize: 18, fontWeight: 500 }}>{o.label}</div>
          <div style={{ fontSize: 13, color: '#6B6254', marginTop: 2 }}>{o.sub}</div>
        </button>
      ))}
    </div>
  );
}
