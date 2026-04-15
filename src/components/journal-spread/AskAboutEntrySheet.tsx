'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useCoach } from '@/hooks/useCoach';
import { useEntryChat } from '@/hooks/useEntryChat';
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

export function AskAboutEntrySheet({ entry, side, nameOf, onClose }: AskAboutEntrySheetProps) {
  const journalBacked = isJournalBacked(entry);

  // Persisted per-entry chat (user-authored entries only).
  const entryChat = useEntryChat(journalBacked ? entry.id : null);
  // Ephemeral coach (fallback for AI-authored entries).
  const coach = useCoach();

  const [input, setInput] = useState('');
  const [hasAsked, setHasAsked] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
          {displayTurns.map((t) => (
            <div key={t.key} className={`msg msg-${t.role}`}>
              {t.content}
            </div>
          ))}
          {loading && <div className="msg msg-assistant loading">thinking…</div>}
          {error && <div className="error">{error}</div>}
          <div ref={messagesEndRef} />
        </section>

        <form className="composer" onSubmit={handleSubmit}>
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
          <button type="submit" className="send" disabled={!input.trim() || loading}>
            Send
          </button>
        </form>

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
          .error {
            color: #b94a3b;
            font-size: 12px;
            font-family: -apple-system, sans-serif;
          }
          .composer {
            padding: 12px 16px 18px;
            border-top: 1px dotted #c8b89a;
            display: flex;
            gap: 10px;
            align-items: flex-end;
            background: rgba(200, 184, 154, 0.12);
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
