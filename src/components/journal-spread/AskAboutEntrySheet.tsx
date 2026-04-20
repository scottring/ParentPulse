'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Sparkles, Share2 } from 'lucide-react';
import { MicButton } from '@/components/voice/MicButton';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useCoach } from '@/hooks/useCoach';
import { useEntryChat } from '@/hooks/useEntryChat';
import { useJournal } from '@/hooks/useJournal';
import { usePerson } from '@/hooks/usePerson';
import type { Entry } from '@/types/entry';

interface AskAboutEntrySheetProps {
  entry: Entry;
  side: 'left' | 'right';
  nameOf?: (personId: string) => string;
  onClose: () => void;
}

interface DisplayTurn {
  key: string;
  role: 'user' | 'assistant';
  content: string;
}

function entryKicker(entry: Entry): string {
  switch (entry.type) {
    case 'synthesis':   return 'Synthesis';
    case 'nudge':       return 'Nudge';
    case 'activity':    return 'Activity';
    case 'prompt':      return 'Question';
    case 'reflection':  return 'Reflection';
    case 'observation': return 'Observation';
    case 'conversation':return 'Conversation';
    default:            return 'Written';
  }
}

function formatDate(entry: Entry): string {
  try {
    return entry.createdAt.toDate().toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * True when the entry is backed by a `journal_entries` document —
 * user-authored types. Only these support the persisted per-entry
 * chat thread via `chatWithEntry`. AI-authored entries fall back to
 * the ephemeral coach.
 */
function isJournalBacked(entry: Entry): boolean {
  return (
    entry.author.kind === 'person' &&
    (entry.type === 'written' ||
      entry.type === 'observation' ||
      entry.type === 'reflection' ||
      entry.type === 'activity')
  );
}

function buildContextPreamble(entry: Entry, nameOf?: (id: string) => string): string {
  const kicker = entryKicker(entry);
  const date = formatDate(entry);
  const subjects = entry.subjects
    .map((s) => {
      if (s.kind === 'person') return nameOf ? nameOf(s.personId) : s.personId;
      if (s.kind === 'family') return 'the family';
      if (s.kind === 'bond') return 'a relationship';
      return '';
    })
    .filter(Boolean)
    .join(', ');
  const about = subjects ? ` about ${subjects}` : '';
  return `[Context: ${kicker.toLowerCase()}${about} from ${date}: "${entry.content}"]`;
}

type SanitizeState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'draft'; text: string; audience: 'just-me' | 'spouse' | 'family'; saving: boolean }
  | { kind: 'cannot'; message: string }
  | { kind: 'error'; message: string };

export function AskAboutEntrySheet({ entry, side, nameOf, onClose }: AskAboutEntrySheetProps) {
  const journalBacked = isJournalBacked(entry);
  const { user } = useAuth();
  const { people } = usePerson();
  const { createEntry } = useJournal();

  // Persisted per-entry chat (user-authored entries only).
  const entryChat = useEntryChat(journalBacked ? entry.id : null);
  // Ephemeral coach (fallback for AI-authored entries).
  const coach = useCoach();

  const [input, setInput] = useState('');
  const [hasAsked, setHasAsked] = useState(false);
  const [sanitize, setSanitize] = useState<SanitizeState>({ kind: 'idle' });
  // Per-turn "commit as practice" state: keyed by turnId, tracks
  // pending/committed/error. Lets the UI show inline feedback on
  // the specific advice the user is acting on.
  type CommitState =
    | { kind: 'idle' }
    | { kind: 'pending' }
    | { kind: 'done'; growthItemId: string; title: string }
    | { kind: 'error'; message: string };
  const [commitState, setCommitState] =
    useState<Record<string, CommitState>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Spouse = first other family member with a linked user account.
  const spouse = useMemo(
    () => people.find((p) => Boolean(p.linkedUserId) && p.linkedUserId !== user?.userId) || null,
    [people, user?.userId]
  );

  const personIds = useMemo(
    () =>
      entry.subjects
        .filter((s): s is { kind: 'person'; personId: string } => s.kind === 'person')
        .map((s) => s.personId),
    [entry.subjects]
  );

  // Normalize both sources into a common display shape.
  const displayTurns: DisplayTurn[] = journalBacked
    ? entryChat.turns
        .filter((t) => !t.excluded)
        .map((t) => ({ key: t.turnId, role: t.role, content: t.content }))
    : coach.messages.map((m, i) => ({
        // Hide the synthetic context preamble on the very first user message.
        key: `${i}`,
        role: m.role,
        content:
          i === 0 && m.role === 'user' && m.content.startsWith('[Context:')
            ? m.content.replace(/^\[Context:[^\]]+\]\s*\n*/, '')
            : m.content,
      }));

  const loading = journalBacked ? entryChat.loading : coach.loading;
  const error = journalBacked ? entryChat.error : coach.error;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayTurns.length, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setInput('');

    if (journalBacked) {
      // chatWithEntry server-side auto-injects entry text on first turn,
      // so no client-side preamble is needed.
      await entryChat.sendMessage(trimmed, personIds.length > 0 ? personIds : undefined);
    } else {
      const message = hasAsked
        ? trimmed
        : `${buildContextPreamble(entry, nameOf)}\n\n${trimmed}`;
      setHasAsked(true);
      await coach.sendMessage(message, personIds.length > 0 ? personIds : undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Commit a specific AI turn as a practice (growth_items doc).
  // Only works for journal-backed chats since ephemeral coach turns
  // don't have stable turnIds to reference.
  const handleCommitTurn = async (turnId: string) => {
    if (!journalBacked) return;
    setCommitState((prev) => ({ ...prev, [turnId]: { kind: 'pending' } }));
    try {
      const fn = httpsCallable<
        { entryId: string; turnId: string },
        { growthItemId: string; title: string }
      >(functions, 'commitChatTurnAsPractice');
      const res = await fn({ entryId: entry.id, turnId });
      setCommitState((prev) => ({
        ...prev,
        [turnId]: {
          kind: 'done',
          growthItemId: res.data.growthItemId,
          title: res.data.title,
        },
      }));
    } catch (err) {
      setCommitState((prev) => ({
        ...prev,
        [turnId]: {
          kind: 'error',
          message: err instanceof Error ? err.message : 'Failed',
        },
      }));
    }
  };

  // Call the sanitize Cloud Function; transitions the sheet into
  // preview mode with the draft text. On failure, shows an error
  // or the "cannot_sanitize" guardrail message.
  const handleSanitize = async () => {
    if (!journalBacked) return;
    setSanitize({ kind: 'loading' });
    try {
      const fn = httpsCallable<
        { entryId: string },
        | { success: true; draft: string }
        | { success: false; reason: 'cannot_sanitize'; message: string }
      >(functions, 'sanitizeEntryToActivity');
      const res = await fn({ entryId: entry.id });
      if (res.data.success) {
        setSanitize({
          kind: 'draft',
          text: res.data.draft,
          audience: 'family',
          saving: false,
        });
      } else {
        setSanitize({ kind: 'cannot', message: res.data.message });
      }
    } catch (err) {
      setSanitize({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to draft',
      });
    }
  };

  // Save the user's edited sanitized draft as a new journal entry
  // with category='activity' and the chosen audience. No person
  // mentions — the sanitization stripped them — so the entry reads
  // as generic advice in the family stream.
  const handleSaveSanitized = async () => {
    if (sanitize.kind !== 'draft') return;
    const trimmed = sanitize.text.trim();
    if (!trimmed || !user?.userId) return;

    setSanitize({ ...sanitize, saving: true });
    try {
      const sharedWithUserIds =
        sanitize.audience === 'just-me'
          ? []
          : sanitize.audience === 'spouse' && spouse?.linkedUserId
          ? [spouse.linkedUserId]
          : people
              .filter((p) => Boolean(p.linkedUserId) && p.linkedUserId !== user.userId)
              .map((p) => p.linkedUserId as string);

      await createEntry({
        text: trimmed,
        category: 'reflection',
        personMentions: [],
        sharedWithUserIds,
      });
      window.dispatchEvent(new Event('relish:entries-stale'));
      setSanitize({ kind: 'idle' });
      onClose();
    } catch (err) {
      setSanitize({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to save',
      });
    }
  };

  const kicker = entryKicker(entry);
  const date = formatDate(entry);

  return (
    <>
      <div className="backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        className={`sheet sheet-${side}`}
        role="dialog"
        aria-label="Ask about this entry"
      >
        <header className="sheet-head">
          <div className="head-title">
            <Sparkles size={14} strokeWidth={1.5} />
            <span>Ask about this</span>
          </div>
          <button className="close" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={1.5} />
          </button>
        </header>

        <section className="anchor">
          <div className="anchor-kicker">
            {kicker}
            {date ? ` · ${date}` : ''}
            {!journalBacked && ' · not saved'}
          </div>
          <p className="anchor-body">{entry.content}</p>
        </section>

        {sanitize.kind === 'idle' ? (
          <>
            <section className="messages">
              {displayTurns.length === 0 && !loading && (
                <p className="hint">
                  Ask anything about this entry — patterns, follow-ups,
                  what it might mean, or what to try next.
                  {journalBacked && (
                    <> <br /><br /><em>This thread persists and feeds future synthesis.</em></>
                  )}
                </p>
              )}
              {displayTurns.map((t) => {
                const canCommit = journalBacked && t.role === 'assistant';
                const cs = commitState[t.key] ?? { kind: 'idle' };
                return (
                  <div key={t.key} className={`msg msg-${t.role}`}>
                    {t.content}
                    {canCommit && (
                      <div className="turn-actions">
                        {cs.kind === 'idle' && (
                          <button
                            type="button"
                            className="turn-cta"
                            onClick={() => handleCommitTurn(t.key)}
                          >
                            Try this <span aria-hidden>→</span>
                          </button>
                        )}
                        {cs.kind === 'pending' && (
                          <span className="turn-meta">saving as a practice…</span>
                        )}
                        {cs.kind === 'done' && (
                          <a
                            className="turn-cta turn-cta-done"
                            href={`/growth/${cs.growthItemId}`}
                          >
                            Saved · {cs.title} <span aria-hidden>↗</span>
                          </a>
                        )}
                        {cs.kind === 'error' && (
                          <span className="turn-meta turn-error">
                            {cs.message}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {loading && <div className="msg msg-assistant loading">thinking…</div>}
              {error && <div className="error">{error}</div>}
              <div ref={messagesEndRef} />
            </section>

            <form className="composer" onSubmit={handleSubmit}>
              <div className="composer-row">
                <textarea
                  ref={inputRef}
                  className="input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask…"
                  rows={2}
                  disabled={loading}
                />
                <MicButton
                  size="sm"
                  disabled={loading}
                  onTranscript={(t) => setInput((prev) => (prev ? `${prev} ${t}` : t))}
                />
                <button type="submit" className="send" disabled={!input.trim() || loading}>
                  Send
                </button>
              </div>
              {journalBacked && (
                <button
                  type="button"
                  className="share-activity"
                  onClick={handleSanitize}
                  title="Create a sanitized activity others can see"
                >
                  <Share2 size={12} strokeWidth={1.5} />
                  Share as sanitized activity
                </button>
              )}
            </form>
          </>
        ) : (
          <section className="sanitize-panel">
            {sanitize.kind === 'loading' && (
              <p className="sanitize-status">Drafting a sanitized activity…</p>
            )}
            {sanitize.kind === 'cannot' && (
              <>
                <p className="sanitize-status error-tone">
                  {sanitize.message}
                </p>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setSanitize({ kind: 'idle' })}
                >
                  Back to chat
                </button>
              </>
            )}
            {sanitize.kind === 'error' && (
              <>
                <p className="sanitize-status error-tone">
                  {sanitize.message}
                </p>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setSanitize({ kind: 'idle' })}
                >
                  Back to chat
                </button>
              </>
            )}
            {sanitize.kind === 'draft' && (
              <>
                <div className="sanitize-kicker">Sanitized activity · draft</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                  <textarea
                    className="draft-input"
                    value={sanitize.text}
                    onChange={(e) =>
                      setSanitize({ ...sanitize, text: e.target.value })
                    }
                    rows={5}
                    disabled={sanitize.saving}
                  />
                  <MicButton
                    size="sm"
                    disabled={sanitize.saving}
                    onTranscript={(t) =>
                      setSanitize((prev) =>
                        prev.kind === 'draft'
                          ? { ...prev, text: prev.text ? `${prev.text} ${t}` : t }
                          : prev
                      )
                    }
                  />
                </div>
                <div className="audience">
                  <span className="audience-label">Who can see this?</span>
                  <div className="audience-pills">
                    <button
                      type="button"
                      className={`audience-pill${sanitize.audience === 'just-me' ? ' active' : ''}`}
                      onClick={() => setSanitize({ ...sanitize, audience: 'just-me' })}
                      disabled={sanitize.saving}
                    >
                      Just me
                    </button>
                    {spouse && (
                      <button
                        type="button"
                        className={`audience-pill${sanitize.audience === 'spouse' ? ' active' : ''}`}
                        onClick={() => setSanitize({ ...sanitize, audience: 'spouse' })}
                        disabled={sanitize.saving}
                      >
                        {spouse.name.split(' ')[0]} and me
                      </button>
                    )}
                    <button
                      type="button"
                      className={`audience-pill${sanitize.audience === 'family' ? ' active' : ''}`}
                      onClick={() => setSanitize({ ...sanitize, audience: 'family' })}
                      disabled={sanitize.saving}
                    >
                      Family
                    </button>
                  </div>
                </div>
                <div className="sanitize-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setSanitize({ kind: 'idle' })}
                    disabled={sanitize.saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="send"
                    onClick={handleSaveSanitized}
                    disabled={!sanitize.text.trim() || sanitize.saving}
                  >
                    {sanitize.saving ? 'Saving…' : 'Save activity'}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        <style jsx>{`
          .backdrop {
            position: fixed;
            inset: 0;
            background: rgba(20, 12, 4, 0.28);
            z-index: 60;
            animation: fade 180ms ease;
          }
          .sheet {
            position: fixed;
            top: 0;
            bottom: 0;
            width: min(460px, 46vw);
            background: #f5ecd8;
            box-shadow: 0 0 48px rgba(0, 0, 0, 0.4);
            display: flex;
            flex-direction: column;
            z-index: 61;
            animation: slide 240ms cubic-bezier(.2,.8,.2,1);
            color: #2d2418;
          }
          .sheet-left {
            left: 0;
            border-right: 2px solid #2a1f14;
          }
          .sheet-right {
            right: 0;
            border-left: 2px solid #2a1f14;
          }
          @keyframes fade {
            from { opacity: 0; } to { opacity: 1; }
          }
          @keyframes slide {
            from {
              transform: translateX(${side === 'left' ? '-100%' : '100%'});
            }
            to { transform: translateX(0); }
          }
          .sheet-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 18px 20px 12px;
            border-bottom: 1px dotted #c8b89a;
          }
          .head-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: -apple-system, 'Helvetica Neue', sans-serif;
            font-size: 10px;
            letter-spacing: 0.28em;
            text-transform: uppercase;
            color: #8a6a9a;
            font-weight: 700;
          }
          .close {
            background: none;
            border: none;
            color: #8a6f4a;
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            border-radius: 4px;
          }
          .close:hover {
            background: rgba(138, 111, 74, 0.12);
          }
          .anchor {
            padding: 14px 20px 16px;
            border-bottom: 1px dotted #c8b89a;
            background: rgba(200, 184, 154, 0.15);
          }
          .anchor-kicker {
            font-family: -apple-system, 'Helvetica Neue', sans-serif;
            font-size: 9px;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: #a89373;
            margin-bottom: 6px;
          }
          .anchor-body {
            margin: 0;
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 13px;
            line-height: 1.55;
            font-style: italic;
            color: #3d2f1f;
            white-space: pre-wrap;
          }
          .messages {
            flex: 1;
            overflow-y: auto;
            padding: 18px 20px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .hint {
            font-family: Georgia, serif;
            font-style: italic;
            font-size: 12px;
            color: #8a6f4a;
            margin: 0;
            opacity: 0.85;
          }
          .hint em {
            color: #6a8a6a;
            font-style: italic;
          }
          .msg {
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 13.5px;
            line-height: 1.55;
            padding: 10px 14px;
            border-radius: 4px;
            white-space: pre-wrap;
            max-width: 88%;
          }
          .msg-user {
            align-self: flex-end;
            background: #2a1f14;
            color: #f5ecd8;
          }
          .msg-assistant {
            align-self: flex-start;
            background: rgba(255, 255, 255, 0.55);
            color: #2d2418;
            border: 1px solid rgba(138, 111, 74, 0.2);
          }
          .msg-assistant.loading {
            opacity: 0.6;
            font-style: italic;
          }
          .turn-actions {
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px dashed rgba(138, 111, 74, 0.3);
            display: flex;
            gap: 8px;
            align-items: center;
          }
          .turn-cta {
            font-family: -apple-system, 'Helvetica Neue', sans-serif;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #6a8a6a;
            background: transparent;
            border: 1px solid #6a8a6a;
            border-radius: 999px;
            padding: 4px 10px;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            transition: background 160ms ease, color 160ms ease;
          }
          .turn-cta:hover {
            background: #6a8a6a;
            color: #f5ecd8;
          }
          .turn-cta-done {
            color: #2d2418;
            border-color: #c89b3b;
            background: rgba(200, 155, 59, 0.12);
          }
          .turn-cta-done:hover {
            background: #c89b3b;
            color: #2d2418;
          }
          .turn-meta {
            font-family: -apple-system, 'Helvetica Neue', sans-serif;
            font-size: 11px;
            font-style: italic;
            color: #8a6f4a;
          }
          .turn-error {
            color: #b94a3b;
          }
          .error {
            color: #b94a3b;
            font-size: 12px;
            font-family: -apple-system, sans-serif;
          }
          .composer {
            padding: 12px 16px 18px;
            border-top: 1px dotted #c8b89a;
            display: flex;
            flex-direction: column;
            gap: 8px;
            background: rgba(200, 184, 154, 0.12);
          }
          .composer-row {
            display: flex;
            gap: 10px;
            align-items: flex-end;
          }
          .share-activity {
            align-self: flex-start;
            background: none;
            border: none;
            color: #6a8a6a;
            font-family: -apple-system, 'Helvetica Neue', sans-serif;
            font-size: 10px;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            padding: 4px 6px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            opacity: 0.75;
            transition: opacity 140ms ease, color 140ms ease;
          }
          .share-activity:hover {
            opacity: 1;
            color: #4d6e4d;
          }
          .sanitize-panel {
            flex: 1;
            overflow-y: auto;
            padding: 18px 20px;
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
          .sanitize-status {
            font-family: Georgia, serif;
            font-style: italic;
            color: #5a4628;
            font-size: 13px;
            margin: 4px 0;
          }
          .sanitize-status.error-tone {
            color: #7a3324;
          }
          .sanitize-kicker {
            font-family: -apple-system, 'Helvetica Neue', sans-serif;
            font-size: 9px;
            letter-spacing: 0.28em;
            text-transform: uppercase;
            color: #6a8a6a;
            font-weight: 700;
          }
          .draft-input {
            border: 1px solid #c8b89a;
            background: #fffaf0;
            border-radius: 4px;
            padding: 12px 14px;
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 14px;
            line-height: 1.55;
            color: #2d2418;
            outline: none;
            resize: vertical;
            min-height: 100px;
          }
          .draft-input:focus {
            border-color: #6a8a6a;
          }
          .audience {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .audience-label {
            font-family: -apple-system, sans-serif;
            font-size: 9px;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: #8a6f4a;
          }
          .audience-pills {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
          }
          .audience-pill {
            padding: 6px 12px;
            border-radius: 14px;
            border: 1px solid #8a6f4a;
            background: transparent;
            color: #5a4628;
            font-family: -apple-system, sans-serif;
            font-size: 11px;
            cursor: pointer;
            transition: background 140ms ease, color 140ms ease;
          }
          .audience-pill.active {
            background: #2a1f14;
            color: #f5ecd8;
            border-color: #2a1f14;
          }
          .audience-pill:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .sanitize-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 8px;
            padding-top: 10px;
            border-top: 1px dotted #c8b89a;
          }
          .secondary {
            background: transparent;
            color: #8a6f4a;
            border: 1px solid #c8b89a;
            border-radius: 4px;
            padding: 10px 18px;
            font-family: -apple-system, sans-serif;
            font-size: 11px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            cursor: pointer;
          }
          .secondary:hover {
            background: rgba(138, 111, 74, 0.1);
          }
          .secondary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .input {
            flex: 1;
            resize: none;
            border: 1px solid #c8b89a;
            background: #fffaf0;
            border-radius: 4px;
            padding: 10px 12px;
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 13.5px;
            color: #2d2418;
            outline: none;
          }
          .input:focus {
            border-color: #8a6a9a;
          }
          .send {
            background: #2a1f14;
            color: #f5ecd8;
            border: none;
            border-radius: 4px;
            padding: 10px 18px;
            font-family: -apple-system, sans-serif;
            font-size: 11px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            cursor: pointer;
          }
          .send:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }
          @media (max-width: 640px) {
            .sheet {
              width: 100vw;
            }
          }
        `}</style>
      </aside>
    </>
  );
}
