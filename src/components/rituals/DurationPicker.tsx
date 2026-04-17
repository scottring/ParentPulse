'use client';

const OPTIONS = [
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
];

export default function DurationPicker({
  value, onChange,
}: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-5 py-3 rounded-xl border transition-colors ${
            value === o.value
              ? 'border-[#7C9082] bg-[#F3F1EC]'
              : 'border-[rgba(120,100,70,0.18)] hover:bg-black/[0.02]'
          }`}
          style={{ fontFamily: 'var(--font-parent-body)', fontSize: 15, color: '#3A3530' }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
