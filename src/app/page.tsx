'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useCoupleRitual } from '@/hooks/useCoupleRitual';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { useJournalEcho } from '@/hooks/useJournalEcho';
import { useGrowthFeed } from '@/hooks/useGrowthFeed';
import { useActionItems } from '@/hooks/useActionItems';
import { useDinnerPrompt } from '@/hooks/useDinnerPrompt';
import { resolveRecipe } from '@/lib/surface-recipes';
import { SurfaceLayout } from '@/components/surface/SurfaceLayout';
import { HeroSlot } from '@/components/surface/HeroSlot';
import { GridSlot } from '@/components/surface/GridSlot';
import Navigation from '@/components/layout/Navigation';
import type { SurfaceData } from '@/types/surface-recipe';

// ================================================================
// Landing / home page — the library desk.
//
// Signed-out visitors see the library desk landing (sign-in /
// register links). Signed-in users go directly to TheSurface —
// the curated single-page dashboard.
// ================================================================

function TheSurfacePage() {
  const { user } = useAuth();
  const dashboard = useDashboard();
  const { ritual } = useCoupleRitual();
  const { entries: journalEntries } = useJournalEntries();
  const { echo } = useJournalEcho(journalEntries);
  const growth = useGrowthFeed();
  const actionItems = useActionItems({
    people: dashboard.people,
    manuals: dashboard.manuals,
    contributions: dashboard.contributions,
    assessments: dashboard.assessments,
    userId: user!.userId,
  });
  const { prompt: dinnerPrompt } = useDinnerPrompt();

  if (dashboard.loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#F5F0E8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-cormorant)',
            fontStyle: 'italic',
            fontSize: '1.25rem',
            color: '#8B7E6A',
          }}
        >
          Loading&hellip;
        </span>
      </div>
    );
  }

  const data: SurfaceData = {
    stage: dashboard.state,
    people: dashboard.people,
    manuals: dashboard.manuals,
    contributions: dashboard.contributions,
    selfPerson: dashboard.selfPerson,
    spouse: dashboard.spouse,
    peopleNeedingContributions: dashboard.peopleNeedingContributions,
    hasSelfContribution: dashboard.hasSelfContribution,
    activeGrowthItems: growth.activeItems,
    arcGroups: growth.arcGroups,
    journalEntries,
    echo,
    ritual,
    actionItems: actionItems.items,
    dinnerPrompt,
    hasAssessments: dashboard.hasAssessments,
  };

  const resolved = resolveRecipe(data);

  return (
    <>
      <Navigation />
      <main style={{ background: '#F5F0E8' }}>
        <SurfaceLayout
          hero={<HeroSlot heroId={resolved.hero} data={data} />}
          grid={<GridSlot tileIds={resolved.gridTiles} data={data} />}
          gridTileCount={resolved.gridTiles.length}
        />
      </main>
    </>
  );
}

