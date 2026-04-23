'use client';

/* ================================================================
   Relish · /rituals/couple/session — the real couple-ritual flow.
   Enters with ?ritualId=… the first time, generates a RitualSession
   via the generateRitualScript Cloud Function, then walks the
   couple through 5 guided sections with shared notes. The final
   section captures 1-2 intentions for the coming week. On save the
   session is marked complete and past sessions show up on /rituals.
   ================================================================ */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  useRitualSession,
  createRitualSession,
} from '@/hooks/useRitualSession';
import type {
  RitualIntention,
  SessionSection,
} from '@/types/ritual-session';

function SessionStage({ children }: { children: React.ReactNode }) {
  return (
    <main className="session-stage">
      <div className="session-vignette" aria-hidden="true" />
      <div className="session-content">{children}</div>
      <style jsx global>{stageStyles}</style>
    </main>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <SessionStage>
      <p className="eyebrow">Your check-in</p>
      <h1 className="title">{message}</h1>
      <p className="lede muted">
        Pulling the last week together. Take a breath while Relish reads.
      </p>
    </SessionStage>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <SessionStage>
      <p className="eyebrow">Your check-in</p>
      <h1 className="title">Something snagged.</h1>
      <p className="lede muted">{message}</p>
      <Link href="/rituals" className="back-link">
        <span aria-hidden="true">&larr;</span> Back to rituals
      </Link>
    </SessionStage>
  );
}

/* ---------------- Bootstrap ---------------- */
function Bootstrap() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const sessionId = params.get('sessionId');
  const ritualId = params.get('ritualId');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (sessionId) return;
    if (!ritualId) {
      setError('No ritual specified. Pick a ritual from the rituals page.');
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    setCreating(true);
    createRitualSession(ritualId)
      .then((sid) => {
        router.replace(`/rituals/couple/session?sessionId=${sid}`);
      })
      .catch((err) => {
        console.error('createRitualSession failed:', err);
        setError(
          'The session couldn’t be generated. Check that you are a participant of this ritual.',
        );
        setCreating(false);
      });
  }, [authLoading, user, router, ritualId, sessionId]);

  if (error) return <ErrorState message={error} />;
  if (sessionId) return <Session sessionId={sessionId} />;
  if (creating) return <LoadingState message="Preparing your session…" />;
  return <LoadingState message="Opening…" />;
}

/* ---------------- Session (the flow) ---------------- */
function Session({ sessionId }: { sessionId: string }) {
  const { session, loading, saveSectionNote, saveIntentions, markComplete } =
    useRitualSession(sessionId);

  if (loading || !session) {
    return <LoadingState message="Opening…" />;
  }

  if (session.status === 'complete') {
    return <CompletedScreen session={session} />;
  }

  return (
    <SessionFlow
      sections={session.sections}
      initialIntentions={session.intentions || []}
      onSaveNote={saveSectionNote}
      onSaveIntentions={saveIntentions}
      onComplete={markComplete}
    />
  );
}

/* ---------------- Completed ---------------- */
function CompletedScreen({
  session,
}: {
  session: { intentions: RitualIntention[] };
}) {
  return (
    <SessionStage>
      <p className="eyebrow">Session complete</p>
      <h1 className="title">
        You finished <span className="accent">together</span>.
      </h1>
      <p className="lede muted">Carrying forward:</p>
      <ul className="intentions-recap">
        {session.intentions.length === 0 && (
          <li className="muted">
            <em>No intentions recorded.</em>
          </li>
        )}
        {session.intentions.map((it, i) => (
          <li key={i}>
            <span className="bullet" aria-hidden="true">
              &#10070;
            </span>
            {it.text}
          </li>
        ))}
      </ul>
      <Link href="/rituals" className="back-link">
        <span aria-hidden="true">&larr;</span> Back to rituals
      </Link>
    </SessionStage>
  );
}

