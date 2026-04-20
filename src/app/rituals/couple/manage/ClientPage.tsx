'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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

  if (loading) return <Chrome><p className="muted">Loading&hellip;</p></Chrome>;
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
      <p className="eyebrow">Your couple ritual</p>
      <div className="hero">
        <div className="hero-image">
          <Image
            src="/images/two-books.png"
            alt=""
            fill
            sizes="(max-width: 720px) 100vw, 320px"
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        </div>
        <div className="hero-body">
          <h1 className="title">{summarize(ritual)}</h1>
          {ritual.intention && <p className="intention">&ldquo;{ritual.intention}&rdquo;</p>}
          {spouseName && (
            <p className="with">with {spouseName}</p>
          )}
        </div>
      </div>

      <section className="actions">
        <p className="section-eyebrow">Adjustments</p>
        <Link href="/rituals/couple/setup" className="action-row">
          <span className="action-label">Change time, day, or cadence</span>
          <span className="action-arrow" aria-hidden="true">&rarr;</span>
        </Link>
        <button onClick={handleRedownload} className="action-row">
          <span className="action-label">Download calendar invite</span>
          <span className="action-arrow" aria-hidden="true">&#8599;</span>
        </button>
        {ritual.status === 'active' ? (
          <button onClick={pauseRitual} className="action-row">
            <span className="action-label">Pause</span>
            <span className="action-arrow" aria-hidden="true">&#9208;</span>
          </button>
        ) : (
          <button onClick={resumeRitual} className="action-row">
            <span className="action-label">Resume</span>
            <span className="action-arrow" aria-hidden="true">&#9654;</span>
          </button>
        )}
        <button onClick={handleEnd} className="action-row danger">
          <span className="action-label">End ritual</span>
          <span className="action-arrow" aria-hidden="true">&times;</span>
        </button>
      </section>

      <style jsx>{`
        .eyebrow {
          font-family: var(--font-parent-body);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #8B7D63;
          margin: 0 0 28px;
        }
        .hero {
          background: #F3F1EC;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04), 0 12px 36px rgba(80, 70, 50, 0.10);
          margin-bottom: 56px;
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: 200px 1fr;
        }
        .hero-image {
          position: relative;
        }
        .hero-body {
          padding: 32px 36px 36px;
        }
        .title {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 300;
          font-size: clamp(26px, 4vw, 36px);
          line-height: 1.2;
          letter-spacing: -0.01em;
          color: #2B2620;
          margin: 0 0 14px;
        }
        .intention {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 17px;
          color: #6B6254;
          line-height: 1.5;
          margin: 0 0 10px;
        }
        .with {
          font-family: var(--font-parent-body);
          font-size: 13px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #8B7D63;
          margin: 0;
        }
        .actions {
          margin-top: 0;
        }
        .section-eyebrow {
          font-family: var(--font-parent-body);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #5C5347;
          margin: 0 0 12px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(120, 100, 70, 0.12);
        }
        .action-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 20px 4px;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(120, 100, 70, 0.12);
          font-family: var(--font-parent-body);
          font-size: 15px;
          color: #3A3530;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.15s ease, padding 0.15s ease;
          text-align: left;
        }
        .action-row:hover {
          background: rgba(120, 100, 70, 0.04);
          padding-left: 12px;
          padding-right: 12px;
        }
        .action-row.danger {
          color: #B06757;
        }
        .action-label {
          font-weight: 500;
        }
        .action-arrow {
          font-family: var(--font-parent-body);
          color: #8B7D63;
          font-size: 14px;
        }
        .muted {
          color: #8B7D63;
          font-family: var(--font-parent-body);
        }
        @media (min-width: 720px) {
          .hero {
            grid-template-columns: 280px 1fr;
            grid-template-rows: 1fr;
            min-height: 260px;
          }
        }
      `}</style>
    </Chrome>
  );
}

function Chrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="ritual-page">
        <div className="page-inner">{children}</div>
      </main>
      <style jsx>{`
        .ritual-page {
          min-height: 100vh;
          background:
            radial-gradient(ellipse at 20% -10%, rgba(124, 144, 130, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 85% 110%, rgba(212, 168, 114, 0.05) 0%, transparent 50%),
            #FAF8F3;
          padding: 112px 24px 96px;
        }
        .page-inner {
          max-width: 680px;
          margin: 0 auto;
        }
      `}</style>
    </>
  );
}

function summarize(r: { cadence: string; dayOfWeek: number; startTimeLocal: string; durationMinutes: number; status: string }): string {
  const days = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  const [h, m] = r.startTimeLocal.split(':').map((n) => parseInt(n, 10));
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  const prefix = r.cadence === 'weekly' ? 'Every' : r.cadence === 'biweekly' ? 'Every other' : 'Monthly on';
  const pauseSuffix = r.status === 'paused' ? ' \u2014 paused' : '';
  return `${prefix} ${days[r.dayOfWeek]} at ${h12}:${m.toString().padStart(2, '0')} ${ampm}, ${r.durationMinutes} minutes${pauseSuffix}.`;
}
