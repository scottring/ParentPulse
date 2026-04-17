'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/context/AuthContext';
import { useCoupleRitual } from '@/hooks/useCoupleRitual';
import { useSpouse } from '@/hooks/useSpouse';
import { coupleRitualToIcs } from '@/lib/rituals/icsExport';
import { downloadIcs } from '@/lib/rituals/downloadIcs';

export default function ClientPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { ritual, loading, pauseRitual, resumeRitual, endRitual } = useCoupleRitual();
  const { spouseName } = useSpouse();

  if (loading) return <Chrome><p>Loading…</p></Chrome>;
  if (!ritual) {
    router.replace('/rituals');
    return null;
  }

  function handleRedownload() {
    if (!ritual || !user) return;
    const ics = coupleRitualToIcs(
      ritual,
      user.name ?? 'Me',
      spouseName ?? 'your partner',
    );
    downloadIcs(ics, `relish-check-in-with-${(spouseName ?? 'partner').toLowerCase()}.ics`);
  }

  async function handleEnd() {
    if (!confirm('End this ritual? You and your partner can always set up a new one.')) return;
    await endRitual();
    router.push('/rituals');
  }

  return (
    <Chrome>
      <h1 style={h1Style}>Your check-in</h1>
      <p style={pStyle}>{summarize(ritual)}</p>
      {ritual.intention && <p style={{ ...pStyle, fontStyle: 'italic' }}>{ritual.intention}</p>}

      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Link href="/rituals/couple/setup" style={linkBtn}>Change time, day, or cadence</Link>
        <button onClick={handleRedownload} style={linkBtn}>Download calendar invite</button>
        {ritual.status === 'active' ? (
          <button onClick={pauseRitual} style={linkBtn}>Pause</button>
        ) : (
          <button onClick={resumeRitual} style={linkBtn}>Resume</button>
        )}
        <button onClick={handleEnd} style={{ ...linkBtn, color: '#B06757' }}>End ritual</button>
      </div>
    </Chrome>
  );
}

function Chrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      <main style={{ padding: '96px 32px 64px', maxWidth: 560, margin: '0 auto' }}>
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
  const pauseSuffix = r.status === 'paused' ? ' — paused' : '';
  return `${prefix} ${days[r.dayOfWeek]} at ${h12}:${m.toString().padStart(2, '0')} ${ampm}, ${r.durationMinutes} minutes${pauseSuffix}.`;
}

const h1Style: React.CSSProperties = {
  fontFamily: 'var(--font-parent-display)', fontSize: 36, fontWeight: 300,
  fontStyle: 'italic', margin: '0 0 16px', color: '#3A3530',
};
const pStyle: React.CSSProperties = {
  fontFamily: 'var(--font-parent-body)', fontSize: 16, color: '#3A3530',
  margin: '0 0 12px', lineHeight: 1.5,
};
const linkBtn: React.CSSProperties = {
  fontFamily: 'var(--font-parent-body)', fontSize: 15, color: '#3A3530',
  textDecoration: 'none', fontWeight: 500, background: 'transparent', border: 'none',
  textAlign: 'left', cursor: 'pointer', padding: '10px 0',
  borderBottom: '1px solid rgba(120,100,70,0.12)',
};
