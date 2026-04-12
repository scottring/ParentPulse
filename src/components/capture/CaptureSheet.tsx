'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useJournal } from '@/hooks/useJournal';
import { usePerson } from '@/hooks/usePerson';
import { JOURNAL_CATEGORIES, type JournalCategory } from '@/types/journal';

// A family member with a user account — someone an entry can be
// explicitly shared with. Derived from Persons whose `linkedUserId`
// is set, excluding the current user (you always see your own entries).
interface ShareCandidate {
  userId: string;
  name: string;
}

export default function CaptureSheet() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [category, setCategory] = useState<JournalCategory>('moment');
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  const { createEntry, saving } = useJournal();
  const { people } = usePerson();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Family members with accounts — the set an entry can be shared with.
  const shareCandidates = useMemo<ShareCandidate[]>(() => {
    return people
      .filter(
        (p) =>
          Boolean(p.linkedUserId) && p.linkedUserId !== user?.userId,
      )
      .map((p) => ({
        userId: p.linkedUserId as string,
        name: p.name,
      }));
  }, [people, user?.userId]);

  // Focus textarea when sheet opens
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => textareaRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Allow decoupled UI (e.g. the empty-state CTA on the Journal page)
  // to open the sheet. Dispatch window.dispatchEvent(new Event('relish:open-capture')).
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('relish:open-capture', handler);
    return () => window.removeEventListener('relish:open-capture', handler);
  }, []);

  const resetAll = () => {
    setText('');
    setCategory('moment');
    setSelectedPeople([]);
    setSharedWith([]);
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

  const handleSave = async () => {
    if (!text.trim() || saving) return;

    try {
      await createEntry({
        text,
        category,
        personMentions: selectedPeople,
        sharedWithUserIds: sharedWith,
      });

      resetAll();
      setOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch {
      // error surfaced via hook
    }
  };

  const canSubmit = text.trim().length > 0 && !saving;

  return (
    <>
      {/* Floating pen button */}
      <button
        onClick={() => setOpen(true)}
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
          display: open ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 18,
        }}
        aria-label="Capture a thought"
      >
        ✎
      </button>

      {/* Save confirmation toast */}
      <div
        className="fixed z-[60] left-1/2 transition-all duration-500 ease-out"
        style={{
          bottom: showSuccess ? 32 : -60,
          transform: 'translateX(-50%)',
          opacity: showSuccess ? 1 : 0,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 22px',
            borderRadius: 999,
            background: 'rgba(58, 53, 48, 0.92)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            color: '#f5ecd8',
            fontFamily: 'var(--font-parent-display)',
            fontStyle: 'italic',
            fontSize: 15,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: '#7C9082', fontSize: 16 }}>✓</span>
          Saved to the Journal
        </div>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 transition-opacity duration-200"
          style={{ background: 'rgba(0,0,0,0.35)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bottom sheet */}
      <div
        className="fixed left-0 right-0 z-50 transition-transform duration-300 ease-out"
        style={{
          bottom: 0,
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          maxHeight: '85vh',
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

        {open && (
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
                onClick={() => setOpen(false)}
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
                          selected
                            ? 'rgba(124,144,130,0.3)'
                            : 'rgba(0,0,0,0.06)'
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
                    const selected = selectedPeople.includes(
                      person.personId,
                    );
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
                            selected
                              ? 'rgba(124,144,130,0.3)'
                              : 'rgba(0,0,0,0.06)'
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

            {/* Share with */}
            <div className="mb-4">
              <p
                className="mb-2 flex items-center gap-2"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#6B6254',
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 13 }}>
                  {sharedWith.length === 0 ? '🔒' : '✦'}
                </span>
                {sharedWith.length === 0
                  ? 'Private to you'
                  : 'Shared with'}
              </p>
              {shareCandidates.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {shareCandidates.map((candidate) => {
                    const selected = sharedWith.includes(candidate.userId);
                    return (
                      <button
                        key={candidate.userId}
                        onClick={() => toggleShareWith(candidate.userId)}
                        className="px-3 py-1.5 rounded-full transition-all"
                        style={{
                          fontFamily: 'var(--font-parent-body)',
                          fontSize: 13,
                          fontWeight: selected ? 500 : 400,
                          background: selected
                            ? 'color-mix(in srgb, #7C9082 12%, white)'
                            : 'rgba(0,0,0,0.03)',
                          border: `1px solid ${
                            selected
                              ? 'rgba(124,144,130,0.3)'
                              : 'rgba(0,0,0,0.06)'
                          }`,
                          color: selected ? '#5C7566' : '#5F564B',
                        }}
                      >
                        {candidate.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p
                  className="italic"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: 13,
                    color: '#8A7B5F',
                  }}
                >
                  No one else in the family has an account yet — this
                  entry stays with you.
                </p>
              )}
            </div>

            {/* Save button — one action, no fork */}
            <div
              className="pt-4"
              style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
            >
              <button
                onClick={handleSave}
                disabled={!canSubmit}
                className="w-full py-3.5 rounded-full transition-all hover:opacity-90 disabled:opacity-30"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: 16,
                  fontWeight: 500,
                  background: '#7C9082',
                  color: 'white',
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
