'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTaggedQuestions } from '@/hooks/useTaggedQuestions';
import { TaggedQuestion, QuestionAnswer, StructuredAnswer } from '@/types/onboarding';

interface TaggedQuestionsWidgetProps {
  compact?: boolean;  // For sidebar/small displays
}

export function TaggedQuestionsWidget({ compact = false }: TaggedQuestionsWidgetProps) {
  const {
    questionsForMe,
    loading,
    error,
    answerTaggedQuestion,
    dismissTaggedQuestion,
    pendingCount,
  } = useTaggedQuestions();

  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="w-6 h-6 border-2 border-slate-800 border-t-amber-600 rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  if (pendingCount === 0) {
    return null; // Don't show widget if no questions
  }

  const handleAnswer = async (tagId: string) => {
    if (!answerText.trim()) return;

    setIsSubmitting(true);
    try {
      const answer: StructuredAnswer = {
        primary: answerText.trim(),
        timestamp: Date.now(),
      };
      await answerTaggedQuestion(tagId, answer);
      setAnswerText('');
      setExpandedQuestionId(null);
    } catch (err) {
      console.error('Failed to submit answer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = async (tagId: string) => {
    try {
      await dismissTaggedQuestion(tagId);
    } catch (err) {
      console.error('Failed to dismiss:', err);
    }
  };

  if (compact) {
    return (
      <div className="bg-amber-50 border-2 border-amber-600 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">✉️</span>
          <span className="font-mono font-bold text-slate-800">
            {pendingCount} Question{pendingCount !== 1 ? 's' : ''} for You
          </span>
        </div>
        <p className="font-mono text-xs text-slate-600 mb-3">
          {questionsForMe[0]?.taggerName} tagged you on a question about {questionsForMe[0]?.personName}
        </p>
        <Link
          href="/tagged-questions"
          className="inline-block px-3 py-1.5 bg-amber-600 text-white font-mono text-xs font-bold hover:bg-amber-700 transition-colors"
        >
          View & Answer →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-mono font-bold text-lg text-slate-800">
          Questions for You ({pendingCount})
        </h3>
      </div>

      {questionsForMe.map((question) => (
        <QuestionCard
          key={question.tagId}
          question={question}
          isExpanded={expandedQuestionId === question.tagId}
          onToggle={() => setExpandedQuestionId(
            expandedQuestionId === question.tagId ? null : question.tagId
          )}
          answerText={expandedQuestionId === question.tagId ? answerText : ''}
          onAnswerChange={setAnswerText}
          onSubmit={() => handleAnswer(question.tagId)}
          onDismiss={() => handleDismiss(question.tagId)}
          isSubmitting={isSubmitting}
        />
      ))}
    </div>
  );
}

interface QuestionCardProps {
  question: TaggedQuestion;
  isExpanded: boolean;
  onToggle: () => void;
  answerText: string;
  onAnswerChange: (text: string) => void;
  onSubmit: () => void;
  onDismiss: () => void;
  isSubmitting: boolean;
}

function QuestionCard({
  question,
  isExpanded,
  onToggle,
  answerText,
  onAnswerChange,
  onSubmit,
  onDismiss,
  isSubmitting,
}: QuestionCardProps) {
  const taggerAnswer = question.taggerAnswer;
  const taggerAnswerText = typeof taggerAnswer === 'string'
    ? taggerAnswer
    : (taggerAnswer as StructuredAnswer)?.primary?.toString() || '';

  return (
    <div className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="font-mono text-sm text-amber-600 mb-1">
              {question.taggerName} tagged you • About {question.personName}
            </p>
            <p className="font-mono font-bold text-slate-800">
              {question.questionText}
            </p>
            {question.note && (
              <p className="font-mono text-xs text-slate-500 mt-1 italic">
                "{question.note}"
              </p>
            )}
          </div>
          <span className="text-slate-400">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-4 border-t-2 border-slate-200 bg-slate-50">
          {/* Show tagger's answer if they provided one */}
          {taggerAnswerText && !question.skippedByTagger && (
            <div className="mb-4 p-3 bg-white border-l-4 border-amber-600 rounded">
              <p className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-1">
                {question.taggerName}'s answer:
              </p>
              <p className="font-mono text-sm text-slate-700">
                {taggerAnswerText}
              </p>
            </div>
          )}

          {/* Answer input */}
          <div className="mb-4">
            <label className="block font-mono text-xs text-slate-600 uppercase tracking-wider mb-2">
              Your answer:
            </label>
            <textarea
              value={answerText}
              onChange={(e) => onAnswerChange(e.target.value)}
              placeholder="Share your perspective..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded font-mono text-sm focus:border-slate-800 focus:outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting || !answerText.trim()}
              className="flex-1 py-2 bg-slate-800 text-white font-mono font-bold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Submit Answer'}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="px-4 py-2 border-2 border-slate-300 font-mono text-sm text-slate-600 hover:border-slate-800 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
