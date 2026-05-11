'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { CoupleRitual } from '@/types/couple-ritual';

export function FamilyCheckInsSection({
  checkIns,
  kidNames,
}: {
  checkIns: CoupleRitual[];
  kidNames: Record<string, string>;
}) {
  return (
    <section style={sectionStyle} aria-label="Family check-ins">
      <p style={eyebrowStyle}>Family Check-ins</p>
      {checkIns.length === 0 ? (
        <Link href="/rituals/family/setup" style={emptyCardStyle}>
          <p style={emptyTitleStyle}><em>A scheduled moment with a child.</em></p>
          <p style={emptyBodyStyle}>Set up a recurring check-in so it doesn't slip through the week.</p>
          <span style={ctaInlineStyle}>Set up a family check-in ⟶</span>
        </Link>
      ) : (
        <>
          <ul style={listStyle}>
            {checkIns.map((c) => {
              const name = c.targetPersonId ? (kidNames[c.targetPersonId] ?? 'a child') : 'a child';
              return (
                <li key={c.id} style={rowStyle}>
                  <div style={rowMetaStyle}>
                    <p style={rowTitleStyle}>{`Check-in with ${name}`}</p>
                    <p style={rowCadenceStyle}>{cadenceLabel(c)}</p>
                  </div>
                  <Link
                    href={`/check-in/${c.targetPersonId ?? ''}?ritualId=${c.id}`}
                    style={beginCtaStyle}
                  >
                    Begin
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link href="/rituals/family/setup" style={addLinkStyle}>
            + Add another check-in
          </Link>
        </>
      )}
    </section>
  );
}

function cadenceLabel(c: CoupleRitual): string {
  const days = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  const [h, m] = (c.startTimeLocal ?? '17:00').split(':').map((n) => parseInt(n, 10));
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = ((h + 11) % 12) + 1;
  const cadence = c.cadence === 'weekly' ? 'Weekly' : c.cadence === 'biweekly' ? 'Every other week' : 'Monthly';
  return `${cadence}, ${days[c.dayOfWeek ?? 0]} at ${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

const sectionStyle: CSSProperties = { marginTop: 40 };
const eyebrowStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 11, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--r-text-3, #5C5347)', margin: '0 0 16px', paddingBottom: 12, borderBottom: '1px solid rgba(120, 100, 70, 0.12)' };
const emptyCardStyle: CSSProperties = { display: 'block', padding: '24px 26px', background: 'var(--r-paper, #FDFBF6)', border: '1px solid rgba(120, 100, 70, 0.14)', borderRadius: 8, textDecoration: 'none', color: 'inherit' };
const emptyTitleStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontSize: 20, color: 'var(--r-ink, #2B2620)', margin: '0 0 8px' };
const emptyBodyStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 14, color: 'var(--r-text-3, #5C5347)', margin: '0 0 14px' };
const ctaInlineStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--r-ink, #2B2620)' };
const listStyle: CSSProperties = { listStyle: 'none', margin: 0, padding: 0 };
const rowStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid rgba(120, 100, 70, 0.08)' };
const rowMetaStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const rowTitleStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontSize: 17, color: 'var(--r-ink, #2B2620)', margin: 0 };
const rowCadenceStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 11, color: 'var(--r-text-4, #6B6254)', letterSpacing: '0.04em', margin: 0 };
const beginCtaStyle: CSSProperties = { padding: '8px 14px', background: 'var(--r-ink, #2B2620)', color: 'var(--r-cream, #FAF8F3)', borderRadius: 4, fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' };
const addLinkStyle: CSSProperties = { display: 'inline-block', marginTop: 16, fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--r-text-4, #6B6254)', textDecoration: 'none' };
