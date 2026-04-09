'use client';

import { useState, useRef, useEffect } from 'react';
import { useJournal } from '@/hooks/useJournal';
import { usePerson } from '@/hooks/usePerson';
import { JOURNAL_CATEGORIES, type JournalCategory } from '@/types/journal';

type SheetState = 'closed' | 'open';

export default function JournalCapture() {
  const [sheet, setSheet] = useState<SheetState>('closed');
  const [text, setText] = useState('');
  const [category, setCategory] = useState<JournalCategory>('moment');
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { createEntry, saving } = useJournal();
  const { people } = usePerson();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Focus textarea when sheet opens
  useEffect(() => {
    if (sheet === 'open') {
      // Small delay to let animation start
      const t = setTimeout(() => textareaRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [sheet]);

  const reset = () => {
    setText('');
    setCategory('moment');
    setSelectedPeople([]);
    setIsPrivate(false);
  };

  const handleOpen = () => setSheet('open');

  const handleClose = () => {
    setSheet('closed');
    // Don't reset immediately — let user reopen to continue
  };

  const handleSubmit = async () => {
    if (!text.trim() || saving) return;

    try {
      await createEntry({
        text,
        category,
        personMentions: selectedPeople,
        isPrivate,
      });

      reset();
      setSheet('closed');

      // Brief success indicator
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch {
      // error is surfaced via useJournal's error state
    }
  };

  const togglePerson = (personId: string) => {
    setSelectedPeople((prev) =>
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId]
    );
  };

  const canSubmit = text.trim().length > 0 && !saving;

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
          display: sheet === 'open' ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: showSuccess ? 20 : 18,
        }}
        aria-label={showSuccess ? 'Entry saved' : 'Write a journal entry'}
      >
        {showSuccess ? '✓' : '✎'}
      </button>

      {/* Backdrop */}
      {sheet === 'open' && (
        <div
          className="fixed inset-0 z-50 transition-opacity duration-200"
          style={{ background: 'rgba(0,0,0,0.35)' }}
          onClick={handleClose}
        />
      )}

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        className="fixed left-0 right-0 z-50 transition-transform duration-300 ease-out"
        style={{
          bottom: 0,
          transform: sheet === 'open' ? 'translateY(0)' : 'translateY(100%)',
          maxHeight: '85vh',
          overflowY: 'auto',
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.12)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: 'rgba(0,0,0,0.12)',
            }}
          />
        </div>

        <div className="px-5 pb-6 pt-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2
              style={{
                fontFamily: 'var(--font-parent-display)',
                fontSize: 20,
                fontWeight: 400,
                color: 'var(--parent-text, #3A3530)',
              }}
            >
              What&apos;s on your mind?
            </h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5"
              style={{
                fontSize: 18,
                color: 'var(--parent-text-light, #7C7468)',
              }}
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
            className="w-full resize-none rounded-2xl px-4 py-3 mb-4"
            style={{
              fontFamily: 'var(--font-parent-body)',
              fontSize: 15,
              lineHeight: 1.6,
              color: 'var(--parent-text, #3A3530)',
              background: 'rgba(0,0,0,0.03)',
              border: '1px solid rgba(0,0,0,0.06)',
              outline: 'none',
            }}
            placeholder="A moment, a thought, something you noticed..."
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(124,144,130,0.3)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(0,0,0,0.06)';
            }}
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
                      fontSize: 12,
                      fontWeight: selected ? 500 : 400,
                      background: selected
                        ? 'color-mix(in srgb, #7C9082 12%, white)'
                        : 'rgba(0,0,0,0.03)',
                      border: `1px solid ${
                        selected ? 'rgba(124,144,130,0.3)' : 'rgba(0,0,0,0.06)'
                      }`,
                      color: selected
                        ? '#5C7566'
                        : 'var(--parent-text-light, #7C7468)',
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
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--parent-text-muted, #8A8078)',
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
                        fontSize: 12,
                        fontWeight: selected ? 500 : 400,
                        background: selected
                          ? 'color-mix(in srgb, #7C9082 12%, white)'
                          : 'rgba(0,0,0,0.03)',
                        border: `1px solid ${
                          selected ? 'rgba(124,144,130,0.3)' : 'rgba(0,0,0,0.06)'
                        }`,
                        color: selected
                          ? '#5C7566'
                          : 'var(--parent-text-light, #7C7468)',
                      }}
                    >
                      {person.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer row: privacy toggle + submit */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setIsPrivate(!isPrivate)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-black/5 transition-colors"
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: 11,
                color: isPrivate
                  ? '#7C9082'
                  : 'var(--parent-text-muted, #8A8078)',
              }}
            >
              <span style={{ fontSize: 13 }}>{isPrivate ? '🔒' : '👁'}</span>
              {isPrivate ? 'Private' : 'Family visible'}
            </button>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-5 py-2 rounded-full transition-all hover:opacity-90 disabled:opacity-30"
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: 13,
                fontWeight: 500,
                background: 'var(--parent-primary, #7C9082)',
                color: 'white',
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
