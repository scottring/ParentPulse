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
            className="w-full text-2xl px-4 py-3 border-b-4 border-gray-300 focus:border-blue-600 outline-none bg-transparent transition-colors"
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
            className="w-full text-xl px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 outline-none resize-none transition-colors"
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
                  className={`flex-1 py-4 text-2xl font-bold rounded-lg border-2 transition-all ${
                    localValue === value
                      ? 'bg-blue-600 text-white border-blue-600 scale-105'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
            {question.scaleLabels && (
              <div className="flex justify-between text-sm text-gray-600">
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
                className={`w-full text-left px-6 py-4 text-lg rounded-lg border-2 transition-all ${
                  localValue === option.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
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
                  className={`w-full text-left px-6 py-4 text-lg rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
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
    <div className="bg-white rounded-2xl shadow-xl p-8">
      {/* Section description */}
      <p className="text-sm font-medium text-blue-600 mb-4">
        {sectionDescription}
      </p>

      {/* Question text */}
      <h2 className="text-4xl font-bold text-gray-900 mb-8">
        {replacePlaceholder(question.text)}
        {question.required && <span className="text-red-500 ml-2">*</span>}
      </h2>

      {/* Help text */}
      {question.helpText && (
        <p className="text-gray-600 mb-6">
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
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            canGoBack
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          ← Back
        </button>

        <div className="flex gap-4">
          {!question.required && (
            <button
              onClick={handleSkipClick}
              className="px-6 py-3 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
            >
              Skip
            </button>
          )}
          <button
            onClick={handleContinue}
            disabled={question.required && !localValue}
            className={`px-8 py-3 rounded-lg font-medium transition-colors ${
              question.required && !localValue
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
