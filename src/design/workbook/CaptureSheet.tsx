'use client';
/* ================================================================
   Relish · Workbook — CaptureSheet (The Pen)
   Rebuilt from the 2026-04-20 editorial redesign: dark cinematic
   stage behind a paper sheet with a notebook margin rule, an
   editorial date header, a big serif field with an ember caret,
   chip rows for person/tag/visibility, and a footer with an
   AttachmentRow + primary "Keep" pill. Listens for the
   `relish:pen:open` event posted by PenHost.
   ================================================================ */

import { useEffect, useRef, useState } from 'react';
import { usePrivacyLock } from '@/hooks/usePrivacyLock';
import { PinSetupModal } from '@/components/privacy/PinSetupModal';
import { useAuth } from '@/context/AuthContext';
import { AttachmentRow } from '@/components/capture/AttachmentRow';
import type { JournalMedia } from '@/types/journal';

export type CaptureVisibility = 'just-me' | 'everyone';
export interface CaptureSubmission {
  text: string;
  person?: string;
  tag?: string;
  visibility: CaptureVisibility;
  media?: JournalMedia[];
}
export interface CaptureSheetProps {
  people?: string[];              // quick-pick chips
  tags?: string[];
  onSubmit?: (s: CaptureSubmission) => Promise<void> | void;
}

