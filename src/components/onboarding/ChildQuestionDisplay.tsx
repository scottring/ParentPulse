'use client';

import { useState, useEffect } from 'react';
import type { ChildQuestion } from '@/config/child-questionnaire';
import { getDemoAnswer } from '@/config/demo-answers';

interface ChildQuestionDisplayProps {
  question: ChildQuestion;
  sectionEmoji: string;
  sectionDescription: string;
  currentAnswer: any;
  onAnswer: (value: any) => void;
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
  const [localValue, setLocalValue] = useState(currentAnswer || '');

  // Update local value when current answer changes or question changes
  useEffect(() => {
    setLocalValue(currentAnswer || '');
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

  // Replace {{childName}} placeholder
  const replacePlaceholder = (text: string) => {
    return text.replace(/\{\{childName\}\}/g, childName);
  };

  // Render different input types
  const renderInput = () => {
    switch (question.type) {
      case 'text':
        return (
          <textarea
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder="Type or tell us your answer..."
            rows={4}
            className="w-full text-2xl px-6 py-4 rounded-2xl outline-none resize-none transition-colors"
            style={{ fontFamily: 'var(--font-parent-body)', color: '#3A3530', border: '2px solid rgba(124,144,130,0.3)', backgroundColor: 'rgba(255,255,255,0.5)' }}
          />
        );

      case 'emoji-scale':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-4">
              {question.scaleEmojis?.map((emoji, index) => {
                const value = index + 1;
                return (
                  <button
                    key={value}
                    onClick={() => setLocalValue(value)}
                    className="text-6xl p-4 rounded-full transition-all transform hover:scale-110"
                    style={{
                      backgroundColor: localValue === value ? 'rgba(124,144,130,0.2)' : 'rgba(255,255,255,0.3)',
                      transform: localValue === value ? 'scale(1.25)' : undefined,
                      boxShadow: localValue === value ? '0 10px 25px rgba(0,0,0,0.1)' : undefined,
                    }}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
            {question.scaleLabels && (
              <div className="flex justify-between text-xl font-medium px-4" style={{ fontFamily: 'var(--font-parent-body)', color: '#5C5347' }}>
                <span>{question.scaleLabels.min}</span>
                <span>{question.scaleLabels.max}</span>
              </div>
            )}
          </div>
        );

      case 'emoji-choice':
        return (
          <div className="grid grid-cols-2 gap-4">
            {question.options?.map((option) => (
              <button
                key={option.value}
                onClick={() => setLocalValue(option.value)}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl transition-all transform hover:scale-105"
                style={{
                  backgroundColor: localValue === option.value ? 'rgba(124,144,130,0.15)' : 'rgba(255,255,255,0.3)',
                  border: localValue === option.value ? '2px solid #7C9082' : '1px solid rgba(255,255,255,0.4)',
                  transform: localValue === option.value ? 'scale(1.05)' : undefined,
                  boxShadow: localValue === option.value ? '0 10px 25px rgba(0,0,0,0.1)' : undefined,
                }}
              >
                {option.emoji && <span className="text-5xl">{option.emoji}</span>}
                <span className="text-xl font-medium" style={{ fontFamily: 'var(--font-parent-body)', color: '#3A3530' }}>{option.label}</span>
              </button>
            ))}
          </div>
        );

      case 'checkboxes':
        const selectedValues = Array.isArray(localValue) ? localValue : [];
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {question.options?.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    if (isSelected) {
                      setLocalValue(selectedValues.filter((v) => v !== option.value));
                    } else {
                      setLocalValue([...selectedValues, option.value]);
                    }
                  }}
                  className="flex items-center gap-3 px-5 py-4 text-left rounded-xl transition-all"
                  style={{
                    backgroundColor: isSelected ? 'rgba(124,144,130,0.15)' : 'rgba(255,255,255,0.3)',
                    border: isSelected ? '2px solid #7C9082' : '1px solid rgba(255,255,255,0.4)',
                    boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.08)' : undefined,
                  }}
                >
                  <span className="text-3xl min-w-[40px] text-center">
                    {isSelected ? '✅' : option.emoji || '⬜'}
                  </span>
                  <span className="text-lg font-medium" style={{ fontFamily: 'var(--font-parent-body)', color: '#3A3530' }}>{option.label}</span>
                </button>
              );
            })}
          </div>
        );

