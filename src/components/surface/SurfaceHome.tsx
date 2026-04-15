'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  ArrowRight,
  Compass,
  Feather,
  Leaf,
  MessageCircleQuestion,
  Users,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useSurfaceNext, type SurfaceNext } from '@/hooks/useSurfaceNext';
import { useEntries } from '@/hooks/useEntries';
import { UserMenu } from '@/components/layout/UserMenu';
import CaptureSheet from '@/components/capture/CaptureSheet';
import type { Entry } from '@/types/entry';
import type { PersonManual } from '@/types/person-manual';

/**
 * SurfaceHome — single-viewport bento dashboard.
 *
 * No vertical scrolling. Four cells in a responsive grid:
 *   1. Next Thing    — the single most important action right now
 *   2. Synthesis     — the freshest cross-perspective insight
 *   3. Quick capture — drop a thought without leaving the surface
 *   4. Recent        — one glance at the most recent journal entry
 *
 * Every cell is a destination or an action. Nothing is passive.
 */
export function SurfaceHome() {
  const { user } = useAuth();
  const { state, manuals } = useDashboard();
  const next = useSurfaceNext();
  const { entries } = useEntries({ familyId: user?.familyId ?? null, filter: {} });

  const firstName = user?.name?.split(' ')[0] || '';
  const loading = state === 'loading';

  const heroManualId =
    next?.kind === 'fresh-synthesis' ? next.manual.manualId : null;
  const secondarySynth = useMemo(
    () =>
      [...manuals]
        .filter((m) => Boolean(m.synthesizedContent?.overview))
        .filter((m) => m.manualId !== heroManualId)
        .sort(
          (a, b) =>
            (b.synthesizedContent?.lastSynthesizedAt?.toMillis?.() ?? 0) -
            (a.synthesizedContent?.lastSynthesizedAt?.toMillis?.() ?? 0)
        )[0] || null,
    [manuals, heroManualId]
  );

  const mostRecentEntry = entries[0] ?? null;

  const openCapture = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('relish:open-capture'));
    }
  };

  return (
    <main className="surface">
      <div className="surface-bg" aria-hidden="true" />

      <header className="surface-head">
        <a href="/" className="wordmark" aria-label="Relish home">Relish</a>
        <div className="greeting">
          <span className="eyebrow">Today</span>
          <span className="hello">{firstName ? `Hello, ${firstName}.` : 'Hello.'}</span>
        </div>
      </header>
      <UserMenu />

      <section className="bento" aria-busy={loading}>
        <NextCell next={next} loading={loading} firstName={firstName} />
        <SynthCell manual={secondarySynth} />
        <CaptureCell onCapture={openCapture} />
        <RecentCell entry={mostRecentEntry} />
      </section>

      <CaptureSheet />

      <style jsx>{`
        .surface {
          position: relative;
          min-height: 100vh;
          height: 100vh;
          overflow: hidden;
          color: #2a1f14;
          display: flex;
          flex-direction: column;
          padding: 70px 28px 28px;
        }
        .surface-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(
              ellipse at center,
              rgba(243, 234, 214, 0.985) 0%,
              rgba(243, 234, 214, 0.97) 45%,
              rgba(228, 212, 178, 0.92) 100%
            ),
            url('/images/home-table.png') center / cover no-repeat;
        }
        .surface-head {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
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
        .greeting {
          display: flex;
          align-items: baseline;
          gap: 10px;
          padding-right: 70px;
        }
        .eyebrow {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 9px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8a6f4a;
        }
        .hello {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-size: 18px;
          color: #2a1f14;
        }
        .bento {
          position: relative;
          z-index: 1;
          flex: 1;
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          grid-template-rows: 1.2fr 1fr;
          gap: 16px;
          min-height: 0;
        }
        .bento :global(.cell) {
          background: rgba(255, 250, 240, 0.82);
          border: 1px solid rgba(138, 111, 74, 0.22);
          border-radius: 12px;
          padding: 20px 22px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-height: 0;
          box-shadow: 0 2px 12px rgba(30, 20, 10, 0.06);
        }
        .bento :global(.cell-hero) {
          grid-column: 1;
          grid-row: 1;
          background: rgba(255, 250, 240, 0.92);
          border-color: rgba(138, 106, 154, 0.35);
        }
        .bento :global(.cell-synth) {
          grid-column: 2;
          grid-row: 1;
          border-left: 3px solid #8a6a9a;
          background: rgba(255, 250, 240, 0.65);
        }
        .bento :global(.cell-capture) {
          grid-column: 1;
          grid-row: 2;
          background: rgba(42, 31, 20, 0.95);
          color: #f5ecd8;
          border-color: #2a1f14;
          cursor: pointer;
        }
        .bento :global(.cell-capture:hover) {
          background: #1a120a;
        }
        .bento :global(.cell-recent) {
          grid-column: 2;
          grid-row: 2;
        }
        @media (max-width: 760px) {
          .surface {
            height: auto;
            min-height: 100vh;
            overflow: auto;
          }
          .bento {
            grid-template-columns: 1fr;
            grid-template-rows: auto;
            flex: none;
          }
          .bento :global(.cell-hero),
          .bento :global(.cell-synth),
          .bento :global(.cell-capture),
          .bento :global(.cell-recent) {
            grid-column: 1;
            grid-row: auto;
          }
          .greeting {
            padding-right: 54px;
          }
        }
      `}</style>
    </main>
  );
}

