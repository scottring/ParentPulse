'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  ArrowRight,
  Feather,
  Leaf,
  BookOpen,
  MessageCircleQuestion,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useSurfaceNext, type SurfaceNext } from '@/hooks/useSurfaceNext';
import { UserMenu } from '@/components/layout/UserMenu';
import CaptureSheet from '@/components/capture/CaptureSheet';
import type { Person, PersonManual } from '@/types/person-manual';

// ────────────────────────────────────────────────────────────────
// Soft warm accent palette — cycled across family members so each
// person carries a distinct visual temperature.
// ────────────────────────────────────────────────────────────────
const ACCENTS = [
  { bg: '#d4b483', ring: '#8a6a9a' }, // sand / violet
  { bg: '#c8a18a', ring: '#b94a3b' }, // clay / coral
  { bg: '#a8b89a', ring: '#6a8a6a' }, // sage / green
  { bg: '#c8b89a', ring: '#c89b3b' }, // wheat / gold
  { bg: '#c0a8b8', ring: '#7a3060' }, // mauve / plum
];

function accentFor(index: number) {
  return ACCENTS[index % ACCENTS.length];
}

/**
 * SurfaceHome — visual dashboard.
 *
 * Three regions, fit to viewport:
 *   1. Greeting strip (wordmark + warm hello)
 *   2. Main row:
 *      • Hero: the one thing worth doing right now
 *      • Family: avatar tiles for each person's manual state
 *   3. Action dock: quick capture / journal / ask
 *
 * Every element is a target. No passive copy, no redundant links.
 */
