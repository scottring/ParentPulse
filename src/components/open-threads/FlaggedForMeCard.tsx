'use client';

import { useState } from 'react';
import type { MessageFlag } from '@/types/flag';

interface Props {
  flag: MessageFlag;
  /** Pretty name for `fromUserId`, looked up by caller. */
  senderDisplayName: string;
  /** Called after a successful response. Parent should refresh / dismiss. */
  onClosed?: () => void;
}

export function FlaggedForMeCard({ flag, senderDisplayName, onClosed: _onClosed }: Props) {
  const [expanded, setExpanded] = useState(false);
  // Implementation of expanded state added in Task 14.

  return (
    <button
      type="button"
      className="flag-row"
      onClick={() => setExpanded((v) => !v)}
      aria-expanded={expanded}
    >
      <span className="row-icon" aria-hidden>⚑</span>
      <span className="row-text">
        <span className="title">
          {senderDisplayName} flagged a moment for you
          {flag.needsRealReply && <span className="pill-warn"> Needs reply</span>}
        </span>
        <span className="sub">&ldquo;{flag.quoteText}&rdquo;</span>
      </span>

      <style jsx>{`
        .flag-row {
          all: unset;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          background: #fffaf0;
          border: 1px solid #ead9b4;
          border-left: 3px solid #b65f3a;
          border-radius: 8px;
          padding: 11px 14px;
          margin-bottom: 7px;
          box-sizing: border-box;
        }
        .row-icon {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, #b65f3a, #d4a25a);
          color: white;
          display: grid; place-items: center;
          font-size: 14px; flex-shrink: 0;
        }
        .row-text {
          flex: 1; display: flex; flex-direction: column; gap: 2px;
          text-align: left;
        }
        .title { font-size: 13px; font-weight: 600; color: #2a2a2a; }
        .sub {
          font-size: 12px; color: #6a6055; font-style: italic;
          overflow: hidden; text-overflow: ellipsis;
          display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical;
        }
        .pill-warn {
          display: inline-block; margin-left: 6px;
          background: #f4ddc4; color: #8b3a18;
          font-size: 10px; padding: 1px 7px; border-radius: 999px;
          text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;
        }
      `}</style>
    </button>
  );
}
