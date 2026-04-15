'use client';

export interface MastheadMember {
  id: string;
  name: string;
}

export interface MastheadRowProps {
  familyName: string;
  volumeLabel: string;
  dateRangeLabel: string;
  members: MastheadMember[];
}

export function MastheadRow({
  familyName,
  volumeLabel,
  dateRangeLabel,
  members,
}: MastheadRowProps) {
  return (
    <header className="masthead-row">
      <div className="masthead-avatars">
        {members.map((m) => (
          <span key={m.id} className="avatar" title={m.name}>
            {m.name.charAt(0).toUpperCase()}
          </span>
        ))}
      </div>
      <div className="masthead-text">
        <div className="masthead-volume">
          The {familyName} Family · <em>{volumeLabel}</em>
        </div>
        <div className="masthead-date">{dateRangeLabel}</div>
      </div>
      <style jsx>{`
        .masthead-row {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 14px 0 12px;
          border-bottom: 1px solid rgba(80, 60, 40, 0.2);
          margin-bottom: 14px;
        }
        .masthead-avatars { display: inline-flex; margin-bottom: 8px; }
        .avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #d4b483;
          color: #3d2f1f;
          font-weight: 700;
          font-family: -apple-system, sans-serif;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-left: -5px;
          border: 2px solid #f5ecd8;
        }
        .avatar:first-child { margin-left: 0; }
        .masthead-volume {
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #8a6f4a;
          font-family: -apple-system, sans-serif;
          text-align: center;
        }
        .masthead-volume em {
          font-family: Georgia, serif;
          font-style: italic;
          font-size: 14px;
          letter-spacing: 0;
          color: #3d2f1f;
          text-transform: none;
        }
        .masthead-date {
          font-size: 10px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #8a6f4a;
          margin-top: 6px;
          text-align: center;
        }
      `}</style>
    </header>
  );
}
