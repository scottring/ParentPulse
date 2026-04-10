'use client';

import { useState, useRef, useEffect } from 'react';
import { useJournal } from '@/hooks/useJournal';
import { usePerson } from '@/hooks/usePerson';
import { useCoach, type ChatMessage } from '@/hooks/useCoach';
import { JOURNAL_CATEGORIES, type JournalCategory } from '@/types/journal';

type SheetState = 'closed' | 'composing' | 'chatting';

export default function CaptureSheet() {
  const [state, setState] = useState<SheetState>('closed');
  const [text, setText] = useState('');
  const [category, setCategory] = useState<JournalCategory>('moment');
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const { createEntry, saving: savingJournal } = useJournal();
  const { people } = usePerson();
  const {
    messages: chatMessages,
    loading: chatLoading,
    sendMessage: sendChatMessage,
    clearConversation: clearChat,
  } = useCoach();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Focus textarea when sheet opens in composing mode
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

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (state === 'chatting' && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, state]);

  const resetAll = () => {
    setText('');
    setCategory('moment');
    setSelectedPeople([]);
    setIsPrivate(false);
    setChatInput('');
    clearChat();
  };

  const handleOpen = () => setState('composing');
  const handleClose = () => setState('closed');

  const togglePerson = (personId: string) => {
    setSelectedPeople((prev) =>
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId]
    );
  };

  const handleSaveNote = async () => {
    if (!text.trim() || savingJournal) return;

    try {
      await createEntry({
        text,
        category,
        personMentions: selectedPeople,
        isPrivate,
      });

      resetAll();
      setState('closed');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch {
      // error surfaced via hook
    }
  };

  const handleAskAboutThis = async () => {
    if (!text.trim()) return;

    // Transition to chat mode and send the initial message with
    // ALL tagged people as context, not just the first one.
    const initialText = text.trim();
    setState('chatting');
    await sendChatMessage(initialText, selectedPeople);
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const message = chatInput.trim();
    setChatInput('');
    await sendChatMessage(message, selectedPeople);
  };

  const handleChatKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  };

  const canSubmitCompose = text.trim().length > 0 && !savingJournal;
  const sheetOpen = state !== 'closed';

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        className="fixed z-40 transition-all duration-300"
        style={{
          bottom: 24,
          right: 24,
          width: showSuccess ? 52 : 48,
          height: showSuccess ? 52 : 48,
          borderRadius: '50%',
          background: showSuccess ? '#7C9082' : 'rgba(58, 53, 48, 0.85)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: sheetOpen ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: showSuccess ? 20 : 18,
        }}
        aria-label={showSuccess ? 'Saved' : 'Capture a thought'}
      >
        {showSuccess ? '✓' : '✎'}
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
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: 'rgba(0,0,0,0.12)',
            }}
          />
        </div>

        {state === 'composing' && (
          <ComposingView
            textareaRef={textareaRef}
            text={text}
            setText={setText}
            category={category}
            setCategory={setCategory}
            people={people}
            selectedPeople={selectedPeople}
            togglePerson={togglePerson}
            isPrivate={isPrivate}
            setIsPrivate={setIsPrivate}
            onClose={handleClose}
            onSaveNote={handleSaveNote}
            onAskAboutThis={handleAskAboutThis}
            canSubmit={canSubmitCompose}
            saving={savingJournal}
          />
        )}

        {state === 'chatting' && (
          <ChattingView
            chatScrollRef={chatScrollRef}
            chatInputRef={chatInputRef}
            messages={chatMessages}
            loading={chatLoading}
            chatInput={chatInput}
            setChatInput={setChatInput}
            onSend={handleChatSend}
            onKey={handleChatKey}
            onClose={() => {
              resetAll();
              setState('closed');
            }}
            personNames={selectedPeople
              .map(
                (id) =>
                  people.find((p) => p.personId === id)?.name || '',
              )
              .filter(Boolean)}
          />
        )}
      </div>
    </>
  );
}

// ==================== Composing view ====================

interface ComposingViewProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  text: string;
  setText: (v: string) => void;
  category: JournalCategory;
  setCategory: (v: JournalCategory) => void;
  people: Array<{ personId: string; name: string }>;
  selectedPeople: string[];
  togglePerson: (id: string) => void;
  isPrivate: boolean;
  setIsPrivate: (v: boolean) => void;
  onClose: () => void;
  onSaveNote: () => void;
  onAskAboutThis: () => void;
  canSubmit: boolean;
  saving: boolean;
}

