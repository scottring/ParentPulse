'use client';

import { useEffect, useRef, useState } from 'react';
import { markFlagSeen, respondToFlag } from '@/lib/flags';
import type { MessageFlag } from '@/types/flag';

interface Props {
  flag: MessageFlag;
  senderDisplayName: string;
  onClosed?: () => void;
}

const EMOJI_OPTIONS = ['🫶', '😬', '🤔', '👀', '👍'] as const;

export function FlaggedForMeCard({ flag, senderDisplayName, onClosed }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const seenFiredRef = useRef(false);

  useEffect(() => {
    if (!expanded || seenFiredRef.current) return;
    seenFiredRef.current = true;
    markFlagSeen(flag.flagId, { currentStatus: flag.status }).catch(() => {});
  }, [expanded, flag.flagId, flag.status]);

  const handleEmoji = async (e: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await respondToFlag(flag.flagId, { kind: 'emoji', value: e });
      onClosed?.();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSend = async () => {
    const text = replyText.trim();
    if (text.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      await respondToFlag(flag.flagId, {
        kind: flag.needsRealReply ? 'reply' : 'note',
        value: text,
      });
      onClosed?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`flag-row ${expanded ? 'expanded' : ''}`}>
      <button
        type="button"
        className="row-head"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="row-icon" aria-hidden>⚑</span>
        <span className="row-text">
          <span className="title">
            {senderDisplayName} flagged a moment for you
            {flag.needsRealReply && <span className="pill-warn"> Needs reply</span>}
          </span>
          {!expanded ? (
            <span className="sub">&ldquo;{flag.quoteText}&rdquo;</span>
          ) : (
            <span className="sub">
              {timeAgo(flag.createdAt)}
              {flag.needsRealReply ? ' · wants a written reply' : ''}
            </span>
          )}
        </span>
        <span className="caret" aria-hidden>{expanded ? '▴' : '▾'}</span>
      </button>

      {expanded && (
        <div className="expanded-body">
          {flag.note && <p className="note">{flag.note}</p>}
          <blockquote className="quote">&ldquo;{flag.quoteText}&rdquo;</blockquote>

          <div className="reply-row">
            <input
              type="text"
              className="reply-input"
              placeholder={`Write ${senderDisplayName} back…`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
            />
            <button
              type="button"
              className="send"
              onClick={handleSend}
              disabled={submitting || replyText.trim().length === 0}
            >
              Send
            </button>
          </div>

          {!flag.needsRealReply && (
            <div className="emoji-row" role="group" aria-label="Quick reactions">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  className="emoji"
                  onClick={() => handleEmoji(e)}
                  disabled={submitting}
                  aria-label={e}
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          {flag.needsRealReply && (
            <p className="needs-line">
              {senderDisplayName} asked for a written reply, not just a tap.
            </p>
          )}
        </div>
      )}

      <style jsx>{`
        .flag-row {
          background: #fffaf0;
          border: 1px solid #ead9b4;
          border-left: 3px solid #b65f3a;
          border-radius: 8px;
          padding: 0;
          margin-bottom: 7px;
        }
        .row-head {
          all: unset;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 11px 14px;
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
        }
        .pill-warn {
          display: inline-block; margin-left: 6px;
          background: #f4ddc4; color: #8b3a18;
          font-size: 10px; padding: 1px 7px; border-radius: 999px;
          text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;
        }
        .caret { color: #8a7a55; font-size: 12px; }
        .expanded-body {
          padding: 0 18px 14px 58px;
        }
        .note {
          font-size: 13px; line-height: 1.55; color: #4a4030;
          margin: 0 0 12px;
        }
        .quote {
          margin: 0 0 14px; padding: 2px 0 2px 12px;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 17px; line-height: 1.5; color: #2a2a2a;
          font-style: italic; border-left: 2px solid #b65f3a;
        }
        .reply-row {
          display: flex; gap: 8px; align-items: center;
          border-top: 1px solid #f0e6cf; padding-top: 12px;
        }
        .reply-input {
          flex: 1; border: 1px solid #ead9b4; border-radius: 6px;
          padding: 8px 10px; font-size: 13px; background: #fffefb;
        }
        .send {
          background: #b65f3a; color: white; border: none;
          padding: 8px 14px; border-radius: 6px;
          font-size: 12px; font-weight: 600; cursor: pointer;
        }
        .send:disabled { opacity: 0.5; cursor: default; }
        .emoji-row { display: flex; gap: 6px; margin-top: 10px; }
        .emoji {
          background: #f1ead4; border: 1px solid #d9c98a;
          width: 34px; height: 34px; border-radius: 50%;
          display: grid; place-items: center;
          font-size: 17px; cursor: pointer;
        }
        .needs-line {
          font-size: 11px; color: #8b3a18;
          font-style: italic; margin: 8px 0 0;
        }
      `}</style>
    </div>
  );
}

function timeAgo(ts: { toMillis?: () => number } | null | undefined): string {
  const ms = ts?.toMillis?.();
  if (!ms) return 'just now';
  const diffMin = Math.floor((Date.now() - ms) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}
