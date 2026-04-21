'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useSurfaceNext, type SurfaceNext } from '@/hooks/useSurfaceNext';
import { UserMenu } from '@/components/layout/UserMenu';
import CaptureSheet from '@/components/capture/CaptureSheet';
import { SurfaceTherapyCard } from './SurfaceTherapyCard';
import type { Person, PersonManual } from '@/types/person-manual';

/**
 * SurfaceHome — editorial single-page dashboard.
 *
 * Off-white page, generous whitespace, hairline rules, one italic
 * serif headline that carries the day. Everything else is small-
 * caps meta, quiet and tracked. Fits one viewport height. Reads
 * like a magazine cover, not a web app.
 */
export function SurfaceHome() {
  const { user } = useAuth();
  const { state, people, manuals, selfPerson } = useDashboard();
  const next = useSurfaceNext();

  const firstName = user?.name?.split(' ')[0] || '';
  const loading = state === 'loading';

  const familyRows = useMemo(() => {
    const ordered: Array<{ person: Person; manual: PersonManual | null }> = [];
    if (selfPerson) {
      ordered.push({
        person: selfPerson,
        manual: manuals.find((m) => m.personId === selfPerson.personId) ?? null,
      });
    }
    for (const p of people) {
      if (p.personId === selfPerson?.personId) continue;
      ordered.push({
        person: p,
        manual: manuals.find((m) => m.personId === p.personId) ?? null,
      });
    }
    return ordered;
  }, [people, manuals, selfPerson]);

  const openCapture = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('relish:open-capture'));
    }
  };

  const heroCopy = copyFor(next, firstName);

  return (
    <main className="surface">
      <div className="surface-bg" aria-hidden="true" />
      <header className="chrome">
        <a href="/" className="wordmark" aria-label="Relish home">Relish</a>
        <span className="date">{todayLabel()}</span>
      </header>
      <UserMenu />

      <section className="editorial" aria-busy={loading}>
        <p className="eyebrow">
          {firstName ? `Hello, ${firstName}` : 'Hello'}
        </p>

        <h1 className="headline">{heroCopy.headline}</h1>

        <p className="sub">{heroCopy.body}</p>

        {heroCopy.href && (
          <Link href={heroCopy.href} className="cta">
            <span>{heroCopy.ctaLabel}</span>
            <span className="arrow" aria-hidden="true">→</span>
          </Link>
        )}
      </section>

      <section className="family" aria-label="Family">
        <div className="section-head">
          <span className="section-label">The family</span>
        </div>
        <ul className="roster">
          {familyRows.map(({ person, manual }) => (
            <PersonRow
              key={person.personId}
              person={person}
              manual={manual}
              isSelf={person.personId === selfPerson?.personId}
            />
          ))}
          <li className="add-row">
            <Link href="/people" className="add-link">
              <span className="add-glyph" aria-hidden="true">+</span>
              <span>Add someone</span>
            </Link>
          </li>
        </ul>
      </section>

      <div className="therapy-row">
        <SurfaceTherapyCard />
      </div>

      <nav className="dock" aria-label="Quick actions">
        <button type="button" className="dock-btn dock-primary" onClick={openCapture}>
          <span className="dock-glyph" aria-hidden="true">✎</span>
          <span>Drop a thought</span>
        </button>
        <Link href="/journal" className="dock-btn">
          <span>Journal</span>
        </Link>
      </nav>

      <CaptureSheet />

      <style jsx>{`
        .surface {
          position: relative;
          height: 100vh;
          overflow: hidden;
          background: #fafaf7;
          color: #0f0f0d;
          display: grid;
          grid-template-rows: auto 1fr auto auto;
          gap: 0;
          padding: 28px 48px 24px;
          font-family: 'Times New Roman', Georgia, serif;
        }
        .surface-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          background-image: url('/images/scottring-balto_Editorial_still_life_photograph_of_exactly_tw_b0defca1-17b3-48bf-8a21-5705c7afb98c_1.png');
          background-size: cover;
          background-position: center;
          pointer-events: none;
        }
        .surface-bg::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse at center,
            rgba(250, 250, 247, 0.92) 0%,
            rgba(250, 250, 247, 0.82) 40%,
            rgba(250, 250, 247, 0.45) 100%
          );
        }
        .surface > :global(*:not(.surface-bg)) {
          position: relative;
          z-index: 1;
        }

        /* ─── Chrome ───────────────────────────────────────── */
        .chrome {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          padding-bottom: 16px;
          border-bottom: 1px solid #1a1a18;
          padding-right: 64px;
        }
        .wordmark {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-size: 22px;
          letter-spacing: 0;
          color: #0f0f0d;
          text-decoration: none;
        }
        .date {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: #6b6b68;
        }

        /* ─── Editorial hero ──────────────────────────────── */
        .editorial {
          align-self: center;
          justify-self: center;
          max-width: 720px;
          width: 100%;
          text-align: center;
          padding: 8px 16px;
        }
        .eyebrow {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 11px;
          letter-spacing: 0.36em;
          text-transform: uppercase;
          color: #6b6b68;
          margin: 0 0 22px;
        }
        .headline {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-weight: 400;
          font-size: clamp(44px, 6.2vw, 84px);
          line-height: 0.98;
          letter-spacing: -0.015em;
          color: #0a0a08;
          margin: 0 0 24px;
        }
        .sub {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(15px, 1.15vw, 17px);
          line-height: 1.55;
          color: #3d3d39;
          max-width: 520px;
          margin: 0 auto 28px;
        }
        .cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 11px;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: #0a0a08;
          text-decoration: none;
          padding: 12px 0;
          border-bottom: 1px solid #0a0a08;
          transition: gap 180ms ease, letter-spacing 180ms ease;
        }
        .cta:hover {
          gap: 18px;
        }
        .cta .arrow {
          transition: transform 180ms ease;
        }
        .cta:hover .arrow {
          transform: translateX(2px);
        }

        /* ─── Family roster ──────────────────────────────── */
        .family {
          border-top: 1px solid #1a1a18;
          padding-top: 14px;
          min-height: 0;
        }
        .section-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .section-label {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: #6b6b68;
        }
        .section-link {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          color: #6b6b68;
          text-decoration: none;
          transition: color 160ms ease;
        }
        .section-link:hover {
          color: #0a0a08;
        }
        .roster {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
        }
        .add-row {
          border-top: 1px solid rgba(10, 10, 8, 0.08);
        }
        .add-link {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 0;
          color: #6b6b68;
          text-decoration: none;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          transition: color 160ms ease;
        }
        .add-link:hover {
          color: #0a0a08;
        }
        .add-glyph {
          font-size: 18px;
          width: 26px;
          text-align: center;
          color: #6b6b68;
        }

        /* ─── Therapy row ────────────────────────────────── */
        .therapy-row {
          padding-bottom: 12px;
        }

        /* ─── Dock ────────────────────────────────────────── */
        .dock {
          display: flex;
          gap: 12px;
          justify-content: center;
          padding-top: 16px;
          border-top: 1px solid #1a1a18;
        }
        .dock-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 11px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #0a0a08;
          text-decoration: none;
          padding: 10px 20px;
          border: 1px solid #0a0a08;
          border-radius: 2px;
          background: transparent;
          cursor: pointer;
          transition: background 160ms ease, color 160ms ease;
        }
        .dock-btn:hover {
          background: rgba(10, 10, 8, 0.06);
        }
        .dock-primary {
          background: #0a0a08;
          color: #fafaf7;
        }
        .dock-primary:hover {
          background: #000;
        }
        .dock-glyph {
          font-family: Georgia, serif;
          font-size: 13px;
        }

        @media (max-width: 820px) {
          .surface {
            height: auto;
            min-height: 100vh;
            overflow: auto;
            padding: 24px 24px 20px;
          }
          .editorial {
            padding: 32px 0;
          }
        }
      `}</style>
    </main>
  );
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

