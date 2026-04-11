'use client';

import { useState, useEffect } from 'react';
import type { ChildQuestion } from '@/config/child-questionnaire';
import { getDemoAnswer } from '@/config/demo-answers';

interface ChildQuestionDisplayProps {
  question: ChildQuestion;
  sectionEmoji: string;
  sectionDescription: string;
  currentAnswer: unknown;
  onAnswer: (value: unknown) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  canGoBack: boolean;
  childName: string;
  isDemo?: boolean;
}

export default function ChildQuestionDisplay({
  question,
  sectionEmoji,
  sectionDescription,
  currentAnswer,
  onAnswer,
  onNext,
  onBack,
  onSkip,
  canGoBack,
  childName,
  isDemo,
}: ChildQuestionDisplayProps) {
  const [localValue, setLocalValue] = useState<unknown>(currentAnswer ?? '');

  useEffect(() => {
    setLocalValue(currentAnswer ?? '');
  }, [currentAnswer, question.id]);

  const handleContinue = () => {
    if (localValue || !question.required) {
      onAnswer(localValue);
      onNext();
    }
  };

  const handleSkipClick = () => {
    onAnswer(null);
    onSkip();
  };

  const replacePlaceholder = (text: string) =>
    text.replace(/\{\{childName\}\}/g, childName);

  // Kid-friendly palette + type. Larger sans-serif, generous touch
  // targets, no italic display face. Typeform-style: one big question,
  // big options, lots of breathing room. Selected state is *unmistakable*
  // — solid filled background with white text, not just a tint.
  const KID_FONT = 'var(--font-parent-body)'; // DM Sans
  const KID_INK = '#2A2520';
  const KID_INK_SOFT = '#5C5347';
  const KID_ACCENT = '#2D5F5D';
  const KID_ACCENT_HOVER_BG = 'rgba(45, 95, 93, 0.10)';
  const KID_BORDER = 'rgba(0, 0, 0, 0.12)';

  // ================================================================
  // Render the right kind of input
  // ================================================================
  const renderInput = () => {
    switch (question.type) {
      case 'text':
        return (
          <textarea
            value={typeof localValue === 'string' ? localValue : ''}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder="Type your answer here…"
            rows={4}
            className="w-full focus:outline-none"
            style={{
              fontFamily: KID_FONT,
              fontSize: 26,
              fontWeight: 400,
              color: KID_INK,
              background: '#FFFFFF',
              border: `2px solid ${KID_BORDER}`,
              borderRadius: 18,
              padding: '20px 22px',
              resize: 'none',
              lineHeight: 1.5,
            }}
          />
        );

      case 'emoji-scale':
        return (
          <div>
            <div
              className="flex items-center justify-center"
              style={{ gap: 18, flexWrap: 'wrap' }}
            >
              {question.scaleEmojis?.map((emoji, index) => {
                const value = index + 1;
                const isSelected = localValue === value;
                return (
                  <button
                    key={value}
                    onClick={() => setLocalValue(value)}
                    className="transition-all"
                    style={{
                      background: isSelected ? KID_ACCENT : '#FFFFFF',
                      border: `2px solid ${
                        isSelected ? KID_ACCENT : KID_BORDER
                      }`,
                      borderRadius: 999,
                      width: isSelected ? 100 : 84,
                      height: isSelected ? 100 : 84,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: isSelected ? 60 : 52,
                      cursor: 'pointer',
                      opacity: isSelected ? 1 : 0.7,
                      transform: isSelected ? 'translateY(-4px)' : 'none',
                      boxShadow: isSelected
                        ? '0 6px 18px rgba(45, 95, 93, 0.32)'
                        : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
            {question.scaleLabels && (
              <div
                className="flex justify-between"
                style={{
                  fontFamily: KID_FONT,
                  fontSize: 16,
                  fontWeight: 500,
                  color: KID_INK_SOFT,
                  marginTop: 18,
                  padding: '0 12px',
                }}
              >
                <span>{question.scaleLabels.min}</span>
                <span>{question.scaleLabels.max}</span>
              </div>
            )}
          </div>
        );

      case 'emoji-choice':
        return (
          <div
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 14,
            }}
          >
            {question.options?.map((option) => {
              const isSelected = localValue === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setLocalValue(option.value)}
                  className="text-left transition-all"
                  style={{
                    background: isSelected ? KID_ACCENT : '#FFFFFF',
                    border: `2px solid ${isSelected ? KID_ACCENT : KID_BORDER}`,
                    borderRadius: 18,
                    padding: '20px 22px',
                    cursor: 'pointer',
                    minHeight: 76,
                    boxShadow: isSelected
                      ? '0 4px 16px rgba(45, 95, 93, 0.28)'
                      : 'none',
                    transform: isSelected ? 'translateY(-1px)' : 'none',
                    transition:
                      'background 0.15s ease, border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = KID_ACCENT_HOVER_BG;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#FFFFFF';
                    }
                  }}
                >
                  <div className="flex items-center" style={{ gap: 18 }}>
                    {option.emoji && (
                      <span style={{ fontSize: 36, lineHeight: 1 }}>
                        {option.emoji}
                      </span>
                    )}
                    <span
                      style={{
                        fontFamily: KID_FONT,
                        fontSize: 22,
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? '#FFFFFF' : KID_INK_SOFT,
                        lineHeight: 1.3,
                        flex: 1,
                      }}
                    >
                      {option.label}
                    </span>
                    {isSelected && (
                      <span
                        aria-hidden="true"
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          background: '#FFFFFF',
                          color: KID_ACCENT,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 'checkboxes': {
        const selectedValues = Array.isArray(localValue) ? localValue : [];
        return (
          <div
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 12,
            }}
          >
            {question.options?.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    if (isSelected) {
                      setLocalValue(
                        selectedValues.filter((v: string) => v !== option.value),
                      );
                    } else {
                      setLocalValue([...selectedValues, option.value]);
                    }
                  }}
                  className="text-left transition-all"
                  style={{
                    background: isSelected ? KID_ACCENT : '#FFFFFF',
                    border: `2px solid ${isSelected ? KID_ACCENT : KID_BORDER}`,
                    borderRadius: 16,
                    padding: '18px 20px',
                    cursor: 'pointer',
                    minHeight: 68,
                    boxShadow: isSelected
                      ? '0 4px 14px rgba(45, 95, 93, 0.24)'
                      : 'none',
                    transform: isSelected ? 'translateY(-1px)' : 'none',
                    transition:
                      'background 0.15s ease, border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = KID_ACCENT_HOVER_BG;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#FFFFFF';
                    }
                  }}
                >
                  <div className="flex items-center" style={{ gap: 16 }}>
                    {option.emoji ? (
                      <span style={{ fontSize: 32, lineHeight: 1 }}>
                        {option.emoji}
                      </span>
                    ) : (
                      <span
                        aria-hidden="true"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          border: `2px solid ${
                            isSelected ? '#FFFFFF' : KID_BORDER
                          }`,
                          background: isSelected ? '#FFFFFF' : 'transparent',
                          color: KID_ACCENT,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        {isSelected ? '✓' : ''}
                      </span>
                    )}
                    <span
                      style={{
                        fontFamily: KID_FONT,
                        fontSize: 21,
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? '#FFFFFF' : KID_INK_SOFT,
                        lineHeight: 1.3,
                        flex: 1,
                      }}
                    >
                      {option.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        );
      }

      case 'drawing':
        return (
          <div>
            <p
              style={{
                fontFamily: KID_FONT,
                fontSize: 18,
                color: KID_INK_SOFT,
                marginBottom: 16,
              }}
            >
              Drawing isn&rsquo;t here yet. For now, tell us what
              you&rsquo;d draw:
            </p>
            <textarea
              value={typeof localValue === 'string' ? localValue : ''}
              onChange={(e) => setLocalValue(e.target.value)}
              placeholder="What would you draw?"
              rows={3}
              className="w-full focus:outline-none"
              style={{
                fontFamily: KID_FONT,
                fontSize: 24,
                color: KID_INK,
                background: '#FFFFFF',
                border: `2px solid ${KID_BORDER}`,
                borderRadius: 18,
                padding: '18px 20px',
                resize: 'none',
              }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ fontFamily: KID_FONT }}>
      {/* Section header — small uppercase tag, no chapter label */}
      <div
        className="flex items-center"
        style={{ gap: 14, marginBottom: 36 }}
      >
        <span style={{ fontSize: 32, lineHeight: 1 }}>{sectionEmoji}</span>
        <div>
          <p
            style={{
              fontFamily: KID_FONT,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: KID_ACCENT,
              margin: 0,
            }}
          >
            {sectionDescription}
          </p>
        </div>
      </div>

      {/* The question itself — big, sans-serif, prominent */}
      <div style={{ marginBottom: 36 }}>
        {question.emoji && (
          <div style={{ fontSize: 56, marginBottom: 18, lineHeight: 1 }}>
            {question.emoji}
          </div>
        )}
        <h2
          style={{
            fontFamily: KID_FONT,
            fontSize: 'clamp(30px, 4.2vw, 44px)',
            fontWeight: 600,
            color: KID_INK,
            lineHeight: 1.2,
            letterSpacing: '-0.015em',
            margin: 0,
          }}
        >
          {replacePlaceholder(question.text)}
          {question.required && (
            <span
              style={{ color: '#C08070', marginLeft: 8, fontSize: '0.7em' }}
            >
              *
            </span>
          )}
        </h2>
        {question.helpText && (
          <p
            style={{
              fontFamily: KID_FONT,
              fontSize: 19,
              fontWeight: 400,
              color: KID_INK_SOFT,
              marginTop: 14,
              lineHeight: 1.5,
            }}
          >
            {replacePlaceholder(question.helpText)}
          </p>
        )}
      </div>

      {/* Input */}
      <div style={{ marginBottom: 36 }}>
        {renderInput()}
        {isDemo && getDemoAnswer(question.id, 'kid') !== undefined && (
          <div style={{ textAlign: 'right', marginTop: 14 }}>
            <button
              type="button"
              onClick={() => {
                const demo = getDemoAnswer(question.id, 'kid');
                if (demo !== undefined) {
                  setLocalValue(demo);
                  onAnswer(demo);
                }
              }}
              style={{
                fontFamily: KID_FONT,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: KID_INK_SOFT,
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
              }}
            >
              Fill for demo →
            </button>
          </div>
        )}
      </div>

      {/* Navigation — buttons, not press links */}
      <div
        className="flex items-center justify-between"
        style={{ marginTop: 32, gap: 16, flexWrap: 'wrap' }}
      >
        <button
          onClick={onBack}
          disabled={!canGoBack}
          style={{
            fontFamily: KID_FONT,
            fontSize: 17,
            fontWeight: 600,
            color: KID_INK_SOFT,
            background: 'transparent',
            border: 0,
            padding: '12px 4px',
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            opacity: canGoBack ? 1 : 0.3,
          }}
        >
          ← Back
        </button>

        <div className="flex items-center" style={{ gap: 18 }}>
          {!question.required && (
            <button
              onClick={handleSkipClick}
              style={{
                fontFamily: KID_FONT,
                fontSize: 17,
                fontWeight: 600,
                color: KID_INK_SOFT,
                background: 'transparent',
                border: 0,
                padding: '12px 16px',
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
          )}
          <button
            onClick={handleContinue}
            disabled={question.required && !localValue}
            style={{
              fontFamily: KID_FONT,
              fontSize: 19,
              fontWeight: 700,
              color: '#FFFFFF',
              background:
                question.required && !localValue ? '#B8B0A0' : KID_ACCENT,
              border: 0,
              borderRadius: 999,
              padding: '16px 36px',
              cursor:
                question.required && !localValue ? 'not-allowed' : 'pointer',
              boxShadow:
                question.required && !localValue
                  ? 'none'
                  : '0 4px 14px rgba(45, 95, 93, 0.25)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!(question.required && !localValue)) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow =
                  '0 6px 18px rgba(45, 95, 93, 0.32)';
              }
            }}
            onMouseLeave={(e) => {
              if (!(question.required && !localValue)) {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow =
                  '0 4px 14px rgba(45, 95, 93, 0.25)';
              }
            }}
          >
            OK ✓
          </button>
        </div>
      </div>

      {/* Cheerful encouragement */}
      <p
        style={{
          fontFamily: KID_FONT,
          fontSize: 15,
          fontWeight: 500,
          textAlign: 'center',
          marginTop: 40,
          color: KID_INK_SOFT,
        }}
      >
        — you&rsquo;re doing beautifully, {childName}
      </p>
    </div>
  );
}
