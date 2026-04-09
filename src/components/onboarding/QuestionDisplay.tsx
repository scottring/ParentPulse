'use client';

import { useState, useEffect, useRef } from 'react';
import type { Question } from '@/config/child-onboarding-questions';

interface QuestionDisplayProps {
  question: Question;
  sectionDescription: string;
  currentAnswer: any;
  onAnswer: (value: any) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  canGoBack: boolean;
  childName: string;
}

export default function QuestionDisplay({
  question,
  sectionDescription,
  currentAnswer,
  onAnswer,
  onNext,
  onBack,
  onSkip,
  canGoBack,
  childName,
}: QuestionDisplayProps) {
  const [localValue, setLocalValue] = useState(currentAnswer || '');
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  // Replace placeholder in text
  const replacePlaceholder = (text: string) => {
    return text.replace(/\{\{childName\}\}/g, childName);
  };

  // Update local value when current answer changes or question changes
  useEffect(() => {
    setLocalValue(currentAnswer || '');
  }, [currentAnswer, question.id]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [question.id]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter to continue (if answer is valid)
      if (e.key === 'Enter' && !e.shiftKey && (localValue || !question.required)) {
        e.preventDefault();
        handleContinue();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [localValue, question.required]);

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

  // Render different input types
  const renderInput = () => {
    switch (question.type) {
      case 'text':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder={question.placeholder ? replacePlaceholder(question.placeholder) : ''}
            className="w-full text-2xl px-4 py-3 outline-none bg-transparent transition-colors"
            style={{ fontFamily: 'var(--font-parent-body)', color: '#3A3530', borderBottom: '2px solid rgba(124,144,130,0.3)' }}
          />
        );

      case 'textarea':
        return (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder={question.placeholder ? replacePlaceholder(question.placeholder) : ''}
            rows={6}
            className="w-full text-xl px-4 py-3 rounded-lg outline-none resize-none transition-colors"
            style={{ fontFamily: 'var(--font-parent-body)', color: '#3A3530', border: '1px solid rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.3)' }}
          />
        );

      case 'scale':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setLocalValue(value)}
                  className="flex-1 py-4 text-2xl font-bold rounded-xl transition-all"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    backgroundColor: localValue === value ? '#7C9082' : 'rgba(255,255,255,0.3)',
                    color: localValue === value ? 'white' : '#5C5347',
                    border: localValue === value ? '2px solid #7C9082' : '1px solid rgba(255,255,255,0.4)',
                    transform: localValue === value ? 'scale(1.05)' : undefined,
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
            {question.scaleLabels && (
              <div className="flex justify-between text-sm" style={{ fontFamily: 'var(--font-parent-body)', color: '#5F564B' }}>
                <span>{question.scaleLabels.min}</span>
                <span>{question.scaleLabels.max}</span>
              </div>
            )}
          </div>
        );

      case 'multipleChoice':
        return (
          <div className="space-y-3">
            {question.options?.map((option) => (
              <button
                key={option.value}
                onClick={() => setLocalValue(option.value)}
                className="w-full text-left px-6 py-4 text-lg rounded-xl transition-all"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  backgroundColor: localValue === option.value ? '#7C9082' : 'rgba(255,255,255,0.3)',
                  color: localValue === option.value ? 'white' : '#5C5347',
                  border: localValue === option.value ? '2px solid #7C9082' : '1px solid rgba(255,255,255,0.4)',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        );

      case 'checkboxes':
        const selectedValues = Array.isArray(localValue) ? localValue : [];
        return (
          <div className="space-y-3">
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
                  className="w-full text-left px-6 py-4 text-lg rounded-xl transition-all"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    backgroundColor: isSelected ? '#7C9082' : 'rgba(255,255,255,0.3)',
                    color: isSelected ? 'white' : '#5C5347',
                    border: isSelected ? '2px solid #7C9082' : '1px solid rgba(255,255,255,0.4)',
                  }}
                >
                  <span className="inline-block w-6 mr-3">
                    {isSelected ? '✓' : ''}
                  </span>
                  {option.label}
                </button>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="glass-card-strong rounded-2xl p-8" style={{ border: '1px solid rgba(255,255,255,0.4)' }}>
      {/* Section description */}
      <p className="text-sm font-medium mb-4" style={{ fontFamily: 'var(--font-parent-body)', color: '#7C9082' }}>
        {sectionDescription}
      </p>

      {/* Question text */}
      <h2 className="mb-8" style={{ fontFamily: 'var(--font-parent-display)', fontSize: '32px', fontWeight: 600, color: '#3A3530' }}>
        {replacePlaceholder(question.text)}
        {question.required && <span className="ml-2" style={{ color: '#c87a6a' }}>*</span>}
      </h2>

      {/* Help text */}
      {question.helpText && (
        <p className="mb-6" style={{ fontFamily: 'var(--font-parent-body)', color: '#5F564B' }}>
          {replacePlaceholder(question.helpText)}
        </p>
      )}

      {/* Input */}
      <div className="mb-8">
        {renderInput()}
      </div>

      {/* Action buttons */}
      <div className="flex gap-4 justify-between">
        <button
          onClick={onBack}
          disabled={!canGoBack}
          className="px-6 py-3 rounded-full font-medium transition-colors"
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontSize: '14px',
            fontWeight: 500,
            backgroundColor: canGoBack ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
            color: canGoBack ? '#5C5347' : '#6B6254',
            border: '1px solid rgba(255,255,255,0.4)',
            cursor: canGoBack ? 'pointer' : 'not-allowed',
          }}
        >
          &larr; Back
        </button>

        <div className="flex gap-4">
          {!question.required && (
            <button
              onClick={handleSkipClick}
              className="px-6 py-3 rounded-full font-medium transition-colors"
              style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', fontWeight: 500, color: '#5C5347', background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.4)' }}
            >
              Skip
            </button>
          )}
          <button
            onClick={handleContinue}
            disabled={question.required && !localValue}
            className="px-8 py-3 rounded-full font-medium transition-colors"
            style={{
              fontFamily: 'var(--font-parent-body)',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: (question.required && !localValue) ? 'rgba(124,144,130,0.3)' : '#7C9082',
              color: 'white',
              cursor: (question.required && !localValue) ? 'not-allowed' : 'pointer',
            }}
          >
            Continue &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