// ────────────────────────────────────────────────────────────────

interface HeroCopy {
  headline: string;
  body: string;
  ctaLabel: string;
  href: string | null;
}

function copyFor(next: SurfaceNext, firstName: string): HeroCopy {
  if (!next) {
    return {
      headline: 'All quiet today.',
      body: firstName
        ? `You're caught up, ${firstName}. Drop a thought when something surfaces.`
        : "You're caught up. Drop a thought when something surfaces.",
      ctaLabel: 'Open the journal',
      href: '/journal',
    };
  }
  switch (next.kind) {
    case 'finish-self-onboard':
      return {
        headline: 'Your manual starts with you.',
        body:
          'Answer a handful of questions so everyone else has something to respond to.',
        ctaLabel: 'Begin',
        href: next.href,
      };
    case 'resume-draft':
      return {
        headline: `Finish what you started${
          next.subjectName ? `\nabout ${next.subjectName}` : ''
        }.`,
        body: 'Pick up where you left off.',
        ctaLabel: 'Continue',
        href: next.href,
      };
    case 'contribute-about':
      return {
        headline: `Say what you see in ${next.person.name}.`,
        body:
          'Your observations round out the picture — the magic is in the synthesis of perspectives.',
        ctaLabel: 'Contribute',
        href: next.href,
      };
    case 'fresh-synthesis':
      return {
        headline: `A new read on ${next.manual.personName}.`,
        body:
          truncate(next.manual.synthesizedContent?.overview || 'New patterns surfaced.', 200),
        ctaLabel: "See what's new",
        href: next.href,
      };
  }
}

