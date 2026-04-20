'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePerson } from '@/hooks/usePerson';
import { useMomentInvite } from '@/hooks/useMomentInvite';
import { momentTouchesHighDivergence } from '@/config/high-divergence-dimensions';
import type { Moment } from '@/types/moment';
import type { MomentInviteMode } from '@/types/moment-invite';

interface InviteViewSheetProps {
  moment: Moment;
  existingViewerUserIds: string[];   // so we can hide them from the picker
  onClose: () => void;
  onSent?: () => void;
}

// A sheet that opens over the moment page when the user clicks
// "invite a view". Targets: family members with a linkedUserId
// who aren't already contributors. Default mode: blind if the
// moment touches a high-divergence dimension, else anchored.
export function InviteViewSheet({
  moment,
  existingViewerUserIds,
  onClose,
  onSent,
}: InviteViewSheetProps) {
  const { user } = useAuth();
  const { people } = usePerson();
  const { inviteView } = useMomentInvite();

  const targets = useMemo(() => {
    return people
      .filter((p) => !p.archived)
      .filter(
        (p) =>
          !!p.linkedUserId &&
          p.linkedUserId !== user?.userId &&
          !existingViewerUserIds.includes(p.linkedUserId),
      );
  }, [people, existingViewerUserIds, user?.userId]);

  const defaultMode: MomentInviteMode = momentTouchesHighDivergence(
    moment.dimensions,
  )
    ? 'blind'
    : 'anchored';

  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<MomentInviteMode>(defaultMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!targetUserId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await inviteView({
        momentId: moment.momentId,
        targetUserId,
        prompt: prompt.trim() || undefined,
        mode,
      });
      onSent?.();
      onClose();
    } catch (err) {
      console.error('InviteViewSheet: inviteView failed', err);
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div style={stageStyle} onClick={onClose} />
      <div role="dialog" aria-label="Invite a view" style={sheetStyle}>
        <header style={headStyle}>
          <p style={kickerStyle}>Invite a view</p>
          <h2 style={titleStyle}>
            Ask someone <em>what they saw.</em>
          </h2>
          <p style={ledeStyle}>
            They&rsquo;ll write their own account of this moment.{' '}
            {mode === 'blind' ? (
              <em>They won&rsquo;t see yours until they submit.</em>
            ) : (
              <em>They&rsquo;ll see your view first.</em>
            )}
          </p>
        </header>

        {targets.length === 0 ? (
          <p style={emptyStyle}>
            <em>No one else in the family has a login yet.</em> Add someone in
            Settings first.
          </p>
        ) : (
          <>
            <section style={sectionStyle}>
              <p style={labelStyle}>Who</p>
              <div style={targetRowStyle}>
                {targets.map((p) => {
                  const on = targetUserId === p.linkedUserId;
                  return (
                    <button
                      key={p.personId}
                      type="button"
                      onClick={() => setTargetUserId(p.linkedUserId!)}
                      style={targetChipStyle(on)}
                    >
                      <span style={targetInitialStyle(on)}>
                        {p.name.slice(0, 1).toUpperCase()}
                      </span>
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </section>

            <section style={sectionStyle}>
              <p style={labelStyle}>A prompt (optional)</p>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. What did you see from your side?"
                style={inputStyle}
                maxLength={160}
              />
            </section>

            <section style={sectionStyle}>
              <p style={labelStyle}>Mode</p>
              <div style={modeRowStyle}>
                <button
                  type="button"
                  onClick={() => setMode('blind')}
                  style={modePillStyle(mode === 'blind')}
                >
                  <span style={modeTitleStyle}>Blind</span>
                  <span style={modeSubStyle}>
                    They write without seeing your view
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('anchored')}
                  style={modePillStyle(mode === 'anchored')}
                >
                  <span style={modeTitleStyle}>Anchored</span>
                  <span style={modeSubStyle}>
                    They see your view first
                  </span>
                </button>
              </div>
              {momentTouchesHighDivergence(moment.dimensions) && (
                <p style={modeNoteStyle}>
                  <em>Blind is suggested</em> — this moment touches a
                  dimension where partners often see things differently.
                </p>
              )}
            </section>

            {error && <p style={errorStyle}>{error}</p>}
          </>
        )}

        <footer style={footStyle}>
          <button type="button" onClick={onClose} style={cancelBtnStyle}>
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!targetUserId || submitting || targets.length === 0}
            style={sendBtnStyle(!targetUserId || submitting)}
          >
            {submitting ? 'Sending…' : 'Send the invite'}
          </button>
        </footer>
      </div>
    </>
  );
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
};

const sheetStyle: React.CSSProperties = {
  position: 'fixed',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 81,
  width: 'min(640px, calc(100vw - 48px))',
  maxHeight: 'calc(100vh - 96px)',
  overflow: 'auto',
  background: 'var(--r-paper)',
  borderRadius: 3,
  boxShadow:
    '0 2px 6px rgba(0,0,0,0.3), 0 24px 60px rgba(0,0,0,0.45), 0 60px 140px rgba(0,0,0,0.35)',
  padding: '36px 40px 24px',
};

const headStyle: React.CSSProperties = {
  marginBottom: 24,
  paddingBottom: 20,
  borderBottom: '1px solid var(--r-rule-5)',
};

const kickerStyle: React.CSSProperties = {
  fontFamily: 'var(--r-sans)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4)',
  margin: '0 0 8px',
};

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--r-serif)',
  fontStyle: 'italic',
  fontWeight: 300,
  fontSize: 30,
  lineHeight: 1.1,
  letterSpacing: '-0.015em',
  color: 'var(--r-ink)',
  margin: 0,
};

