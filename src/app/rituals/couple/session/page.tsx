'use client';

import Link from 'next/link';

export default function Page() {
  return (
    <main className="session-stage">
      <div className="session-vignette" aria-hidden="true" />

      <div className="session-content">
        <p className="eyebrow">Your check-in</p>
        <h1 className="title">Begin together.</h1>
        <p className="lede">
          Sit down. Put your phones face-down, once you&rsquo;re here. Talk about what&rsquo;s
          alive for each of you this week &mdash; what&rsquo;s worth naming, what needs
          attention, what feels good.
        </p>
        <p className="note">The shared Surface is coming. For now this is simply the signal to start.</p>

        <Link href="/rituals" className="back-link">
          <span aria-hidden="true">&larr;</span> Back to rituals
        </Link>
      </div>

      <style jsx>{`
        .session-stage {
          position: relative;
          min-height: 100vh;
          background: #14100c;
          color: #ede4d0;
          overflow: hidden;
        }
        .session-vignette {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at center,
              rgba(42, 37, 32, 0.0) 0%,
              rgba(20, 16, 12, 0.35) 60%,
              rgba(20, 16, 12, 0.6) 100%);
          pointer-events: none;
          z-index: 1;
        }
        .session-content {
          position: relative;
          z-index: 10;
          max-width: 640px;
          margin: 0 auto;
          padding: 18vh 28px 96px;
          text-align: center;
        }
        .eyebrow {
          font-family: var(--font-parent-body);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #c8b894;
          margin: 0 0 24px;
          text-shadow: 0 1px 8px rgba(0,0,0,0.85);
        }
        .title {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 300;
          font-size: clamp(44px, 7vw, 72px);
          letter-spacing: -0.02em;
          color: #f5ecd8;
          margin: 0 0 24px;
          line-height: 1.05;
          text-shadow:
            0 2px 18px rgba(0, 0, 0, 0.85),
            0 0 36px rgba(0, 0, 0, 0.5);
        }
        .lede {
          font-family: var(--font-parent-body);
          font-size: 17px;
          line-height: 1.7;
          color: #d8cba8;
          margin: 0 auto 36px;
          max-width: 42ch;
          text-shadow: 0 1px 8px rgba(0,0,0,0.8);
        }
        .note {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 15px;
          color: #a89676;
          margin: 0 0 56px;
          text-shadow: 0 1px 6px rgba(0,0,0,0.75);
        }
        :global(.session-content .back-link) {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 16px;
          color: #c8b894;
          text-decoration: none;
          border-bottom: 1px solid rgba(200, 184, 148, 0.4);
          padding-bottom: 2px;
          transition: color 0.2s ease;
          text-shadow: 0 1px 8px rgba(0,0,0,0.85);
        }
        :global(.session-content .back-link:hover) {
          color: #f5ecd8;
        }
      `}</style>
    </main>
  );
}
