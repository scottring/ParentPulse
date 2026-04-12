'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useJournalEntry } from '@/hooks/useJournalEntry';
import { useJournal } from '@/hooks/useJournal';
import { usePerson } from '@/hooks/usePerson';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';
import { JOURNAL_CATEGORIES, type JournalEntry } from '@/types/journal';

// ================================================================
// JOURNAL ENTRY DETAIL — Phase B
//
// Low-chrome cream-paper canvas for reading and editing a single
// entry. Body and title are edited in place with auto-save on blur
// and on a 10-second heartbeat. Privacy is editable via a padlock
// panel that reuses the per-person sharing model. Category and
// personMentions are display-only in Phase B; personMentions editing
// and AI-filled titles come later. See
// memory/project_journal_first_architecture.md.
// ================================================================

const CATEGORY_META = Object.fromEntries(
  JOURNAL_CATEGORIES.map((c) => [c.value, c]),
);

const AUTOSAVE_INTERVAL_MS = 10_000;

export default function JournalEntryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const entryId =
    typeof params?.entryId === 'string' ? params.entryId : null;

  const { user, loading: authLoading } = useAuth();
  const { entry, loading, notFound, error } = useJournalEntry(entryId);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="relish-page">
        <Navigation />
        <SideNav />
        <div className="pt-[64px]">
          <div className="press-loading">Opening the entry&hellip;</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (notFound || error || !entry) {
    return (
      <div className="relish-page">
        <Navigation />
        <SideNav />
        <div className="pt-[64px] pb-24">
          <div className="relish-container">
            <div
              className="press-empty"
              style={{ padding: '80px 40px' }}
            >
              <p className="press-empty-title">This entry is missing.</p>
              <p className="press-empty-body">
                {error ??
                  'It may have been removed, or you may not have access.'}
              </p>
              <Link href="/journal" className="press-link">
                Back to the Journal <span className="arrow">⟶</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Keyed remount: when entryId changes (navigation), useState inside
  // EntryEditor reinitializes from the fresh entry prop. Avoids the
  // "hydrate state from effect" anti-pattern flagged by
  // react-hooks/set-state-in-effect.
  return (
    <div className="relish-page">
      <Navigation />
      <SideNav />
      <EntryEditor
        key={entry.entryId}
        entry={entry}
        currentUserId={user.userId}
      />
    </div>
  );
}

// ================================================================
// EntryEditor — keyed on entryId so a fresh navigation always
// reinitializes local state via useState initializers. Receives the
// loaded entry from the parent and owns all of the editing logic.
// ================================================================
interface EntryEditorProps {
  entry: JournalEntry;
  currentUserId: string;
}

function EntryEditor({ entry, currentUserId }: EntryEditorProps) {
  const isMine = entry.authorId === currentUserId;
  const { updateEntry } = useJournal();
  const { people } = usePerson();

  // Initial values come from the entry prop; React won't rerun these
  // initializers until the component is remounted (via `key` on the
  // parent). Any divergence after mount is local.
  const [title, setTitle] = useState<string>(entry.title ?? '');
  const [body, setBody] = useState<string>(entry.text ?? '');
  const [sharedWith, setSharedWith] = useState<string[]>(
    entry.sharedWithUserIds ?? [],
  );
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');

  // Last-saved server state. Consulted by `flush` to decide whether
  // there's anything to write.
  const lastSavedRef = useRef<{ title: string; body: string }>({
    title: entry.title ?? '',
    body: entry.text ?? '',
  });

  // Candidates for sharing — family members with linked user
  // accounts, minus the current user.
  const shareCandidates = useMemo(() => {
    return people
      .filter(
        (p) =>
          Boolean(p.linkedUserId) && p.linkedUserId !== currentUserId,
      )
      .map((p) => ({ userId: p.linkedUserId as string, name: p.name }));
  }, [people, currentUserId]);

  // Flush local edits to Firestore if anything diverged from
  // lastSavedRef. Title and body go in a single update so a partial
  // failure doesn't leave the entry half-saved.
  const flush = useCallback(async () => {
    if (!isMine) return;
    const dirtyTitle = title !== lastSavedRef.current.title;
    const dirtyBody = body !== lastSavedRef.current.body;
    if (!dirtyTitle && !dirtyBody) return;

    setSaveStatus('saving');
    try {
      await updateEntry(entry.entryId, {
        ...(dirtyTitle ? { title } : {}),
        ...(dirtyBody ? { text: body } : {}),
      });
      lastSavedRef.current = { title, body };
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }, [isMine, title, body, entry.entryId, updateEntry]);

  // Ref to the latest flush so the interval effect can stay stable
  // across edits. Without this, the interval would reset on every
  // keystroke (because flush is a fresh closure) and never fire on
  // users who type continuously.
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });

  // 10-second autosave heartbeat.
  useEffect(() => {
    if (!isMine) return;
    const interval = setInterval(() => {
      void flushRef.current();
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isMine]);

  // Best-effort flush when the user navigates away.
  useEffect(() => {
    return () => {
      void flushRef.current();
    };
  }, []);

  // Fade the "Saved" badge back to idle after 2s.
  useEffect(() => {
    if (saveStatus !== 'saved') return;
    const t = setTimeout(() => setSaveStatus('idle'), 2000);
    return () => clearTimeout(t);
  }, [saveStatus]);

  // Share toggles save immediately — discrete actions, not keystrokes.
  // Optimistic update with rollback on failure.
  const toggleShareWith = async (userId: string) => {
    if (!isMine) return;
    const next = sharedWith.includes(userId)
      ? sharedWith.filter((id) => id !== userId)
      : [...sharedWith, userId];
    const prev = sharedWith;
    setSharedWith(next);
    setSaveStatus('saving');
    try {
      await updateEntry(
        entry.entryId,
        { sharedWithUserIds: next },
        entry.authorId,
      );
      setSaveStatus('saved');
    } catch {
      setSharedWith(prev);
      setSaveStatus('error');
    }
  };

  // Click-outside for the share menu.
  useEffect(() => {
    if (!showShareMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('.privacy-control')) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showShareMenu]);

  const cat = CATEGORY_META[entry.category];
  const createdDate = entry.createdAt?.toDate?.();
  const dateLine = createdDate
    ? createdDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : '';
  const timeLine = createdDate
    ? createdDate
        .toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })
        .toLowerCase()
    : '';

  const aboutNames = entry.personMentions
    .map((id) => people.find((p) => p.personId === id)?.name)
    .filter(Boolean) as string[];

  const sharedNames = sharedWith
    .map((id) => shareCandidates.find((c) => c.userId === id)?.name)
    .filter(Boolean) as string[];

  const privacyLabel =
    sharedWith.length === 0
      ? 'Private'
      : sharedNames.length > 0
        ? `Shared with ${sharedNames.join(' & ')}`
        : 'Shared';

  return (
    <div className="pt-[64px] pb-24">
      <div className="relish-container">
        <div className="detail-backbar">
          <Link href="/journal" className="back-link">
            ← The Journal
          </Link>
        </div>

        <article className="entry-paper relish-panel">
          <header className="entry-meta-row">
            <div className="entry-subject">
              {cat && (
                <span className="entry-category">
                  <span
                    className="entry-category-glyph"
                    aria-hidden="true"
                  >
                    {cat.emoji}
                  </span>
                  {cat.label}
                </span>
              )}
              {aboutNames.length > 0 && (
                <span className="entry-about-pill">
                  about{' '}
                  <span className="press-sc">
                    {aboutNames.join(' & ')}
                  </span>
                </span>
              )}
            </div>
            <div className="entry-date">
              <div>{dateLine}</div>
              {timeLine && <div className="entry-time">{timeLine}</div>}
            </div>
          </header>

          <input
            type="text"
            className="entry-title"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => void flush()}
            readOnly={!isMine}
            aria-label="Entry title"
          />

          <textarea
            className="entry-body"
            placeholder={isMine ? 'Keep writing…' : ''}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onBlur={() => void flush()}
            readOnly={!isMine}
            rows={10}
            aria-label="Entry body"
          />

          <footer className="entry-footer">
            <div className="privacy-control">
              <button
                type="button"
                onClick={() => isMine && setShowShareMenu((v) => !v)}
                className="privacy-button"
                disabled={!isMine}
              >
                <span aria-hidden="true" className="privacy-icon">
                  {sharedWith.length === 0 ? '🔒' : '✦'}
                </span>
                <span>{privacyLabel}</span>
                {isMine && (
                  <span className="privacy-caret" aria-hidden="true">
                    {showShareMenu ? '▴' : '▾'}
                  </span>
                )}
              </button>

              {showShareMenu && shareCandidates.length > 0 && (
                <div className="privacy-menu" role="dialog">
                  <p className="privacy-menu-label">Share with</p>
                  <div className="privacy-menu-pills">
                    {shareCandidates.map((c) => {
                      const selected = sharedWith.includes(c.userId);
                      return (
                        <button
                          key={c.userId}
                          type="button"
                          onClick={() =>
                            void toggleShareWith(c.userId)
                          }
                          className={`privacy-pill${
                            selected ? ' selected' : ''
                          }`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {showShareMenu && shareCandidates.length === 0 && (
                <div className="privacy-menu" role="dialog">
                  <p className="privacy-menu-empty">
                    No other family members have accounts yet.
                  </p>
                </div>
              )}
            </div>

            <span className="save-status" aria-live="polite">
              {saveStatus === 'saving' && 'Saving…'}
              {saveStatus === 'saved' && 'Saved'}
              {saveStatus === 'error' && 'Save failed'}
            </span>
          </footer>
        </article>
      </div>

      <style jsx>{`
        .detail-backbar {
          max-width: 760px;
          margin: 24px auto 12px;
        }
        :global(.back-link) {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 16px;
          color: #7c6e54;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        :global(.back-link:hover) {
          color: #3a3530;
        }

        .entry-paper {
          max-width: 760px;
          margin: 0 auto;
          padding: 56px 64px 40px;
          position: relative;
        }

        .entry-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 32px;
        }

        .entry-subject {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #8a7b5f;
        }
        .entry-category {
          display: inline-flex;
          align-items: baseline;
          gap: 6px;
          color: #5a4f3b;
        }
        .entry-category-glyph {
          color: #5c8064;
          font-size: 12px;
        }
        .entry-about-pill {
          padding: 3px 12px;
          border: 1px solid rgba(200, 190, 172, 0.55);
          border-radius: 999px;
          color: #6b6254;
          text-transform: none;
          letter-spacing: 0.1em;
          font-size: 11px;
          font-weight: 400;
          font-style: italic;
          font-family: var(--font-parent-display);
        }
        .entry-about-pill :global(.press-sc) {
          font-style: normal;
        }

        .entry-date {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #8a7b5f;
          text-align: right;
          line-height: 1.6;
          flex-shrink: 0;
        }
        .entry-time {
          color: #a8997d;
        }

        .entry-title {
          display: block;
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: clamp(32px, 4vw, 44px);
          line-height: 1.12;
          letter-spacing: -0.012em;
          color: #3a3530;
          padding: 0;
          margin-bottom: 24px;
        }
        .entry-title::placeholder {
          color: #b2a487;
          font-style: italic;
        }

        .entry-body {
          display: block;
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          font-family: var(--font-parent-display);
          font-size: 21px;
          line-height: 1.6;
          letter-spacing: -0.002em;
          color: #3a3530;
          resize: vertical;
          min-height: 360px;
          padding: 0;
        }
        .entry-body::placeholder {
          color: #b2a487;
          font-style: italic;
        }

        .entry-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-top: 48px;
          padding-top: 22px;
          border-top: 1px solid rgba(200, 190, 172, 0.45);
        }

        .privacy-control {
          position: relative;
        }
        .privacy-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          padding: 4px 6px;
          margin: -4px -6px;
          border-radius: 4px;
          cursor: pointer;
          font-family: var(--font-parent-body);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.14em;
          color: #6b6254;
          text-transform: none;
          transition: background 0.2s ease;
        }
        .privacy-button:not(:disabled):hover {
          background: rgba(200, 190, 172, 0.15);
        }
        .privacy-button:disabled {
          cursor: default;
        }
        .privacy-icon {
          font-size: 13px;
        }
        .privacy-caret {
          font-size: 10px;
          opacity: 0.7;
          margin-left: 2px;
        }

        .privacy-menu {
          position: absolute;
          left: 0;
          bottom: calc(100% + 12px);
          min-width: 240px;
          padding: 16px 18px;
          background: #fdfbf6;
          border: 1px solid rgba(200, 190, 172, 0.55);
          border-radius: 6px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
          z-index: 20;
        }
        .privacy-menu-label {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #8a7b5f;
          margin: 0 0 10px;
        }
        .privacy-menu-empty {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 14px;
          color: #8a7b5f;
          margin: 0;
        }
        .privacy-menu-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .privacy-pill {
          padding: 5px 12px;
          border-radius: 999px;
          font-family: var(--font-parent-body);
          font-size: 12px;
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.06);
          color: #5f564b;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .privacy-pill.selected {
          background: color-mix(in srgb, #7c9082 12%, white);
          border-color: rgba(124, 144, 130, 0.3);
          color: #5c7566;
          font-weight: 500;
        }

        .save-status {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #a8997d;
          font-style: italic;
          min-height: 14px;
        }

        @media (max-width: 720px) {
          .entry-paper {
            padding: 36px 28px 32px;
          }
          .entry-title {
            font-size: 28px;
          }
          .entry-body {
            font-size: 19px;
            min-height: 280px;
          }
          .entry-meta-row {
            flex-direction: column;
          }
          .entry-date {
            text-align: left;
          }
        }
      `}</style>
    </div>
  );
}
