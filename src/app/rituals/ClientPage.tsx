'use client';

import Link from 'next/link';
import Image from 'next/image';
import Navigation from '@/components/layout/Navigation';
import { useCoupleRitual } from '@/hooks/useCoupleRitual';
import { useSpouse } from '@/hooks/useSpouse';

export default function ClientPage() {
  const { ritual, loading } = useCoupleRitual();
  const { spouseName, loading: spouseLoading } = useSpouse();

  if (loading || spouseLoading) {
    return (
      <Chrome>
        <p className="muted">Loading&hellip;</p>
      </Chrome>
    );
  }

  return (
    <Chrome>
      <p className="eyebrow">Rituals</p>
      <h1 className="title">
        Quiet rhythms <span className="italic">for two</span>.
      </h1>
      <p className="lede">
        A ritual is a recurring moment you set aside on purpose. Between rituals,
        Relish stays out of your way.
      </p>

      <section className="ritual-section">
        <div className="section-head">
          <p className="section-eyebrow">Your couple check-in</p>
        </div>

        {!ritual && (
          <div className="empty-card">
            <div className="empty-image">
              <Image
                src="/images/two-books.png"
                alt=""
                fill
                sizes="(max-width: 720px) 100vw, 720px"
                style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
              />
              <div className="empty-image-overlay" />
            </div>
            <div className="empty-body">
              <h2 className="card-heading">
                {spouseName
                  ? `A weekly moment with ${spouseName}.`
                  : `Add your partner first.`}
              </h2>
              <p className="card-copy">
                {spouseName
                  ? `Pick a day and time together, on one device. A small ceremony that keeps the big conversations current.`
                  : `Couple rituals need both of you in the family. Once your partner is here, set it up together.`}
              </p>
              {spouseName ? (
                <Link href="/rituals/couple/setup" className="cta">
                  Set up your check-in
                  <span className="cta-arrow" aria-hidden="true">&#8599;</span>
                </Link>
              ) : (
                <Link href="/settings" className="cta">
                  Go to Settings
                  <span className="cta-arrow" aria-hidden="true">&#8599;</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {ritual && (
          <div className="active-card">
            <div className="active-image">
              <Image
                src="/images/two-books.png"
                alt=""
                fill
                sizes="(max-width: 720px) 100vw, 240px"
                style={{ objectFit: 'cover', objectPosition: 'center' }}
              />
            </div>
            <div className="active-body">
              <h2 className="card-heading">{summarize(ritual)}</h2>
              {ritual.intention && (
                <p className="intention">&ldquo;{ritual.intention}&rdquo;</p>
              )}
              <Link href="/rituals/couple/manage" className="manage-link">
                Manage <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        )}
      </section>

      <style jsx>{`
        .eyebrow {
          font-family: var(--font-parent-body);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #8B7D63;
          margin: 0 0 24px;
        }
        .title {
          font-family: var(--font-parent-display);
          font-weight: 300;
          font-size: clamp(36px, 5vw, 52px);
          line-height: 1.08;
          letter-spacing: -0.02em;
          color: #2B2620;
          margin: 0 0 20px;
        }
        .title .italic {
          font-style: italic;
          color: #7C9082;
        }
        .lede {
          font-family: var(--font-parent-body);
          font-size: 17px;
          line-height: 1.55;
          color: #5C5347;
          margin: 0 0 56px;
          max-width: 52ch;
        }
        .muted {
          font-family: var(--font-parent-body);
          color: #8B7D63;
        }
        .ritual-section {
          margin-bottom: 64px;
        }
        .section-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(120, 100, 70, 0.12);
          padding-bottom: 16px;
        }
        .section-eyebrow {
          font-family: var(--font-parent-body);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #5C5347;
          margin: 0;
        }
        .empty-card {
          background: #F3F1EC;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04), 0 12px 36px rgba(80, 70, 50, 0.10);
          display: grid;
          grid-template-rows: auto 1fr;
        }
        .empty-image {
          position: relative;
          height: 260px;
          overflow: hidden;
        }
        .empty-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(20, 16, 12, 0) 0%,
            rgba(20, 16, 12, 0) 65%,
            rgba(243, 241, 236, 0.9) 100%
          );
          pointer-events: none;
        }
        .empty-body {
          padding: 32px 36px 40px;
        }
        .card-heading {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 300;
          font-size: clamp(24px, 3.2vw, 32px);
          line-height: 1.2;
          letter-spacing: -0.01em;
          color: #2B2620;
          margin: 0 0 14px;
        }
        .card-copy {
          font-family: var(--font-parent-body);
          font-size: 15px;
          line-height: 1.6;
          color: #5C5347;
          margin: 0 0 24px;
          max-width: 48ch;
        }
        .cta {
          display: inline-flex;
          align-items: baseline;
          gap: 10px;
          padding: 13px 26px;
          background: #7C9082;
          color: #FAF8F3;
          border-radius: 999px;
          text-decoration: none;
          font-family: var(--font-parent-body);
          font-size: 15px;
          font-weight: 500;
          letter-spacing: 0.02em;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08), 0 4px 12px rgba(80, 100, 85, 0.22);
          transition: background 0.2s ease, transform 0.15s ease;
        }
        .cta:hover {
          background: #6E8275;
          transform: translateY(-1px);
        }
        .cta-arrow {
          font-size: 14px;
        }
        .active-card {
          background: #F3F1EC;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04), 0 12px 36px rgba(80, 70, 50, 0.10);
          display: grid;
          grid-template-columns: 1fr;
        }
        .active-image {
          position: relative;
          height: 180px;
        }
        .active-body {
          padding: 28px 32px 32px;
        }
        .intention {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 17px;
          color: #6B6254;
          line-height: 1.5;
          margin: 0 0 20px;
        }
        .manage-link {
          display: inline-flex;
          align-items: baseline;
          gap: 6px;
          font-family: var(--font-parent-body);
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #3A3530;
          text-decoration: none;
          border-bottom: 1px solid #7C9082;
          padding-bottom: 2px;
        }
        .manage-link:hover {
          opacity: 0.75;
        }
        @media (min-width: 720px) {
          .active-card {
            grid-template-columns: 240px 1fr;
          }
          .active-image {
            height: auto;
          }
        }
      `}</style>
    </Chrome>
  );
}

function Chrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      <main className="ritual-page">
        <div className="page-inner">
          {children}
        </div>
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
          max-width: 760px;
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
  const pauseSuffix = r.status === 'paused' ? ' (paused)' : '';
  return `${prefix} ${days[r.dayOfWeek]} at ${h12}:${m.toString().padStart(2, '0')} ${ampm}, ${r.durationMinutes} minutes${pauseSuffix}.`;
}
