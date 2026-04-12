'use client';

function yearToRoman(n: number): string {
  if (n < 1) return '';
  const map: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let result = '';
  let num = n;
  for (const [value, numeral] of map) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
}

function formatPressDate(d: Date): string {
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  return `${weekday}, ${month} ${d.getDate()}`;
}

function formatIssueNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = (d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return Math.ceil((diff + start.getDay() + 1) / 7);
}

interface MastheadProps {
  title: string;
  // Date is injected so callers can pass a stable instance and avoid
  // SSR/hydration drift. Defaults to now.
  date?: Date;
}

export default function Masthead({ title, date }: MastheadProps) {
  const d = date ?? new Date();
  return (
    <header className="press-masthead">
      <div className="press-masthead-rule" aria-hidden="true" />
      <h1 className="press-masthead-title">{title}</h1>
      <div className="press-masthead-fleuron" aria-hidden="true">
        ❦
      </div>
      <p className="press-masthead-meta">
        <span>Volume {yearToRoman(d.getFullYear())}</span>
        <span className="sep">·</span>
        <span>Issue {formatIssueNumber(d)}</span>
        <span className="sep">·</span>
        <span>{formatPressDate(d)}</span>
      </p>
      <div className="press-masthead-rule" aria-hidden="true" />
    </header>
  );
}