export function CaptureSheet({ people = [], tags = [], onSubmit }: CaptureSheetProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [person, setPerson] = useState<string | undefined>();
  const [tag, setTag] = useState<string | undefined>();
  const [visibility, setVisibility] = useState<CaptureVisibility>('just-me');
  const [media, setMedia] = useState<JournalMedia[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);

  const privacyLock = usePrivacyLock();

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('relish:pen:open', onOpen as EventListener);
    return () => window.removeEventListener('relish:pen:open', onOpen as EventListener);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') setOpen(false);
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (open) setTimeout(() => ta.current?.focus(), 80);
  }, [open]);

  async function submit() {
    if (!text.trim() || submitting) return;
    if (visibility === 'just-me' && !privacyLock.loading && !privacyLock.pinIsSet) {
      setPendingSave(true);
      setShowPinSetup(true);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit?.({
        text: text.trim(),
        person,
        tag,
        visibility,
        media: media.length > 0 ? media : undefined,
      });
      setJustSaved(true);
      setText('');
      setPerson(undefined);
      setTag(undefined);
      setVisibility('just-me');
      setMedia([]);
      setTimeout(() => { setOpen(false); setJustSaved(false); }, 1100);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const timeLabel = today.toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <>
      {/* Dark cinematic stage — the world goes out of focus */}
      <div
        onClick={() => setOpen(false)}
        style={stageStyle}
        aria-label="Close the Pen"
      />

      {/* Chrome above the sheet — quiet crumb + close */}
      <div style={chromeStyle}>
        <div style={chromeFromStyle}>
          <span style={chromeDot} aria-hidden="true" />
          <span>
            Picking up the Pen · <em style={{ color: 'var(--r-amber)' }}>{partOfDay(today)}</em>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          style={closeXStyle}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>
      </div>

      {/* THE SHEET */}
      <div role="dialog" aria-label="Capture" style={sheetStyle}>
        <style jsx>{`
          @keyframes r-rise-pen {
            from { transform: translate(-50%, 16px); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
          }
          @keyframes r-fade { from { opacity: 0; } to { opacity: 1; } }
          .pen-field {
            width: 100%;
            border: none;
            background: transparent;
            resize: none;
            outline: none;
            font-family: var(--r-serif, Georgia, serif);
            font-weight: 400;
            font-size: 22px;
            line-height: 1.6;
            color: var(--r-ink, #3A3530);
            caret-color: var(--r-ember, #C9864C);
            letter-spacing: -0.003em;
            padding: 0;
            min-height: 220px;
          }
          .pen-field::placeholder {
            color: var(--r-text-5, #887C68);
            font-style: italic;
          }
          .kind-chip {
            all: unset;
            cursor: pointer;
            font-family: var(--r-sans, -apple-system, sans-serif);
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: var(--r-text-4, #6B6254);
            padding: 6px 12px;
            border: 1px solid var(--r-rule-4, #D8D3CA);
            border-radius: 999px;
            background: transparent;
            transition: all 140ms var(--r-ease-ink, cubic-bezier(0.22,1,0.36,1));
          }
          .kind-chip:hover {
            color: var(--r-ink, #3A3530);
            border-color: var(--r-rule-3, #C0B49F);
          }
          .kind-chip.on {
            background: var(--r-leather, #14100C);
            color: var(--r-paper, #FBF8F2);
            border-color: var(--r-leather, #14100C);
          }
          .keep-btn {
            all: unset;
            cursor: pointer;
            font-family: var(--r-sans, -apple-system, sans-serif);
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            padding: 12px 24px;
            border-radius: 999px;
            background: var(--r-leather, #14100C);
            color: var(--r-paper, #FBF8F2);
            display: inline-flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 1px 2px rgba(60,50,40,0.04), 0 6px 18px rgba(60,50,40,0.05);
            transition: transform 140ms var(--r-ease-ink, cubic-bezier(0.22,1,0.36,1)), background 140ms;
          }
          .keep-btn:hover { background: var(--r-leather-2, #2A2520); transform: translateY(-1px); }
          .keep-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
          .keep-btn .ember-dot {
            width: 7px; height: 7px; border-radius: 50%;
            background: var(--r-ember, #C9864C);
          }
        `}</style>

        {justSaved ? (
          <div style={savedStyle}>
            <span style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 28, color: 'var(--r-sage-deep)' }}>
              In the book.
            </span>
          </div>
        ) : (
          <>
            {/* HEADER: date + kind chips */}
            <div style={sheetHeadStyle}>
              <div>
                <div style={sheetDateStyle}>{dateLabel}</div>
                <div style={sheetTimeStyle}>{timeLabel}</div>
              </div>
              <div style={sheetKindRow}>
                <span style={kindLabelStyle}>A kind of note</span>
                {['moment', 'reflection', 'win', 'question'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`kind-chip ${tag === k ? 'on' : ''}`}
                    onClick={() => setTag(tag === k ? undefined : k)}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            {/* PROMPT CUE */}
            {tag !== 'question' && (
              <p style={promptCueStyle}>
                <span style={qMarkStyle}>&ldquo;</span>
                <span>
                  {tag === 'win' ? 'What went well?' :
                   tag === 'reflection' ? 'What are you sitting with?' :
                   'What happened? Who was there?'}
                </span>
              </p>
            )}

            {/* THE FIELD */}
            <textarea
              ref={ta}
              className="pen-field"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write what came up. A line, a scene, a feeling."
              rows={6}
            />

            {/* ENTITIES ROW (people + tag chips pulled from props) */}
            {(people.length > 0 || tags.length > 0) && (
              <div style={entitiesStyle}>
                <span style={entitiesLabelStyle}>Who &amp; what</span>
                {people.map((p) => (
                  <EntityChip
                    key={p}
                    label={p}
                    active={person === p}
                    onClick={() => setPerson(person === p ? undefined : p)}
                  />
                ))}
                {tags.filter((t) => !['moment', 'reflection', 'win', 'question'].includes(t)).map((t) => (
                  <EntityChip
                    key={t}
                    label={`#${t}`}
                    active={tag === t}
                    onClick={() => setTag(tag === t ? undefined : t)}
                    kind="tag"
                  />
                ))}
              </div>
            )}

            {/* ATTACHMENTS */}
            {user?.familyId && (
              <div style={{ marginTop: 20 }}>
                <AttachmentRow
                  familyId={user.familyId}
                  media={media}
                  onChange={setMedia}
                  compact
                />
              </div>
            )}

            {/* FOOTER: visibility + Keep */}
            <div style={sheetFootStyle}>
              <div style={toolBarStyle}>
                <button
                  type="button"
                  className={`kind-chip ${visibility === 'just-me' ? 'on' : ''}`}
                  onClick={() => setVisibility('just-me')}
                >
                  Just me
                </button>
                <button
                  type="button"
                  className={`kind-chip ${visibility === 'everyone' ? 'on' : ''}`}
                  onClick={() => setVisibility('everyone')}
                >
                  Everyone
                </button>
                <span style={privacyNoteStyle}>
                  {visibility === 'just-me'
                    ? '— a line only you will read'
                    : '— shared with the household'}
                </span>
              </div>
              <button
                type="button"
                className="keep-btn"
                disabled={!text.trim() || submitting}
                onClick={submit}
              >
                <span className="ember-dot" aria-hidden="true" />
                {submitting ? 'Keeping…' : 'Keep'}
              </button>
            </div>
          </>
        )}
      </div>

      {showPinSetup && (
        <PinSetupModal
          onComplete={async (pin) => {
            await privacyLock.setupPin(pin);
            setShowPinSetup(false);
            if (pendingSave) {
              setPendingSave(false);
              setTimeout(() => { void submit(); }, 0);
            }
          }}
          onCancel={() => {
            setShowPinSetup(false);
            setPendingSave(false);
          }}
        />
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   Sub-components
   ════════════════════════════════════════════════════════════════ */

function EntityChip({
  label,
  active,
  onClick,
  kind,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  kind?: 'person' | 'tag';
}) {
  const initial = label.slice(0, 1).toUpperCase();
  const isTag = kind === 'tag';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px 6px 6px',
        background: active ? 'var(--r-cream-warm)' : 'var(--r-cream)',
        border: `1px solid ${active ? 'var(--r-rule-3)' : 'var(--r-rule-5)'}`,
        borderRadius: 999,
        fontFamily: 'var(--r-sans)',
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--r-ink)',
        transition: 'all 140ms var(--r-ease-ink)',
      }}
    >
      {!isTag && (
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'var(--r-cream-warm)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--r-serif)',
            fontStyle: 'italic',
            fontSize: 12,
            color: 'var(--r-ink)',
          }}
          aria-hidden="true"
        >
          {initial}
        </span>
      )}
      {label}
    </button>
  );
}

