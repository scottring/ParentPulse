'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

// ================================================================
// Landing / home page — the library table.
//
// Public to both signed-in and signed-out visitors. The only
// difference between the two states:
//   1. Upper-right: auth links (signed-out) vs. user name + sign
//      out (signed-in).
//   2. Books: click-through to their destinations is only
//      activated for signed-in visitors, who also see the glow +
//      floating label on hover.
// ================================================================

interface BookRegion {
  left: string;
  top: string;
  width: string;
  height: string;
  labelLeft: string;
  labelTop: string;
  href: string;
  label: string;
}

const BOOK_REGIONS: Record<string, BookRegion> = {
  manual: {
    left: '5%',
    top: '30%',
    width: '44%',
    height: '36%',
    labelLeft: '27%',
    labelTop: '14%',
    href: '/family-manual',
    label: 'The Family Manual',
  },
  journal: {
    left: '31%',
    top: '55%',
    width: '32%',
    height: '36%',
    labelLeft: '47%',
    labelTop: '14%',
    href: '/workbook',
    label: 'The Journal',
  },
  folio: {
    left: '66%',
    top: '42%',
    width: '30%',
    height: '35%',
    labelLeft: '81%',
    labelTop: '14%',
    href: '/reports',
    label: 'Reports',
  },
};

export default function HomePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [hoveredBook, setHoveredBook] = useState<string | null>(null);

  const isSignedIn = Boolean(user && !authLoading);
  const firstName = user?.name?.split(' ')[0] || '';

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/');
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

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

      {/* ─── Book hit targets + floating labels — activated
          only for signed-in visitors. ─────────────────── */}
      {isSignedIn && (
        <div className="home-books" aria-label="The three volumes">
          {Object.entries(BOOK_REGIONS).map(([key, region]) => (
            <Link
              key={key}
              href={region.href}
              className="home-book-target"
              style={{
                left: region.left,
                top: region.top,
                width: region.width,
                height: region.height,
              }}
              aria-label={region.label}
              onMouseEnter={() => setHoveredBook(key)}
              onMouseLeave={() =>
                setHoveredBook((prev) => (prev === key ? null : prev))
              }
              onFocus={() => setHoveredBook(key)}
              onBlur={() =>
                setHoveredBook((prev) => (prev === key ? null : prev))
              }
            >
              <span className="home-book-glow" aria-hidden="true" />
            </Link>
          ))}

          {Object.entries(BOOK_REGIONS).map(([key, region]) => (
            <span
              key={`label-${key}`}
              className="home-book-float-label"
              style={{
                left: region.labelLeft,
                top: region.labelTop,
                opacity: hoveredBook === key ? 1 : 0,
                transform: `translate(-50%, ${
                  hoveredBook === key ? '0' : '6px'
                })`,
              }}
              aria-hidden="true"
            >
              {region.label}
            </span>
          ))}
        </div>
      )}

      {/* ─── Wordmark + tagline (upper-left) ─────────────── */}
      <header className="home-header">
        <h1 className="home-wordmark">Relish</h1>
        <p className="home-subwordmark">
          operating manuals for the people you love
        </p>
      </header>

      {/* ─── Auth area (upper-right) ─────────────────────── */}
      <nav className="home-auth" aria-label="Enter the library">
        {authLoading ? null : isSignedIn ? (
          <>
            <span
              className="home-auth-avatar"
              aria-hidden="true"
              title={user?.name || firstName}
            >
              {firstName ? firstName.charAt(0).toUpperCase() : '·'}
            </span>
            <span className="home-auth-name">{firstName}</span>
            <span className="home-auth-sep" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="home-auth-link home-auth-signout"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="home-auth-link">
              Sign in
            </Link>
            <span className="home-auth-sep" aria-hidden="true">
              ·
            </span>
            <Link href="/register" className="home-auth-link home-auth-primary">
              Begin a volume <span className="arrow">⟶</span>
            </Link>
          </>
        )}
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
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #c8b894;
          margin: 12px 0 0;
          text-shadow: 0 1px 10px rgba(0, 0, 0, 0.85);
          max-width: 300px;
          line-height: 1.5;
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
        .home-auth-avatar {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(200, 184, 148, 0.18);
          border: 1px solid rgba(245, 217, 181, 0.35);
          color: #f5ecd8;
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 18px;
          font-weight: 400;
          line-height: 1;
          text-shadow: 0 1px 6px rgba(0, 0, 0, 0.7);
          box-shadow:
            0 1px 0 rgba(255, 220, 180, 0.1) inset,
            0 2px 12px rgba(0, 0, 0, 0.6);
        }
        .home-auth-name {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 19px;
          color: #f5ecd8;
          text-shadow:
            0 2px 12px rgba(0, 0, 0, 0.9),
            0 0 24px rgba(0, 0, 0, 0.6);
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
        :global(.home-auth-signout) {
          font-size: 15px;
          color: #a89676;
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
            font-size: 9px;
            margin-top: 8px;
          }
          .home-auth {
            top: 26px;
            right: 22px;
            gap: 10px;
          }
          .home-auth-avatar {
            width: 28px;
            height: 28px;
            font-size: 14px;
          }
          .home-auth-name {
            font-size: 15px;
          }
          :global(.home-auth-link) {
            font-size: 15px;
          }
          :global(.home-auth-signout) {
            font-size: 12px;
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
            font-size: 8px;
            max-width: 180px;
          }
          .home-auth-name {
            display: none;
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
