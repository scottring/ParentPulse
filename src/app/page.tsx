'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

// ================================================================
// Home — editorial broadsheet splash.
//
// Signed-in visitors are redirected to /workbook (their room).
// Signed-out visitors see a typographic landing that matches the
// redesign's voice — no stock photography, paper + ink only.
// ================================================================

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) router.replace('/workbook');
  }, [authLoading, user, router]);

  if (authLoading || user) {
    return (
      <div className="home-boot">
        <span>Opening…</span>
        <style jsx>{`
          .home-boot {
            min-height: 100vh;
            background: var(--r-cream, #F5F0E8);
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: var(--r-serif, Georgia, serif);
            font-style: italic;
            font-size: 19px;
            color: var(--r-text-4, #6B6254);
          }
        `}</style>
      </div>
    );
  }

  return (
    <main className="home-stage">
      <header className="home-header">
        <p className="home-kicker">Vol. I — No. 01 · A family broadsheet</p>
        <h1 className="home-wordmark">Relish</h1>
        <p className="home-subwordmark">
          <em>Operating manuals</em> for the people you love.
        </p>
      </header>

      <section className="home-lede">
        <p className="lede-text">
          A private, long-running family journal. You (and your partner)
          write about the people in your life — kids, parents, friends —
          and the book gives you back patterns, prompts, briefs, and
          memories that help you <em>pay attention</em>.
        </p>
      </section>

      <section className="home-rooms" aria-label="The three rooms">
        <p className="rooms-eyebrow">Three rooms inside</p>
        <div className="rooms-grid">
          <article className="room-card">
            <p className="room-name"><em>The Workbook.</em></p>
            <p className="room-blurb">
              The daily entry point. What&apos;s open, what&apos;s kept,
              what&apos;s waiting.
            </p>
          </article>
          <article className="room-card">
            <p className="room-name"><em>The Family Manual.</em></p>
            <p className="room-blurb">
              The people view. Who&apos;s here, who&apos;s waiting, how
              they relate.
            </p>
          </article>
          <article className="room-card">
            <p className="room-name"><em>The Archive.</em></p>
            <p className="room-blurb">
              Every line the book has kept. Searchable, readable,
              yours.
            </p>
          </article>
        </div>
      </section>

      <nav className="home-auth" aria-label="Enter">
        <Link href="/login" className="home-auth-link">
          Sign in
        </Link>
        <span className="home-auth-sep" aria-hidden="true">·</span>
        <Link href="/register" className="home-auth-link home-auth-primary">
          Begin a volume <span aria-hidden="true">⟶</span>
        </Link>
      </nav>

      <footer className="home-colophon">
        <span aria-hidden="true" className="fleuron">❦</span>
        <span>The Workbook, a family broadsheet.</span>
      </footer>

      <style jsx>{`
        .home-stage {
          position: relative;
          min-height: 100vh;
          background: var(--r-cream, #F5F0E8);
          color: var(--r-ink, #3A3530);
          font-family: var(--r-serif, Georgia, serif);
          display: flex;
          flex-direction: column;
          max-width: 1040px;
          margin: 0 auto;
          padding: 72px 40px 48px;
        }
        .home-header {
          text-align: center;
          padding-bottom: 48px;
          border-bottom: 1px solid var(--r-rule-4, #D8D3CA);
        }
        .home-kicker {
          font-family: var(--r-sans, -apple-system, sans-serif);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--r-text-5, #887C68);
          margin: 0 0 18px 0;
        }
        .home-wordmark {
          font-family: var(--r-serif, Georgia, serif);
          font-style: italic;
          font-weight: 300;
          font-size: clamp(72px, 12vw, 140px);
          line-height: 0.96;
          letter-spacing: -0.025em;
          color: var(--r-ink, #3A3530);
          margin: 0;
        }
        .home-subwordmark {
          font-family: var(--r-serif, Georgia, serif);
          font-weight: 400;
          font-size: clamp(18px, 2.2vw, 22px);
          line-height: 1.4;
          color: var(--r-text-3, #5F564B);
          margin: 16px 0 0 0;
        }
        .home-subwordmark em {
          font-style: italic;
          color: var(--r-ink, #3A3530);
        }
        .home-lede {
          padding: 48px 0;
          border-bottom: 1px solid var(--r-rule-4, #D8D3CA);
          text-align: center;
        }
        .lede-text {
          font-family: var(--r-serif, Georgia, serif);
          font-weight: 400;
          font-size: clamp(19px, 2.2vw, 24px);
          line-height: 1.5;
          color: var(--r-text-2, #5C5347);
          max-width: 56ch;
          margin: 0 auto;
        }
        .lede-text em {
          font-style: italic;
          color: var(--r-ink, #3A3530);
        }
        .home-rooms {
          padding: 56px 0;
          border-bottom: 1px solid var(--r-rule-4, #D8D3CA);
        }
        .rooms-eyebrow {
          font-family: var(--r-sans, sans-serif);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--r-text-4, #6B6254);
          text-align: center;
          margin: 0 0 32px 0;
        }
        .rooms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 0;
        }
        .room-card {
          padding: 24px 28px;
          border-right: 1px solid var(--r-rule-5, #E5E0D8);
        }
        .room-card:last-child {
          border-right: none;
        }
        .room-name {
          font-family: var(--r-serif, Georgia, serif);
          font-size: 24px;
          line-height: 1.2;
          color: var(--r-ink, #3A3530);
          margin: 0 0 10px 0;
        }
        .room-name em {
          font-style: italic;
        }
        .room-blurb {
          font-family: var(--r-serif, Georgia, serif);
          font-size: 15px;
          line-height: 1.55;
          color: var(--r-text-3, #5F564B);
          margin: 0;
        }
        .home-auth {
          display: flex;
          justify-content: center;
          align-items: baseline;
          gap: 24px;
          padding: 48px 0;
        }
        .home-auth-link {
          font-family: var(--r-serif, Georgia, serif);
          font-style: italic;
          font-size: 18px;
          color: var(--r-text-3, #5F564B);
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: color 180ms var(--r-ease-ink, cubic-bezier(0.22,1,0.36,1));
          padding-bottom: 2px;
        }
        .home-auth-link:hover {
          color: var(--r-ink, #3A3530);
          border-bottom-color: var(--r-rule-2, #B5A99A);
        }
        .home-auth-primary {
          color: var(--r-ink, #3A3530);
        }
        .home-auth-sep {
          color: var(--r-rule-2, #B5A99A);
        }
        .home-colophon {
          margin-top: auto;
          text-align: center;
          padding-top: 32px;
          font-family: var(--r-serif, Georgia, serif);
          font-style: italic;
          font-size: 14px;
          color: var(--r-text-5, #887C68);
        }
        .fleuron {
          display: block;
          font-size: 20px;
          margin-bottom: 10px;
          color: var(--r-rule-2, #B5A99A);
          font-style: normal;
        }
        @media (max-width: 720px) {
          .home-stage {
            padding: 48px 24px 32px;
          }
          .rooms-grid {
            grid-template-columns: 1fr;
          }
          .room-card {
            border-right: none;
            border-bottom: 1px solid var(--r-rule-5, #E5E0D8);
          }
          .room-card:last-child {
            border-bottom: none;
          }
        }
      `}</style>
    </main>
  );
}
