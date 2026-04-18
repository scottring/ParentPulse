'use client';
/* ================================================================
   Relish · Manual — PeopleGrid
   The Family Manual opens to a grid of people. Each card is a
   portrait tile with name, relation, and a quiet line about the
   last time they came up. Tap opens their page.
   ================================================================ */

import { Eyebrow, Caption } from '../type';

export interface Person {
  id: string;
  name: string;
  relation: string;           // "Mother" / "Son, 8" / "Neighbour"
  initials?: string;
  lastMention?: string;       // "Mentioned 2 days ago"
  accent?: 'sage' | 'ember' | 'burgundy' | 'amber' | 'ink';
}

const ACCENT: Record<NonNullable<Person['accent']>, string> = {
  sage: 'var(--r-tint-sage)',
  ember: 'var(--r-tint-ember)',
  burgundy: 'var(--r-tint-burgundy)',
  amber: 'var(--r-tint-amber)',
  ink: 'var(--r-tint-ink)',
};

export interface PeopleGridProps {
  people: Person[];
  onOpen?: (id: string) => void;
  onAdd?: () => void;
}

export function PeopleGrid({ people, onOpen, onAdd }: PeopleGridProps) {
  return (
    <section aria-label="People" style={{ padding: '32px 0 64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
        <Eyebrow>People · {people.length}</Eyebrow>
        {onAdd && (
          <button
            onClick={onAdd}
            style={{
              all: 'unset', cursor: 'pointer',
              fontFamily: 'var(--r-serif)', fontStyle: 'italic',
              fontSize: 17, color: 'var(--r-ink)',
            }}
          >
            Add someone ⟶
          </button>
        )}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 20,
        }}
      >
        {people.map((p) => (
          <PersonCard key={p.id} person={p} onOpen={() => onOpen?.(p.id)} />
        ))}
      </div>
    </section>
  );
}

function PersonCard({ person, onOpen }: { person: Person; onOpen: () => void }) {
  const initials = person.initials ?? person.name.split(' ').map((s) => s[0]).slice(0, 2).join('');
  const bg = ACCENT[person.accent ?? 'ink'];
  return (
    <button
      onClick={onOpen}
      style={{
        all: 'unset', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        padding: 20,
        background: 'var(--r-paper)',
        border: '1px solid var(--r-rule-5)',
        borderRadius: 'var(--r-radius-3)',
        transition: 'box-shadow 160ms var(--r-ease-ink), transform 160ms var(--r-ease-ink)',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--r-shadow-card)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
    >
      <div
        aria-hidden
        style={{
          width: 64, height: 64, borderRadius: '50%',
          background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 26,
          color: 'var(--r-ink)',
          marginBottom: 14,
        }}
      >
        {initials}
      </div>
      <div style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--r-ink)', marginBottom: 2 }}>
        {person.name}
      </div>
      <Caption style={{ color: 'var(--r-text-4)' }}>{person.relation}</Caption>
      {person.lastMention && (
        <Caption style={{ color: 'var(--r-text-5)', marginTop: 10, fontStyle: 'italic' }}>
          {person.lastMention}
        </Caption>
      )}
    </button>
  );
}
