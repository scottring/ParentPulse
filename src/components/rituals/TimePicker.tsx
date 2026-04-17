'use client';

const TIMES = [
  '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00',
];

export default function TimePicker({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {TIMES.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-4 py-3 rounded-full border transition-colors ${
            value === t
              ? 'border-[#7C9082] bg-[#7C9082] text-white'
              : 'border-[rgba(120,100,70,0.18)] text-[#3A3530] hover:bg-black/[0.02]'
          }`}
          style={{ fontFamily: 'var(--font-parent-body)', fontSize: 14, minWidth: 88 }}
        >
          {formatTimeLabel(t)}
        </button>
      ))}
    </div>
  );
}

function formatTimeLabel(hm: string): string {
  const [h, m] = hm.split(':').map((n) => parseInt(n, 10));
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}
