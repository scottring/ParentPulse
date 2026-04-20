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
import { useEntryChat } from '@/hooks/useEntryChat';

import { CompanionComposer } from '@/components/journal-spread/CompanionComposer';
import { ResponseBlock } from '@/components/journal-spread/ResponseBlock';
import { MomentBanner } from '@/components/journal-spread/MomentBanner';
import { useOpenThreads } from '@/hooks/useOpenThreads';
import { ClosingActionCard } from '@/components/open-threads/ClosingActionCard';
import { MicButton } from '@/components/voice/MicButton';
import { JOURNAL_CATEGORIES, type JournalCategory, type JournalEntry } from '@/types/journal';
import { useEntryResponses } from '@/hooks/useEntryResponses';
import { useIsMentionedIn } from '@/hooks/useIsMentionedIn';
import { getDimension, type DimensionId } from '@/config/relationship-dimensions';

// ================================================================
// JOURNAL ENTRY DETAIL — Phase B
//
// Low-chrome cream-paper canvas for reading and editing a single
// entry. Body and title are edited in place with auto-save on blur
// and on a 10-second heartbeat. Privacy is editable via a padlock
// panel that reuses the per-person sharing model. Category and
// personMentions are editable via inline pickers, saving immediately
// on change (discrete actions, like sharing).
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
  const router = useRouter();
  const { updateEntry, deleteEntry } = useJournal();
  const { threads } = useOpenThreads();
  // An entry surfaces its own closing affordance via its moment — a
  // plain stand-alone entry is not an open thread by itself.
  const momentThread = entry.momentId
    ? threads.find((t) => t.kind === 'moment' && t.id === entry.momentId)
    : undefined;

  const handleDelete = async () => {
    if (!window.confirm('Delete this entry? This can\'t be undone.')) return;
    try {
      await deleteEntry(entry.entryId);
      router.push('/journal');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[journal] delete failed', err);
      const message = err instanceof Error ? err.message : String(err);
      window.alert(`Could not delete this entry: ${message}`);
    }
  };
  const { people } = usePerson();
  const { responses } = useEntryResponses(entry.entryId);
  const mentioned = useIsMentionedIn(entry);
  const authorNameOf = (authorId: string) =>
    people?.find((p) => p.linkedUserId === authorId)?.name ?? 'Someone';
  const {
    turns: chatTurns,
    loading: chatLoading,
    sendMessage: sendEntryChat,
    ready: chatReady,
  } = useEntryChat(entry.entryId);

  // Initial values come from the entry prop; React won't rerun these
  // initializers until the component is remounted (via `key` on the
  // parent). Any divergence after mount is local.
  const [title, setTitle] = useState<string>(entry.title ?? '');
  const [body, setBody] = useState<string>(entry.text ?? '');
  const [category, setCategory] = useState(entry.category);
  const [mentions, setMentions] = useState<string[]>(entry.personMentions ?? []);
  const [sharedWith, setSharedWith] = useState<string[]>(
    entry.sharedWithUserIds ?? [],
  );
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showPeoplePicker, setShowPeoplePicker] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');

  // Auto-open the chat panel if the entry already has a thread
  const hasExistingThread = chatReady && chatTurns.length > 0;
  useEffect(() => {
    if (hasExistingThread) setShowChat(true);
  }, [hasExistingThread]);
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (showChat && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatTurns, showChat]);

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

  // Category change — immediate save (discrete action).
  const changeCategory = async (value: JournalCategory) => {
    if (!isMine) return;
    const prev = category;
    setCategory(value);
    setShowCategoryPicker(false);
    setSaveStatus('saving');
    try {
      await updateEntry(entry.entryId, { category: value });
      setSaveStatus('saved');
    } catch {
      setCategory(prev);
      setSaveStatus('error');
    }
  };

  // Person mention toggle — immediate save (discrete action).
  const toggleMention = async (personId: string) => {
    if (!isMine) return;
    const next = mentions.includes(personId)
      ? mentions.filter((id) => id !== personId)
      : [...mentions, personId];
    const prev = mentions;
    setMentions(next);
    setSaveStatus('saving');
    try {
      await updateEntry(entry.entryId, { personMentions: next });
      setSaveStatus('saved');
    } catch {
      setMentions(prev);
      setSaveStatus('error');
    }
  };

  // Click-outside for pickers.
  useEffect(() => {
    if (!showCategoryPicker && !showPeoplePicker) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (showCategoryPicker && !target?.closest('.category-picker-wrap')) {
        setShowCategoryPicker(false);
      }
      if (showPeoplePicker && !target?.closest('.people-picker-wrap')) {
        setShowPeoplePicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCategoryPicker, showPeoplePicker]);

  const cat = CATEGORY_META[category];
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

  const aboutNames = mentions
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
          {momentThread && <ClosingActionCard thread={momentThread} />}
          {entry.momentId && <MomentBanner momentId={entry.momentId} />}
          <header className="entry-meta-row">
            <div className="entry-subject">
              {/* Category — clickable to open picker */}
              <span className="category-picker-wrap" style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="entry-category"
                  onClick={() => isMine && setShowCategoryPicker((v) => !v)}
                  disabled={!isMine}
                  style={{ cursor: isMine ? 'pointer' : 'default' }}
                >
                  <span className="entry-category-glyph" aria-hidden="true">
                    {cat?.emoji}
                  </span>
                  {cat?.label}
                  {isMine && (
                    <span className="picker-caret" aria-hidden="true">
                      {showCategoryPicker ? '▴' : '▾'}
                    </span>
                  )}
                </button>
                {showCategoryPicker && (
                  <div className="inline-picker category-picker" role="listbox">
                    {JOURNAL_CATEGORIES.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        role="option"
                        aria-selected={c.value === category}
                        className={`picker-option${c.value === category ? ' selected' : ''}`}
                        onClick={() => void changeCategory(c.value)}
                      >
                        <span className="picker-option-glyph">{c.emoji}</span>
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </span>

              {/* Person mentions — clickable pill to toggle picker */}
              <span className="people-picker-wrap" style={{ position: 'relative' }}>
                <button
                  type="button"
                  className={`entry-about-pill${aboutNames.length === 0 ? ' empty' : ''}`}
                  onClick={() => isMine && setShowPeoplePicker((v) => !v)}
                  disabled={!isMine}
                  style={{ cursor: isMine ? 'pointer' : 'default' }}
                >
                  {aboutNames.length > 0 ? (
                    <>about <span className="press-sc">{aboutNames.join(' & ')}</span></>
                  ) : (
                    isMine ? '+ tag someone' : ''
                  )}
                  {isMine && aboutNames.length > 0 && (
                    <span className="picker-caret" aria-hidden="true">
                      {showPeoplePicker ? '▴' : '▾'}
                    </span>
                  )}
                </button>
                {showPeoplePicker && (
                  <div className="inline-picker people-picker" role="listbox">
                    {people.length > 1 && (() => {
                      const allIds = people.map((p) => p.personId);
                      const allSelected = allIds.every((id) => mentions.includes(id));
                      return (
                        <button
                          type="button"
                          className={`picker-option${allSelected ? ' selected' : ''}`}
                          onClick={() => {
                            const next = allSelected ? [] : allIds;
                            setMentions(next);
                            void updateEntry(entry.entryId, { personMentions: next });
                          }}
                        >
                          Whole family
                        </button>
                      );
                    })()}
                    {people.map((p) => {
                      const selected = mentions.includes(p.personId);
                      return (
                        <button
                          key={p.personId}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={`picker-option${selected ? ' selected' : ''}`}
                          onClick={() => void toggleMention(p.personId)}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                    {people.length === 0 && (
                      <p className="picker-empty">No family members yet</p>
                    )}
                  </div>
                )}
              </span>
            </div>
            <div className="entry-date">
              <div>{dateLine}</div>
              {timeLine && <div className="entry-time">{timeLine}</div>}
              {isMine && (
                <button
                  type="button"
                  className="entry-delete"
                  onClick={handleDelete}
                  aria-label="Delete this entry"
                  title="Delete this entry"
                >
                  delete
                </button>
              )}
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

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <textarea
              className="entry-body"
              placeholder={isMine ? 'Keep writing…' : ''}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onBlur={() => void flush()}
              readOnly={!isMine}
              rows={10}
              aria-label="Entry body"
              style={{ flex: 1 }}
            />
            {isMine && (
              <MicButton
                size="sm"
                disabled={saveStatus === 'saving'}
                onTranscript={(t) => setBody((prev) => (prev ? `${prev} ${t}` : t))}
              />
            )}
          </div>

          {/* Media attachments */}
          {entry.media && entry.media.length > 0 && (
            <div className="entry-media-grid">
              {entry.media.filter((m) => m.type === 'image').map((m, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={m.url}
                  alt={m.filename || 'Photo'}
                  className="entry-media-img"
                />
              ))}
              {entry.media.filter((m) => m.type === 'audio').map((m, i) => (
                <div key={`audio-${i}`} className="entry-media-audio-block">
                  <audio controls src={m.url} style={{ width: '100%' }} />
                  {m.transcription && (
                    <p className="entry-media-transcription">{m.transcription}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* AI enrichment markers — quiet read-only display of what
              the Cloud Function extracted. Only render once the
              enrichment object exists on the doc. */}
          {entry.enrichment && (
            <EnrichmentMarkers
              enrichment={entry.enrichment}
              people={people}
            />
          )}

          {/* Provenance: this entry spawned a Workbook activity */}
          {entry.activitySpawnedItemId && (
            <div className="entry-provenance">
              <Link
                href={`/growth/${entry.activitySpawnedItemId}`}
                className="provenance-link"
              >
                <span className="provenance-glyph" aria-hidden="true">◆</span>
                This led to a practice in the Workbook
                <span className="arrow">⟶</span>
              </Link>
            </div>
          )}

          {/* AI conversation — persistent per-entry thread stored in
              journal_entries/{entryId}/chat subcollection. Opens inline
              below the body. Auto-opens if the entry already has a
              thread from a previous visit or from the CaptureSheet. */}
          <div className="entry-chat-section">
            {!showChat ? (
              <button
                type="button"
                onClick={() => {
                  setShowChat(true);
                  // Send the entry text as the opening message so
                  // the AI responds immediately with context.
                  void sendEntryChat(
                    "What do you notice about what I wrote?",
                    entry.personMentions || [],
                  );
                  setTimeout(
                    () => chatInputRef.current?.focus(),
                    200,
                  );
                }}
                className="chat-trigger"
              >
                Talk to the AI about this
                <span className="arrow">⟶</span>
              </button>
            ) : (
              <div className="chat-panel">
                <div className="chat-header">
                  <span className="chat-header-label">
                    Conversation about this entry
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowChat(false)}
                    className="chat-close"
                    aria-label="Collapse conversation"
                  >
                    {chatTurns.length > 0 ? '▾' : '×'}
                  </button>
                </div>
                <div className="chat-messages" ref={chatScrollRef}>
                  {chatTurns
                    .filter((t) => !t.excluded)
                    .map((turn) => (
                      <div
                        key={turn.turnId}
                        className={`chat-msg ${
                          turn.role === 'user'
                            ? 'chat-msg--user'
                            : 'chat-msg--ai'
                        }`}
                      >
                        {turn.content}
                      </div>
                    ))}
                  {chatLoading && (
                    <div className="chat-msg chat-msg--ai chat-msg--loading">
                      thinking&hellip;
                    </div>
                  )}
                  {chatTurns.length === 0 && !chatLoading && (
                    <div className="chat-empty">
                      Ask a question about this entry and the AI will respond
                      grounded in your family&apos;s manuals.
                    </div>
                  )}
                </div>
                <div className="chat-input-row">
                  <input
                    ref={chatInputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!chatInput.trim() || chatLoading) return;
                        const msg = chatInput.trim();
                        setChatInput('');
                        void sendEntryChat(
                          msg,
                          entry.personMentions || [],
                        );
                        setTimeout(() => chatInputRef.current?.focus(), 50);
                      }
                    }}
                    placeholder="Reply…"
                    disabled={chatLoading}
                    className="chat-input"
                  />
                  <MicButton
                    size="sm"
                    disabled={chatLoading}
                    onTranscript={(t) => setChatInput((prev) => (prev ? `${prev} ${t}` : t))}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!chatInput.trim() || chatLoading) return;
                      const msg = chatInput.trim();
                      setChatInput('');
                      void sendEntryChat(
                        msg,
                        entry.personMentions || [],
                      );
                      setTimeout(() => chatInputRef.current?.focus(), 50);
                    }}
                    disabled={!chatInput.trim() || chatLoading}
                    className="chat-send"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>

          {responses.length > 0 && (
            <section aria-label="Other perspectives" style={{ marginTop: 32 }}>
              {responses.map((r) => (
                <ResponseBlock
                  key={r.entryId}
                  response={r}
                  authorName={authorNameOf(r.authorId)}
                  currentUserId={currentUserId}
                />
              ))}
            </section>
          )}
          {mentioned && (
            <CompanionComposer parent={entry} />
          )}

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
                    {shareCandidates.length > 1 && (() => {
                      const allIds = shareCandidates.map((c) => c.userId);
                      const allShared = allIds.every((id) => sharedWith.includes(id));
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            const next = allShared ? [] : allIds;
                            setSharedWith(next);
                            void updateEntry(
                              entry.entryId,
                              { sharedWithUserIds: next },
                              entry.authorId,
                            );
                          }}
                          className={`privacy-pill${allShared ? ' selected' : ''}`}
                        >
                          Everyone
                        </button>
                      );
                    })()}
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
          background: transparent;
          border: none;
          padding: 0;
          font-family: inherit;
          font-size: inherit;
          font-weight: inherit;
          letter-spacing: inherit;
          text-transform: inherit;
          transition: opacity 0.2s ease;
        }
        .entry-category:not(:disabled):hover {
          opacity: 0.7;
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
          background: transparent;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }
        .entry-about-pill:not(:disabled):hover {
          opacity: 0.7;
        }
        .entry-about-pill.empty {
          border-style: dashed;
          color: #a8997d;
        }
        .entry-about-pill :global(.press-sc) {
          font-style: normal;
        }

        .picker-caret {
          font-size: 8px;
          opacity: 0.6;
          margin-left: 4px;
        }
        .inline-picker {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          min-width: 180px;
          padding: 8px 6px;
          background: #fdfbf6;
          border: 1px solid rgba(200, 190, 172, 0.55);
          border-radius: 6px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
          z-index: 20;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .picker-option {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 999px;
          font-family: var(--font-parent-body);
          font-size: 12px;
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.06);
          color: #5f564b;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .picker-option.selected {
          background: color-mix(in srgb, #7c9082 12%, white);
          border-color: rgba(124, 144, 130, 0.3);
          color: #5c7566;
          font-weight: 500;
        }
        .picker-option-glyph {
          font-size: 11px;
          color: #5c8064;
        }
        .picker-empty {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 13px;
          color: #a8997d;
          margin: 4px 8px;
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
        .entry-delete {
          margin-top: 8px;
          background: none;
          border: none;
          padding: 2px 6px;
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #c89282;
          cursor: pointer;
          border-radius: 3px;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .entry-delete:hover {
          background: rgba(201, 123, 99, 0.1);
          color: #9a5545;
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
        .entry-media-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 24px;
        }
        :global(.entry-media-img) {
          max-width: 100%;
          max-height: 400px;
          object-fit: contain;
          border-radius: 6px;
          border: 1px solid rgba(200, 190, 172, 0.35);
        }
        .entry-media-audio-block {
          width: 100%;
        }
        .entry-media-transcription {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 15px;
          color: #6b6254;
          margin: 8px 0 0;
          line-height: 1.5;
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

        .entry-chat-section {
          margin-top: 36px;
          padding-top: 20px;
          border-top: 1px solid rgba(200, 190, 172, 0.35);
        }
        :global(.chat-trigger) {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 17px;
          color: #7c6e54;
          transition: color 0.2s ease;
        }
        :global(.chat-trigger:hover) {
          color: #3a3530;
        }
        :global(.chat-trigger .arrow) {
          display: inline-block;
          margin-left: 2px;
          transition: transform 0.25s ease;
        }
        :global(.chat-trigger:hover .arrow) {
          transform: translateX(3px);
        }
        .chat-panel {
          border: 1px solid rgba(200, 190, 172, 0.45);
          border-radius: 8px;
          overflow: hidden;
        }
        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 16px;
          border-bottom: 1px solid rgba(200, 190, 172, 0.35);
        }
        .chat-header-label {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #8a7b5f;
        }
        .chat-close {
          background: transparent;
          border: none;
          font-size: 18px;
          color: #8a7b5f;
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
        }
        .chat-messages {
          max-height: 320px;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        :global(.chat-msg) {
          max-width: 85%;
          padding: 10px 14px;
          border-radius: 14px;
          font-family: var(--font-parent-body);
          font-size: 15px;
          line-height: 1.5;
          color: #3a3530;
          white-space: pre-wrap;
        }
        :global(.chat-msg--user) {
          align-self: flex-end;
          background: color-mix(in srgb, #7C9082 14%, white);
          border: 1px solid rgba(124, 144, 130, 0.25);
        }
        :global(.chat-msg--ai) {
          align-self: flex-start;
          background: rgba(245, 240, 230, 0.6);
          border: 1px solid rgba(200, 190, 172, 0.4);
        }
        :global(.chat-msg--loading) {
          font-family: var(--font-parent-display);
          font-style: italic;
          color: #8a7b5f;
        }
        .chat-empty {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 15px;
          line-height: 1.5;
          color: #a8997d;
          text-align: center;
          padding: 20px 16px;
        }
        .chat-input-row {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid rgba(200, 190, 172, 0.35);
        }
        .chat-input {
          flex: 1;
          padding: 8px 14px;
          border-radius: 999px;
          font-family: var(--font-parent-body);
          font-size: 15px;
          color: #3a3530;
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.08);
          outline: none;
        }
        .chat-send {
          padding: 8px 18px;
          border-radius: 999px;
          font-family: var(--font-parent-body);
          font-size: 14px;
          font-weight: 500;
          background: #7C9082;
          color: white;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }
        .chat-send:disabled {
          opacity: 0.3;
          cursor: default;
        }

        .entry-provenance {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px dashed rgba(200, 190, 172, 0.3);
        }
        :global(.provenance-link) {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-parent-body);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.14em;
          color: #5c8064;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        :global(.provenance-link:hover) {
          color: #3a3530;
        }
        :global(.provenance-link .arrow) {
          display: inline-block;
          margin-left: 2px;
          transition: transform 0.25s ease;
        }
        :global(.provenance-link:hover .arrow) {
          transform: translateX(3px);
        }
        .provenance-glyph {
          font-size: 10px;
          color: #5c8064;
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

// ================================================================
// EnrichmentMarkers — quiet read-only display of what the AI
// extracted from the entry. Renders as a dim sidebar-feeling section
// between the body and the footer. Not editable by the user — these
// are write-once from the Cloud Function.
// ================================================================
interface EnrichmentMarkersProps {
  enrichment: NonNullable<JournalEntry['enrichment']>;
  people: Array<{ personId: string; name: string }>;
}

function EnrichmentMarkers({ enrichment, people }: EnrichmentMarkersProps) {
  const aiPeopleNames = enrichment.aiPeople
    .map((id) => people.find((p) => p.personId === id)?.name)
    .filter(Boolean) as string[];

  const dimensionNames = enrichment.aiDimensions
    .map((id) => getDimension(id as DimensionId)?.name)
    .filter(Boolean) as string[];

  const hasContent =
    enrichment.summary ||
    aiPeopleNames.length > 0 ||
    dimensionNames.length > 0 ||
    enrichment.themes.length > 0;

  if (!hasContent) return null;

  return (
    <div className="enrichment">
      <div className="enrichment-label">
        <span className="enrichment-label-glyph" aria-hidden="true">
          ◎
        </span>
        What I noticed
      </div>

      {enrichment.summary && (
        <p className="enrichment-summary">{enrichment.summary}</p>
      )}

      <div className="enrichment-tags">
        {dimensionNames.map((name) => (
          <span key={name} className="enrichment-tag enrichment-tag--dimension">
            {name}
          </span>
        ))}
        {enrichment.themes.map((theme) => (
          <span key={theme} className="enrichment-tag enrichment-tag--theme">
            {theme}
          </span>
        ))}
        {aiPeopleNames.map((name) => (
          <span key={name} className="enrichment-tag enrichment-tag--person">
            {name}
          </span>
        ))}
      </div>

      <style jsx>{`
        .enrichment {
          margin-top: 36px;
          padding-top: 20px;
          border-top: 1px dashed rgba(200, 190, 172, 0.4);
        }
        .enrichment-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #a8997d;
          margin-bottom: 12px;
        }
        .enrichment-label-glyph {
          font-size: 14px;
          color: #b2a487;
        }
        .enrichment-summary {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 15px;
          line-height: 1.5;
          color: #7c6e54;
          margin: 0 0 14px;
          max-width: 600px;
        }
        .enrichment-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .enrichment-tag {
          padding: 3px 10px;
          border-radius: 999px;
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.08em;
        }
        .enrichment-tag--dimension {
          background: rgba(92, 128, 100, 0.08);
          border: 1px solid rgba(92, 128, 100, 0.2);
          color: #5c7566;
        }
        .enrichment-tag--theme {
          background: rgba(184, 142, 90, 0.06);
          border: 1px solid rgba(184, 142, 90, 0.2);
          color: #8a6f42;
        }
        .enrichment-tag--person {
          background: rgba(58, 53, 48, 0.04);
          border: 1px solid rgba(58, 53, 48, 0.12);
          color: #5a4f3b;
          font-variant: small-caps;
          font-feature-settings: 'smcp', 'c2sc';
          letter-spacing: 0.1em;
        }
      `}</style>
    </div>
  );
}
