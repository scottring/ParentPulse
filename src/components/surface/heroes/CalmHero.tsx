'use client';

interface CalmMessage {
  title: string;
  body: string;
}

const CALM_MESSAGES: CalmMessage[] = [
  {
    title: 'All clear',
    body: 'Nothing needs your attention right now.',
  },
  {
    title: 'Quiet moment',
    body: "Your family's manuals are up to date. Enjoy the stillness.",
  },
  {
    title: 'Everything in balance',
    body: 'No new insights, no pending actions. Just presence.',
  },
];

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export function CalmHero() {
  const dayOfYear = getDayOfYear();
  const message = CALM_MESSAGES[dayOfYear % CALM_MESSAGES.length];

  return (
    <div className="calm-hero">
      <div className="hero-inner">
        <div className="ornament" aria-hidden="true">❦</div>
        <h2 className="title">{message.title}</h2>
        <p className="body">{message.body}</p>
      </div>

      <style jsx>{`
        .calm-hero {
          height: 100%;
          min-height: 100%;
          background: linear-gradient(160deg, #3a3530 0%, #4a4540 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 48px 40px;
        }
        .hero-inner {
          max-width: 400px;
        }
        .ornament {
          font-family: var(--font-cormorant, serif);
          font-size: 28px;
          color: #6b8f71;
          line-height: 1;
          margin-bottom: 24px;
          opacity: 0.7;
        }
        .title {
          font-family: var(--font-cormorant, serif);
          font-style: italic;
          font-weight: 400;
          font-size: clamp(32px, 4vw, 52px);
          color: #f5f0e8;
          margin: 0 0 16px;
          line-height: 1.1;
          letter-spacing: -0.01em;
        }
        .body {
          font-family: var(--font-parent-body, sans-serif);
          font-size: 15px;
          line-height: 1.65;
          color: #b5aa98;
          margin: 0;
        }
        @media (max-width: 768px) {
          .calm-hero {
            padding: 40px 24px;
            min-height: 360px;
          }
          .hero-inner {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