export function SurfaceHome() {
  const { user } = useAuth();
  const { state, people, manuals, selfPerson } = useDashboard();
  const next = useSurfaceNext();

  const firstName = user?.name?.split(' ')[0] || '';
  const loading = state === 'loading';

  // Everyone except self, ordered by contribution completeness so
  // people who need attention surface to the top-left of the grid.
  const familyTiles = useMemo(() => {
    const otherPeople = people.filter(
      (p) => p.personId !== selfPerson?.personId
    );
    const manualByPerson = new Map(manuals.map((m) => [m.personId, m]));
    return otherPeople.map((p) => ({
      person: p,
      manual: manualByPerson.get(p.personId) ?? null,
    }));
  }, [people, selfPerson, manuals]);

  const openCapture = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('relish:open-capture'));
    }
  };

  return (
    <main className="surface">
      <div className="surface-bg" aria-hidden="true" />

      <header className="chrome">
        <a href="/" className="wordmark" aria-label="Relish home">Relish</a>
        <div className="hello-line">
          <span className="hello">
            {firstName ? `Hello, ${firstName}` : 'Hello'}
          </span>
          <span className="sep" aria-hidden="true">·</span>
          <span className="date">{todayLabel()}</span>
        </div>
      </header>
      <UserMenu />

      <section className="stage" aria-busy={loading}>
        <HeroPanel next={next} firstName={firstName} loading={loading} />

        <aside className="family">
          <div className="family-head">
            <span className="family-kicker">The family</span>
            <Link href="/people" className="family-manage" aria-label="Manage people">
              Manage
            </Link>
          </div>
          <div className="family-grid">
            {selfPerson && (
              <PersonTile
                key={selfPerson.personId}
                person={selfPerson}
                manual={
                  manuals.find((m) => m.personId === selfPerson.personId) ?? null
                }
                accent={accentFor(0)}
                isSelf
              />
            )}
            {familyTiles.map(({ person, manual }, i) => (
              <PersonTile
                key={person.personId}
                person={person}
                manual={manual}
                accent={accentFor(i + 1)}
              />
            ))}
            <AddPersonTile />
          </div>
        </aside>
      </section>

      <nav className="dock" aria-label="Quick actions">
        <button type="button" className="dock-btn primary" onClick={openCapture}>
          <Feather size={15} strokeWidth={1.5} />
          <span>Drop a thought</span>
        </button>
        <Link href="/journal" className="dock-btn">
          <BookOpen size={15} strokeWidth={1.5} />
          <span>Journal</span>
        </Link>
        <Link href="/people" className="dock-btn">
          <MessageCircleQuestion size={15} strokeWidth={1.5} />
          <span>Ask a manual</span>
        </Link>
      </nav>

      <CaptureSheet />

      <style jsx>{`
        .surface {
          position: relative;
          height: 100vh;
          overflow: hidden;
          color: #2a1f14;
          display: flex;
          flex-direction: column;
          padding: 22px 32px 24px;
          gap: 20px;
        }
        .surface-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(
              ellipse at 30% 30%,
              rgba(243, 234, 214, 0.98) 0%,
              rgba(238, 224, 198, 0.94) 50%,
              rgba(205, 182, 148, 0.88) 100%
            ),
            url('/images/home-table.png') center / cover no-repeat;
        }
        .chrome {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: baseline;
          gap: 24px;
          padding-right: 72px;
        }
        .wordmark {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-size: 22px;
          color: #2a1f14;
          text-decoration: none;
          transition: color 140ms ease, transform 140ms ease;
        }
        .wordmark:hover {
          color: #1a120a;
          transform: translateY(-1px);
        }
        .hello-line {
          display: inline-flex;
          align-items: baseline;
          gap: 10px;
          color: #5a4628;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
        }
        .hello {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-size: 16px;
          color: #3d2f1f;
        }
        .sep {
          opacity: 0.5;
        }
        .date {
          font-size: 10px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8a6f4a;
        }
        .stage {
          position: relative;
          z-index: 1;
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
          gap: 24px;
        }
        .family {
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .family-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .family-kicker {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8a6f4a;
        }
        .family-manage {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #8a6f4a;
          text-decoration: none;
          transition: color 140ms ease;
        }
        .family-manage:hover {
          color: #2a1f14;
        }
        .family-grid {
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          grid-auto-rows: 1fr;
          gap: 12px;
          overflow: hidden;
        }
        .dock {
          position: relative;
          z-index: 2;
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .dock-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 22px;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          text-decoration: none;
          border: 1px solid rgba(138, 111, 74, 0.4);
          background: rgba(255, 250, 240, 0.7);
          color: #5a4628;
          cursor: pointer;
          transition: background 140ms ease, color 140ms ease, transform 140ms ease;
        }
        .dock-btn:hover {
          background: rgba(255, 250, 240, 1);
          color: #2a1f14;
          transform: translateY(-1px);
        }
        .dock-btn.primary {
          background: #2a1f14;
          color: #f5ecd8;
          border-color: #2a1f14;
        }
        .dock-btn.primary:hover {
          background: #1a120a;
          color: #f5ecd8;
        }
        @media (max-width: 900px) {
          .surface {
            height: auto;
            min-height: 100vh;
            overflow: auto;
            padding: 20px 18px 24px;
          }
          .chrome {
            flex-direction: column;
            gap: 4px;
          }
          .stage {
            grid-template-columns: 1fr;
          }
          .family-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 500px) {
          .family-grid {
            grid-template-columns: repeat(2, 1fr);
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
// Hero panel — big, image-rich
// ────────────────────────────────────────────────────────────────

function HeroPanel({
  next,
  firstName,
  loading,
}: {
  next: SurfaceNext;
  firstName: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <section className="hero">
        <p className="loading">Loading…</p>
        <HeroStyles />
      </section>
    );
  }

  if (!next) {
    return (
      <section className="hero hero-calm">
        <div className="hero-glyph" style={{ background: 'rgba(106, 138, 106, 0.18)', color: '#5a7a5a' }}>
          <Leaf size={30} strokeWidth={1.25} />
        </div>
        <p className="hero-eyebrow" style={{ color: '#6a8a6a' }}>All quiet</p>
        <h1 className="hero-headline">
          {firstName ? `You're caught up, ${firstName}.` : "You're caught up."}
        </h1>
        <p className="hero-body">
          Nothing's pressing. Drop a thought when one surfaces, or revisit the
          journal when you want to read.
        </p>
        <HeroStyles />
      </section>
    );
  }

  const { icon: Icon, eyebrow, headline, body, ctaLabel, href, glyphTone } =
    heroCopyFor(next);

  return (
    <section className="hero">
      <div className="hero-glyph" style={{ background: glyphTone.bg, color: glyphTone.fg }}>
        <Icon size={30} strokeWidth={1.25} />
      </div>
      <p className="hero-eyebrow" style={{ color: glyphTone.fg }}>{eyebrow}</p>
      <h1 className="hero-headline">{headline}</h1>
      <p className="hero-body">{body}</p>
      <Link href={href} className="hero-cta">
        <span>{ctaLabel}</span>
        <ArrowRight size={14} strokeWidth={1.5} />
      </Link>
      <HeroStyles />
    </section>
  );
}

