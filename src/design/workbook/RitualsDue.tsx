'use client';
/* ================================================================
   Relish · Workbook — RitualsDue
   A small section of "practice cards" — each a paper tile with an
   ornamental glyph, serif name, cadence, and a quiet mark-done
   affordance. Ceremonial voice is preserved through typography;
   copy is plain so the purpose is legible at a glance.
   ================================================================ */

import { useState } from 'react';
import { Card } from '../surfaces';
import { Eyebrow, Caption, BodySerif } from '../type';

export interface RitualDue {
  id: string;
  name: string;
  cadence: string;          // "Weekly" / "Every Sunday"
  overdueBy?: number;       // days; undefined if on-time
}

export interface RitualsDueProps {
  rituals: RitualDue[];
  onMarkDone?: (id: string) => void;
}

export function RitualsDue({ rituals, onMarkDone }: RitualsDueProps) {
  if (rituals.length === 0) return null;

  // Single-item compact row — the grid framing is disproportionate
  // for one practice. See the flows audit workbook fix.
  if (rituals.length === 1) {
    return (
      <section aria-label="Practice due this week">
        <Eyebrow>Practice · due this week</Eyebrow>
        <div style={{ marginTop: 10 }}>
          <RitualCard ritual={rituals[0]} onMarkDone={onMarkDone} compact />
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Practices this week">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <Eyebrow>Practices · this week</Eyebrow>
          <BodySerif
            style={{
              marginTop: 6,
              fontStyle: 'italic',
              fontSize: 24,
              lineHeight: 1.2,
              color: 'var(--r-ink)',
            }}
          >
            Recurring things worth keeping up.
          </BodySerif>
        </div>
        <span
          aria-hidden
          style={{
            fontFamily: 'var(--r-serif)',
            fontSize: 22,
            color: 'var(--r-rule-2)',
            lineHeight: 1,
          }}
        >
          ❦
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {rituals.map((r) => (
          <RitualCard key={r.id} ritual={r} onMarkDone={onMarkDone} />
        ))}
      </div>
    </section>
  );
}

function RitualCard({
  ritual,
  onMarkDone,
  compact,
}: {
  ritual: RitualDue;
  onMarkDone?: (id: string) => void;
  compact?: boolean;
}) {
  const [done, setDone] = useState(false);
  const overdue = (ritual.overdueBy ?? 0) > 0;
  const accent = done
    ? 'var(--r-sage)'
    : overdue
      ? 'var(--r-burgundy)'
      : 'var(--r-ember)';

  const nameStyle: React.CSSProperties = {
    fontFamily: 'var(--r-serif)',
    fontStyle: 'italic',
    fontSize: compact ? 18 : 20,
    lineHeight: 1.2,
    color: 'var(--r-ink)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const caption = done
    ? 'Done this cycle'
    : overdue
      ? `${ritual.overdueBy} day${ritual.overdueBy === 1 ? '' : 's'} late`
      : ritual.cadence;

  const markLabel = done ? 'Done' : 'Mark done';
  const tooltip = done
    ? 'Completed this cycle'
    : 'Mark this practice done for this cycle';
  const aria = done
    ? `${ritual.name} done this cycle`
    : `Mark ${ritual.name} done for this cycle`;

  return (
    <Card
      tone="paper"
      padding={compact ? 16 : 20}
      lift
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        borderLeft: `3px solid ${accent}`,
        opacity: done ? 0.82 : 1,
        transition: 'opacity 160ms var(--r-ease-ink)',
      }}
    >
      <Glyph done={done} accent={accent} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={nameStyle}>{ritual.name}</div>
        <Caption style={{ color: 'var(--r-text-4)', marginTop: 2 }}>
          {caption}
        </Caption>
      </div>
      <button
        onClick={() => {
          if (done) return;
          setDone(true);
          onMarkDone?.(ritual.id);
        }}
        disabled={done}
        aria-label={aria}
        title={tooltip}
        style={{
          all: 'unset',
          cursor: done ? 'default' : 'pointer',
          padding: '6px 14px',
          borderRadius: 'var(--r-radius-pill)',
          border: `1px solid ${done ? 'var(--r-sage)' : 'var(--r-rule-3)'}`,
          background: done ? 'var(--r-tint-sage)' : 'transparent',
          fontFamily: 'var(--r-sans)',
          fontSize: 12,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: done ? 'var(--r-sage)' : 'var(--r-text-3)',
          transition: 'all 160ms var(--r-ease-ink)',
          flex: 'none',
        }}
      >
        {markLabel}
      </button>
    </Card>
  );
}

function Glyph({ done, accent }: { done: boolean; accent: string }) {
  return (
    <span
      aria-hidden
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: done ? 'var(--r-tint-sage)' : 'var(--r-paper-soft)',
        border: `1px solid ${done ? 'var(--r-sage)' : 'var(--r-rule-4)'}`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: accent,
        fontFamily: 'var(--r-serif)',
        fontSize: 20,
        lineHeight: 1,
        flex: 'none',
      }}
    >
      {done ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      ) : (
        '❦'
      )}
    </span>
  );
}
