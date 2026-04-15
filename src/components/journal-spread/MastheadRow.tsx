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
          font-size: 20px;
          font-weight: 400;
          color: #f5ecd8;
          margin: 0;
          letter-spacing: 0.01em;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
        }
        .masthead-meta {
          margin-top: 3px;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(245, 236, 216, 0.62);
          display: flex;
          gap: 10px;
          align-items: baseline;
        }
        .sep {
          opacity: 0.5;
        }
      `}</style>
    </header>
  );
}
