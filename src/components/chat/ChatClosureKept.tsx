'use client';

import { useEffect, useState } from 'react';

export interface ChatClosureKeptProps {
  /** The emergent one-sentence distillation (coach chat only). */
  emergent?: string;
  /** First user message, echoed back on close. */
  echo?: string;
  /**
   * What to say will happen with this material. The workbook card
   * promise for coach chats; the on-entry promise for entry chats.
   */
  followUp: string;
  /**
   * Called when the overlay finishes (user taps Close or auto-timer
   * elapses). The caller then runs its normal onClose logic.
   */
  onDismiss: () => void;
  /**
   * localStorage key used to gate the first-time long explainer.
   * Different chats use different keys so each gets its own intro.
   */
  firstTimeKey: string;
  /**
   * Longer paragraph shown only the first time this chat type is
   * closed. Omitted afterwards.
   */
  firstTimeBody: string;
}

/**
 * Brief "Kept." moment shown when a chat is closed after the user
 * had at least one turn. Auto-dismisses after ~3.5s, or sooner on
 * tap. First-time variant stays until tapped so the user can read
 * the longer explainer.
 */
export function ChatClosureKept({
  emergent,
  echo,
  followUp,
  onDismiss,
  firstTimeKey,
  firstTimeBody,
}: ChatClosureKeptProps) {
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setReady(true);
      return;
    }
    let seen = false;
    try {
      seen = !!window.localStorage.getItem(firstTimeKey);
    } catch {
      // storage disabled — treat as first-time; no harm shown twice
    }
    setIsFirstTime(!seen);
    try {
      window.localStorage.setItem(firstTimeKey, '1');
    } catch {
      // non-fatal
    }
    setReady(true);
  }, [firstTimeKey]);

  // Auto-dismiss timer — only after the first-time variant has been
  // seen. First-time users need to read the explainer.
  useEffect(() => {
    if (!ready || isFirstTime) return;
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [ready, isFirstTime, onDismiss]);

  if (!ready) return null;

  return (
    <div
      className="chat-closure-overlay"
      role="dialog"
      aria-live="polite"
      onClick={onDismiss}
    >
      <div
        className="chat-closure-card"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="cc-eyebrow">Saved.</span>
        {emergent ? (
          <p className="cc-emergent">
            <em>&ldquo;{emergent}&rdquo;</em>
          </p>
        ) : echo ? (
          <p className="cc-echo">
            We heard: <em>&ldquo;{echo}&rdquo;</em>
          </p>
        ) : null}

        {isFirstTime && (
          <p className="cc-intro">{firstTimeBody}</p>
        )}

        <p className="cc-follow">{followUp}</p>

        <button
          type="button"
          className="cc-dismiss"
          onClick={onDismiss}
        >
          {isFirstTime ? 'Got it ⟶' : 'Close'}
        </button>
      </div>

      <style jsx>{`
        .chat-closure-overlay {
          position: fixed;
          inset: 0;
          z-index: 80;
          background: rgba(20, 16, 12, 0.55);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          animation: cc-fade-in 220ms ease-out;
        }
        .chat-closure-card {
          max-width: 460px;
          width: 100%;
          background: #fdfbf6;
          border: 1px solid rgba(200, 190, 172, 0.55);
          border-radius: 4px;
          padding: 32px 36px 28px;
          text-align: center;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.8) inset,
            0 20px 60px rgba(20, 16, 12, 0.35);
          animation: cc-rise 260ms ease-out;
        }
        .cc-eyebrow {
          display: block;
          font-family: var(--font-parent-display, Georgia, serif);
          font-style: italic;
          font-weight: 400;
          font-size: 36px;
          line-height: 1;
          letter-spacing: -0.015em;
          color: #3a3530;
          margin-bottom: 16px;
        }
        .cc-emergent {
          font-family: var(--font-parent-display, Georgia, serif);
          font-size: 18px;
          line-height: 1.4;
          color: #3a3530;
          margin: 0 0 14px;
        }
        .cc-emergent em {
          font-style: italic;
        }
        .cc-echo {
          font-family: var(--font-parent-body, system-ui, sans-serif);
          font-size: 14px;
          line-height: 1.5;
          color: #5a5247;
          margin: 0 0 14px;
        }
        .cc-echo em {
          font-family: var(--font-parent-display, Georgia, serif);
          font-style: italic;
          font-size: 16px;
          color: #3a3530;
        }
        .cc-intro {
          font-family: var(--font-parent-body, system-ui, sans-serif);
          font-size: 14px;
          line-height: 1.55;
          color: #4a4238;
          margin: 14px auto 12px;
          max-width: 380px;
          padding-top: 14px;
          border-top: 1px solid rgba(200, 190, 172, 0.55);
        }
        .cc-follow {
          font-family: var(--font-parent-body, system-ui, sans-serif);
          font-size: 13px;
          line-height: 1.5;
          color: #6b6254;
          margin: 10px auto 0;
          max-width: 380px;
        }
        .cc-dismiss {
          margin-top: 22px;
          font-family: var(--font-parent-body, system-ui, sans-serif);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #3a3530;
          background: transparent;
          border: 0;
          cursor: pointer;
          padding: 8px 12px;
        }
        .cc-dismiss:hover {
          color: #7c9082;
        }
        @keyframes cc-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cc-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
