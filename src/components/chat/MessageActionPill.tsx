'use client';

interface Props {
  onFlag: () => void;
}

export function MessageActionPill({ onFlag }: Props) {
  return (
    <div className="action-pill" role="toolbar" aria-label="Message actions">
      <button type="button" className="action primary" onClick={onFlag}>
        ⚑ Flag for…
      </button>

      <style jsx>{`
        .action-pill {
          position: absolute;
          top: -12px;
          right: 8px;
          background: #2a2a2a;
          color: #f1ead4;
          border-radius: 999px;
          padding: 3px 9px;
          font-size: 10px;
          display: flex;
          gap: 9px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .action {
          all: unset;
          cursor: pointer;
          opacity: 0.85;
        }
        .action.primary { color: #ffd49b; opacity: 1; font-weight: 600; }
      `}</style>
    </div>
  );
}
