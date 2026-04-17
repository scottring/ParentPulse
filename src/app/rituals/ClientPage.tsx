'use client';

import Link from 'next/link';
import Navigation from '@/components/layout/Navigation';
import { useCoupleRitual } from '@/hooks/useCoupleRitual';
import { useSpouse } from '@/hooks/useSpouse';

export default function ClientPage() {
  const { ritual, loading } = useCoupleRitual();
  const { spouseName, loading: spouseLoading } = useSpouse();

  if (loading || spouseLoading) return <PageChrome><p>Loading…</p></PageChrome>;

  return (
    <PageChrome>
      <h1 style={h1Style}>Rituals</h1>
      {!ritual && (
        <div style={card}>
          <h2 style={h2Style}>Your couple check-in</h2>
          <p style={pStyle}>
            {spouseName
              ? `A recurring time you and ${spouseName} set aside for each other. Pick it together.`
              : `Invite your partner first, then come back here.`}
          </p>
          {spouseName && (
            <Link href="/rituals/couple/setup" style={primaryLink}>
              Set up your check-in →
            </Link>
          )}
        </div>
      )}
      {ritual && (
        <div style={card}>
          <h2 style={h2Style}>Your couple check-in</h2>
          <p style={pStyle}>{summarize(ritual)}</p>
          {ritual.intention && (
            <p style={{ ...pStyle, fontStyle: 'italic' }}>{ritual.intention}</p>
          )}
          <Link href="/rituals/couple/manage" style={primaryLink}>
            Manage →
          </Link>
        </div>
      )}
    </PageChrome>
  );
}

function PageChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      <main style={{ padding: '96px 32px 64px', maxWidth: 720, margin: '0 auto' }}>
        {children}
      </main>
    </>
  );
}

function summarize(r: { cadence: string; dayOfWeek: number; startTimeLocal: string; durationMinutes: number; status: string }): string {
  const days = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  const [h, m] = r.startTimeLocal.split(':').map((n) => parseInt(n, 10));
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  const prefix = r.cadence === 'weekly' ? 'Every' : r.cadence === 'biweekly' ? 'Every other' : 'Monthly on';
  const pauseSuffix = r.status === 'paused' ? ' (paused)' : '';
  return `${prefix} ${days[r.dayOfWeek]} at ${h12}:${m.toString().padStart(2, '0')} ${ampm}, ${r.durationMinutes} minutes${pauseSuffix}.`;
}

const h1Style: React.CSSProperties = {
  fontFamily: 'var(--font-parent-display)', fontSize: 40, fontWeight: 300,
  fontStyle: 'italic', margin: '0 0 32px', color: '#3A3530', lineHeight: 1.1,
};
const h2Style: React.CSSProperties = {
  fontFamily: 'var(--font-parent-display)', fontSize: 22, fontWeight: 400,
  margin: '0 0 8px', color: '#3A3530',
};
const pStyle: React.CSSProperties = {
  fontFamily: 'var(--font-parent-body)', fontSize: 15, color: '#6B6254',
  margin: '0 0 16px', lineHeight: 1.55,
};
const card: React.CSSProperties = {
  padding: 28, borderRadius: 14, background: '#F7F5F0',
  border: '1px solid rgba(120,100,70,0.12)',
};
const primaryLink: React.CSSProperties = {
  fontFamily: 'var(--font-parent-body)', fontSize: 15, color: '#3A3530',
  textDecoration: 'none', fontWeight: 500, borderBottom: '1px solid #7C9082',
  paddingBottom: 2,
};
