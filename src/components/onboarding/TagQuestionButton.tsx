'use client';

import { useState } from 'react';
import { useFamilyMembers, FamilyMember } from '@/hooks/useFamilyMembers';
import { useTaggedQuestions } from '@/hooks/useTaggedQuestions';
import { QuestionAnswer } from '@/types/onboarding';

interface TagQuestionButtonProps {
  personId: string;
  personName: string;
  manualId?: string;
  sectionId: string;
  questionId: string;
  questionText: string;
  currentAnswer?: QuestionAnswer;
  onTagAndSkip?: () => void;  // Called after tagging if they want to skip
}

export function TagQuestionButton({
  personId,
  personName,
  manualId,
  sectionId,
  questionId,
  questionText,
  currentAnswer,
  onTagAndSkip,
}: TagQuestionButtonProps) {
  const { otherMembers, loading: membersLoading } = useFamilyMembers();
  const { tagQuestion } = useTaggedQuestions();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [note, setNote] = useState('');
  const [skipAfterTag, setSkipAfterTag] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const hasAnswer = currentAnswer !== undefined && currentAnswer !== '';

  const handleSubmit = async () => {
    if (!selectedMember) return;

    setIsSubmitting(true);
    try {
      await tagQuestion({
        taggedUserId: selectedMember.userId,
        taggedUserName: selectedMember.name,
        personId,
        personName,
        manualId,
        sectionId,
        questionId,
        questionText,
        taggerAnswer: hasAnswer ? currentAnswer : undefined,
        skippedByTagger: skipAfterTag || !hasAnswer,
        note: note || undefined,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsOpen(false);
        setSelectedMember(null);
        setNote('');

        if (skipAfterTag && onTagAndSkip) {
          onTagAndSkip();
        }
      }, 1500);
    } catch (err) {
      console.error('Failed to tag question:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't show if no other family members
  if (membersLoading || otherMembers.length === 0) {
    return null;
  }

  if (showSuccess) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg font-mono text-sm">
        <span>✓</span> Tagged!
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-mono text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        title="Tag someone else to answer this"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Tag Someone
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50">
            <div className="p-4">
              <h4 className="font-mono font-bold text-sm text-slate-800 mb-3">
                Tag someone to answer
              </h4>

              {/* Member selection */}
              <div className="space-y-2 mb-4">
                {otherMembers.map((member) => (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => setSelectedMember(member)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      selectedMember?.userId === member.userId
                        ? 'bg-amber-100 border-2 border-amber-600'
                        : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-600 font-mono font-bold text-sm">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-mono text-sm text-slate-800">
                      {member.name}
                    </span>
                    {selectedMember?.userId === member.userId && (
                      <span className="ml-auto text-amber-600">✓</span>
                    )}
                  </button>
                ))}
              </div>

              {selectedMember && (
                <>
                  {/* Optional note */}
                  <div className="mb-4">
                    <label className="block font-mono text-xs text-slate-600 uppercase tracking-wider mb-1">
                      Add a note (optional)
                    </label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g., You know them better here..."
                      className="w-full px-3 py-2 border-2 border-slate-300 rounded font-mono text-sm focus:border-slate-800 focus:outline-none"
                    />
                  </div>

                  {/* Skip option */}
                  {hasAnswer ? (
                    <label className="flex items-center gap-2 mb-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={skipAfterTag}
                        onChange={(e) => setSkipAfterTag(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      <span className="font-mono text-xs text-slate-600">
                        Also skip this question (let them answer instead)
                      </span>
                    </label>
                  ) : (
                    <p className="font-mono text-xs text-slate-500 mb-4">
                      Since you haven't answered, {selectedMember.name}'s answer will be used.
                    </p>
                  )}

                  {/* Submit button */}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full py-2 bg-slate-800 text-white font-mono font-bold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Tagging...' : `Tag ${selectedMember.name}`}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
