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
            placeholder="Write your answer in your own words…"
            rows={4}
            className="w-full focus:outline-none"
            style={{
              fontFamily: 'var(--font-parent-display)',
              fontSize: 22,
              fontStyle: 'italic',
              color: '#3A3530',
              background: 'transparent',
              border: 0,
              borderBottom: '1px solid rgba(200, 190, 172, 0.6)',
              padding: '10px 2px 14px',
              resize: 'none',
              lineHeight: 1.55,
            }}
          />
        );

      case 'emoji-scale':
        return (
          <div>
            <div
              className="flex items-center justify-center"
              style={{ gap: 14, flexWrap: 'wrap' }}
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
                      background: 'transparent',
                      border: 0,
                      fontSize: isSelected ? 56 : 48,
                      padding: 14,
                      cursor: 'pointer',
                      opacity: isSelected ? 1 : 0.55,
                      transform: isSelected ? 'translateY(-4px)' : 'none',
                      transition: 'all 0.25s ease',
                      filter: isSelected ? 'none' : 'grayscale(0.3)',
                    }}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
            {question.scaleLabels && (
              <div
                className="flex justify-between press-marginalia"
                style={{ fontSize: 15, marginTop: 14, padding: '0 12px' }}
              >
                <em>{question.scaleLabels.min}</em>
                <em>{question.scaleLabels.max}</em>
              </div>
            )}
          </div>
        );

      case 'emoji-choice':
        return (
          <div
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
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
                    background: 'transparent',
                    border: 0,
                    padding: '16px 18px 18px',
                    borderBottom: `1.5px solid ${
                      isSelected ? '#2D5F5D' : 'rgba(200,190,172,0.5)'
                    }`,
                    cursor: 'pointer',
                  }}
                >
                  <div className="flex items-center" style={{ gap: 14 }}>
                    {option.emoji && (
                      <span
                        style={{
                          fontSize: 32,
                          opacity: isSelected ? 1 : 0.7,
                          transition: 'opacity 0.2s ease',
                        }}
                      >
                        {option.emoji}
                      </span>
                    )}
                    <span
                      style={{
                        fontFamily: 'var(--font-parent-display)',
                        fontSize: 19,
                        fontStyle: 'italic',
                        fontWeight: isSelected ? 500 : 400,
                        color: isSelected ? '#3A3530' : '#5C5347',
                        lineHeight: 1.25,
                        flex: 1,
                      }}
                    >
                      {option.label}
                    </span>
                    {isSelected && (
                      <span
                        style={{
                          fontFamily: 'var(--font-parent-display)',
                          fontStyle: 'italic',
                          color: '#2D5F5D',
                          fontSize: 18,
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 8,
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
                    background: 'transparent',
                    border: 0,
                    padding: '14px 8px',
                    borderBottom: '1px solid rgba(200,190,172,0.4)',
                    cursor: 'pointer',
                  }}
                >
                  <div className="flex items-baseline" style={{ gap: 12 }}>
                    <span
                      style={{
                        fontSize: 20,
                        opacity: isSelected ? 1 : 0.55,
                        width: 26,
                        flexShrink: 0,
                        transition: 'opacity 0.2s ease',
                      }}
                    >
                      {option.emoji || (isSelected ? '✓' : '◦')}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-parent-display)',
                        fontSize: 18,
                        fontStyle: 'italic',
                        fontWeight: isSelected ? 500 : 400,
                        color: isSelected ? '#3A3530' : '#5C5347',
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
              className="press-body-italic"
              style={{ fontSize: 15, marginBottom: 14 }}
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
                fontFamily: 'var(--font-parent-display)',
                fontSize: 20,
                fontStyle: 'italic',
                color: '#3A3530',
                background: 'transparent',
                border: 0,
                borderBottom: '1px solid rgba(200, 190, 172, 0.6)',
                padding: '8px 2px 10px',
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
    <div>
      {/* Section header */}
      <div className="flex items-baseline" style={{ gap: 14, marginBottom: 28 }}>
        <span style={{ fontSize: 32 }}>{sectionEmoji}</span>
        <div>
          <span className="press-chapter-label" style={{ display: 'block' }}>
            A section
          </span>
          <p
            className="press-body-italic"
            style={{ fontSize: 16, marginTop: 2, color: '#5C5347' }}
          >
            {sectionDescription}
          </p>
        </div>
      </div>

      {/* The question itself */}
      <div style={{ marginBottom: 24 }}>
        {question.emoji && (
          <div style={{ fontSize: 44, marginBottom: 12 }}>{question.emoji}</div>
        )}
        <h2
          style={{
            fontFamily: 'var(--font-parent-display)',
            fontSize: 'clamp(28px, 4vw, 36px)',
            fontStyle: 'italic',
            fontWeight: 400,
            color: '#3A3530',
            lineHeight: 1.2,
            letterSpacing: '-0.005em',
          }}
        >
          {replacePlaceholder(question.text)}
          {question.required && (
            <span
              style={{ color: '#C08070', marginLeft: 6, fontSize: '0.7em' }}
            >
              *
            </span>
          )}
        </h2>
        {question.helpText && (
          <p
            className="press-body-italic mt-3"
            style={{ fontSize: 16, color: '#5F564B' }}
          >
            {replacePlaceholder(question.helpText)}
          </p>
        )}
      </div>

      {/* Input */}
      <div style={{ marginBottom: 28 }}>
        {renderInput()}
        {isDemo && getDemoAnswer(question.id, 'kid') !== undefined && (
          <div style={{ textAlign: 'right', marginTop: 12 }}>
            <button
              type="button"
              onClick={() => {
                const demo = getDemoAnswer(question.id, 'kid');
                if (demo !== undefined) {
                  setLocalValue(demo);
                  onAnswer(demo);
                }
              }}
              className="press-link-sm"
              style={{
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Fill for demo ⟶
            </button>
          </div>
        )}
      </div>

      <hr className="press-rule" />

      {/* Navigation */}
      <div
        className="flex items-baseline justify-between"
        style={{ marginTop: 24 }}
      >
        <button
          onClick={onBack}
          disabled={!canGoBack}
          className="press-link-sm"
          style={{
            background: 'transparent',
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            opacity: canGoBack ? 1 : 0.3,
          }}
        >
          ⟵ Back
        </button>

        <div className="flex items-baseline" style={{ gap: 28 }}>
          {!question.required && (
            <button
              onClick={handleSkipClick}
              className="press-link-sm"
              style={{ background: 'transparent', cursor: 'pointer' }}
            >
              Skip
            </button>
          )}
          <button
            onClick={handleContinue}
            disabled={question.required && !localValue}
            className="press-link"
            style={{
              background: 'transparent',
              cursor:
                question.required && !localValue ? 'not-allowed' : 'pointer',
              opacity: question.required && !localValue ? 0.4 : 1,
              fontSize: 20,
            }}
          >
            Next
            <span className="arrow">⟶</span>
          </button>
        </div>
      </div>

      {/* Cheerful encouragement */}
      <p
        className="press-marginalia"
        style={{
          fontSize: 15,
          textAlign: 'center',
          marginTop: 32,
          color: '#746856',
        }}
      >
        — you&rsquo;re doing beautifully, <em>{childName}</em>
      </p>
    </div>
  );
}
