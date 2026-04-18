'use client';
/* ================================================================
   Relish · Manual — PersonSheet
   A single person's page. Portrait band at top, then sections:
   Essentials (DOB, contact, allergies), Rituals with them,
   Recent threads, and Quiet facts (free-form lines).
   ================================================================ */

import { Eyebrow, H2, BodySerif, Caption } from '../type';
import { Rule } from '../surfaces';

export interface PersonFact {
  label: string;
  value: string;
}
export interface PersonRitual {
  id: string;
  name: string;
  cadence: string;
}
export interface PersonThread {
  id: string;
  title: string;
  date: string;
}
export interface PersonSheetProps {
  name: string;
  relation: string;
  initials?: string;
  accent?: 'sage' | 'ember' | 'burgundy' | 'amber' | 'ink';
  essentials?: PersonFact[];
  rituals?: PersonRitual[];
  threads?: PersonThread[];
  quietFacts?: string[];
  onEdit?: () => void;
}

const ACCENT: Record<NonNullable<PersonSheetProps['accent']>, string> = {
  sage: 'var(--r-tint-sage)',
  ember: 'var(--r-tint-ember)',
  burgundy: 'var(--r-tint-burgundy)',
  amber: 'var(--r-tint-amber)',
  ink: 'var(--r-tint-ink)',
};

export function PersonSheet({
  name, relation, initials, accent = 'ink',
  essentials = [], rituals = [], threads = [], quietFacts = [], onEdit,
}: PersonSheetProps) {
  const inits = initials ?? name.split(' ').map((s) => s[0]).slice(0, 2).join('');
  return (
    <article style={{ maxWidth: 880, margin: '0 auto', padding: '48px 0 96px' }}>
      {/* Portrait band */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 40 }}>
        <div
          aria-hidden
          style={{
            width: 112, height: 112, borderRadius: '50%',
            background: ACCENT[accent],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 44,
            color: 'var(--r-ink)',
            flex: 'none',
          }}
        >
          {inits}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow>{relation}</Eyebrow>
          <H2 style={{ margin: '6px 0 0', fontSize: 44 }}>{name}</H2>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            style={{ all: 'unset', cursor: 'pointer', fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 17, color: 'var(--r-text-3)' }}
          >
            Edit
          </button>
        )}
      </header>

      {/* Essentials */}
      {essentials.length > 0 && (
        <Section title="Essentials">
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 32, rowGap: 12 }}>
            {essentials.map((f) => (
              <div key={f.label} style={{ display: 'contents' }}>
                <dt style={{ fontFamily: 'var(--r-sans)', fontSize: 12, color: 'var(--r-text-4)', letterSpacing: '0.08em', textTransform: 'uppercase', paddingTop: 2 }}>
                  {f.label}
                </dt>
                <dd style={{ margin: 0, fontFamily: 'var(--r-serif)', fontSize: 18, color: 'var(--r-ink)', lineHeight: 1.5 }}>
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {/* Rituals */}
      {rituals.length > 0 && (
        <Section title="Rituals">
          {rituals.map((r) => (
            <div key={r.id} style={{ padding: '14px 0', borderTop: '1px solid var(--r-rule-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <BodySerif style={{ fontSize: 19, fontStyle: 'italic' }}>{r.name}</BodySerif>
              <Caption style={{ color: 'var(--r-text-4)' }}>{r.cadence}</Caption>
            </div>
          ))}
        </Section>
      )}

      {/* Recent threads */}
      {threads.length > 0 && (
        <Section title="Recent threads">
          {threads.map((t) => (
            <div key={t.id} style={{ padding: '14px 0', borderTop: '1px solid var(--r-rule-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <BodySerif style={{ fontSize: 19, fontStyle: 'italic' }}>{t.title}</BodySerif>
              <Caption style={{ color: 'var(--r-text-4)' }}>{t.date}</Caption>
            </div>
          ))}
        </Section>
      )}

      {/* Quiet facts */}
      {quietFacts.length > 0 && (
        <Section title="Quiet facts">
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {quietFacts.map((q, i) => (
              <li key={i} style={{ padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--r-rule-5)', fontFamily: 'var(--r-serif)', fontSize: 18, color: 'var(--r-text-2)', lineHeight: 1.6 }}>
                {q}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <Eyebrow style={{ marginBottom: 16 }}>{title}</Eyebrow>
      {children}
    </section>
  );
}