// ────────────────────────────────────────────────────────────────
// Cells
// ────────────────────────────────────────────────────────────────

function NextCell({
  next,
  loading,
  firstName,
}: {
  next: SurfaceNext;
  loading: boolean;
  firstName: string;
}) {
  if (loading) {
    return (
      <div className="cell cell-hero">
        <Kicker icon={Sparkles} color="#8a6a9a" label="Today" />
        <p className="cell-muted">Loading your surface…</p>
        <CellStyles />
      </div>
    );
  }

  if (!next) {
    return (
      <div className="cell cell-hero">
        <Kicker icon={Leaf} color="#6a8a6a" label="All quiet" />
        <h2 className="cell-headline">
          {firstName ? `Nothing pressing, ${firstName}.` : 'Nothing pressing.'}
        </h2>
        <p className="cell-body">
          You've been listening well. Drop a thought below or revisit the
          journal when you want to.
        </p>
        <Link href="/journal" className="cell-cta">
          Revisit the journal <ArrowRight size={14} strokeWidth={1.5} />
        </Link>
        <CellStyles />
      </div>
    );
  }

  const { icon: Icon, eyebrow, headline, body, ctaLabel, href } = copyFor(next);
  return (
    <div className="cell cell-hero">
      <Kicker icon={Icon} color="#8a6a9a" label={eyebrow} />
      <h2 className="cell-headline">{headline}</h2>
      <p className="cell-body">{body}</p>
      <Link href={href} className="cell-cta">
        {ctaLabel} <ArrowRight size={14} strokeWidth={1.5} />
      </Link>
      <CellStyles />
    </div>
  );
}

function SynthCell({ manual }: { manual: PersonManual | null }) {
  if (!manual) {
    return (
      <div className="cell cell-synth">
        <Kicker icon={Compass} color="#8a6a9a" label="Synthesis" />
        <p className="cell-muted">
          The more perspectives the app sees, the richer your syntheses get.
        </p>
        <Link href="/people" className="cell-cta subtle">
          Add a perspective <ArrowRight size={14} strokeWidth={1.5} />
        </Link>
        <CellStyles />
      </div>
    );
  }
  const overview = manual.synthesizedContent?.overview?.trim() ?? '';
  return (
    <div className="cell cell-synth">
      <Kicker icon={Compass} color="#8a6a9a" label={`About ${manual.personName}`} />
      <p className="cell-pull">{truncate(overview, 180)}</p>
      <Link href={`/people/${manual.personId}/manual`} className="cell-cta subtle">
        Read more <ArrowRight size={14} strokeWidth={1.5} />
      </Link>
      <CellStyles />
    </div>
  );
}

function CaptureCell({ onCapture }: { onCapture: () => void }) {
  return (
    <button type="button" className="cell cell-capture" onClick={onCapture}>
      <div className="capture-head">
        <Feather size={18} strokeWidth={1.5} />
        <span className="capture-eyebrow">Drop a thought</span>
      </div>
      <h3 className="capture-title">What are you noticing?</h3>
      <p className="capture-hint">Tap to open the capture sheet.</p>
      <style jsx>{`
        .capture-head {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #f5ecd8;
          margin-bottom: 14px;
        }
        .capture-eyebrow {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 9px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(245, 236, 216, 0.75);
        }
        .capture-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-weight: 400;
          font-size: 22px;
          line-height: 1.3;
          margin: 0 0 auto;
          color: #f5ecd8;
        }
        .capture-hint {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(245, 236, 216, 0.62);
          margin: 12px 0 0;
          text-align: left;
        }
        button.cell {
          text-align: left;
          font: inherit;
          border: 1px solid #2a1f14;
          color: #f5ecd8;
        }
      `}</style>
    </button>
  );
}

