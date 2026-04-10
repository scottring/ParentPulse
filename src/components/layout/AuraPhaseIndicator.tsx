'use client';

export type AuraPhase = 'assess' | 'understand' | 'respond' | 'assimilate';

interface AuraPhaseIndicatorProps {
  phase: AuraPhase;
  compact?: boolean; // true = dots only, false = dots + label
}

const PHASES: { key: AuraPhase; label: string; color: string }[] = [
  { key: 'assess', label: 'Assess', color: 'var(--aura-assess)' },
  { key: 'understand', label: 'Understand', color: 'var(--aura-understand)' },
  { key: 'respond', label: 'Respond', color: 'var(--aura-respond)' },
  { key: 'assimilate', label: 'Assimilate', color: 'var(--aura-assimilate)' },
];

export default function AuraPhaseIndicator({ phase, compact = false }: AuraPhaseIndicatorProps) {
  const activeIndex = PHASES.findIndex((p) => p.key === phase);

  return (
    <div
      className="inline-flex flex-col items-center"
      style={{ height: compact ? 32 : 48, justifyContent: 'center' }}
    >
      {/* Dots */}
      <div className="flex items-center" style={{ gap: 12 }}>
        {PHASES.map((p, i) => {
          const isActive = i === activeIndex;
          return (
            <span
              key={p.key}
              style={{
                width: isActive ? 10 : 8,
                height: isActive ? 10 : 8,
                borderRadius: '50%',
                background: isActive ? p.color : 'transparent',
                border: `1.5px solid ${isActive ? p.color : 'var(--parent-text-light)'}`,
                opacity: isActive ? 1 : 0.3,
                transition: 'all 0.3s ease',
                transform: isActive ? 'scale(1)' : 'scale(0.85)',
              }}
            />
          );
        })}
      </div>

      {/* Label */}
      {!compact && (
        <span
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: PHASES[activeIndex]?.color ?? 'var(--parent-text-light)',
            marginTop: 6,
            transition: 'color 0.3s ease',
          }}
        >
          {PHASES[activeIndex]?.label}
        </span>
      )}
    </div>
  );
}
