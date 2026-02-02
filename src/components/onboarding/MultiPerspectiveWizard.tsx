'use client';

import { useState, useMemo } from 'react';
import {
  UserCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  PaperAirplaneIcon,
  UserGroupIcon,
  ArrowRightIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import type {
  RespondentType,
  PromptVariant,
  QuestionVariant,
  ManualInput,
} from '@/types/multi-perspective';
import { TechnicalButton, TechnicalCard } from '@/components/technical';

// ==================== Types ====================

interface Respondent {
  id: string;
  name: string;
  type: RespondentType;
  age?: number;
  email?: string;
  status: 'not_started' | 'in_progress' | 'complete';
  questionsAnswered: number;
  totalQuestions: number;
}

interface MultiPerspectiveWizardProps {
  personName: string;
  personId: string;
  manualId: string;
  manualType: 'child' | 'adult' | 'marriage';

  // Respondents configuration
  respondents: Respondent[];
  requiredRespondents: RespondentType[];

  // Current respondent (who is filling out now)
  currentRespondentId?: string;
  currentRespondentType?: RespondentType;

  // Questions to display for current respondent
  questions: Array<{
    questionId: string;
    variant: QuestionVariant;
    category: string;
    existingInput?: ManualInput;
  }>;

  // Callbacks
  onSubmitInput: (questionId: string, response: string | string[]) => Promise<void>;
  onInviteRespondent: (respondentType: RespondentType, email: string) => Promise<void>;
  onComplete: () => void;
  onContinueWithPartial?: () => void;
}

// ==================== Sub-Components ====================

function RespondentStatusCard({
  respondent,
  isRequired,
  isCurrent,
  onInvite,
}: {
  respondent: Respondent;
  isRequired: boolean;
  isCurrent: boolean;
  onInvite?: () => void;
}) {
  const statusIcon =
    respondent.status === 'complete' ? (
      <CheckCircleIcon className="w-5 h-5 text-green-600" />
    ) : respondent.status === 'in_progress' ? (
      <ClockIcon className="w-5 h-5 text-amber-500" />
    ) : (
      <UserCircleIcon className="w-5 h-5 text-slate-400" />
    );

  const statusText =
    respondent.status === 'complete'
      ? 'Complete'
      : respondent.status === 'in_progress'
      ? `${respondent.questionsAnswered}/${respondent.totalQuestions}`
      : 'Not started';

  const statusColor =
    respondent.status === 'complete'
      ? 'text-green-600'
      : respondent.status === 'in_progress'
      ? 'text-amber-600'
      : 'text-slate-500';

  return (
    <div
      className={`flex items-center justify-between p-3 border ${
        isCurrent
          ? 'border-amber-500 bg-amber-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-3">
        {statusIcon}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-slate-800">
              {respondent.name}
            </span>
            <span className="font-mono text-xs text-slate-500">
              ({respondent.type})
            </span>
            {isRequired && (
              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 font-mono text-xs">
                Required
              </span>
            )}
          </div>
          <span className={`font-mono text-xs ${statusColor}`}>{statusText}</span>
        </div>
      </div>

      {respondent.status === 'not_started' && onInvite && (
        <button
          onClick={onInvite}
          className="px-3 py-1.5 border border-slate-300 bg-white font-mono text-xs text-slate-600 hover:border-slate-500 transition-colors flex items-center gap-1"
        >
          <EnvelopeIcon className="w-3 h-3" />
          Invite
        </button>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  onSubmit,
  isSubmitting,
}: {
  question: {
    questionId: string;
    variant: QuestionVariant;
    category: string;
    existingInput?: ManualInput;
  };
  onSubmit: (response: string | string[]) => void;
  isSubmitting: boolean;
}) {
  const [response, setResponse] = useState<string>(
    question.existingInput
      ? typeof question.existingInput.response === 'string'
        ? question.existingInput.response
        : ''
      : ''
  );
  const [selectedOptions, setSelectedOptions] = useState<string[]>(
    question.existingInput?.selectedOptions ?? []
  );

  const handleSubmit = () => {
    if (question.variant.inputType === 'multiple_choice' ||
        question.variant.inputType === 'multiple_choice_with_other') {
      onSubmit(selectedOptions);
    } else {
      onSubmit(response);
    }
  };

  const isMultipleChoice =
    question.variant.inputType === 'multiple_choice' ||
    question.variant.inputType === 'multiple_choice_with_other';

  return (
    <TechnicalCard shadowSize="md" className="p-0 overflow-hidden">
      <div className="p-4 border-b border-slate-200">
        <span className="inline-block px-2 py-0.5 bg-slate-100 font-mono text-xs text-slate-600 mb-2">
          {question.category.toUpperCase()}
        </span>
        <h4 className="font-mono font-bold text-base text-slate-800">
          {question.variant.prompt}
        </h4>
        {question.variant.helpText && (
          <p className="mt-1 font-mono text-xs text-slate-500">
            {question.variant.helpText}
          </p>
        )}
      </div>

      <div className="p-4">
        {isMultipleChoice && question.variant.options ? (
          <div className="space-y-2">
            {question.variant.options.map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-3 p-3 border cursor-pointer transition-colors ${
                  selectedOptions.includes(option.value)
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedOptions.includes(option.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedOptions([...selectedOptions, option.value]);
                    } else {
                      setSelectedOptions(
                        selectedOptions.filter((v) => v !== option.value)
                      );
                    }
                  }}
                  className="w-4 h-4 accent-amber-600"
                />
                <span className="font-mono text-sm text-slate-700">
                  {option.label}
                </span>
              </label>
            ))}

            {question.variant.inputType === 'multiple_choice_with_other' && (
              <div className="mt-3">
                <label className="font-mono text-xs text-slate-600">
                  Other (please specify):
                </label>
                <input
                  type="text"
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your answer..."
                  className="mt-1 w-full p-2 border border-slate-200 font-mono text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>
            )}
          </div>
        ) : (
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder={question.variant.placeholder || 'Type your answer...'}
            rows={4}
            className="w-full p-3 border border-slate-200 font-mono text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none"
          />
        )}
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
        <TechnicalButton
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            (!response.trim() && selectedOptions.length === 0)
          }
        >
          {isSubmitting ? 'Saving...' : 'Save Answer'}
          <PaperAirplaneIcon className="w-4 h-4 ml-1" />
        </TechnicalButton>
      </div>
    </TechnicalCard>
  );
}

// ==================== Main Component ====================

export default function MultiPerspectiveWizard({
  personName,
  personId,
  manualId,
  manualType,
  respondents,
  requiredRespondents,
  currentRespondentId,
  currentRespondentType,
  questions,
  onSubmitInput,
  onInviteRespondent,
  onComplete,
  onContinueWithPartial,
}: MultiPerspectiveWizardProps) {
  const [submittingQuestion, setSubmittingQuestion] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState<RespondentType | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');

  // Calculate overall status
  const completedRespondents = respondents.filter((r) => r.status === 'complete');
  const requiredComplete = requiredRespondents.every((type) =>
    respondents.some((r) => r.type === type && r.status === 'complete')
  );
  const hasMinimumInput = completedRespondents.length >= 1;

  // Questions that still need answers from current respondent
  const unansweredQuestions = questions.filter((q) => !q.existingInput);

  const handleSubmitInput = async (questionId: string, response: string | string[]) => {
    setSubmittingQuestion(questionId);
    try {
      await onSubmitInput(questionId, response);
    } finally {
      setSubmittingQuestion(null);
    }
  };

  const handleInvite = async () => {
    if (!showInviteModal || !inviteEmail.trim()) return;

    await onInviteRespondent(showInviteModal, inviteEmail);
    setShowInviteModal(null);
    setInviteEmail('');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white border-2 border-slate-800 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-3 mb-4">
          <UserGroupIcon className="w-6 h-6 text-amber-600" />
          <h2 className="font-mono text-xl font-bold text-slate-800">
            Building {personName}&apos;s Manual
          </h2>
        </div>
        <p className="font-mono text-sm text-slate-600">
          We need input from multiple family members to create a complete picture.
          Different perspectives help identify patterns and blind spots.
        </p>
      </div>

      {/* Respondent Status */}
      <div>
        <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-4">
          INPUT STATUS
        </div>
        <div className="space-y-2">
          {respondents.map((respondent) => (
            <RespondentStatusCard
              key={respondent.id}
              respondent={respondent}
              isRequired={requiredRespondents.includes(respondent.type)}
              isCurrent={respondent.id === currentRespondentId}
              onInvite={
                respondent.status === 'not_started'
                  ? () => setShowInviteModal(respondent.type)
                  : undefined
              }
            />
          ))}
        </div>

        {!requiredComplete && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200">
            <p className="font-mono text-xs text-amber-800">
              <strong>Required:</strong> At least{' '}
              {requiredRespondents.length === 1
                ? '1 parent observation'
                : `observations from: ${requiredRespondents.join(', ')}`}
            </p>
          </div>
        )}
      </div>

      {/* Questions for current respondent */}
      {currentRespondentId && unansweredQuestions.length > 0 && (
        <div>
          <div className="inline-block px-3 py-1 bg-amber-600 text-white font-mono text-xs mb-4">
            YOUR QUESTIONS ({unansweredQuestions.length} remaining)
          </div>
          <div className="space-y-4">
            {unansweredQuestions.map((question) => (
              <QuestionCard
                key={question.questionId}
                question={question}
                onSubmit={(response) =>
                  handleSubmitInput(question.questionId, response)
                }
                isSubmitting={submittingQuestion === question.questionId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completion Actions */}
      <div className="bg-slate-50 border-2 border-slate-300 p-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {requiredComplete ? (
            <TechnicalButton
              variant="primary"
              size="md"
              onClick={onComplete}
              className="flex-1"
            >
              Continue to AI Synthesis
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </TechnicalButton>
          ) : hasMinimumInput && onContinueWithPartial ? (
            <>
              <TechnicalButton
                variant="outline"
                size="md"
                onClick={onContinueWithPartial}
                className="flex-1"
              >
                Continue with Available Input
              </TechnicalButton>
              <p className="font-mono text-xs text-slate-500 text-center">
                (AI will note where more perspectives would help)
              </p>
            </>
          ) : (
            <p className="font-mono text-sm text-slate-600 text-center">
              Complete required inputs to continue
            </p>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowInviteModal(null)}
        >
          <div
            className="bg-white border-4 border-slate-800 p-6 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-mono text-lg font-bold text-slate-800 mb-4">
              Invite {showInviteModal} to Contribute
            </h3>
            <p className="font-mono text-sm text-slate-600 mb-4">
              Send an invitation email so they can add their perspective to{' '}
              {personName}&apos;s manual.
            </p>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address"
              className="w-full p-3 border-2 border-slate-200 font-mono text-sm mb-4 focus:border-amber-500 outline-none"
            />
            <div className="flex gap-3">
              <TechnicalButton
                variant="outline"
                size="md"
                onClick={() => setShowInviteModal(null)}
                className="flex-1"
              >
                Cancel
              </TechnicalButton>
              <TechnicalButton
                variant="primary"
                size="md"
                onClick={handleInvite}
                disabled={!inviteEmail.trim()}
                className="flex-1"
              >
                Send Invite
              </TechnicalButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