      case 'drawing':
        // Future enhancement: Add canvas for drawing
        return (
          <div className="text-center p-8 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
            <p className="text-xl" style={{ fontFamily: 'var(--font-parent-body)', color: '#5C5347' }}>Drawing feature coming soon!</p>
            <p className="text-lg mt-2" style={{ fontFamily: 'var(--font-parent-body)', color: '#7C7468' }}>For now, you can describe what you'd draw:</p>
            <textarea
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              placeholder="What would you draw?"
              rows={3}
              className="mt-4 w-full text-xl px-4 py-3 rounded-lg outline-none resize-none"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#3A3530', border: '1px solid rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.4)' }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="glass-card-strong rounded-3xl p-8 max-w-4xl mx-auto" style={{ border: '1px solid rgba(255,255,255,0.4)' }}>
      {/* Section emoji and description */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-4xl">{sectionEmoji}</span>
        <p className="text-lg font-semibold" style={{ fontFamily: 'var(--font-parent-body)', color: '#7C9082' }}>
          {sectionDescription}
        </p>
      </div>

      {/* Question with emoji */}
      <div className="flex items-start gap-4 mb-8">
        {question.emoji && (
          <span className="text-5xl flex-shrink-0">{question.emoji}</span>
        )}
        <h2 className="leading-tight" style={{ fontFamily: 'var(--font-parent-display)', fontSize: '28px', fontWeight: 600, color: '#3A3530' }}>
          {replacePlaceholder(question.text)}
          {question.required && <span className="ml-2" style={{ color: '#c87a6a' }}>*</span>}
        </h2>
      </div>

      {/* Help text */}
      {question.helpText && (
        <p className="text-xl mb-6 ml-16" style={{ fontFamily: 'var(--font-parent-body)', color: '#7C7468' }}>
          {replacePlaceholder(question.helpText)}
        </p>
      )}

      {/* Input */}
      <div className="mb-8 ml-0 sm:ml-16">
        {renderInput()}
        {isDemo && getDemoAnswer(question.id, 'kid') !== undefined && (
          <button
            type="button"
            onClick={() => {
              const demo = getDemoAnswer(question.id, 'kid');
              if (demo !== undefined) {
                setLocalValue(demo);
                onAnswer(demo);
              }
            }}
            className="mt-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105"
            style={{ fontFamily: 'var(--font-parent-body)', background: '#7C9082', color: 'white', fontWeight: 500 }}
          >
            Fill
          </button>
        )}
      </div>

      {/* Action buttons - larger and more kid-friendly */}
      <div className="flex gap-4 justify-between mt-8">
        <button
          onClick={onBack}
          disabled={!canGoBack}
          className="px-8 py-4 rounded-2xl font-bold text-xl transition-all"
          style={{
            fontFamily: 'var(--font-parent-body)',
            backgroundColor: canGoBack ? 'rgba(124,144,130,0.1)' : 'rgba(255,255,255,0.15)',
            color: canGoBack ? '#5C5347' : '#8A8078',
            border: canGoBack ? '2px solid rgba(124,144,130,0.3)' : '1px solid rgba(255,255,255,0.4)',
            cursor: canGoBack ? 'pointer' : 'not-allowed',
          }}
        >
          &larr; Back
        </button>

        <div className="flex gap-4">
          {!question.required && (
            <button
              onClick={handleSkipClick}
              className="px-8 py-4 rounded-2xl font-bold text-xl transition-all"
              style={{ fontFamily: 'var(--font-parent-body)', backgroundColor: 'rgba(255,255,255,0.3)', color: '#5C5347', border: '1px solid rgba(255,255,255,0.4)' }}
            >
              Skip
            </button>
          )}
          <button
            onClick={handleContinue}
            disabled={question.required && !localValue}
            className="px-10 py-4 rounded-2xl font-bold text-xl transition-all transform hover:scale-105"
            style={{
              fontFamily: 'var(--font-parent-body)',
              backgroundColor: (question.required && !localValue) ? 'rgba(124,144,130,0.3)' : '#7C9082',
              color: 'white',
              cursor: (question.required && !localValue) ? 'not-allowed' : 'pointer',
            }}
          >
            Next &rarr;
          </button>
        </div>
      </div>

      {/* Fun progress indicator */}
      <div className="mt-6 text-center">
        <p className="text-lg" style={{ fontFamily: 'var(--font-parent-body)', color: '#7C7468' }}>
          You're doing great, {childName}!
        </p>
      </div>
    </div>
  );
}
