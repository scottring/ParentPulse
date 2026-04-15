'use client';

import { useCallback, useEffect, useState } from 'react';
import { Lock, Delete } from 'lucide-react';

interface PinKeypadProps {
  /** Called with the 4-digit string once the user submits (auto or Enter). */
  onSubmit: (pin: string) => Promise<boolean> | boolean;
  /** Optional heading above the keypad. Defaults to "Enter PIN". */
  title?: string;
  /** Optional subtitle hint under the heading. */
  subtitle?: string;
  /** Error text shown beneath the dots (e.g. after a wrong PIN). */
  error?: string | null;
  /** Called when the user cancels (tap background or X). Omit to hide. */
  onCancel?: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', null, '0', 'del'] as const;

/**
 * Full-screen numeric keypad for entering a 4-digit PIN.
 *
 * Auto-submits when the 4th digit is entered. Clears input on
 * incorrect submission (parent returns false).
 */
export function PinKeypad({
  onSubmit,
  title = 'Enter PIN',
  subtitle,
  error,
  onCancel,
}: PinKeypadProps) {
  const [digits, setDigits] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(
    async (pin: string) => {
      if (submitting) return;
      setSubmitting(true);
      try {
        const ok = await onSubmit(pin);
        if (!ok) setDigits('');
      } finally {
        setSubmitting(false);
      }
    },
    [onSubmit, submitting]
  );

  useEffect(() => {
    if (digits.length === 4) {
      submit(digits);
    }
  }, [digits, submit]);

  // Hardware keyboard support.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (submitting) return;
      if (e.key >= '0' && e.key <= '9') {
        setDigits((prev) => (prev.length >= 4 ? prev : prev + e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        setDigits((prev) => prev.slice(0, -1));
      } else if (e.key === 'Escape' && onCancel) {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submitting, onCancel]);

  const handleKey = (k: (typeof KEYS)[number]) => {
    if (submitting) return;
    if (k === null) return;
    if (k === 'del') {
      setDigits((prev) => prev.slice(0, -1));
      return;
    }
    setDigits((prev) => (prev.length >= 4 ? prev : prev + k));
  };

  return (
    <div className="pin-shell" role="dialog" aria-label={title}>
      <div className="pin-backdrop" onClick={onCancel} aria-hidden={onCancel ? undefined : 'true'} />
      <div className="pin-card">
        <div className="pin-icon" aria-hidden="true">
          <Lock size={20} strokeWidth={1.5} />
        </div>
        <h2 className="pin-title">{title}</h2>
        {subtitle && <p className="pin-sub">{subtitle}</p>}

        <div className="pin-dots" aria-live="polite">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`dot${i < digits.length ? ' filled' : ''}`}
              aria-hidden="true"
            />
          ))}
        </div>

        {error && <p className="pin-error">{error}</p>}

        <div className="pin-keys">
          {KEYS.map((k, i) => {
            if (k === null) return <span key={i} className="key-spacer" />;
            if (k === 'del') {
              return (
                <button
                  key={i}
                  type="button"
                  className="key key-del"
                  onClick={() => handleKey(k)}
                  aria-label="Delete"
                  disabled={submitting}
                >
                  <Delete size={18} strokeWidth={1.5} />
                </button>
              );
            }
            return (
              <button
                key={i}
                type="button"
                className="key"
                onClick={() => handleKey(k)}
                disabled={submitting}
              >
                {k}
              </button>
            );
          })}
        </div>

        {onCancel && (
          <button
            type="button"
            className="pin-cancel"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
        )}
      </div>

      <style jsx>{`
        .pin-shell {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .pin-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(20, 12, 4, 0.55);
          backdrop-filter: blur(4px);
          animation: fade 160ms ease;
        }
        @keyframes fade {
          from { opacity: 0; } to { opacity: 1; }
        }
        .pin-card {
          position: relative;
          background: #f5ecd8;
          border-radius: 12px;
          padding: 28px 28px 20px;
          width: min(340px, 100%);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
          text-align: center;
          color: #2d2418;
        }
        .pin-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(138, 106, 154, 0.15);
          color: #8a6a9a;
          margin-bottom: 10px;
        }
        .pin-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-size: 22px;
          color: #2d2418;
          margin: 0 0 4px;
          font-weight: 400;
        }
        .pin-sub {
          font-family: -apple-system, sans-serif;
          font-size: 12px;
          color: #8a6f4a;
          margin: 0 0 18px;
        }
        .pin-dots {
          display: flex;
          justify-content: center;
          gap: 14px;
          margin: 10px 0 12px;
        }
        .dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 1.5px solid #8a6f4a;
          background: transparent;
          transition: background 120ms ease;
        }
        .dot.filled {
          background: #2a1f14;
          border-color: #2a1f14;
        }
        .pin-error {
          font-family: -apple-system, sans-serif;
          font-size: 12px;
          color: #b94a3b;
          margin: 4px 0 10px;
        }
        .pin-keys {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 10px;
        }
        .key {
          padding: 16px 0;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(138, 111, 74, 0.25);
          font-family: -apple-system, sans-serif;
          font-size: 22px;
          color: #2d2418;
          cursor: pointer;
          transition: background 120ms ease, transform 80ms ease;
        }
        .key:hover {
          background: rgba(255, 255, 255, 0.85);
        }
        .key:active {
          transform: scale(0.97);
        }
        .key:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .key-del {
          color: #8a6f4a;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .key-spacer {
          /* grid cell, no visual */
        }
        .pin-cancel {
          margin-top: 14px;
          background: none;
          border: none;
          color: #8a6f4a;
          font-family: -apple-system, sans-serif;
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          cursor: pointer;
          padding: 6px 12px;
        }
        .pin-cancel:hover {
          color: #5a4628;
        }
      `}</style>
    </div>
  );
}
