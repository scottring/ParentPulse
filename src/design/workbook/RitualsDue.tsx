'use client';
/* ================================================================
   Relish · Workbook — RitualsDue
   The rituals strip: a small row of chips for rituals that are due
   today or overdue. Tap to mark done; ambient, never nagging.
   ================================================================ */

import { useState } from 'react';
import { Eyebrow, Caption } from '../type';

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
    <section aria-label="Rituals due" style={{ padding: '32px 0', borderTop: '1px solid var(--r-rule-5)' }}>
      <Eyebrow>Rituals · due today</Eyebrow>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
        {rituals.map((r) => (
          <RitualChip key={r.id} ritual={r} onMarkDone={onMarkDone} />
        ))}
      </div>
    </section>
  );
}

function RitualChip({ ritual, onMarkDone }: { ritual: RitualDue; onMarkDone?: (id: string) => void }) {
  const [done, setDone] = useState(false);
  const overdue = (ritual.overdueBy ?? 0) > 0;

  return (
    <button
      onClick={() => {
        setDone(true);
        onMarkDone?.(ritual.id);
      }}
      disabled={done}
      style={{
        all: 'unset',
        cursor: done ? 'default' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        borderRadius: 'var(--r-radius-pill)',
        border: `1px solid ${overdue ? 'var(--r-burgundy)' : 'var(--r-rule-4)'}`,
        background: done ? 'var(--r-tint-sage)' : 'var(--r-paper)',
        fontFamily: 'var(--r-sans)',
        fontSize: 13,
        color: done ? 'var(--r-sage)' : 'var(--r-ink)',
        transition: 'all 160ms var(--r-ease-ink)',
        opacity: done ? 0.75 : 1,
      }}
      aria-pressed={done}
    >
      <span aria-hidden style={{ width: 14, height: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {done ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7l3 3 5-6" />
          </svg>
        ) : (
          <span style={{ width: 8, height: 8, borderRadius: '50%', border: `1.5px solid ${overdue ? 'var(--r-burgundy)' : 'var(--r-rule-2)'}` }} />
        )}
      </span>
      <span style={{ fontWeight: 500 }}>{ritual.name}</span>
      <Caption style={{ color: 'var(--r-text-4)' }}>
        {done ? 'done' : overdue ? `${ritual.overdueBy}d late` : ritual.cadence}
      </Caption>
    </button>
  );
}