function HeroStyles() {
  return (
    <style jsx>{`
      .hero {
        position: relative;
        background:
          linear-gradient(
            135deg,
            rgba(255, 250, 240, 0.92) 0%,
            rgba(243, 227, 198, 0.85) 100%
          );
        border: 1px solid rgba(138, 111, 74, 0.22);
        border-radius: 16px;
        padding: 36px 40px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        min-height: 0;
        overflow: hidden;
        box-shadow: 0 8px 28px rgba(30, 20, 10, 0.08);
      }
      .hero::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
          radial-gradient(
            circle at 85% 20%,
            rgba(212, 180, 131, 0.35) 0%,
            transparent 50%
          );
        pointer-events: none;
      }
      .hero-glyph {
        position: absolute;
        top: 32px;
        right: 36px;
        width: 58px;
        height: 58px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .hero-eyebrow {
        font-family: -apple-system, 'Helvetica Neue', sans-serif;
        font-size: 10px;
        letter-spacing: 0.3em;
        text-transform: uppercase;
        font-weight: 700;
        margin: 0 0 12px;
      }
      .hero-headline {
        font-family: Georgia, 'Times New Roman', serif;
        font-style: italic;
        font-weight: 400;
        font-size: clamp(24px, 2.6vw, 34px);
        line-height: 1.2;
        color: #2a1f14;
        margin: 0 0 12px;
        max-width: 520px;
      }
      .hero-body {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 15px;
        line-height: 1.55;
        color: #5a4628;
        margin: 0 0 22px;
        max-width: 480px;
      }
      .hero-cta {
        align-self: flex-start;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: #2a1f14;
        color: #f5ecd8;
        padding: 12px 22px;
        border-radius: 22px;
        font-family: -apple-system, 'Helvetica Neue', sans-serif;
        font-size: 11px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        text-decoration: none;
        transition: background 140ms ease, transform 140ms ease;
      }
      .hero-cta:hover {
        background: #1a120a;
        transform: translateY(-1px);
      }
      .loading {
        font-family: Georgia, serif;
        font-style: italic;
        color: #8a6f4a;
        margin: auto;
      }
    `}</style>
  );
}

function heroCopyFor(next: NonNullable<SurfaceNext>) {
  switch (next.kind) {
    case 'finish-self-onboard':
      return {
        icon: Feather,
        eyebrow: 'Start here',
        headline: 'Your manual starts with you',
        body:
          'Answer a handful of questions so everyone else has something to respond to.',
        ctaLabel: 'Begin self-onboard',
        href: next.href,
        glyphTone: { bg: 'rgba(138, 106, 154, 0.18)', fg: '#6a4a8a' },
      };
    case 'resume-draft':
      return {
        icon: Feather,
        eyebrow: 'Unfinished',
        headline: `Resume your draft about ${next.subjectName}`,
        body: 'Pick up where you left off.',
        ctaLabel: 'Continue',
        href: next.href,
        glyphTone: { bg: 'rgba(184, 142, 90, 0.22)', fg: '#8a5f3a' },
      };
    case 'contribute-about':
      return {
        icon: Users,
        eyebrow: 'Add a perspective',
        headline: `Say what you see in ${next.person.name}`,
        body:
          "Your observations round out the picture — the magic is in the synthesis of perspectives.",
        ctaLabel: 'Contribute',
        href: next.href,
        glyphTone: { bg: 'rgba(106, 138, 106, 0.2)', fg: '#4d6e4d' },
      };
    case 'fresh-synthesis':
      return {
        icon: Sparkles,
        eyebrow: 'New synthesis',
        headline: `A fresh read on ${next.manual.personName}`,
        body:
          truncate(next.manual.synthesizedContent?.overview || 'New patterns surfaced.', 200),
        ctaLabel: "See what's new",
        href: next.href,
        glyphTone: { bg: 'rgba(138, 106, 154, 0.2)', fg: '#6a4a8a' },
      };
  }
}