function RecentCell({ entry }: { entry: Entry | null }) {
  if (!entry) {
    return (
      <div className="cell cell-recent">
        <Kicker icon={BookOpen} color="#8a6f4a" label="Journal" />
        <p className="cell-muted">No entries yet. Your first drop shows up here.</p>
        <CellStyles />
      </div>
    );
  }
  const date = formatDate(entry);
  return (
    <div className="cell cell-recent">
      <Kicker icon={BookOpen} color="#8a6f4a" label={`Lately · ${date}`} />
      <p className="cell-pull">{truncate(firstSentence(entry.content), 160)}</p>
      <Link href="/journal" className="cell-cta subtle">
        Open the journal <ArrowRight size={14} strokeWidth={1.5} />
      </Link>
      <CellStyles />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Shared primitives
// ────────────────────────────────────────────────────────────────

function Kicker({
  icon: Icon,
  color,
  label,
}: {
  icon: typeof Sparkles;
  color: string;
  label: string;
}) {
  return (
    <p className="kicker" style={{ color }}>
      <Icon size={12} strokeWidth={1.5} />
      <span>{label}</span>
      <style jsx>{`
        .kicker {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 9px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          font-weight: 700;
          margin: 0 0 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
      `}</style>
    </p>
  );
}

function CellStyles() {
  return (
    <style jsx global>{`
      .cell .cell-headline {
        font-family: Georgia, 'Times New Roman', serif;
        font-style: italic;
        font-weight: 400;
        font-size: 20px;
        line-height: 1.3;
        color: #2a1f14;
        margin: 0 0 10px;
      }
      .cell .cell-body {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 13.5px;
        line-height: 1.5;
        color: #5a4628;
        margin: 0 0 auto;
      }
      .cell .cell-muted {
        font-family: Georgia, 'Times New Roman', serif;
        font-style: italic;
        font-size: 13px;
        color: #7a5f3d;
        margin: 0 0 auto;
      }
      .cell .cell-pull {
        font-family: Georgia, 'Times New Roman', serif;
        font-style: italic;
        font-size: 14px;
        line-height: 1.5;
        color: #3d2f1f;
        margin: 0 0 auto;
      }
      .cell .cell-cta {
        margin-top: 14px;
        align-self: flex-start;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #2a1f14;
        color: #f5ecd8;
        padding: 8px 16px;
        border-radius: 16px;
        font-family: -apple-system, 'Helvetica Neue', sans-serif;
        font-size: 10px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        text-decoration: none;
        transition: background 140ms ease, transform 140ms ease;
      }
      .cell .cell-cta:hover {
        background: #1a120a;
        transform: translateY(-1px);
      }
      .cell .cell-cta.subtle {
        background: transparent;
        color: #8a6f4a;
        padding: 6px 0;
      }
      .cell .cell-cta.subtle:hover {
        color: #5a4628;
        background: transparent;
        transform: none;
      }
    `}</style>
  );
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max).trim() + '…';
}

function firstSentence(text: string): string {
  const dot = text.indexOf('. ');
  return dot === -1 ? text : text.slice(0, dot + 1);
}

function formatDate(entry: Entry): string {
  try {
    return entry.createdAt
      .toDate()
      .toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

interface CellCopy {
  icon: typeof Sparkles;
  eyebrow: string;
  headline: string;
  body: string;
  ctaLabel: string;
  href: string;
}

function copyFor(next: NonNullable<SurfaceNext>): CellCopy {
  switch (next.kind) {
    case 'finish-self-onboard':
      return {
        icon: Feather,
        eyebrow: 'Start here',
        headline: 'Your manual starts with you',
        body:
          'Answer a handful of questions so everyone else has something to respond to.',
        ctaLabel: 'Begin',
        href: next.href,
      };
    case 'resume-draft':
      return {
        icon: Feather,
        eyebrow: 'Unfinished',
        headline: `Resume: ${next.subjectName}`,
        body: 'Pick up where you left off.',
        ctaLabel: 'Continue',
        href: next.href,
      };
    case 'contribute-about':
      return {
        icon: Users,
        eyebrow: 'Add a perspective',
        headline: `Contribute about ${next.person.name}`,
        body:
          'Your observations round out the picture — the magic is in the synthesis.',
        ctaLabel: 'Start',
        href: next.href,
      };
    case 'fresh-synthesis':
      return {
        icon: MessageCircleQuestion,
        eyebrow: 'New synthesis',
        headline: `${next.manual.personName}'s manual has a fresh read`,
        body: truncate(
          next.manual.synthesizedContent?.overview || 'New patterns surfaced.',
          160
        ),
        ctaLabel: "See what's new",
        href: next.href,
      };
  }
}
