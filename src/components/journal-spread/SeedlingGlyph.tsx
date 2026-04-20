'use client';

/**
 * Seedling glyph — the mark a reflection entry gets when it carries
 * specific earlier entries forward. Visible to the reader as a quiet
 * sign that the book has folded back on itself and something grew
 * from something.
 *
 * Displayed left of the entry title on any row where
 *   entry.category === 'reflection' && entry.reflectsOnEntryIds?.length > 0
 */
export function SeedlingGlyph({ size = 14 }: { size?: number }) {
  return (
    <span
      aria-label="A reflection that carries earlier moments forward"
      title="Carries earlier moments forward"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--r-sage, #5C8064)',
        verticalAlign: 'middle',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* Stem */}
        <path d="M8 13 V7" />
        {/* Left leaf */}
        <path d="M8 9 C6.2 8.6 5 7.4 4.6 5.6 C6.4 6 7.6 7.2 8 9 Z" />
        {/* Right leaf */}
        <path d="M8 8 C9.8 7.6 11 6.4 11.4 4.6 C9.6 5 8.4 6.2 8 8 Z" />
      </svg>
    </span>
  );
}
