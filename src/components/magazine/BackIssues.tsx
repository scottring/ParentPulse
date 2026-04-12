'use client';

interface BackIssuesProps {
  line?: string;
}

// Footer colophon — the last word on the page. One fleuron, one line of
// small italic text, a top rule, done.
export default function BackIssues({
  line = 'Back issues are bound in the archive.',
}: BackIssuesProps) {
  return (
    <div className="back-issues">
      <span className="back-issues-fleuron" aria-hidden="true">
        ❦
      </span>
      <p className="back-issues-line">{line}</p>

      <style jsx>{`
        .back-issues {
          margin-top: 64px;
          padding-top: 28px;
          text-align: center;
          border-top: 1px solid rgba(200, 190, 172, 0.45);
        }
        .back-issues-fleuron {
          display: block;
          font-family: var(--font-parent-display);
          font-size: 22px;
          color: #8a7b5f;
          margin-bottom: 12px;
          line-height: 1;
        }
        .back-issues-line {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 15px;
          color: #7c6e54;
          margin: 0;
        }
        @media (max-width: 720px) {
          .back-issues {
            margin-top: 48px;
          }
        }
      `}</style>
    </div>
  );
}