/* ---------------- Flow ---------------- */
function SessionFlow({
  sections,
  initialIntentions,
  onSaveNote,
  onSaveIntentions,
  onComplete,
}: {
  sections: SessionSection[];
  initialIntentions: RitualIntention[];
  onSaveNote: (sectionIndex: number, note: string) => Promise<void>;
  onSaveIntentions: (intentions: RitualIntention[]) => Promise<void>;
  onComplete: () => Promise<void>;
}) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [intentions, setIntentions] = useState<RitualIntention[]>(
    () =>
      initialIntentions.length > 0
        ? initialIntentions
        : [{ text: '' }, { text: '' }],
  );

  const lastIdx = sections.length - 1;
  const atLast = idx === lastIdx;
  const section = sections[idx];

  const handleFinish = useCallback(async () => {
    setFinishing(true);
    const cleaned = intentions
      .map((i) => ({ ...i, text: i.text.trim() }))
      .filter((i) => i.text.length > 0);
    try {
      await onSaveIntentions(cleaned);
      await onComplete();
    } catch (err) {
      console.error('session finish failed:', err);
      setFinishing(false);
    }
  }, [intentions, onSaveIntentions, onComplete]);

  return (
    <SessionStage>
      <div className="progress">
        {sections.map((_, i) => (
          <span
            key={i}
            className={`progress-dot ${
              i === idx ? 'current' : i < idx ? 'done' : ''
            }`}
            aria-hidden="true"
          />
        ))}
      </div>

      <p className="eyebrow">
        Section {idx + 1} of {sections.length}
      </p>
      <h1 className="title">{section.title}</h1>
      <p className="lede">{section.opener}</p>

      {section.references && section.references.length > 0 && (
        <ul className="refs">
          {section.references.map((r, i) => (
            <li key={i} className="ref">
              <p className="ref-snippet">&ldquo;{r.snippet}&rdquo;</p>
              <p className="ref-by">
                &mdash; {r.authorName || 'one of you'}
                {r.sourceDate ? `, ${formatRefDate(r.sourceDate)}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="prompt">
        <em>{section.prompt}</em>
      </p>

      {section.kind === 'planAhead' ? (
        <IntentionsEditor value={intentions} onChange={setIntentions} />
      ) : (
        <SharedNoteField
          key={section.kind + ':' + idx}
          initialValue={section.note ?? ''}
          onSave={(note) => onSaveNote(idx, note)}
        />
      )}

      <div className="nav">
        <button
          type="button"
          className="nav-btn ghost"
          onClick={() => {
            if (idx === 0) {
              router.push('/rituals');
            } else {
              setIdx((v) => v - 1);
            }
          }}
        >
          {idx === 0 ? 'Leave' : '← Back'}
        </button>
        {atLast ? (
          <button
            type="button"
            className="nav-btn primary"
            onClick={handleFinish}
            disabled={finishing}
          >
            {finishing ? 'Saving…' : 'Complete session'}
          </button>
        ) : (
          <button
            type="button"
            className="nav-btn primary"
            onClick={() => setIdx((v) => v + 1)}
          >
            Next &rarr;
          </button>
        )}
      </div>
    </SessionStage>
  );
}

/* ---------------- Shared note field ---------------- */
function SharedNoteField({
  initialValue,
  onSave,
}: {
  initialValue: string;
  onSave: (note: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const handleBlur = useCallback(async () => {
    if (value === initialValue) return;
    setSaving(true);
    try {
      await onSave(value);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }, [value, initialValue, onSave]);

  return (
    <div className="note-wrap">
      <textarea
        className="note-field"
        placeholder="Jot a line or two together… (saves when you move on)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        rows={3}
      />
      <p className="note-status" aria-live="polite">
        {saving
          ? 'Saving…'
          : savedAt
          ? 'Saved.'
          : ' '}
      </p>
    </div>
  );
}

/* ---------------- Intentions editor ---------------- */
function IntentionsEditor({
  value,
  onChange,
}: {
  value: RitualIntention[];
  onChange: (next: RitualIntention[]) => void;
}) {
  const set = (i: number, patch: Partial<RitualIntention>) =>
    onChange(value.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addRow = () =>
    value.length < 3 && onChange([...value, { text: '' }]);
  const removeRow = (i: number) =>
    onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="intentions">
      {value.map((it, i) => (
        <div key={i} className="intention-row">
          <span className="intention-num">{String(i + 1).padStart(2, '0')}</span>
          <input
            className="intention-input"
            placeholder="What’s one thing you’ll carry into the week?"
            value={it.text}
            onChange={(e) => set(i, { text: e.target.value })}
          />
          {value.length > 1 && (
            <button
              type="button"
              className="intention-remove"
              onClick={() => removeRow(i)}
              aria-label="Remove intention"
            >
              &times;
            </button>
          )}
        </div>
      ))}
      {value.length < 3 && (
        <button type="button" className="intention-add" onClick={addRow}>
          + Add another
        </button>
      )}
    </div>
  );
}

function formatRefDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingState message="Opening…" />}>
      <Bootstrap />
    </Suspense>
  );
}

const stageStyles = `
  .session-stage {
    position: relative;
    min-height: 100vh;
    background: #14100c;
    color: #ede4d0;
    overflow: hidden;
  }
  .session-vignette {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at center,
        rgba(42, 37, 32, 0.0) 0%,
        rgba(20, 16, 12, 0.35) 60%,
        rgba(20, 16, 12, 0.6) 100%);
    pointer-events: none;
    z-index: 1;
  }
  .session-content {
    position: relative;
    z-index: 10;
    max-width: 720px;
    margin: 0 auto;
    padding: 88px 28px 96px;
  }
  .session-content .progress {
    display: flex;
    gap: 10px;
    margin-bottom: 36px;
  }
  .session-content .progress-dot {
    width: 28px;
    height: 2px;
    background: rgba(237, 228, 208, 0.18);
    transition: background 260ms ease;
  }
  .session-content .progress-dot.current { background: #d4a574; }
  .session-content .progress-dot.done { background: rgba(237, 228, 208, 0.5); }

  .session-content .eyebrow {
    font-family: var(--r-sans, 'DM Sans', system-ui, sans-serif);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: #c8b894;
    margin: 0 0 18px;
    text-shadow: 0 1px 8px rgba(0,0,0,0.85);
  }
  .session-content .title {
    font-family: var(--r-serif, 'Cormorant Garamond', Georgia, serif);
    font-style: italic;
    font-weight: 300;
    font-size: clamp(36px, 5.6vw, 60px);
    letter-spacing: -0.02em;
    color: #f5ecd8;
    margin: 0 0 20px;
    line-height: 1.08;
    text-shadow: 0 2px 18px rgba(0, 0, 0, 0.8);
  }
  .session-content .title .accent { color: #d4a574; font-style: italic; }
  .session-content .lede {
    font-family: var(--r-serif, 'Cormorant Garamond', Georgia, serif);
    font-style: italic;
    font-size: 20px;
    line-height: 1.55;
    color: #e8dcc0;
    margin: 0 0 28px;
    max-width: 52ch;
    text-shadow: 0 1px 8px rgba(0,0,0,0.8);
  }
  .session-content .lede.muted { color: #a89676; }
  .session-content .prompt {
    font-family: var(--r-serif, 'Cormorant Garamond', Georgia, serif);
    font-style: italic;
    font-size: 17px;
    color: #c8b894;
    margin: 0 0 18px;
    max-width: 48ch;
  }

  .session-content .refs {
    list-style: none;
    margin: 0 0 28px;
    padding: 0;
    display: grid;
    gap: 12px;
    max-width: 52ch;
  }
  .session-content .ref {
    background: rgba(237, 228, 208, 0.05);
    border-left: 2px solid rgba(212, 165, 116, 0.55);
    padding: 12px 14px 10px;
  }
  .session-content .ref-snippet {
    font-family: var(--r-serif, 'Cormorant Garamond', Georgia, serif);
    font-style: italic;
    font-size: 16px;
    color: #e8dcc0;
    line-height: 1.45;
    margin: 0 0 6px;
  }
  .session-content .ref-by {
    font-family: var(--r-sans, 'DM Sans', system-ui, sans-serif);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #a89676;
    margin: 0;
  }

  .session-content .note-wrap { margin: 0 0 28px; max-width: 56ch; }
  .session-content .note-field {
    width: 100%;
    background: rgba(237, 228, 208, 0.06);
    border: 1px solid rgba(237, 228, 208, 0.16);
    color: #f5ecd8;
    font-family: var(--r-serif, 'Cormorant Garamond', Georgia, serif);
    font-style: italic;
    font-size: 17px;
    line-height: 1.55;
    padding: 14px 16px;
    border-radius: 3px;
    resize: vertical;
    min-height: 92px;
    transition: border 160ms ease, background 160ms ease;
  }
  .session-content .note-field::placeholder { color: #8a7b5f; }
  .session-content .note-field:focus {
    outline: none;
    border-color: rgba(212, 165, 116, 0.55);
    background: rgba(237, 228, 208, 0.09);
  }
  .session-content .note-status {
    font-family: var(--r-sans, 'DM Sans', system-ui, sans-serif);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #7c6f55;
    margin: 6px 0 0;
    min-height: 1em;
  }

  .session-content .intentions {
    display: grid;
    gap: 10px;
    margin: 0 0 32px;
    max-width: 56ch;
  }
  .session-content .intention-row {
    display: grid;
    grid-template-columns: 36px 1fr 24px;
    align-items: center;
    gap: 10px;
  }
  .session-content .intention-num {
    font-family: var(--r-serif, 'Cormorant Garamond', Georgia, serif);
    font-style: italic;
    font-size: 20px;
    color: #d4a574;
    text-align: right;
  }
  .session-content .intention-input {
    background: rgba(237, 228, 208, 0.06);
    border: none;
    border-bottom: 1px solid rgba(237, 228, 208, 0.18);
    color: #f5ecd8;
    font-family: var(--r-serif, 'Cormorant Garamond', Georgia, serif);
    font-style: italic;
    font-size: 18px;
    padding: 8px 4px;
    outline: none;
    transition: border-color 160ms ease;
  }
  .session-content .intention-input:focus {
    border-bottom-color: #d4a574;
  }
  .session-content .intention-input::placeholder { color: #7c6f55; }
  .session-content .intention-remove {
    background: none;
    border: none;
    color: #7c6f55;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    padding: 4px;
    transition: color 160ms ease;
  }
  .session-content .intention-remove:hover { color: #c96852; }
  .session-content .intention-add {
    background: none;
    border: none;
    color: #c8b894;
    font-family: var(--r-sans, 'DM Sans', system-ui, sans-serif);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    padding: 8px 0;
    cursor: pointer;
    justify-self: start;
    transition: color 160ms ease;
  }
  .session-content .intention-add:hover { color: #f5ecd8; }

  .session-content .nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 12px;
  }
  .session-content .nav-btn {
    font-family: var(--r-sans, 'DM Sans', system-ui, sans-serif);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 12px 22px;
    border-radius: 2px;
    cursor: pointer;
    transition: background 160ms ease, color 160ms ease, opacity 160ms ease;
  }
  .session-content .nav-btn.ghost {
    background: transparent;
    color: #a89676;
    border: 1px solid rgba(168, 150, 118, 0.3);
  }
  .session-content .nav-btn.ghost:hover {
    color: #f5ecd8;
    border-color: rgba(245, 236, 216, 0.5);
  }
  .session-content .nav-btn.primary {
    background: #d4a574;
    color: #1c1410;
    border: 1px solid #d4a574;
  }
  .session-content .nav-btn.primary:hover {
    background: #e0b486;
    border-color: #e0b486;
  }
  .session-content .nav-btn.primary:disabled {
    opacity: 0.6;
    cursor: progress;
  }

  .session-content .intentions-recap {
    list-style: none;
    margin: 0 0 40px;
    padding: 0;
    display: grid;
    gap: 10px;
  }
  .session-content .intentions-recap li {
    font-family: var(--r-serif, 'Cormorant Garamond', Georgia, serif);
    font-style: italic;
    font-size: 19px;
    color: #f5ecd8;
    padding-left: 8px;
  }
  .session-content .intentions-recap .bullet {
    color: #d4a574;
    margin-right: 10px;
    font-style: normal;
  }
  .session-content .intentions-recap .muted { color: #8a7b5f; }

  .session-content .back-link {
    display: inline-block;
    font-family: var(--r-serif, 'Cormorant Garamond', Georgia, serif);
    font-style: italic;
    font-size: 16px;
    color: #c8b894;
    text-decoration: none;
    border-bottom: 1px solid rgba(200, 184, 148, 0.4);
    padding-bottom: 2px;
    transition: color 200ms ease;
  }
  .session-content .back-link:hover { color: #f5ecd8; }

  @media (max-width: 560px) {
    .session-content { padding: 64px 20px 88px; }
    .session-content .title { font-size: 36px; }
    .session-content .lede { font-size: 17px; }
    .session-content .nav { flex-direction: column-reverse; align-items: stretch; }
    .session-content .nav-btn { width: 100%; }
  }
`;
