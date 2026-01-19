'use client';

import { useState, useEffect } from 'react';
import type { ChildQuestion } from '@/config/child-questionnaire';

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
            className="w-full text-2xl px-6 py-4 border-4 border-blue-300 rounded-2xl focus:border-blue-500 outline-none resize-none transition-colors bg-white"
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
                    className={`text-6xl p-4 rounded-full transition-all transform hover:scale-110 ${
                      localValue === value
                        ? 'bg-yellow-200 scale-125 shadow-lg'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
            {question.scaleLabels && (
              <div className="flex justify-between text-xl font-medium text-gray-700 px-4">
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
                className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-4 transition-all transform hover:scale-105 ${
                  localValue === option.value
                    ? 'bg-blue-100 border-blue-500 scale-105 shadow-lg'
                    : 'bg-white border-gray-300 hover:border-blue-300'
                }`}
              >
                {option.emoji && <span className="text-5xl">{option.emoji}</span>}
                <span className="text-xl font-medium text-gray-800">{option.label}</span>
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
                  className={`flex items-center gap-3 px-5 py-4 text-left rounded-xl border-3 transition-all ${
                    isSelected
                      ? 'bg-green-100 border-green-500 shadow-md'
                      : 'bg-white border-gray-300 hover:border-green-300'
                  }`}
                >
                  <span className="text-3xl min-w-[40px] text-center">
                    {isSelected ? '✅' : option.emoji || '⬜'}
                  </span>
                  <span className="text-lg font-medium text-gray-800">{option.label}</span>
                </button>
              );
            })}
          </div>
        );

      case 'drawing':
        // Future enhancement: Add canvas for drawing
        return (
          <div className="text-center p-8 bg-gray-100 rounded-2xl">
            <p className="text-xl text-gray-600">Drawing feature coming soon!</p>
            <p className="text-lg text-gray-500 mt-2">For now, you can describe what you'd draw:</p>
            <textarea
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              placeholder="What would you draw?"
              rows={3}
              className="mt-4 w-full text-xl px-4 py-3 border-2 border-gray-300 rounded-lg outline-none resize-none"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-4xl mx-auto">
      {/* Section emoji and description */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-4xl">{sectionEmoji}</span>
        <p className="text-lg font-semibold text-blue-600">
          {sectionDescription}
        </p>
      </div>

      {/* Question with emoji */}
      <div className="flex items-start gap-4 mb-8">
        {question.emoji && (
          <span className="text-5xl flex-shrink-0">{question.emoji}</span>
        )}
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
          {replacePlaceholder(question.text)}
          {question.required && <span className="text-red-500 ml-2">*</span>}
        </h2>
      </div>

      {/* Help text */}
      {question.helpText && (
        <p className="text-xl text-gray-600 mb-6 ml-16">
          {replacePlaceholder(question.helpText)}
        </p>
      )}

      {/* Input */}
      <div className="mb-8 ml-0 sm:ml-16">
        {renderInput()}
      </div>

      {/* Action buttons - larger and more kid-friendly */}
      <div className="flex gap-4 justify-between mt-8">
        <button
          onClick={onBack}
          disabled={!canGoBack}
          className={`px-8 py-4 rounded-2xl font-bold text-xl transition-all ${
            canGoBack
              ? 'bg-gray-300 text-gray-800 hover:bg-gray-400 shadow-md'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          ⬅️ Back
        </button>

        <div className="flex gap-4">
          {!question.required && (
            <button
              onClick={handleSkipClick}
              className="px-8 py-4 rounded-2xl font-bold text-xl bg-yellow-200 text-gray-800 hover:bg-yellow-300 transition-all shadow-md"
            >
              Skip ⏭️
            </button>
          )}
          <button
            onClick={handleContinue}
            disabled={question.required && !localValue}
            className={`px-10 py-4 rounded-2xl font-bold text-xl transition-all shadow-lg ${
              question.required && !localValue
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600 transform hover:scale-105'
            }`}
          >
            Next ➡️
          </button>
        </div>
      </div>

      {/* Fun progress indicator */}
      <div className="mt-6 text-center">
        <p className="text-lg text-gray-500">
          💪 You're doing great, {childName}!
        </p>
      </div>
    </div>
  );
}
