'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useJournal } from '@/hooks/useJournal';
import { usePerson } from '@/hooks/usePerson';
import { useEntryChat } from '@/hooks/useEntryChat';
import { JOURNAL_CATEGORIES, type JournalCategory } from '@/types/journal';

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

  // Preserved after save so the "Ask about this" step can use them
  const savedTextRef = useRef('');
  const savedPeopleRef = useRef<string[]>([]);

  const { createEntry, saving } = useJournal();
  const { people } = usePerson();
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
    const handler = () => setState('composing');
    window.addEventListener('relish:open-capture', handler);
    return () => window.removeEventListener('relish:open-capture', handler);
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
    setChatInput('');
    setSavedEntryId(null);
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

  // Step 1: Save → transition to confirmation state
  const handleSave = async () => {
    if (!text.trim() || saving) return;
    try {
      savedTextRef.current = text.trim();
      savedPeopleRef.current = [...selectedPeople];

      const entryId = await createEntry({
        text,
        category,
        personMentions: selectedPeople,
        sharedWithUserIds: sharedWith,
      });

      setSavedEntryId(entryId);
      setState('saved');
    } catch {
      // error surfaced via hook
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
        {state === 'composing' && (
          <div className="px-6 pb-6 pt-3 overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 style={{
                fontFamily: 'var(--font-parent-display)',
                fontStyle: 'italic', fontSize: 24, fontWeight: 400, color: '#3A3530',
              }}>
                What&apos;s on your mind?
              </h2>
              <button onClick={handleClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5"
                style={{ fontSize: 22, color: '#5F564B' }} aria-label="Close">&times;</button>
            </div>

            <textarea ref={textareaRef} value={text}
              onChange={(e) => setText(e.target.value)} rows={3}
              className="w-full resize-none rounded-2xl px-5 py-4 mb-5"
              style={{
                fontFamily: 'var(--font-parent-body)', fontSize: 17, lineHeight: 1.6,
                color: '#3A3530', background: 'rgba(0,0,0,0.03)',
                border: '1px solid rgba(0,0,0,0.08)', outline: 'none',
              }}
              placeholder="A moment, a thought, a question&hellip;" />

            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {JOURNAL_CATEGORIES.map((cat) => {
                  const selected = category === cat.value;
                  return (
                    <button key={cat.value} onClick={() => setCategory(cat.value)}
                      className="px-3 py-1.5 rounded-full transition-all"
                      style={{
                        fontFamily: 'var(--font-parent-body)', fontSize: 14,
                        fontWeight: selected ? 500 : 400,
                        background: selected ? 'color-mix(in srgb, #7C9082 12%, white)' : 'rgba(0,0,0,0.03)',
                        border: `1px solid ${selected ? 'rgba(124,144,130,0.3)' : 'rgba(0,0,0,0.06)'}`,
                        color: selected ? '#5C7566' : '#5F564B',
                      }}>
                      <span style={{ marginRight: 4 }}>{cat.emoji}</span>{cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {people.length > 0 && (
              <div className="mb-4">
                <p className="mb-2" style={{
                  fontFamily: 'var(--font-parent-body)', fontSize: 13, fontWeight: 600,
                  letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B6254',
                }}>About</p>
                <div className="flex flex-wrap gap-2">
                  {people.map((person) => {
                    const selected = selectedPeople.includes(person.personId);
                    return (
                      <button key={person.personId} onClick={() => togglePerson(person.personId)}
                        className="px-3 py-1.5 rounded-full transition-all"
                        style={{
                          fontFamily: 'var(--font-parent-body)', fontSize: 13,
                          fontWeight: selected ? 500 : 400,
                          background: selected ? 'color-mix(in srgb, #7C9082 12%, white)' : 'rgba(0,0,0,0.03)',
                          border: `1px solid ${selected ? 'rgba(124,144,130,0.3)' : 'rgba(0,0,0,0.06)'}`,
                          color: selected ? '#5C7566' : '#5F564B',
                        }}>
                        {person.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-4">
              <p className="mb-2 flex items-center gap-2" style={{
                fontFamily: 'var(--font-parent-body)', fontSize: 13, fontWeight: 600,
                letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B6254',
              }}>
                <span aria-hidden="true" style={{ fontSize: 13 }}>
                  {sharedWith.length === 0 ? '🔒' : '✦'}
                </span>
                {sharedWith.length === 0 ? 'Private to you' : 'Shared with'}
              </p>
              {shareCandidates.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {shareCandidates.map((c) => {
                    const selected = sharedWith.includes(c.userId);
                    return (
                      <button key={c.userId} onClick={() => toggleShareWith(c.userId)}
                        className="px-3 py-1.5 rounded-full transition-all"
                        style={{
                          fontFamily: 'var(--font-parent-body)', fontSize: 13,
                          fontWeight: selected ? 500 : 400,
                          background: selected ? 'color-mix(in srgb, #7C9082 12%, white)' : 'rgba(0,0,0,0.03)',
                          border: `1px solid ${selected ? 'rgba(124,144,130,0.3)' : 'rgba(0,0,0,0.06)'}`,
                          color: selected ? '#5C7566' : '#5F564B',
                        }}>
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="italic" style={{
                  fontFamily: 'var(--font-parent-body)', fontSize: 13, color: '#8A7B5F',
                }}>No one else in the family has an account yet — this entry stays with you.</p>
              )}
            </div>

            <div className="pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <button onClick={handleSave} disabled={!text.trim() || saving}
                className="w-full py-3.5 rounded-full transition-all hover:opacity-90 disabled:opacity-30"
                style={{
                  fontFamily: 'var(--font-parent-body)', fontSize: 16, fontWeight: 500,
                  background: '#7C9082', color: 'white',
                }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

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
    </>
  );
}
