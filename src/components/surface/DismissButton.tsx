'use client';

interface DismissButtonProps {
  onClick: () => void;
  label?: string;
}

/**
 * Small italic dismiss link for compendium entries.
 * Session-scoped — dismissed items reappear on reload.
 */
export default function DismissButton({ onClick, label = 'dismiss' }: DismissButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="dismiss-btn"
    >
      {label}

      <style jsx>{`
        .dismiss-btn {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 13px;
          color: #9B8E7E;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px 8px;
          transition: color 0.2s ease;
        }
        .dismiss-btn:hover {
          color: #3A3530;
        }
      `}</style>
    </button>
  );
}
