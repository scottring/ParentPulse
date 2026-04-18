'use client';
/* ================================================================
   Relish · Workbook — CaptureSheet
   The Pen's sheet: slides up from the bottom; a single textarea
   plus quiet metadata (person, tag). Submit closes with a
   confirmation that fades. Listens for the `relish:pen:open`
   event posted by PenHost.
   ================================================================ */

import { useEffect, useRef, useState } from 'react';
import { Eyebrow } from '../type';
import { usePrivacyLock } from '@/hooks/usePrivacyLock';
import { PinSetupModal } from '@/components/privacy/PinSetupModal';

export type CaptureVisibility = 'just-me' | 'everyone';
export interface CaptureSubmission {
  text: string;
  person?: string;
  tag?: string;
  visibility: CaptureVisibility;
}
export interface CaptureSheetProps {
  people?: string[];              // quick-pick chips
  tags?: string[];
  onSubmit?: (s: CaptureSubmission) => Promise<void> | void;
}

export function CaptureSheet({ people = [], tags = [], onSubmit }: CaptureSheetProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [person, setPerson] = useState<string | undefined>();
  const [tag, setTag] = useState<string | undefined>();
  const [visibility, setVisibility] = useState<CaptureVisibility>('just-me');
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
      if (e.key === 'Escape') setOpen(false);
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && open) submit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (open) setTimeout(() => ta.current?.focus(), 60);
  }, [open]);

  async function submit() {
    if (!text.trim() || submitting) return;
    // PIN gate: a private ("just me") entry requires a PIN first.
    // Pause submit, open setup modal, resume on completion.
    if (visibility === 'just-me' && !privacyLock.loading && !privacyLock.pinIsSet) {
      setPendingSave(true);
      setShowPinSetup(true);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit?.({ text: text.trim(), person, tag, visibility });
      setJustSaved(true);
      setText(''); setPerson(undefined); setTag(undefined); setVisibility('just-me');
      setTimeout(() => { setOpen(false); setJustSaved(false); }, 900);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 80,
          background: 'rgba(20,16,12,0.24)',
          backdropFilter: 'blur(2px)',
        }}
      />
      <div
        role="dialog"
        aria-label="Capture"
        style={{
          position: 'fixed',
          left: '50%', bottom: 24,
          transform: 'translateX(-50%)',
          zIndex: 81,
          width: 'min(720px, calc(100vw - 48px))',
          background: 'var(--r-paper)',
          border: '1px solid var(--r-rule-4)',
          borderRadius: 'var(--r-radius-3)',
          boxShadow: 'var(--r-shadow-page)',
          padding: 24,
          animation: 'r-rise 200ms var(--r-ease-ink)',
        }}
      >
        <style>{`
          @keyframes r-rise { from { transform:translate(-50%,12px); opacity:0 } to { transform:translate(-50%,0); opacity:1 } }
          @keyframes r-fade { from { opacity:0 } to { opacity:1 } }
        `}</style>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <Eyebrow>{justSaved ? 'Kept.' : 'A note'}</Eyebrow>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            style={{ all: 'unset', cursor: 'pointer', color: 'var(--r-text-4)', fontSize: 13 }}
          >
            esc
          </button>
        </div>

        {justSaved ? (
          <div style={{ padding: '16px 0', fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--r-sage)', animation: 'r-fade 200ms' }}>
            In the book.
          </div>
        ) : (
          <>
            <textarea
              ref={ta}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What happened? Who was there?"
              rows={4}
              style={{
                width: '100%', resize: 'none',
                border: 'none', outline: 'none', background: 'transparent',
                fontFamily: 'var(--r-serif)', fontSize: 20, lineHeight: 1.5,
                color: 'var(--r-ink)',
              }}
            />
            <div style={{ display: 'flex', gap: 20, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--r-rule-5)', flexWrap: 'wrap', alignItems: 'center' }}>
              {people.length > 0 && (
                <ChipRow label="With" options={people} selected={person} onSelect={setPerson} />
              )}
              {tags.length > 0 && (
                <ChipRow label="About" options={tags} selected={tag} onSelect={setTag} />
              )}
              <ChipRow
                label="For"
                options={['just-me', 'everyone']}
                optionLabels={{ 'just-me': 'Just me', everyone: 'Everyone' }}
                selected={visibility}
                onSelect={(v) => setVisibility((v as CaptureVisibility) ?? 'just-me')}
                allowClear={false}
              />
              <div style={{ flex: 1 }} />
              <button
                onClick={submit}
                disabled={!text.trim() || submitting}
                style={{
                  all: 'unset', cursor: !text.trim() ? 'not-allowed' : 'pointer',
                  padding: '10px 20px',
                  background: 'var(--r-leather)', color: 'var(--r-ink-reversed)',
                  fontFamily: 'var(--r-sans)', fontSize: 13, fontWeight: 600,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  borderRadius: 'var(--r-radius-3)',
                  opacity: !text.trim() ? 0.4 : 1,
                  transition: 'opacity 120ms var(--r-ease-ink)',
                }}
              >
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

function ChipRow({ label, options, selected, onSelect, optionLabels, allowClear = true }: {
  label: string;
  options: string[];
  selected?: string;
  onSelect: (v: string | undefined) => void;
  optionLabels?: Record<string, string>;
  allowClear?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontFamily: 'var(--r-sans)', fontSize: 12, color: 'var(--r-text-4)', fontStyle: 'italic' }}>{label}</span>
      {options.map((o) => {
        const active = o === selected;
        return (
          <button
            key={o}
            onClick={() => onSelect(active && allowClear ? undefined : o)}
            style={{
              all: 'unset', cursor: 'pointer',
              padding: '4px 10px',
              fontFamily: 'var(--r-sans)', fontSize: 12,
              color: active ? 'var(--r-leather)' : 'var(--r-text-3)',
              background: active ? 'var(--r-cream-warm)' : 'transparent',
              border: `1px solid ${active ? 'var(--r-cream-warm)' : 'var(--r-rule-4)'}`,
              borderRadius: 'var(--r-radius-pill)',
              transition: 'all 120ms var(--r-ease-ink)',
            }}
          >
            {optionLabels?.[o] ?? o}
          </button>
        );
      })}
    </div>
  );
}
