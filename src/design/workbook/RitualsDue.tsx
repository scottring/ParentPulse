'use client';
/* ================================================================
   Relish · Workbook — RitualsDue
   A small section of "practice cards" — each a paper tile with an
   ornamental glyph, serif name, cadence, and a trailing chevron
   that leads to the practice's detail page. The mark-done action
   lives on the detail page now; these cards are pure navigation.
   ================================================================ */

import Link from 'next/link';
import { Card } from '../surfaces';
import { Eyebrow, Caption, BodySerif } from '../type';

export interface RitualDue {
  id: string;
  name: string;
  cadence: string;          // "Weekly" / "Every Sunday"
  overdueBy?: number;       // days; undefined if on-time
  // Slug used to route to /practices/{slug}. Defaults to `id` if
  // unset. The Weekly Relish card should pass slug='weekly-relish'.
  slug?: string;
}

export interface RitualsDueProps {
  rituals: RitualDue[];
}

export function RitualsDue({ rituals }: RitualsDueProps) {
  if (rituals.length === 0) return null;

  // Single-item compact row — the grid framing is disproportionate
  // for one practice.
  if (rituals.length === 1) {
    return (
      <section aria-label="Practice due this week">
        <Eyebrow>Practice · due this week</Eyebrow>
        <div style={{ marginTop: 10 }}>
          <RitualCard ritual={rituals[0]} compact />
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
          <RitualCard key={r.id} ritual={r} />
        ))}
      </div>
    </section>
  );
}

function RitualCard({
  ritual,
  compact,
}: {
  ritual: RitualDue;
  compact?: boolean;
}) {
  const overdue = (ritual.overdueBy ?? 0) > 0;
  const accent = overdue ? 'var(--r-burgundy)' : 'var(--r-ember)';

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

  const caption = overdue
    ? `${ritual.overdueBy} day${ritual.overdueBy === 1 ? '' : 's'} late`
    : ritual.cadence;

  const href = `/practices/${ritual.slug ?? ritual.id}`;

  return (
    <Link
      href={href}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
      aria-label={`Open the ${ritual.name} practice`}
    >
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
          transition: 'opacity 160ms var(--r-ease-ink)',
        }}
      >
        <Glyph accent={accent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={nameStyle}>{ritual.name}</div>
          <Caption style={{ color: 'var(--r-text-4)', marginTop: 2 }}>
            {caption}
          </Caption>
        </div>
        <span
          aria-hidden
          style={{
            flex: 'none',
            fontFamily: 'var(--r-sans)',
            fontSize: 14,
            color: 'var(--r-text-5)',
          }}
        >
          →
        </span>
      </Card>
    </Link>
  );
}

function Glyph({ accent }: { accent: string }) {
  return (
    <span
      aria-hidden
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: 'var(--r-paper-soft)',
        border: '1px solid var(--r-rule-4)',
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
      ❦
    </span>
  );
}