const ledeStyle: React.CSSProperties = {
  fontFamily: 'var(--r-serif)',
  fontSize: 16,
  lineHeight: 1.5,
  color: 'var(--r-text-3)',
  margin: '10px 0 0',
};

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  marginBottom: 20,
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--r-sans)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4)',
  margin: 0,
};

const targetRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
};

function targetChipStyle(on: boolean): React.CSSProperties {
  return {
    all: 'unset',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 14px 6px 6px',
    borderRadius: 999,
    border: `1px solid ${on ? 'var(--r-leather)' : 'var(--r-rule-4)'}`,
    background: on ? 'var(--r-leather)' : 'var(--r-paper)',
    color: on ? 'var(--r-paper)' : 'var(--r-ink)',
    fontFamily: 'var(--r-sans)',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 140ms var(--r-ease-ink)',
  };
}

function targetInitialStyle(on: boolean): React.CSSProperties {
  return {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: on ? 'rgba(245,236,216,0.15)' : 'var(--r-cream-warm)',
    color: on ? 'var(--r-paper)' : 'var(--r-ink)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--r-serif)',
    fontStyle: 'italic',
    fontSize: 13,
  };
}

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  border: '1px solid var(--r-rule-3)',
  background: 'var(--r-paper-soft)',
  borderRadius: 3,
  fontFamily: 'var(--r-serif)',
  fontStyle: 'italic',
  fontSize: 16,
  color: 'var(--r-ink)',
  outline: 'none',
};

const modeRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 10,
};

function modePillStyle(on: boolean): React.CSSProperties {
  return {
    all: 'unset',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    padding: '14px 16px',
    borderRadius: 3,
    border: `1px solid ${on ? 'var(--r-ink)' : 'var(--r-rule-4)'}`,
    background: on ? 'var(--r-cream-warm)' : 'var(--r-paper-soft)',
    transition: 'all 140ms var(--r-ease-ink)',
  };
}

const modeTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--r-serif)',
  fontStyle: 'italic',
  fontSize: 17,
  color: 'var(--r-ink)',
};

const modeSubStyle: React.CSSProperties = {
  fontFamily: 'var(--r-sans)',
  fontSize: 11,
  letterSpacing: '0.05em',
  color: 'var(--r-text-4)',
};

const modeNoteStyle: React.CSSProperties = {
  fontFamily: 'var(--r-serif)',
  fontSize: 13,
  color: 'var(--r-text-4)',
  margin: '2px 0 0',
};

const emptyStyle: React.CSSProperties = {
  fontFamily: 'var(--r-serif)',
  fontStyle: 'italic',
  color: 'var(--r-text-4)',
  margin: '24px 0',
};

const errorStyle: React.CSSProperties = {
  fontFamily: 'var(--r-serif)',
  fontSize: 14,
  color: 'var(--r-burgundy)',
  margin: '0 0 12px',
};

const footStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  paddingTop: 16,
  borderTop: '1px solid var(--r-rule-5)',
  marginTop: 12,
};

const cancelBtnStyle: React.CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  padding: '10px 18px',
  fontFamily: 'var(--r-sans)',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4)',
  borderRadius: 999,
  border: '1px solid var(--r-rule-4)',
};

function sendBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    all: 'unset',
    cursor: disabled ? 'not-allowed' : 'pointer',
    padding: '10px 18px',
    fontFamily: 'var(--r-sans)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'var(--r-paper)',
    background: 'var(--r-leather)',
    border: '1px solid var(--r-leather)',
    borderRadius: 999,
    opacity: disabled ? 0.4 : 1,
  };
}
