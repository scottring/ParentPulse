'use client';

const TIMES = [
  '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00',
];

export default function TimePicker({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-4 py-3 rounded-xl border border-[rgba(120,100,70,0.18)] bg-white"
      style={{ fontFamily: 'var(--font-parent-body)', fontSize: 16, color: '#3A3530', minWidth: 160 }}
    >
      {TIMES.map((t) => (
        <option key={t} value={t}>{formatTimeLabel(t)}</option>
      ))}
    </select>
  );
}

function formatTimeLabel(hm: string): string {
  const [h, m] = hm.split(':').map((n) => parseInt(n, 10));
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}
