'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

// ================================================================
// Home — the library desk.
//
// Both signed-in and signed-out visitors see the same tabletop
// photograph. Signed-out users get sign-in / register links.
// Signed-in users get glowing book targets that link to the main
// sections, plus a user menu.
//
// Book mapping (two-books.png):
//   Leather-bound book (back-left)  →  /manual   (The Family Manual)
//   Green/gray book (front-right)   →  /journal  (The Journal)
//   Tabletop / pen area             →  /surface  (What's New)
// ================================================================

function UserMenuInline() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const firstName = user.name?.split(' ')[0] || user.email?.split('@')[0] || '';

  return (
    <div className="home-user-menu">
      <button
        onClick={() => setOpen(!open)}
        className="home-user-btn"
        aria-label="User menu"
      >
        {firstName}
      </button>
      {open && (
        <div className="home-user-dropdown">
          <Link href="/settings" onClick={() => setOpen(false)} className="home-user-item">
            Settings
          </Link>
          <div className="home-user-sep" />
          <button
            onClick={async () => {
              await logout();
              router.push('/login');
            }}
            className="home-user-item"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();

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

  return (
    <main className="home-stage">
      {/* ─── Landscape photo (desktop) ─────────────────── */}
      <div className="home-scene home-scene-desktop">
        <Image
          src="/images/home-table.png"
          alt="Books on a desk"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'center center' }}
        />
        <div className="home-vignette" />
        {user && (
          <>
            <Link href="/manual" className="home-book-target home-dt-manual" aria-label="The Family Manual">
              <span className="home-book-glow" />
              <span className="home-book-float-label">The Family Manual</span>
            </Link>
            <Link href="/journal" className="home-book-target home-dt-journal" aria-label="The Journal">
              <span className="home-book-glow" />
              <span className="home-book-float-label">The Journal</span>
            </Link>
            <Link href="/surface" className="home-book-target home-dt-surface" aria-label="What's New">
              <span className="home-book-glow home-glow-surface" />
              <span className="home-book-float-label">What&rsquo;s New</span>
            </Link>
          </>
        )}
      </div>

      {/* ─── Square photo (mobile) ─────────────────────── */}
      <div className="home-scene home-scene-mobile">
        <Image
          src="/images/two-books.png"
          alt="Books on a desk"
          fill
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
        />
        <div className="home-vignette" />
        {user && (
          <>
            <Link href="/manual" className="home-book-target home-mb-manual" aria-label="The Family Manual">
              <span className="home-book-glow" />
              <span className="home-book-float-label">The Family Manual</span>
            </Link>
            <Link href="/journal" className="home-book-target home-mb-journal" aria-label="The Journal">
              <span className="home-book-glow" />
              <span className="home-book-float-label">The Journal</span>
            </Link>
            <Link href="/surface" className="home-book-target home-mb-surface" aria-label="What's New">
              <span className="home-book-glow home-glow-surface" />
              <span className="home-book-float-label">What&rsquo;s New</span>
            </Link>
          </>
        )}
      </div>

      {/* ─── Wordmark + tagline (upper-left) ─────────────── */}
      <header className="home-header">
        <h1 className="home-wordmark">Relish</h1>
        <p className="home-subwordmark">
          operating manuals for the people you love
        </p>
      </header>

      {/* ─── Upper-right: auth or user menu ──────────────── */}
      {user ? (
        <UserMenuInline />
      ) : (
        <nav className="home-auth" aria-label="Enter the library">
          <Link href="/login" className="home-auth-link">
            Sign in
          </Link>
          <span className="home-auth-sep" aria-hidden="true">
            &middot;
          </span>
          <Link href="/register" className="home-auth-link home-auth-primary">
            Begin a volume <span className="arrow">⟶</span>
          </Link>
        </nav>
      )}

      {/* ─── Styles ─────────────────────────────────────── */}
      <style jsx>{`
        .home-stage {
          position: relative;
          width: 100%;
          height: 100vh;
          height: 100dvh;
          background: #14100c;
          color: #ede4d0;
          overflow: hidden;
        }

        .home-scene {
          position: absolute;
          inset: 0;
        }
        /* Desktop: landscape photo. Mobile: square photo. */
        .home-scene-mobile { display: none; }
        @media (max-width: 768px) {
          .home-scene-desktop { display: none; }
          .home-scene-mobile { display: block; }
        }

        .home-vignette {
          position: absolute;
          inset: 0;
          z-index: 2;
          background:
            radial-gradient(
              ellipse at center,
              transparent 0%,
              transparent 35%,
              rgba(20, 16, 12, 0.3) 70%,
              rgba(20, 16, 12, 0.6) 100%
            ),
            linear-gradient(
              180deg,
              rgba(20, 16, 12, 0.4) 0%,
              transparent 20%,
              transparent 80%,
              rgba(20, 16, 12, 0.3) 100%
            );
          pointer-events: none;
        }

        /* ─── Shared book target styles ──────────────── */
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
          inset: -20%;
          border-radius: 50%;
          opacity: 0;
          transition: opacity 0.6s ease-out;
          background: radial-gradient(
            ellipse at center,
            rgba(255, 215, 140, 0.55) 0%,
            rgba(255, 190, 100, 0.3) 40%,
            rgba(255, 170, 60, 0.08) 65%,
            transparent 85%
          );
          mix-blend-mode: screen;
          pointer-events: none;
        }
        :global(.home-book-target:hover .home-book-glow),
        :global(.home-book-target:focus-visible .home-book-glow) {
          opacity: 1;
        }
        :global(.home-glow-surface) {
          background: radial-gradient(
            ellipse at center,
            rgba(200, 190, 160, 0.4) 0%,
            rgba(180, 170, 140, 0.2) 40%,
            transparent 75%
          );
        }

        :global(.home-book-float-label) {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: 26px;
          color: #f5ecd8;
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.5s ease-out;
          text-shadow:
            0 2px 14px rgba(0, 0, 0, 0.92),
            0 0 26px rgba(0, 0, 0, 0.78),
            0 0 48px rgba(0, 0, 0, 0.5);
          pointer-events: none;
          letter-spacing: -0.005em;
          z-index: 15;
        }
        :global(.home-book-target:hover .home-book-float-label),
        :global(.home-book-target:focus-visible .home-book-float-label) {
          opacity: 1;
        }

        /* ═══════════════════════════════════════════════
           DESKTOP — home-table.png (landscape ~3:2)
           ─────────────────────────────────────────────
           Red leather book (large, back) → Family Manual
           White card/notebook w/ ribbon (front-right) → Journal
           Leather desk pad (under everything) → Surface
           ═══════════════════════════════════════════════ */

        /* Red leather book → Family Manual */
        :global(.home-dt-manual) {
          top: 8%;
          left: 20%;
          width: 34%;
          height: 58%;
        }
        /* White notebook / ribbon → Journal */
        :global(.home-dt-journal) {
          top: 28%;
          left: 52%;
          width: 22%;
          height: 40%;
        }
        /* Leather desk pad → What's New */
        :global(.home-dt-surface) {
          top: 68%;
          left: 14%;
          width: 56%;
          height: 26%;
        }

        /* ═══════════════════════════════════════════════
           MOBILE — two-books.png (square 1:1)
           ═══════════════════════════════════════════════ */

        /* Leather book → Family Manual */
        :global(.home-mb-manual) {
          top: 22%;
          left: 16%;
          width: 38%;
          height: 30%;
        }
        /* Gray/green book → Journal */
        :global(.home-mb-journal) {
          top: 38%;
          left: 38%;
          width: 30%;
          height: 28%;
        }
        /* Pen/pad → What's New */
        :global(.home-mb-surface) {
          top: 70%;
          left: 12%;
          width: 34%;
          height: 16%;
        }

        /* ─── Wordmark header — upper-left ────────────── */
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

        /* ─── Auth area — upper-right (signed-out) ────── */
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
          transition: color 0.25s ease;
          text-shadow:
            0 2px 12px rgba(0, 0, 0, 0.9),
            0 0 24px rgba(0, 0, 0, 0.6);
          letter-spacing: 0.005em;
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

        /* ─── User menu — upper-right (signed-in) ─────── */
        :global(.home-user-menu) {
          position: absolute;
          top: 44px;
          right: 44px;
          z-index: 30;
        }
        :global(.home-user-btn) {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: 19px;
          color: #c8b894;
          background: none;
          border: none;
          cursor: pointer;
          text-shadow:
            0 2px 12px rgba(0, 0, 0, 0.9),
            0 0 24px rgba(0, 0, 0, 0.6);
          transition: color 0.25s ease;
          padding: 0;
        }
        :global(.home-user-btn:hover) {
          color: #f5ecd8;
        }
        :global(.home-user-dropdown) {
          position: absolute;
          right: 0;
          top: 100%;
          margin-top: 8px;
          background: rgba(30, 24, 18, 0.92);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(200, 184, 148, 0.15);
          border-radius: 10px;
          padding: 4px 0;
          min-width: 140px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
        }
        :global(.home-user-item) {
          display: block;
          width: 100%;
          text-align: left;
          padding: 8px 16px;
          font-family: var(--font-parent-body);
          font-size: 13px;
          color: #c8b894;
          text-decoration: none;
          background: none;
          border: none;
          cursor: pointer;
          transition: background 140ms ease;
        }
        :global(.home-user-item:hover) {
          background: rgba(200, 184, 148, 0.1);
        }
        :global(.home-user-sep) {
          height: 1px;
          margin: 2px 12px;
          background: rgba(200, 184, 148, 0.12);
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
          :global(.home-user-menu) {
            top: 26px;
            right: 22px;
          }
          :global(.home-book-float-label) {
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
          :global(.home-book-float-label) {
            font-size: 16px;
          }
        }
      `}</style>
    </main>
  );
}
