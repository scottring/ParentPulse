'use client';

import { OnboardingQuestion } from '@/config/onboarding-questions';
import { QuestionAnswer, StructuredAnswer } from '@/types/onboarding';
import { LikertScaleQuestion } from './LikertScaleQuestion';
import { FrequencyQuestion } from './FrequencyQuestion';
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion';
import { QualitativeComment } from './QualitativeComment';
import { getDemoAnswer } from '@/config/demo-answers';

interface QuestionRendererProps {
  question: OnboardingQuestion;
  value: QuestionAnswer | undefined;
  onChange: (value: QuestionAnswer) => void;
  personName: string;
  onKeyboardContinue?: () => void;
  isDemo?: boolean;
  demoPerspective?: 'self' | 'observer' | 'observer_child' | 'kid';
}

export function QuestionRenderer({
  question,
  value,
  onChange,
  onKeyboardContinue,
  isDemo,
  demoPerspective = 'self',
}: QuestionRendererProps) {
  const questionType = question.questionType || 'text';

  const primaryValue = typeof value === 'object' && value !== null && 'primary' in value
    ? (value as StructuredAnswer).primary
    : value;

  const qualitativeValue = typeof value === 'object' && value !== null && 'qualitative' in value
    ? (value as StructuredAnswer).qualitative
    : undefined;

  const handlePrimaryChange = (newPrimary: string | number | string[] | boolean) => {
    const newValue: StructuredAnswer = {
      primary: newPrimary,
      qualitative: qualitativeValue,
      timestamp: Date.now(),
    };
    onChange(newValue);
  };

  const handleQualitativeChange = (newQualitative: string) => {
    const currentPrimary = typeof value === 'object' && value !== null && 'primary' in value
      ? (value as StructuredAnswer).primary
      : value || '';

    const newValue: StructuredAnswer = {
      primary: currentPrimary,
      qualitative: newQualitative,
      timestamp: Date.now(),
    };
    onChange(newValue);
  };

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
        return (
          <div className="relative">
            <textarea
              value={
                typeof value === 'string'
                  ? value
                  : typeof value === 'object' && value !== null && 'primary' in value
                    ? String((value as StructuredAnswer).primary)
                    : ''
              }
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && onKeyboardContinue) {
                  onKeyboardContinue();
                }
              }}
              placeholder={question.placeholder || 'Write in your own words&hellip;'}
              rows={6}
              className="w-full focus:outline-none"
              style={{
                fontFamily: 'var(--font-parent-display)',
                fontSize: 21,
                fontStyle: 'italic',
                color: '#3A3530',
                background: 'transparent',
                border: 0,
                borderBottom: '1px solid rgba(200, 190, 172, 0.6)',
                padding: '10px 2px 14px',
                resize: 'none',
                lineHeight: 1.55,
                letterSpacing: '0.002em',
                minHeight: 160,
              }}
              autoFocus
            />
            {isDemo && getDemoAnswer(question.id, demoPerspective) !== undefined && (
              <button
                type="button"
                onClick={() => {
                  const demo = getDemoAnswer(question.id, demoPerspective);
                  if (demo !== undefined) onChange(demo);
                }}
                className="press-link-sm absolute top-0 right-0"
                style={{ background: 'transparent', cursor: 'pointer', fontSize: 14 }}
              >
                Fill ⟶
              </button>
            )}
          </div>
        );
    }
  };

  const demoFillable =
    isDemo &&
    questionType !== 'text' &&
    getDemoAnswer(question.id, demoPerspective) !== undefined;

  return (
    <div>
      {renderQuestionInput()}

      {demoFillable && (
        <div style={{ textAlign: 'right', marginTop: 14 }}>
          <button
            type="button"
            onClick={() => {
              const demo = getDemoAnswer(question.id, demoPerspective);
              if (demo !== undefined) onChange(demo);
            }}
            className="press-link-sm"
            style={{ background: 'transparent', cursor: 'pointer', fontSize: 14 }}
          >
            Fill for demo ⟶
          </button>
        </div>
      )}

      {/* Qualitative comment — optional embellishment */}
      {question.allowQualitativeComment && questionType !== 'text' && (
        <div style={{ marginTop: 28 }}>
          <QualitativeComment
            value={qualitativeValue || ''}
            onChange={handleQualitativeChange}
            placeholder={question.qualitativePlaceholder}
          />
        </div>
      )}

      {/* Keyboard hint */}
      {questionType === 'text' && (
        <p
          className="press-marginalia"
          style={{ fontSize: 15, marginTop: 14, textAlign: 'right', color: '#7A6E5C' }}
        >
          press <span className="press-sc" style={{ fontSize: 14 }}>⌘</span>
          {' '}+{' '}
          <span className="press-sc" style={{ fontSize: 14 }}>enter</span>
          {' '}to continue
        </p>
      )}
    </div>
  );
}
