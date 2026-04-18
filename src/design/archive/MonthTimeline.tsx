'use client';
/* ================================================================
   Relish · Archive — MonthTimeline
   Vertical timeline for a single year. Each month is a section
   with a month label on the left and entries listed on the right.
   Sparse months show just the label; dense months expand.
   ================================================================ */

import { Eyebrow, BodySerif, Caption } from '../type';

export interface ArchiveEntry {
  id: string;
  date: string;        // "4 March"
  title: string;
  preview?: string;
  tag?: 'health' | 'home' | 'people' | 'work' | 'plans';
}
export interface ArchiveMonth {
  name: string;        // "March"
  entries: ArchiveEntry[];
}

const TAG: Record<NonNullable<ArchiveEntry['tag']>, string> = {
  health: 'var(--r-burgundy)',
  home: 'var(--r-sage)',
  people: 'var(--r-ember)',
  work: 'var(--r-text-5)',
  plans: 'var(--r-amber)',
};

export interface MonthTimelineProps {
  months: ArchiveMonth[];
  onOpen?: (id: string) => void;
}

export function MonthTimeline({ months, onOpen }: MonthTimelineProps) {
  return (
    <div style={{ padding: '48px 0' }}>
      {months.map((m) => (
        <MonthBlock key={m.name} month={m} onOpen={onOpen} />
      ))}
    </div>
  );
}

function MonthBlock({ month, onOpen }: { month: ArchiveMonth; onOpen?: (id: string) => void }) {
  return (
    <section
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1px minmax(0,1fr)',
        gap: 40,
        paddingBottom: 48,
        alignItems: 'start',
      }}
    >
      <div style={{ position: 'sticky', top: 96, alignSelf: 'start' }}>
        <h3
          style={{
            fontFamily: 'var(--r-serif)',
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: 36,
            letterSpacing: '-0.015em',
            color: 'var(--r-ink)',
            margin: 0,
            lineHeight: 1,
          }}
        >
          {month.name}
        </h3>
        <Caption style={{ marginTop: 8, color: 'var(--r-text-4)' }}>
          {month.entries.length} {month.entries.length === 1 ? 'entry' : 'entries'}
        </Caption>
      </div>
      <div aria-hidden style={{ alignSelf: 'stretch', background: 'var(--r-rule-5)' }} />
      <div>
        {month.entries.length === 0 ? (
          <BodySerif style={{ color: 'var(--r-text-5)', fontStyle: 'italic', padding: '8px 0' }}>
            A quiet month.
          </BodySerif>
        ) : (
          month.entries.map((e, i) => (
            <button
              key={e.id}
              onClick={() => onOpen?.(e.id)}
              style={{
                all: 'unset', cursor: 'pointer',
                display: 'block', width: '100%',
                padding: '18px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--r-rule-5)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                {e.tag && (
                  <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: TAG[e.tag], flex: 'none', transform: 'translateY(-2px)' }} />
                )}
                <Caption style={{ color: 'var(--r-text-4)', minWidth: 80 }}>{e.date}</Caption>
                <span
                  style={{
                    fontFamily: 'var(--r-serif)', fontStyle: 'italic',
                    fontSize: 21, color: 'var(--r-ink)', letterSpacing: '-0.005em',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    flex: 1, minWidth: 0,
                  }}
                >
                  {e.title}
                </span>
              </div>
              {e.preview && (
                <BodySerif
                  style={{
                    marginTop: 4, marginLeft: e.tag ? 106 : 94,
                    color: 'var(--r-text-3)', fontSize: 16, lineHeight: 1.55,
                    display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {e.preview}
                </BodySerif>
              )}
            </button>
          ))
        )}
      </div>
    </section>
  );
}
