'use client';

export type ReportPeriod = '2weeks' | 'month' | 'quarter';

interface Props {
  value: ReportPeriod;
  onChange: (period: ReportPeriod) => void;
}

const OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: '2weeks', label: 'Last 2 weeks' },
  { value: 'month', label: 'Last month' },
  { value: 'quarter', label: 'Last quarter' },
];

export function PeriodSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="text-[12px] px-3 py-1.5 rounded-full transition-all"
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontWeight: value === opt.value ? 600 : 400,
            background: value === opt.value ? '#7C9082' : 'rgba(0,0,0,0.03)',
            color: value === opt.value ? 'white' : '#5C5347',
            border: `1px solid ${value === opt.value ? '#7C9082' : 'rgba(138,128,120,0.12)'}`,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function periodToMs(period: ReportPeriod): number {
  switch (period) {
    case '2weeks': return 14 * 24 * 60 * 60 * 1000;
    case 'month': return 30 * 24 * 60 * 60 * 1000;
    case 'quarter': return 90 * 24 * 60 * 60 * 1000;
  }
}
