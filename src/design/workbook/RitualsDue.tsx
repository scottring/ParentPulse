'use client';
/* ================================================================
   Relish · Workbook — RitualsDue
   A small section of "ritual cards" — each a paper tile with an
   ornamental glyph, serif name, cadence, and a quiet mark-done
   affordance. Meant to feel ceremonial, not transactional.
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
  return (
    <section aria-label="Rituals due">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <Eyebrow>Rituals · due today</Eyebrow>
          <BodySerif
            style={{
              marginTop: 6,
              fontStyle: 'italic',
              fontSize: 24,
              lineHeight: 1.2,
              color: 'var(--r-ink)',
            }}
          >
            What wants keeping.
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

function RitualCard({ ritual, onMarkDone }: { ritual: RitualDue; onMarkDone?: (id: string) => void }) {
  const [done, setDone] = useState(false);
  const overdue = (ritual.overdueBy ?? 0) > 0;
  const accent = done
    ? 'var(--r-sage)'
    : overdue
      ? 'var(--r-burgundy)'
      : 'var(--r-ember)';

  return (
    <Card
      tone="paper"
      padding={20}
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
        <div
          style={{
            fontFamily: 'var(--r-serif)',
            fontStyle: 'italic',
            fontSize: 20,
            lineHeight: 1.2,
            color: 'var(--r-ink)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {ritual.name}
        </div>
        <Caption style={{ color: 'var(--r-text-4)', marginTop: 2 }}>
          {done
            ? 'Kept'
            : overdue
              ? `${ritual.overdueBy} day${ritual.overdueBy === 1 ? '' : 's'} late`
              : ritual.cadence}
        </Caption>
      </div>
      <button
        onClick={() => {
          if (done) return;
          setDone(true);
          onMarkDone?.(ritual.id);
        }}
        disabled={done}
        aria-label={done ? 'Kept' : `Mark ${ritual.name} as kept`}
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
        {done ? 'Kept' : 'Keep'}
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
