'use client';
/* ================================================================
   Relish · Archive — YearSelector
   Horizontal year scroller at the top of /archive. Current year
   first, past years reading right. The selected year is bound
   in ember; others are quiet ink.
   ================================================================ */

export interface YearSelectorProps {
  years: number[];
  selected: number;
  onSelect: (year: number) => void;
}

export function YearSelector({ years, selected, onSelect }: YearSelectorProps) {
  return (
    <nav
      aria-label="Year"
      style={{
        display: 'flex',
        gap: 32,
        padding: '24px 0',
        borderBottom: '1px solid var(--r-rule-5)',
        overflowX: 'auto',
      }}
    >
      {years.map((y) => {
        const active = y === selected;
        return (
          <button
            key={y}
            onClick={() => onSelect(y)}
            style={{
              all: 'unset', cursor: 'pointer',
              fontFamily: 'var(--r-serif)',
              fontStyle: 'italic',
              fontWeight: active ? 400 : 300,
              fontSize: active ? 40 : 28,
              color: active ? 'var(--r-ink)' : 'var(--r-text-4)',
              letterSpacing: '-0.015em',
              opacity: active ? 1 : 0.65,
              transition: 'all 200ms var(--r-ease-ink)',
              position: 'relative',
              paddingBottom: 4,
              borderBottom: active ? '1px solid var(--r-ember)' : '1px solid transparent',
              lineHeight: 1,
              alignSelf: 'flex-end',
            }}
          >
            {y}
          </button>
        );
      })}
    </nav>
  );
}