function partOfDay(d: Date): string {
  const h = d.getHours();
  if (h < 5) return 'late-night edition';
  if (h < 12) return 'morning edition';
  if (h < 18) return 'afternoon edition';
  return 'evening edition';
}

/* ════════════════════════════════════════════════════════════════
   Inline styles
   ════════════════════════════════════════════════════════════════ */

const stageStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 80,
  background:
    'radial-gradient(ellipse at 50% 40%, rgba(201,134,76,0.10) 0%, rgba(20,16,12,0) 55%), linear-gradient(180deg, rgba(26,21,16,0.75) 0%, rgba(20,16,12,0.85) 100%)',
  backdropFilter: 'blur(3px)',
  animation: 'r-fade 200ms ease-out',
};

const chromeStyle: React.CSSProperties = {
  position: 'fixed',
  top: 32,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 'min(980px, calc(100vw - 48px))',
  zIndex: 82,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  color: 'rgba(245,236,216,0.6)',
};

const chromeFromStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontFamily: 'var(--r-sans)',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
};

const chromeDot: React.CSSProperties = {
  width: 5,
  height: 5,
  borderRadius: '50%',
  background: 'var(--r-ember)',
  flex: 'none',
};

const closeXStyle: React.CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  width: 32,
  height: 32,
  borderRadius: '50%',
  border: '1px solid rgba(245,236,216,0.18)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(245,236,216,0.55)',
  transition: 'all 140ms var(--r-ease-ink)',
};

const sheetStyle: React.CSSProperties = {
  position: 'fixed',
  left: '50%',
  top: 92,
  transform: 'translateX(-50%)',
  zIndex: 81,
  width: 'min(980px, calc(100vw - 48px))',
  maxHeight: 'calc(100vh - 140px)',
  overflow: 'auto',
  background: 'var(--r-paper)',
  borderRadius: 3,
  boxShadow:
    '0 2px 6px rgba(0,0,0,0.3), 0 24px 60px rgba(0,0,0,0.45), 0 60px 140px rgba(0,0,0,0.35)',
  padding: '48px 56px 28px',
  animation: 'r-rise-pen 220ms var(--r-ease-ink)',
  backgroundImage:
    'repeating-linear-gradient(0deg, rgba(168,152,138,0.04) 0px, rgba(168,152,138,0.04) 1px, transparent 1px, transparent 40px)',
};

const sheetHeadStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 24,
  marginBottom: 20,
  paddingBottom: 20,
  borderBottom: '1px solid var(--r-rule-5)',
  flexWrap: 'wrap',
};

const sheetDateStyle: React.CSSProperties = {
  fontFamily: 'var(--r-serif)',
  fontStyle: 'italic',
  fontWeight: 300,
  fontSize: 26,
  color: 'var(--r-ink)',
  letterSpacing: '-0.01em',
  lineHeight: 1,
};

const sheetTimeStyle: React.CSSProperties = {
  fontFamily: 'var(--r-sans)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--r-text-5)',
  marginTop: 8,
};

const sheetKindRow: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  alignItems: 'center',
  flexWrap: 'wrap',
};

const kindLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--r-sans)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--r-text-5)',
  marginRight: 4,
};

const promptCueStyle: React.CSSProperties = {
  fontFamily: 'var(--r-serif)',
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: 17,
  color: 'var(--r-text-4)',
  margin: '0 0 14px',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

const qMarkStyle: React.CSSProperties = {
  fontFamily: 'var(--r-serif)',
  fontStyle: 'italic',
  fontSize: 28,
  color: 'var(--r-ember)',
  lineHeight: 0.8,
};

const entitiesStyle: React.CSSProperties = {
  margin: '24px 0 0',
  paddingTop: 18,
  borderTop: '1px solid var(--r-rule-5)',
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  alignItems: 'center',
};

const entitiesLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--r-sans)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--r-text-5)',
  marginRight: 4,
};

const sheetFootStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: 24,
  alignItems: 'center',
  marginTop: 28,
  paddingTop: 18,
  borderTop: '1px solid var(--r-rule-5)',
};

const toolBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
  alignItems: 'center',
};

const privacyNoteStyle: React.CSSProperties = {
  fontFamily: 'var(--r-serif)',
  fontStyle: 'italic',
  fontSize: 13,
  color: 'var(--r-text-5)',
  marginLeft: 4,
};

const savedStyle: React.CSSProperties = {
  padding: '48px 0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: 'r-fade 200ms',
};
