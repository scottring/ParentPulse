'use client';

import type { DayOfWeek } from '@/types/couple-ritual';

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 0, label: 'Sun' }, { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export default function DayOfWeekPicker({
  value, onChange,
}: { value: DayOfWeek; onChange: (v: DayOfWeek) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {DAYS.map((d) => (
        <button
          key={d.value}
          onClick={() => onChange(d.value)}
          className={`px-4 py-3 rounded-full border transition-colors ${
            value === d.value
              ? 'border-[#7C9082] bg-[#7C9082] text-white'
              : 'border-[rgba(120,100,70,0.18)] text-[#3A3530] hover:bg-black/[0.02]'
          }`}
          style={{ fontFamily: 'var(--font-parent-body)', fontSize: 14, minWidth: 60 }}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}
