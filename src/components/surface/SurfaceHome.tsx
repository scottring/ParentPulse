'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import CaptureSheet from '@/components/capture/CaptureSheet';

/**
 * SurfaceHome — Plan 4, Step 1 scaffold.
 *
 * A near-empty surface that will grow into the stage-aware single-page
 * home. This step only establishes the route, the chrome (wordmark +
 * avatar), and a link down into the journal so users can still reach
 * the book. Subsequent steps layer on the state-aware greeting, the
 * "next thing" hero, the synthesis highlight, and the inline journal
 * peek.
 */
export function SurfaceHome() {
  const { user } = useAuth();

  return (
    <main className="surface">
      <a href="/" className="wordmark" aria-label="Relish home">
        Relish
      </a>
      <a
        href="/settings"
        className="avatar"
        aria-label={user?.name ? `${user.name} — settings` : 'Settings'}
        title={user?.name || 'Settings'}
      >
        {user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" />
        ) : (
          <span>{(user?.name || '?').charAt(0).toUpperCase()}</span>
        )}
      </a>

      <div className="surface-inner">
        <p className="eyebrow">Today</p>
        <h1 className="hello">
          {user?.name ? `Hello, ${user.name.split(' ')[0]}.` : 'Hello.'}
        </h1>
        <p className="coming">Your surface is coming together.</p>

        <nav className="quick-links" aria-label="Quick links">
          <Link href="/journal" className="link">
            Open the journal →
          </Link>
          <Link href="/family-manual" className="link">
            Family manual
          </Link>
          <Link href="/workbook" className="link">
            Workbook
          </Link>
        </nav>
      </div>

      <CaptureSheet />

      <style jsx>{`
        .surface {
          min-height: 100vh;
          background: #f3ead6;
          color: #2a1f14;
          position: relative;
          padding: 80px 24px 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .wordmark {
          position: fixed;
          top: 18px;
          left: 22px;
          z-index: 20;
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-size: 22px;
          color: #2a1f14;
          text-decoration: none;
          letter-spacing: 0.01em;
          transition: transform 160ms ease, color 160ms ease;
        }
        .wordmark:hover {
          color: #1a120a;
          transform: translateY(-1px);
        }
        .avatar {
          position: fixed;
          top: 14px;
          right: 22px;
          z-index: 20;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #d4b483;
          color: #2a1f14;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          border: 2px solid #f5ecd8;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
          transition: transform 160ms ease;
          overflow: hidden;
        }
        .avatar:hover {
          transform: translateY(-1px);
        }
        .avatar :global(img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .surface-inner {
          max-width: 640px;
          width: 100%;
          text-align: center;
          margin-top: 80px;
        }
        .eyebrow {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8a6f4a;
          margin: 0 0 18px;
        }
        .hello {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-weight: 400;
          font-size: 34px;
          line-height: 1.2;
          color: #2a1f14;
          margin: 0 0 8px;
        }
        .coming {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-size: 16px;
          color: #7a5f3d;
          margin: 0 0 38px;
        }
        .quick-links {
          display: flex;
          flex-direction: column;
          gap: 14px;
          align-items: center;
        }
        .link {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #5a4628;
          text-decoration: none;
          padding: 8px 18px;
          border-radius: 18px;
          transition: background 160ms ease, color 160ms ease, transform 160ms ease;
        }
        .link:hover {
          background: rgba(138, 111, 74, 0.14);
          color: #2a1f14;
          transform: translateY(-1px);
        }
      `}</style>
    </main>
  );
}
