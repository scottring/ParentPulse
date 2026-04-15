'use client';

export interface MastheadMember {
  id: string;
  name: string;
}

export interface MastheadRowProps {
  familyName: string;
  volumeLabel: string;
  dateRangeLabel: string;
  /** Kept for API compatibility; no longer rendered. */
  members?: MastheadMember[];
}

export function MastheadRow({
  familyName,
  volumeLabel,
  dateRangeLabel,
}: MastheadRowProps) {
  return (
    <header className="masthead-row">
      <h1 className="masthead-title">The {familyName} Family</h1>
      <div className="masthead-meta">
        <span>{volumeLabel}</span>
        <span className="sep" aria-hidden="true">·</span>
        <span>{dateRangeLabel}</span>
      </div>
      <style jsx>{`
        .masthead-row {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px 0 14px;
          margin-bottom: 8px;
        }
        .masthead-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-size: 22px;
          font-weight: 400;
          color: #2a1f14;
          margin: 0;
          letter-spacing: 0.01em;
        }
        .masthead-meta {
          margin-top: 4px;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #7a5f3d;
          display: flex;
          gap: 10px;
          align-items: baseline;
        }
        .sep {
          opacity: 0.55;
        }
      `}</style>
    </header>
  );
}