function ComposingView({
  textareaRef,
  text,
  setText,
  category,
  setCategory,
  people,
  selectedPeople,
  togglePerson,
  isPrivate,
  setIsPrivate,
  onClose,
  onSaveNote,
  onAskAboutThis,
  canSubmit,
  saving,
}: ComposingViewProps) {
  return (
    <div className="px-6 pb-6 pt-3 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2
          style={{
            fontFamily: 'var(--font-parent-display)',
            fontStyle: 'italic',
            fontSize: 24,
            fontWeight: 400,
            color: '#3A3530',
            letterSpacing: '-0.005em',
          }}
        >
          What&apos;s on your mind?
        </h2>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5"
          style={{ fontSize: 22, color: '#5F564B' }}
          aria-label="Close"
        >
          &times;
        </button>
      </div>

      {/* Text input */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full resize-none rounded-2xl px-5 py-4 mb-5"
        style={{
          fontFamily: 'var(--font-parent-body)',
          fontSize: 17,
          lineHeight: 1.6,
          color: '#3A3530',
          background: 'rgba(0,0,0,0.03)',
          border: '1px solid rgba(0,0,0,0.08)',
          outline: 'none',
        }}
        placeholder="A moment, a thought, a question&hellip;"
      />

      {/* Category pills */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {JOURNAL_CATEGORIES.map((cat) => {
            const selected = category === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className="px-3 py-1.5 rounded-full transition-all"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: 14,
                  fontWeight: selected ? 500 : 400,
                  background: selected
                    ? 'color-mix(in srgb, #7C9082 12%, white)'
                    : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${
                    selected ? 'rgba(124,144,130,0.3)' : 'rgba(0,0,0,0.06)'
                  }`,
                  color: selected ? '#5C7566' : '#5F564B',
                }}
              >
                <span style={{ marginRight: 4 }}>{cat.emoji}</span>
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Person tags */}
      {people.length > 0 && (
        <div className="mb-4">
          <p
            className="mb-2"
            style={{
              fontFamily: 'var(--font-parent-body)',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#6B6254',
            }}
          >
            About
          </p>
          <div className="flex flex-wrap gap-2">
            {people.map((person) => {
              const selected = selectedPeople.includes(person.personId);
              return (
                <button
                  key={person.personId}
                  onClick={() => togglePerson(person.personId)}
                  className="px-3 py-1.5 rounded-full transition-all"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: 13,
                    fontWeight: selected ? 500 : 400,
                    background: selected
                      ? 'color-mix(in srgb, #7C9082 12%, white)'
                      : 'rgba(0,0,0,0.03)',
                    border: `1px solid ${
                      selected ? 'rgba(124,144,130,0.3)' : 'rgba(0,0,0,0.06)'
                    }`,
                    color: selected ? '#5C7566' : '#5F564B',
                  }}
                >
                  {person.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Privacy toggle */}
      <div className="flex items-center justify-between pt-2 mb-4">
        <button
          onClick={() => setIsPrivate(!isPrivate)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-black/5 transition-colors"
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontSize: 14,
            color: isPrivate ? '#7C9082' : '#6B6254',
          }}
        >
          <span style={{ fontSize: 14 }}>{isPrivate ? '🔒' : '👁'}</span>
          {isPrivate ? 'Private' : 'Family visible'}
        </button>
      </div>

      {/* Two action buttons */}
      <div
        className="pt-4"
        style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onSaveNote}
            disabled={!canSubmit}
            className="py-3.5 rounded-full transition-all hover:opacity-90 disabled:opacity-30"
            style={{
              fontFamily: 'var(--font-parent-body)',
              fontSize: 16,
              fontWeight: 500,
              background: 'rgba(0,0,0,0.04)',
              color: '#3A3530',
              border: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            {saving ? 'Saving…' : 'Save note'}
          </button>
          <button
            onClick={onAskAboutThis}
            disabled={!canSubmit}
            className="py-3.5 rounded-full transition-all hover:opacity-90 disabled:opacity-30"
            style={{
              fontFamily: 'var(--font-parent-body)',
              fontSize: 16,
              fontWeight: 500,
              background: '#7C9082',
              color: 'white',
            }}
          >
            Ask about this →
          </button>
        </div>
        <p
          className="mt-3 text-center"
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontSize: 13,
            color: '#8A7B5F',
            fontStyle: 'italic',
          }}
        >
          {selectedPeople.length > 0
            ? selectedPeople.length === 1
              ? `Ask will ground the conversation in 1 tagged manual`
              : `Ask will ground the conversation in ${selectedPeople.length} tagged manuals`
            : 'Ask gets general coaching context'}
        </p>
      </div>
    </div>
  );
}

// ==================== Chatting view ====================

interface ChattingViewProps {
  chatScrollRef: React.RefObject<HTMLDivElement | null>;
  chatInputRef: React.RefObject<HTMLInputElement | null>;
  messages: ChatMessage[];
  loading: boolean;
  chatInput: string;
  setChatInput: (v: string) => void;
  onSend: () => void;
  onKey: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onClose: () => void;
  personNames: string[];
}

// Format a list of names as natural prose.
// ['Kaleb'] → 'Kaleb'
// ['Kaleb', 'Ella'] → 'Kaleb & Ella'
// ['Kaleb', 'Ella', 'Iris'] → 'Kaleb, Ella & Iris'
function joinNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

function ChattingView({
  chatScrollRef,
  chatInputRef,
  messages,
  loading,
  chatInput,
  setChatInput,
  onSend,
  onKey,
  onClose,
  personNames,
}: ChattingViewProps) {
  const nameList = joinNames(personNames);
  const hasPeople = personNames.length > 0;
  const multiPerson = personNames.length > 1;
  const headerTitle = hasPeople ? `About ${nameList}` : 'A conversation with the Companion';
  const headerSub = hasPeople
    ? multiPerson
      ? `Grounded in ${personNames.length} manuals — ${nameList}`
      : `Grounded in ${nameList}'s manual`
    : 'General coaching context';

  return (
    <>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2
            style={{
              fontFamily: 'var(--font-parent-display)',
              fontStyle: 'italic',
              fontSize: 24,
              fontWeight: 400,
              color: '#3A3530',
              margin: 0,
              lineHeight: 1.15,
              letterSpacing: '-0.005em',
            }}
          >
            {headerTitle}
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-parent-body)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#8A7B5F',
              marginTop: 6,
              marginBottom: 0,
            }}
          >
            {headerSub}
          </p>
          {/* Saved-automatically indicator */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 10,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(124, 144, 130, 0.12)',
              border: '1px solid rgba(124, 144, 130, 0.22)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#7C9082',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#5C7566',
              }}
            >
              This conversation is being saved
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 shrink-0"
          style={{ fontSize: 22, color: '#5F564B', marginLeft: 12 }}
          aria-label="Close conversation"
        >
          &times;
        </button>
      </div>

      {/* Messages */}
      <div
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto px-6 py-5"
        style={{ minHeight: 0 }}
      >
        <div className="space-y-5">
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent:
                  msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '14px 18px',
                  borderRadius: 18,
                  background:
                    msg.role === 'user'
                      ? 'color-mix(in srgb, #7C9082 16%, white)'
                      : 'rgba(245, 240, 230, 0.6)',
                  border: `1px solid ${
                    msg.role === 'user'
                      ? 'rgba(124,144,130,0.28)'
                      : 'rgba(200, 190, 172, 0.5)'
                  }`,
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: 17,
                  lineHeight: 1.58,
                  color: '#3A3530',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: 18,
                  background: 'rgba(245, 240, 230, 0.6)',
                  border: '1px solid rgba(200, 190, 172, 0.5)',
                  fontFamily: 'var(--font-parent-display)',
                  fontStyle: 'italic',
                  fontSize: 17,
                  color: '#8A7B5F',
                }}
              >
                thinking&hellip;
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input — with a secondary hint about what's happening */}
      <div
        className="px-6 pt-3 pb-4 shrink-0"
        style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}
      >
        <div className="flex gap-3 items-end">
          <input
            ref={chatInputRef}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Reply&hellip;"
            disabled={loading}
            className="flex-1 rounded-full px-5 py-3"
            style={{
              fontFamily: 'var(--font-parent-body)',
              fontSize: 16,
              color: '#3A3530',
              background: 'rgba(0,0,0,0.03)',
              border: '1px solid rgba(0,0,0,0.1)',
              outline: 'none',
            }}
          />
          <button
            onClick={onSend}
            disabled={!chatInput.trim() || loading}
            className="px-6 py-3 rounded-full transition-all hover:opacity-90 disabled:opacity-30"
            style={{
              fontFamily: 'var(--font-parent-body)',
              fontSize: 16,
              fontWeight: 500,
              background: '#7C9082',
              color: 'white',
            }}
          >
            Send
          </button>
        </div>
        <p
          className="text-center"
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontSize: 11,
            fontStyle: 'italic',
            color: '#8A7B5F',
            marginTop: 10,
            marginBottom: 0,
          }}
        >
          Closing this conversation will synthesize it into your Journal.
        </p>
      </div>
    </>
  );
}
