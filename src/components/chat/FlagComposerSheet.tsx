'use client';

import { useState } from 'react';
import { createFlag } from '@/lib/flags';
import type { FlagChatKind, FlagSenderRole } from '@/types/flag';

interface Recipient {
  userId: string;
  displayName: string;
}

interface Props {
  open: boolean;
  fromUserId: string;
  defaultRecipient: Recipient;
  chatKind: FlagChatKind;
  chatId: string;
  messageId: string;
  senderRole: FlagSenderRole;
  quoteText: string;
  onClose: () => void;
}

export function FlagComposerSheet({
  open,
  fromUserId,
  defaultRecipient,
  chatKind,
  chatId,
  messageId,
  senderRole,
  quoteText,
  onClose,
}: Props) {
  const [note, setNote] = useState('');
  const [needsRealReply, setNeedsRealReply] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await createFlag({
        fromUserId,
        toUserId: defaultRecipient.userId,
        chatKind,
        chatId,
        messageId,
        senderRole,
        quoteText,
        note: note.trim() || undefined,
        needsRealReply,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="sheet">
        <h4>Flag this for someone</h4>
        <blockquote className="quote">&ldquo;{quoteText}&rdquo;</blockquote>

        <div className="field">
          <label className="label">For</label>
          <span className="chip">
            <span className="avatar" aria-hidden>
              {defaultRecipient.displayName.charAt(0)}
            </span>
            {defaultRecipient.displayName}
          </span>
        </div>

        <div className="field">
          <label className="label" htmlFor="flag-note">Note (optional)</label>
          <textarea
            id="flag-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What do you want them to notice?"
          />
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={needsRealReply}
          aria-label="Needs a real reply"
          className={`toggle ${needsRealReply ? 'on' : 'off'}`}
          onClick={() => setNeedsRealReply((v) => !v)}
        >
          <span className="switch" aria-hidden />
          <span className="toggle-body">
            <strong>Needs a real reply</strong>
            <span>
              An emoji or tap won&apos;t close the loop &mdash; they&apos;ll see this is
              marked for a written response.
            </span>
          </span>
        </button>

        <div className="footer">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            Flag for {defaultRecipient.displayName}
          </button>
        </div>

        <style jsx>{`
          .overlay {
            position: fixed; inset: 0;
            background: rgba(40, 30, 18, 0.4);
            display: grid; place-items: center;
            z-index: 1000;
          }
          .sheet {
            background: white;
            border: 1px solid #d9c98a;
            border-radius: 12px;
            padding: 18px;
            box-shadow: 0 10px 28px rgba(0,0,0,0.10);
            max-width: 440px;
            width: calc(100% - 32px);
          }
          h4 {
            font-family: 'Cormorant Garamond', Georgia, serif;
            font-size: 18px; margin: 0 0 12px; color: #2a2a2a;
          }
          .quote {
            margin: 0 0 14px;
            background: #fbf6ea;
            border-left: 3px solid #b65f3a;
            padding: 8px 11px; border-radius: 4px;
            font-size: 12px; line-height: 1.5;
            color: #4a4030; font-style: italic;
          }
          .field { margin-bottom: 12px; }
          .label {
            display: block; font-size: 11px;
            text-transform: uppercase; letter-spacing: 0.06em;
            color: #8a7a55; margin-bottom: 4px;
          }
          .chip {
            display: inline-flex; align-items: center; gap: 6px;
            background: #f1ead4; border: 1px solid #d9c98a;
            border-radius: 999px; padding: 3px 10px 3px 4px;
            font-size: 12px;
          }
          .avatar {
            width: 18px; height: 18px; border-radius: 50%;
            background: linear-gradient(135deg, #b65f3a, #d4a25a);
            color: white; font-size: 10px; font-weight: 600;
            display: grid; place-items: center;
          }
          textarea {
            width: 100%; border: 1px solid #ead9b4; border-radius: 6px;
            padding: 7px 9px; font-size: 13px;
            background: #fffefb; box-sizing: border-box;
            min-height: 56px; resize: vertical; font-family: inherit;
          }
          .toggle {
            all: unset; cursor: pointer; display: flex; gap: 9px;
            padding: 10px; border: 1px dashed #d9c98a;
            border-radius: 6px; background: #fdfaf0;
            margin-bottom: 10px; align-items: flex-start;
          }
          .switch {
            width: 30px; height: 16px; border-radius: 999px;
            background: #c8bfa8; position: relative; flex-shrink: 0;
            margin-top: 2px;
          }
          .switch::after {
            content: ''; position: absolute;
            width: 12px; height: 12px;
            background: white; border-radius: 50%;
            top: 2px; left: 2px;
          }
          .toggle.on .switch { background: #b65f3a; }
          .toggle.on .switch::after { left: auto; right: 2px; }
          .toggle-body { font-size: 12px; line-height: 1.4; }
          .toggle-body strong { display: block; font-size: 13px; color: #2a2a2a; }
          .toggle-body span { color: #6a6055; }
          .footer { display: flex; gap: 9px; justify-content: flex-end; margin-top: 10px; }
          .primary {
            background: #b65f3a; color: white; border: none;
            padding: 8px 14px; border-radius: 6px;
            font-size: 13px; font-weight: 600; cursor: pointer;
          }
          .primary:disabled { opacity: 0.5; cursor: default; }
          .ghost {
            background: transparent; color: #6a6055;
            border: 1px solid #d9c98a; padding: 8px 14px;
            border-radius: 6px; font-size: 13px; cursor: pointer;
          }
        `}</style>
      </div>
    </div>
  );
}