function SignedOutLanding() {
  return (
    <main className="home-stage">
      {/* ─── Full-bleed photograph ────────────────────────── */}
      <div className="home-photograph" aria-hidden="true">
        <Image
          src="/images/home-table.png"
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />
        <div className="home-vignette" />
      </div>

      {/* ─── Wordmark + tagline (upper-left) ─────────────── */}
      <header className="home-header">
        <h1 className="home-wordmark">Relish</h1>
        <p className="home-subwordmark">
          operating manuals for the people you love
        </p>
      </header>

      {/* ─── Auth area (upper-right) ─────────────────────── */}
      <nav className="home-auth" aria-label="Enter the library">
        <Link href="/login" className="home-auth-link">
          Sign in
        </Link>
        <span className="home-auth-sep" aria-hidden="true">
          ·
        </span>
        <Link href="/register" className="home-auth-link home-auth-primary">
          Begin a volume <span className="arrow">⟶</span>
        </Link>
      </nav>

      {/* ─── Styles ─────────────────────────────────────── */}
      <style jsx>{`
        .home-stage {
          position: relative;
          min-height: 100vh;
          background: #14100c;
          color: #ede4d0;
          overflow: hidden;
        }

        /* Full-bleed photograph layer — always covers the
           viewport regardless of aspect ratio. */
        .home-photograph {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: max(100vw, 150vh);
          aspect-ratio: 3 / 2;
          z-index: 1;
          pointer-events: none;
        }
        .home-vignette {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(
              ellipse at center,
              transparent 0%,
              transparent 40%,
              rgba(20, 16, 12, 0.25) 80%,
              rgba(20, 16, 12, 0.55) 100%
            ),
            linear-gradient(
              180deg,
              rgba(20, 16, 12, 0.35) 0%,
              transparent 18%,
              transparent 82%,
              rgba(20, 16, 12, 0.25) 100%
            );
          pointer-events: none;
        }

        /* ─── Book hit targets ───────────────────────── */
        .home-books {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: max(100vw, 150vh);
          aspect-ratio: 3 / 2;
          z-index: 10;
        }
        :global(.home-book-target) {
          position: absolute;
          display: block;
          cursor: pointer;
          text-decoration: none;
          color: inherit;
          border-radius: 8px;
          z-index: 10;
        }
        :global(.home-book-target:focus-visible) {
          outline: 1px dashed rgba(245, 217, 181, 0.5);
          outline-offset: 6px;
        }

        :global(.home-book-glow) {
          position: absolute;
          inset: -10%;
          border-radius: 50%;
          opacity: 0;
          transition: opacity 0.6s ease-out;
          background: radial-gradient(
            ellipse at center,
            rgba(255, 215, 140, 0.45) 0%,
            rgba(255, 190, 100, 0.25) 35%,
            rgba(255, 170, 60, 0.08) 60%,
            transparent 80%
          );
          mix-blend-mode: soft-light;
          pointer-events: none;
        }
        :global(.home-book-target:hover .home-book-glow),
        :global(.home-book-target:focus-visible .home-book-glow) {
          opacity: 1;
        }

        .home-book-float-label {
          position: absolute;
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: 32px;
          color: #f5ecd8;
          white-space: nowrap;
          transition: opacity 0.5s ease-out, transform 0.5s ease-out;
          text-shadow:
            0 2px 14px rgba(0, 0, 0, 0.92),
            0 0 26px rgba(0, 0, 0, 0.78),
            0 0 48px rgba(0, 0, 0, 0.5);
          pointer-events: none;
          letter-spacing: -0.005em;
          z-index: 15;
        }

        /* ─── Wordmark header — upper-left corner ───── */
        .home-header {
          position: absolute;
          top: 40px;
          left: 44px;
          text-align: left;
          z-index: 20;
          pointer-events: none;
          max-width: 380px;
        }
        .home-wordmark {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 300;
          font-size: 52px;
          letter-spacing: -0.015em;
          color: #f5ecd8;
          margin: 0;
          line-height: 1;
          text-shadow:
            0 2px 18px rgba(0, 0, 0, 0.85),
            0 0 32px rgba(0, 0, 0, 0.55);
        }
        .home-subwordmark {
          font-family: var(--font-parent-body);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #c8b894;
          margin: 12px 0 0;
          text-shadow: 0 1px 10px rgba(0, 0, 0, 0.85);
          line-height: 1.5;
          white-space: nowrap;
        }

        /* ─── Auth area — upper-right corner ────────── */
        .home-auth {
          position: absolute;
          top: 44px;
          right: 44px;
          z-index: 20;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        :global(.home-auth-link) {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: 19px;
          color: #c8b894;
          text-decoration: none;
          transition: color 0.25s ease, opacity 0.25s ease;
          text-shadow:
            0 2px 12px rgba(0, 0, 0, 0.9),
            0 0 24px rgba(0, 0, 0, 0.6);
          letter-spacing: 0.005em;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
        }
        :global(.home-auth-link:hover),
        :global(.home-auth-link:focus-visible) {
          color: #f5ecd8;
        }
        :global(.home-auth-primary) {
          color: #d4a872;
        }
        :global(.home-auth-primary:hover),
        :global(.home-auth-primary:focus-visible) {
          color: #f5d9b5;
        }
        :global(.home-auth-link .arrow) {
          display: inline-block;
          margin-left: 4px;
          transition: transform 0.3s ease;
        }
        :global(.home-auth-link:hover .arrow) {
          transform: translateX(3px);
        }
        .home-auth-sep {
          color: #5a4f3b;
          font-family: var(--font-parent-body);
          font-size: 15px;
          text-shadow: 0 1px 6px rgba(0, 0, 0, 0.85);
        }

        /* ─── Mobile ─────────────────────────────── */
        @media (max-width: 768px) {
          .home-header {
            top: 24px;
            left: 22px;
            max-width: 220px;
          }
          .home-wordmark {
            font-size: 36px;
          }
          .home-subwordmark {
            font-size: 11px;
            margin-top: 8px;
            /* On mobile, let it wrap rather than push off-screen. */
            white-space: normal;
            max-width: 260px;
          }
          .home-auth {
            top: 26px;
            right: 22px;
            gap: 10px;
          }
          :global(.home-auth-link) {
            font-size: 15px;
          }
          .home-auth-sep {
            font-size: 12px;
          }
          .home-book-float-label {
            font-size: 20px;
          }
        }

        @media (max-width: 480px) {
          .home-wordmark {
            font-size: 30px;
          }
          .home-subwordmark {
            font-size: 10px;
            max-width: 180px;
          }
          :global(.home-auth-link) {
            font-size: 13px;
          }
          .home-book-float-label {
            font-size: 16px;
          }
        }
      `}</style>
    </main>
  );
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();

  // Show a minimal loading screen while auth resolves
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#14100c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-parent-display)',
            fontStyle: 'italic',
            fontSize: '19px',
            color: '#c8b894',
          }}
        >
          Opening&hellip;
        </span>
      </div>
    );
  }

  // Signed-in users see TheSurface
  if (user) {
    return <TheSurfacePage />;
  }

  // Signed-out users see the library desk landing
  return <SignedOutLanding />;
}
