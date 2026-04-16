'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useJournal } from '@/hooks/useJournal';
import { usePerson } from '@/hooks/usePerson';
import { useEntryChat } from '@/hooks/useEntryChat';
import { usePrivacyLock } from '@/hooks/usePrivacyLock';
import { JOURNAL_CATEGORIES, type JournalCategory, type JournalMedia } from '@/types/journal';
import { uploadEntryMedia } from '@/lib/upload-media';
import { PinSetupModal } from '@/components/privacy/PinSetupModal';

interface ShareCandidate {
  userId: string;
  name: string;
}

// Sequential flow: closed → composing → saved → (chatting | closed)
// No fork at capture time. Save always happens first.
type SheetState = 'closed' | 'composing' | 'saved' | 'chatting';

export default function CaptureSheet() {
  const { user } = useAuth();
  const [state, setState] = useState<SheetState>('closed');
  const [text, setText] = useState('');
  const [category, setCategory] = useState<JournalCategory>('moment');
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  // Child-supervised mode — when set, the parent is writing on behalf
  // of this child. The entry saves with subjectType='child_proxy'.
  const [writingFor, setWritingFor] = useState<{ personId: string; name: string } | null>(null);
  // Edit mode — when set, save updates the existing entry instead of
  // creating a new one. 'append' preserves original text + separator.
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'edit' | 'append' | null>(null);
  const [originalText, setOriginalText] = useState('');
  // Media attachments — staged files before upload. Uploaded on save.
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  // Which toolbar picker row is expanded (only one at a time).
  const [openPicker, setOpenPicker] = useState<'category' | 'about' | 'writingAs' | 'privacy' | null>(null);
  const [visibilityPreset, setVisibilityPreset] = useState<'just-me' | 'spouse' | 'family'>('just-me');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preserved after save so the "Ask about this" step can use them
  const savedTextRef = useRef('');
  const savedPeopleRef = useRef<string[]>([]);

  const { createEntry, updateEntry, saving, error: journalError } = useJournal();
  const { people } = usePerson();
  const privacyLock = usePrivacyLock();
  // When saving a just-me entry without a PIN, we pause the save and
  // show the PIN setup modal. The pending-save flag resumes save()
  // after the PIN is configured.
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const {
    turns: chatTurns,
    loading: chatLoading,
    sendMessage: sendEntryChat,
  } = useEntryChat(savedEntryId);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const shareCandidates = useMemo<ShareCandidate[]>(() => {
    return people
      .filter(
        (p) => Boolean(p.linkedUserId) && p.linkedUserId !== user?.userId,
      )
      .map((p) => ({ userId: p.linkedUserId as string, name: p.name }));
  }, [people, user?.userId]);

  const spouse = shareCandidates[0] ?? null;

  function applyVisibilityPreset(preset: 'just-me' | 'spouse' | 'family') {
    setVisibilityPreset(preset);
    if (preset === 'just-me') setSharedWith([]);
    else if (preset === 'spouse' && spouse) setSharedWith([spouse.userId]);
    else if (preset === 'family') setSharedWith(shareCandidates.map((c) => c.userId));
    try {
      window.localStorage?.setItem('relish:capture:last-visibility', preset);
    } catch {
      // storage disabled; not fatal
    }
  }

  useEffect(() => {
    if (state !== 'composing') return;
    let stored: string | null = null;
    try { stored = window.localStorage?.getItem('relish:capture:last-visibility'); } catch {}
    const preset =
      stored === 'family' ? 'family' :
      stored === 'spouse' && spouse ? 'spouse' :
      'just-me';
    applyVisibilityPreset(preset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, spouse]);

  useEffect(() => {
    if (state === 'composing') {
      const t = setTimeout(() => textareaRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
    if (state === 'chatting') {
      const t = setTimeout(() => chatInputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [state]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ prefillText?: string; category?: JournalCategory } | undefined>).detail;
      if (detail?.prefillText) setText(detail.prefillText);
      if (detail?.category) setCategory(detail.category);
      setState('composing');
    };
    window.addEventListener('relish:open-capture', handler);

    // Child-mode capture: dispatch 'relish:open-capture-for' with
    // detail: { personId, name } to open the sheet in child-proxy mode.
    const childHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ personId: string; name: string }>).detail;
      if (detail?.personId && detail?.name) {
        setWritingFor(detail);
        setSelectedPeople([detail.personId]);
        setState('composing');
      }
    };
    window.addEventListener('relish:open-capture-for', childHandler);

    // Edit/append: dispatch 'relish:open-edit' with
    // detail: { entry: { id, content }, mode: 'edit' | 'append' }
    const editHandler = (e: Event) => {
      const detail = (e as CustomEvent<{
        entry: { id: string; content: string };
        mode: 'edit' | 'append';
      }>).detail;
      if (!detail?.entry?.id) return;
      setEditingEntryId(detail.entry.id);
      setEditMode(detail.mode);
      setOriginalText(detail.entry.content);
      setText(detail.mode === 'edit' ? detail.entry.content : '');
      setState('composing');
    };
    window.addEventListener('relish:open-edit', editHandler);

    return () => {
      window.removeEventListener('relish:open-capture', handler);
      window.removeEventListener('relish:open-capture-for', childHandler);
      window.removeEventListener('relish:open-edit', editHandler);
    };
  }, []);

  useEffect(() => {
    if (state === 'chatting' && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatTurns, state]);

  const resetAll = () => {
    setText('');
    setCategory('moment');
    setSelectedPeople([]);
    setSharedWith([]);
    setVisibilityPreset('just-me');
    setChatInput('');
    setSavedEntryId(null);
    setWritingFor(null);
    setStagedFiles([]);
    setUploadProgress(null);
    setOpenPicker(null);
    setEditingEntryId(null);
    setEditMode(null);
    setOriginalText('');
  };

  const handleClose = () => {
    resetAll();
    setState('closed');
  };

  const togglePerson = (personId: string) => {
    setSelectedPeople((prev) =>
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId],
    );
  };

  const toggleShareWith = (userId: string) => {
    setSharedWith((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  // Step 1: Save → upload media → transition to confirmation state
  const handleSave = async () => {
    if (!text.trim() || saving) return;

    // Guard: first-use PIN setup for private entries. Only applies
    // to NEW entries (edit/append skip this — the entry already
    // exists). We check visibility preset, not sharedWith, so that
    // "no other accounts yet" doesn't unintentionally require a PIN.
    if (
      !editingEntryId &&
      visibilityPreset === 'just-me' &&
      !privacyLock.loading &&
      !privacyLock.pinIsSet
    ) {
      setPendingSave(true);
      setShowPinSetup(true);
      return;
    }

    try {
      // Edit/append path: update existing entry, skip the AI follow-up.
      if (editingEntryId) {
        const nextText =
          editMode === 'append'
            ? `${originalText.trim()}\n\n— added ${new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} —\n${text.trim()}`
            : text.trim();
        try {
          await updateEntry(editingEntryId, { text: nextText });
          window.dispatchEvent(new Event('relish:entries-stale'));
          handleClose();
        } catch (err) {
          // Don't swallow edit errors — the outer catch would hide them.
          console.error('Failed to save edit:', err);
          throw err;
        }
        return;
      }

      savedTextRef.current = text.trim();
      savedPeopleRef.current = [...selectedPeople];

      const entryId = await createEntry({
        text,
        category,
        personMentions: selectedPeople,
        sharedWithUserIds: sharedWith,
        ...(writingFor ? {
          subjectType: 'child_proxy' as const,
          subjectPersonId: writingFor.personId,
        } : {}),
      });

      // Upload staged files to Firebase Storage and patch the entry
      if (stagedFiles.length > 0 && user?.familyId) {
        setUploadProgress(0);
        const mediaItems: JournalMedia[] = [];
        for (let i = 0; i < stagedFiles.length; i++) {
          const item = await uploadEntryMedia({
            familyId: user.familyId,
            entryId,
            file: stagedFiles[i],
            onProgress: (pct) => {
              setUploadProgress(
                Math.round(((i * 100 + pct) / stagedFiles.length)),
              );
            },
          });
          mediaItems.push(item);
        }
        await updateEntry(entryId, { media: mediaItems });
        setUploadProgress(null);
      }

      setSavedEntryId(entryId);
      setState('saved');
      window.dispatchEvent(new Event('relish:entries-stale'));
    } catch (err) {
      console.error('CaptureSheet save failed:', err);
      setUploadProgress(null);
    }
  };

  // Step 2 (optional): Ask the AI about what was just saved.
  // The first message seeds the per-entry chat thread. When the
  // user later opens the entry detail page, the thread is there.
  const handleAskAboutThis = async () => {
    setState('chatting');
    // Send an opening prompt — the Cloud Function prepends the entry
    // text automatically on the first message.
    await sendEntryChat(
      "What do you notice about what I wrote?",
      savedPeopleRef.current,
    );
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput('');
    await sendEntryChat(msg, savedPeopleRef.current);
    chatInputRef.current?.focus();
  };

  const sheetOpen = state !== 'closed';

  return (
    <>
      {/* Floating pen button */}
      <button
        onClick={() => setState('composing')}
        className="fixed z-40 transition-all duration-300"
        style={{
          bottom: 24,
          right: 24,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(58, 53, 48, 0.85)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: sheetOpen ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 18,
        }}
        aria-label="Capture a thought"
      >
        ✎
      </button>

      {/* Backdrop */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 transition-opacity duration-200"
          style={{ background: 'rgba(0,0,0,0.35)' }}
          onClick={handleClose}
        />
      )}

      {/* Bottom sheet */}
      <div
        className="fixed left-0 right-0 z-50 transition-transform duration-300 ease-out"
        style={{
          bottom: 0,
          transform: sheetOpen ? 'translateY(0)' : 'translateY(100%)',
          maxHeight: state === 'chatting' ? '90vh' : '85vh',
          minHeight: state === 'chatting' ? '60vh' : undefined,
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.12)',
        }}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)' }} />
        </div>

        {/* ─── COMPOSING ─── */}
        {state === 'composing' && (() => {
          const catMeta = JOURNAL_CATEGORIES.find((c) => c.value === category);
          const aboutLabel = selectedPeople.length === 0
            ? 'About'
            : selectedPeople.length === people.length && people.length > 1
              ? 'Family'
              : people.filter((p) => selectedPeople.includes(p.personId)).map((p) => p.name.split(' ')[0]).join(', ');
          const privacyLabel = sharedWith.length === 0 ? 'Private' : 'Shared';
          const hasChildren = people.filter((p) => !p.linkedUserId).length > 0;

          const chipStyle = (active: boolean) => ({
            fontFamily: 'var(--font-parent-body)' as const,
            fontSize: 13,
            fontWeight: active ? 600 : 400,
            padding: '5px 12px',
            borderRadius: 999,
            background: active ? 'rgba(124,144,130,0.12)' : 'transparent',
            border: 'none',
            color: active ? '#3A3530' : '#6B6254',
            cursor: 'pointer' as const,
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap' as const,
          });

          const pickerPillStyle = (selected: boolean) => ({
            fontFamily: 'var(--font-parent-body)' as const,
            fontSize: 13,
            fontWeight: selected ? 500 : 400,
            padding: '5px 14px',
            borderRadius: 999,
            background: selected ? '#7C9082' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${selected ? '#7C9082' : 'rgba(0,0,0,0.06)'}`,
            color: selected ? 'white' : '#5F564B',
            cursor: 'pointer' as const,
            transition: 'all 0.15s ease',
          });

          return (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {/* Header: title + Save */}
              <div className="flex items-center justify-between px-6 pt-2 pb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <h2 style={{
                    fontFamily: 'var(--font-parent-display)',
                    fontStyle: 'italic', fontSize: 22, fontWeight: 400, color: '#3A3530', margin: 0,
                  }}>
                    {editingEntryId
                      ? (editMode === 'append' ? 'Add to entry' : 'Edit entry')
                      : writingFor ? `${writingFor.name}'s entry` : 'New entry'}
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleSave} disabled={!text.trim() || saving}
                    className="transition-all hover:opacity-90 disabled:opacity-30"
                    style={{
                      fontFamily: 'var(--font-parent-body)', fontSize: 14, fontWeight: 600,
                      color: '#7C9082', background: 'transparent', border: 'none',
                      cursor: 'pointer', padding: '4px 8px',
                    }}>
                    {uploadProgress !== null ? `${uploadProgress}%` : saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={handleClose}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5"
                    style={{ fontSize: 20, color: '#5F564B', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    aria-label="Close">&times;</button>
                </div>
              </div>

              {journalError && (
                <div className="px-6 pb-2 shrink-0" style={{
                  fontFamily: '-apple-system, sans-serif', fontSize: 12,
                  color: '#b94a3b',
                }}>
                  {journalError}
                </div>
              )}

              {/* Visibility presets */}
              <div className="shrink-0 px-6 pb-2">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                  <button
                    type="button"
                    onClick={() => applyVisibilityPreset('just-me')}
                    style={{
                      fontSize: 12, padding: '6px 12px', borderRadius: 16,
                      border: `1px solid ${visibilityPreset === 'just-me' ? '#3d2f1f' : '#8a6f4a'}`,
                      color: visibilityPreset === 'just-me' ? '#f5ecd8' : '#5a4628',
                      background: visibilityPreset === 'just-me' ? '#3d2f1f' : 'transparent',
                      cursor: 'pointer',
                      fontFamily: '-apple-system, sans-serif',
                    }}
                  >
                    Just me
                  </button>
                  {spouse && (
                    <button
                      type="button"
                      onClick={() => applyVisibilityPreset('spouse')}
                      style={{
                        fontSize: 12, padding: '6px 12px', borderRadius: 16,
                        border: `1px solid ${visibilityPreset === 'spouse' ? '#3d2f1f' : '#8a6f4a'}`,
                        color: visibilityPreset === 'spouse' ? '#f5ecd8' : '#5a4628',
                        background: visibilityPreset === 'spouse' ? '#3d2f1f' : 'transparent',
                        cursor: 'pointer',
                        fontFamily: '-apple-system, sans-serif',
                      }}
                    >
                      {spouse.name} and me
                    </button>
                  )}
                  {shareCandidates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => applyVisibilityPreset('family')}
                      style={{
                        fontSize: 12, padding: '6px 12px', borderRadius: 16,
                        border: `1px solid ${visibilityPreset === 'family' ? '#3d2f1f' : '#8a6f4a'}`,
                        color: visibilityPreset === 'family' ? '#f5ecd8' : '#5a4628',
                        background: visibilityPreset === 'family' ? '#3d2f1f' : 'transparent',
                        cursor: 'pointer',
                        fontFamily: '-apple-system, sans-serif',
                      }}
                    >
                      Everyone
                    </button>
                  )}
                </div>
              </div>

              {/* Textarea — fills available space */}
              <div className="flex-1 px-6 overflow-y-auto" style={{ minHeight: 0 }}>
                {editMode === 'append' && originalText && (
                  <div style={{
                    marginBottom: 12, padding: '12px 14px',
                    background: 'rgba(200, 184, 154, 0.15)',
                    borderLeft: '2px solid rgba(138, 111, 74, 0.4)',
                    borderRadius: 4,
                    fontFamily: 'var(--font-parent-body)', fontSize: 14,
                    lineHeight: 1.5, color: '#5a4628', fontStyle: 'italic',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {originalText}
                  </div>
                )}
                <textarea ref={textareaRef} value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full h-full resize-none"
                  style={{
                    fontFamily: 'var(--font-parent-body)', fontSize: 17, lineHeight: 1.6,
                    color: '#3A3530', background: 'transparent',
                    border: 'none', outline: 'none', minHeight: 160,
                  }}
                  placeholder={
                    editMode === 'append'
                      ? 'Add more…'
                      : editMode === 'edit'
                        ? 'Edit your entry…'
                        : 'A moment, a thought, a question…'
                  }
                  onClick={() => setOpenPicker(null)} />

                {/* Staged media thumbnails */}
                {stagedFiles.length > 0 && (
                  <div className="flex gap-2 pb-3 overflow-x-auto">
                    {stagedFiles.map((file, i) => (
                      <div key={i} className="relative shrink-0" style={{ width: 56, height: 56 }}>
                        {file.type.startsWith('image/') ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={URL.createObjectURL(file)} alt={file.name}
                            className="rounded-lg object-cover" style={{ width: 56, height: 56 }} />
                        ) : (
                          <div className="rounded-lg flex items-center justify-center"
                            style={{ width: 56, height: 56, background: 'rgba(0,0,0,0.05)', fontSize: 20 }}>
                            🎵
                          </div>
                        )}
                        <button type="button"
                          onClick={() => setStagedFiles((prev) => prev.filter((_, j) => j !== i))}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 10, lineHeight: 1 }}
                          aria-label={`Remove ${file.name}`}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Picker row — slides up above toolbar when a chip is tapped */}
              {openPicker && (
                <div className="shrink-0 px-6 py-2 overflow-x-auto"
                  style={{ borderTop: '1px solid rgba(0,0,0,0.06)', background: '#FAF8F5' }}>
                  <div className="flex flex-wrap gap-2">

                    {openPicker === 'category' && JOURNAL_CATEGORIES.map((c) => (
                      <button key={c.value} onClick={() => { setCategory(c.value); setOpenPicker(null); }}
                        style={pickerPillStyle(c.value === category)}>
                        <span style={{ marginRight: 4 }}>{c.emoji}</span>{c.label}
                      </button>
                    ))}

                    {openPicker === 'about' && (
                      <>
                        {people.length > 1 && (() => {
                          const allIds = people.map((p) => p.personId);
                          const allSelected = allIds.every((id) => selectedPeople.includes(id));
                          return (
                            <button onClick={() => setSelectedPeople(allSelected ? [] : allIds)}
                              style={pickerPillStyle(allSelected)}>
                              Whole family
                            </button>
                          );
                        })()}
                        {people.map((p) => (
                          <button key={p.personId} onClick={() => togglePerson(p.personId)}
                            style={pickerPillStyle(selectedPeople.includes(p.personId))}>
                            {p.name}
                          </button>
                        ))}
                      </>
                    )}

                    {openPicker === 'writingAs' && (
                      <>
                        <button onClick={() => { setWritingFor(null); setOpenPicker(null); }}
                          style={pickerPillStyle(!writingFor)}>
                          Yourself
                        </button>
                        {people.filter((p) => !p.linkedUserId).map((child) => {
                          const active = writingFor?.personId === child.personId;
                          return (
                            <button key={child.personId} onClick={() => {
                              if (active) { setWritingFor(null); }
                              else {
                                setWritingFor({ personId: child.personId, name: child.name });
                                if (!selectedPeople.includes(child.personId)) {
                                  setSelectedPeople((prev) => [...prev, child.personId]);
                                }
                              }
                              setOpenPicker(null);
                            }}
                              style={{
                                ...pickerPillStyle(active),
                                ...(active ? { background: '#B88E5A', borderColor: '#B88E5A' } : {}),
                              }}>
                              {child.name}
                            </button>
                          );
                        })}
                      </>
                    )}

                    {openPicker === 'privacy' && (
                      <>
                        {shareCandidates.length > 1 && (() => {
                          const allIds = shareCandidates.map((c) => c.userId);
                          const allShared = allIds.every((id) => sharedWith.includes(id));
                          return (
                            <button onClick={() => setSharedWith(allShared ? [] : allIds)}
                              style={pickerPillStyle(allShared)}>
                              Everyone
                            </button>
                          );
                        })()}
                        {shareCandidates.map((c) => (
                          <button key={c.userId} onClick={() => toggleShareWith(c.userId)}
                            style={pickerPillStyle(sharedWith.includes(c.userId))}>
                            {c.name}
                          </button>
                        ))}
                        {shareCandidates.length === 0 && (
                          <span style={{ fontFamily: 'var(--font-parent-display)', fontStyle: 'italic', fontSize: 13, color: '#8A7B5F' }}>
                            No one else has an account yet
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Compact toolbar */}
              <div className="shrink-0 flex items-center gap-1 px-4 py-2"
                style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <input ref={fileInputRef} type="file" accept="image/*,audio/*" multiple className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setStagedFiles((prev) => [...prev, ...files].slice(0, 5));
                    e.target.value = '';
                  }} />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  style={{ ...chipStyle(stagedFiles.length > 0), fontSize: 17, padding: '5px 8px' }}
                  aria-label="Add photo">
                  📷{stagedFiles.length > 0 ? ` ${stagedFiles.length}` : ''}
                </button>
                <button type="button" onClick={() => setOpenPicker(openPicker === 'category' ? null : 'category')}
                  style={chipStyle(openPicker === 'category')}>
                  {catMeta?.emoji} {catMeta?.label || 'Category'}
                </button>
                <button type="button" onClick={() => setOpenPicker(openPicker === 'about' ? null : 'about')}
                  style={chipStyle(openPicker === 'about' || selectedPeople.length > 0)}>
                  {aboutLabel}
                </button>
                {hasChildren && (
                  <button type="button" onClick={() => setOpenPicker(openPicker === 'writingAs' ? null : 'writingAs')}
                    style={chipStyle(openPicker === 'writingAs' || !!writingFor)}>
                    {writingFor ? writingFor.name : 'As'}
                  </button>
                )}
                <button type="button" onClick={() => setOpenPicker(openPicker === 'privacy' ? null : 'privacy')}
                  style={chipStyle(openPicker === 'privacy' || sharedWith.length > 0)}>
                  {sharedWith.length === 0 ? '🔒' : '✦'} Adjust who can see this →
                </button>
              </div>
            </div>
          );
        })()}

        {/* ─── SAVED: confirmation + optional follow-up ─── */}
        {state === 'saved' && (
          <div className="px-6 pb-8 pt-6 text-center">
            <div style={{
              fontFamily: 'var(--font-parent-display)',
              fontSize: 28, fontStyle: 'italic', color: '#3A3530', marginBottom: 8,
            }}>
              <span style={{ color: '#7C9082', marginRight: 10 }}>✓</span>
              Saved to the Journal
            </div>
            <p style={{
              fontFamily: 'var(--font-parent-display)', fontStyle: 'italic',
              fontSize: 16, color: '#7c6e54', marginBottom: 28,
            }}>
              Want to talk to the AI about what you wrote?
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={handleClose}
                className="px-6 py-3 rounded-full transition-all hover:opacity-80"
                style={{
                  fontFamily: 'var(--font-parent-body)', fontSize: 15, fontWeight: 500,
                  background: 'rgba(0,0,0,0.04)', color: '#3A3530',
                  border: '1px solid rgba(0,0,0,0.08)',
                }}>
                Done
              </button>
              <button onClick={handleAskAboutThis}
                className="px-6 py-3 rounded-full transition-all hover:opacity-90"
                style={{
                  fontFamily: 'var(--font-parent-body)', fontSize: 15, fontWeight: 500,
                  background: '#7C9082', color: 'white',
                }}>
                Ask about this →
              </button>
            </div>
          </div>
        )}

        {/* ─── CHATTING ─── */}
        {state === 'chatting' && (
          <>
            <div className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              <h2 style={{
                fontFamily: 'var(--font-parent-display)', fontStyle: 'italic',
                fontSize: 22, fontWeight: 400, color: '#3A3530', margin: 0,
              }}>
                About what you wrote
              </h2>
              <button onClick={handleClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 shrink-0"
                style={{ fontSize: 22, color: '#5F564B' }} aria-label="Close">&times;</button>
            </div>

            <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-6 py-5" style={{ minHeight: 0 }}>
              <div className="space-y-4">
                {chatTurns
                  .filter((t) => !t.excluded)
                  .map((turn) => {
                  const isUser = turn.role === 'user';
                  return (
                    <div key={turn.turnId} style={{
                      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
                    }}>
                      <div style={{
                        maxWidth: '85%', padding: '12px 16px', borderRadius: 16,
                        background: isUser ? 'color-mix(in srgb, #7C9082 14%, white)' : 'rgba(245, 240, 230, 0.6)',
                        border: `1px solid ${isUser ? 'rgba(124,144,130,0.25)' : 'rgba(200,190,172,0.4)'}`,
                        fontFamily: 'var(--font-parent-body)', fontSize: 16, lineHeight: 1.55,
                        color: '#3A3530', whiteSpace: 'pre-wrap',
                      }}>
                        {turn.content}
                      </div>
                    </div>
                  );
                })}
                {chatLoading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{
                      padding: '12px 16px', borderRadius: 16,
                      background: 'rgba(245, 240, 230, 0.6)',
                      border: '1px solid rgba(200,190,172,0.4)',
                      fontFamily: 'var(--font-parent-display)', fontStyle: 'italic',
                      fontSize: 16, color: '#8A7B5F',
                    }}>
                      thinking&hellip;
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 pt-3 pb-4 shrink-0" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
              <div className="flex gap-3 items-end">
                <input ref={chatInputRef} value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
                  }}
                  placeholder="Reply…" disabled={chatLoading}
                  className="flex-1 rounded-full px-5 py-3"
                  style={{
                    fontFamily: 'var(--font-parent-body)', fontSize: 16, color: '#3A3530',
                    background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.1)', outline: 'none',
                  }} />
                <button onClick={handleChatSend} disabled={!chatInput.trim() || chatLoading}
                  className="px-6 py-3 rounded-full transition-all hover:opacity-90 disabled:opacity-30"
                  style={{
                    fontFamily: 'var(--font-parent-body)', fontSize: 16, fontWeight: 500,
                    background: '#7C9082', color: 'white',
                  }}>
                  Send
                </button>
              </div>
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
              // Re-run save on next tick so pinIsSet has propagated.
              setTimeout(() => { void handleSave(); }, 0);
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
