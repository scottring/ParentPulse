'use client';

import { OnboardingQuestion } from '@/config/onboarding-questions';
import { QuestionAnswer, StructuredAnswer } from '@/types/onboarding';
import { LikertScaleQuestion } from './LikertScaleQuestion';
import { FrequencyQuestion } from './FrequencyQuestion';
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion';
import { QualitativeComment } from './QualitativeComment';

interface QuestionRendererProps {
  question: OnboardingQuestion;
  value: QuestionAnswer | undefined;
  onChange: (value: QuestionAnswer) => void;
  personName: string;
  onKeyboardContinue?: () => void; // Ctrl/Cmd + Enter handler
  demoMode?: boolean; // Whether in demo mode
  demoAnswer?: QuestionAnswer; // Pre-filled demo answer
}

export function QuestionRenderer({
  question,
  value,
  onChange,
  personName,
  onKeyboardContinue,
  demoMode = false,
  demoAnswer
}: QuestionRendererProps) {
  const questionType = question.questionType || 'text';

  // Handle auto-fill from demo answer
  const handleAutoFill = () => {
    if (demoAnswer) {
      onChange(demoAnswer);
    }
  };

  // Extract primary value and qualitative comment from structured answer
  const primaryValue = typeof value === 'object' && value !== null && 'primary' in value
    ? (value as StructuredAnswer).primary
    : value;

  const qualitativeValue = typeof value === 'object' && value !== null && 'qualitative' in value
    ? (value as StructuredAnswer).qualitative
    : undefined;

  // Handle primary answer change
  const handlePrimaryChange = (newPrimary: string | number | string[] | boolean) => {
    const newValue: StructuredAnswer = {
      primary: newPrimary,
      qualitative: qualitativeValue,
      timestamp: Date.now()
    };
    onChange(newValue);
  };

  // Handle qualitative comment change
  const handleQualitativeChange = (newQualitative: string) => {
    const currentPrimary = typeof value === 'object' && value !== null && 'primary' in value
      ? (value as StructuredAnswer).primary
      : value || '';

    const newValue: StructuredAnswer = {
      primary: currentPrimary,
      qualitative: newQualitative,
      timestamp: Date.now()
    };
    onChange(newValue);
  };

  // Render appropriate question type component
  const renderQuestionInput = () => {
    switch (questionType) {
      case 'likert':
        return (
          <LikertScaleQuestion
            scale={question.scale!}
            value={typeof primaryValue === 'number' ? primaryValue : undefined}
            onChange={handlePrimaryChange}
          />
        );

      case 'frequency':
        return (
          <FrequencyQuestion
            scale={question.scale!}
            value={typeof primaryValue === 'number' ? primaryValue : undefined}
            onChange={handlePrimaryChange}
          />
        );

      case 'multiple_choice':
        return (
          <MultipleChoiceQuestion
            options={question.options!}
            value={typeof primaryValue === 'string' ? primaryValue : undefined}
            onChange={handlePrimaryChange}
          />
        );

      case 'text':
      default:
        // Legacy text input (textarea)
        return (
          <div className="relative">
            <textarea
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && onKeyboardContinue) {
                  onKeyboardContinue();
                }
              }}
              placeholder={question.placeholder || 'Type your answer here...'}
              rows={6}
              className="w-full px-6 py-4 rounded-lg border-2 focus:outline-none focus:ring-4 transition-all text-lg sm:text-xl"
              style={{
                borderColor: 'var(--parent-border)',
                backgroundColor: 'var(--parent-bg)',
                color: 'var(--parent-text)',
                resize: 'vertical'
              }}
              autoFocus
            />
            {/* Demo auto-fill button */}
            {demoMode && demoAnswer && (
              <button
                type="button"
                onClick={handleAutoFill}
                className="absolute bottom-3 right-3 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-mono font-bold rounded shadow-sm transition-all opacity-70 hover:opacity-100"
                title="Auto-fill demo answer"
              >
                ✨ DEMO FILL
              </button>
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Demo auto-fill button for structured questions */}
      {demoMode && demoAnswer && questionType !== 'text' && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAutoFill}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-mono font-bold rounded shadow-sm transition-all"
            title="Auto-fill demo answer"
          >
            ✨ DEMO FILL
          </button>
        </div>
      )}

      {/* Primary question input */}
      {renderQuestionInput()}

      {/* Qualitative comment (optional embellishment) */}
      {question.allowQualitativeComment && questionType !== 'text' && (
        <QualitativeComment
          value={qualitativeValue || ''}
          onChange={handleQualitativeChange}
          placeholder={question.qualitativePlaceholder}
        />
      )}

      {/* Keyboard hint for text questions */}
      {questionType === 'text' && (
        <p className="text-sm mt-2" style={{ color: 'var(--parent-text-light)' }}>
          Press <kbd className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--parent-border)' }}>Ctrl</kbd> + <kbd className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--parent-border)' }}>Enter</kbd> to continue
        </p>
      )}
    </div>
  );
}