// ────────────────────────────────────────────────────────────────
// PersonRow — editorial roster line with hairline rule
// ────────────────────────────────────────────────────────────────

function PersonRow({
  person,
  manual,
  isSelf,
}: {
  person: Person;
  manual: PersonManual | null;
  isSelf: boolean;
}) {
  const hasSynthesis = Boolean(manual?.synthesizedContent?.overview);
  const hasContribs = (manual?.contributionIds?.length ?? 0) > 0;
  const status = hasSynthesis
    ? 'Synthesized'
    : hasContribs
    ? 'In progress'
    : 'Awaiting perspectives';
  return (
    <li className="row-item">
      <Link href={`/journal?focus=${person.personId}`} className="row">
        <span className="name">{person.name}</span>
        {isSelf && <span className="tag">You</span>}
        <span className="spacer" aria-hidden="true" />
        <span className="status">{status}</span>
        <span className="chev" aria-hidden="true">→</span>
      </Link>
      <style jsx>{`
        .row-item {
          border-top: 1px solid rgba(10, 10, 8, 0.08);
        }
        .row-item:last-child {
          border-bottom: 1px solid rgba(10, 10, 8, 0.08);
        }
        .row {
          display: flex;
          align-items: baseline;
          padding: 14px 0;
          color: #0a0a08;
          text-decoration: none;
          transition: background 140ms ease;
        }
        .row:hover {
          background: rgba(10, 10, 8, 0.03);
        }
        .name {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 17px;
          line-height: 1;
          color: #0a0a08;
          margin-right: 12px;
        }
        .tag {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 8px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #6b6b68;
        }
        .spacer {
          flex: 1;
        }
        .status {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          color: #6b6b68;
          white-space: nowrap;
          margin-right: 16px;
        }
        .chev {
          font-family: -apple-system, sans-serif;
          color: #6b6b68;
          transition: transform 160ms ease, color 160ms ease;
        }
        .row:hover .chev {
          transform: translateX(2px);
          color: #0a0a08;
        }
      `}</style>
    </li>
  );
}

// ────────────────────────────────────────────────────────────────

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max).trim() + '…';
}