// ────────────────────────────────────────────────────────────────
// Person tile — avatar with a ring whose fill shows the current
// "state" of that person's manual. Links into their drill-down.
// ────────────────────────────────────────────────────────────────

function PersonTile({
  person,
  manual,
  accent,
  isSelf = false,
}: {
  person: Person;
  manual: PersonManual | null;
  accent: { bg: string; ring: string };
  isSelf?: boolean;
}) {
  const hasSynthesis = Boolean(manual?.synthesizedContent?.overview);
  const hasContribs = (manual?.contributionIds?.length ?? 0) > 0;
  const statusLabel = hasSynthesis
    ? 'Synthesized'
    : hasContribs
    ? 'In progress'
    : 'Empty';
  const statusDot = hasSynthesis ? '#6a8a6a' : hasContribs ? '#c89b3b' : '#b0956a';
  const initial = person.name.charAt(0).toUpperCase();
  const firstName = person.name.split(' ')[0];

  return (
    <Link
      href={`/people/${person.personId}/manual`}
      className="tile"
      aria-label={`${person.name} — ${statusLabel}`}
    >
      <div className="tile-avatar" style={{ background: accent.bg }}>
        <span>{initial}</span>
        {isSelf && <span className="tile-self">You</span>}
      </div>
      <div className="tile-meta">
        <span className="tile-name">{firstName}</span>
        <span className="tile-status">
          <span className="tile-dot" style={{ background: statusDot }} aria-hidden="true" />
          {statusLabel}
        </span>
      </div>
      <style jsx>{`
        .tile {
          position: relative;
          border-radius: 14px;
          background: rgba(255, 250, 240, 0.82);
          border: 1px solid rgba(138, 111, 74, 0.22);
          padding: 14px 14px 12px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 10px;
          text-decoration: none;
          transition: background 140ms ease, transform 140ms ease, box-shadow 140ms ease;
          min-height: 0;
          overflow: hidden;
        }
        .tile:hover {
          background: rgba(255, 250, 240, 1);
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(30, 20, 10, 0.1);
        }
        .tile-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          color: #2a1f14;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 15px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #f5ecd8;
          position: relative;
        }
        .tile-self {
          position: absolute;
          bottom: -6px;
          right: -10px;
          background: #2a1f14;
          color: #f5ecd8;
          font-size: 7px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          padding: 2px 5px;
          border-radius: 8px;
          font-weight: 700;
        }
        .tile-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .tile-name {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-size: 16px;
          color: #2a1f14;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tile-status {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 9px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #8a6f4a;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .tile-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
      `}</style>
    </Link>
  );
}

function AddPersonTile() {
  return (
    <Link href="/people" className="add-tile" aria-label="Add a family member">
      <Plus size={22} strokeWidth={1.5} />
      <span>Add someone</span>
      <style jsx>{`
        .add-tile {
          border-radius: 14px;
          background: transparent;
          border: 1.5px dashed rgba(138, 111, 74, 0.4);
          padding: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          text-decoration: none;
          color: #8a6f4a;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          transition: background 140ms ease, color 140ms ease, border-color 140ms ease;
          min-height: 0;
        }
        .add-tile:hover {
          background: rgba(255, 250, 240, 0.7);
          color: #2a1f14;
          border-color: rgba(138, 111, 74, 0.7);
        }
      `}</style>
    </Link>
  );
}

// ────────────────────────────────────────────────────────────────

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max).trim() + '…';
}
