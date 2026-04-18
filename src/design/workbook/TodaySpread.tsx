'use client';
/* ================================================================
   Relish · Workbook — TodaySpread
   The Workbook's opening view: today's date, weather/season line,
   and the three "open threads" that want attention. Reads like the
   first page you turn to when you sit down with the book.
   ================================================================ */

import { useMemo } from 'react';
import { PageSpread } from '../surfaces';
import { Display, Lede, Eyebrow, BodySerif, Caption } from '../type';

export interface Thread {
  id: string;
  title: string;
  lastTouched: string;   // humanised: "3 days ago"
  preview?: string;
  tag?: 'health' | 'home' | 'people' | 'work' | 'plans';
}

export interface TodaySpreadProps {
  firstName?: string;
  date?: Date;
  season?: string;         // "Early spring" / "Late autumn"
  threads?: Thread[];
  onOpenThread?: (id: string) => void;
}

function greet(d: Date, name?: string) {
  const h = d.getHours();
  const part = h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${part}, ${name}.` : `${part}.`;
}

function formatLongDate(d: Date) {
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

const TAG_COLORS: Record<NonNullable<Thread['tag']>, string> = {
  health: 'var(--r-burgundy)',
  home: 'var(--r-sage)',
  people: 'var(--r-ember)',
  work: 'var(--r-text-5)',
  plans: 'var(--r-amber)',
};

export function TodaySpread({ firstName, date = new Date(), season, threads = [], onOpenThread }: TodaySpreadProps) {
  const greeting = useMemo(() => greet(date, firstName), [date, firstName]);
  const longDate = useMemo(() => formatLongDate(date), [date]);

  const left = (
    <>
      <Eyebrow>{longDate}{season ? ` · ${season}` : ''}</Eyebrow>
      <Display style={{ margin: '12px 0 16px' }}>{greeting}</Display>
      <Lede style={{ maxWidth: '38ch' }}>
        {threads.length === 0
          ? 'Nothing needs you this morning. The book is quiet.'
          : threads.length === 1
            ? 'One thread is open. Take a minute if you have one.'
            : `${threads.length} threads are open. Here's where you left off.`}
      </Lede>
    </>
  );

  const right = (
    <>
      <Eyebrow>Open threads</Eyebrow>
      <div style={{ marginTop: 16 }}>
        {threads.map((t, i) => (
          <ThreadRow
            key={t.id}
            thread={t}
            first={i === 0}
            onOpen={() => onOpenThread?.(t.id)}
          />
        ))}
        {threads.length === 0 && (
          <BodySerif style={{ color: 'var(--r-text-4)', fontStyle: 'italic', marginTop: 8 }}>
            Nothing to pick up. Enjoy the morning.
          </BodySerif>
        )}
      </div>
    </>
  );

  return (
    <section aria-label="Today" style={{ padding: '48px 0' }}>
      <PageSpread left={left} right={right} />
    </section>
  );
}

function ThreadRow({ thread, first, onOpen }: { thread: Thread; first: boolean; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'block',
        width: '100%',
        padding: '20px 0',
        borderTop: first ? 'none' : '1px solid var(--r-rule-5)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
          {thread.tag && (
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: TAG_COLORS[thread.tag],
                flex: 'none',
                transform: 'translateY(-2px)',
              }}
            />
          )}
          <span
            style={{
              fontFamily: 'var(--r-serif)',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 22,
              letterSpacing: '-0.005em',
              color: 'var(--r-ink)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {thread.title}
          </span>
        </div>
        <Caption style={{ flex: 'none', color: 'var(--r-text-4)' }}>{thread.lastTouched}</Caption>
      </div>
      {thread.preview && (
        <BodySerif
          style={{
            marginTop: 4,
            color: 'var(--r-text-3)',
            fontSize: 16,
            lineHeight: 1.55,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {thread.preview}
        </BodySerif>
      )}
    </button>
  );
}
