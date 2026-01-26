'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useConcerns } from '@/hooks/useConcerns';
import { useHouseholdManual } from '@/hooks/useHouseholdManual';
import { TechnicalButton } from '@/components/technical';
import type { ConcernUrgency } from '@/types/household-workbook';
import { CONCERN_URGENCY_LABELS } from '@/types/household-workbook';

interface QuickCaptureModalProps {
  onClose: () => void;
  defaultPersonId?: string;
  defaultPersonName?: string;
}

export function QuickCaptureModal({
  onClose,
  defaultPersonId,
  defaultPersonName,
}: QuickCaptureModalProps) {
  const { user } = useAuth();
  const { addConcern } = useConcerns(user?.familyId);
  const { manual } = useHouseholdManual(user?.familyId);

  // Form state
  const [description, setDescription] = useState('');
  const [selectedPersons, setSelectedPersons] = useState<{ id: string; name: string }[]>(
    defaultPersonId && defaultPersonName
      ? [{ id: defaultPersonId, name: defaultPersonName }]
      : []
  );
  const [urgency, setUrgency] = useState<ConcernUrgency>('simmering');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Get household members from manual
  const householdMembers = manual?.members || [];

  // Add "Me" as an option if not already in members
  const availablePersons = [
    { personId: user?.userId || 'me', name: 'Me' },
    ...householdMembers.map((m) => ({ personId: m.personId, name: m.name })),
  ];

  const handlePersonToggle = (personId: string, personName: string) => {
    setSelectedPersons((prev) => {
      const exists = prev.find((p) => p.id === personId);
      if (exists) {
        return prev.filter((p) => p.id !== personId);
      }
      return [...prev, { id: personId, name: personName }];
    });
  };

  const handleSubmit = async () => {
    if (!description.trim() || selectedPersons.length === 0) return;

    setIsSubmitting(true);
    try {
      await addConcern({
        description: description.trim(),
        involvedPersonIds: selectedPersons.map((p) => p.id),
        involvedPersonNames: selectedPersons.map((p) => p.name),
        urgency,
      });

      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to capture concern:', err);
      alert('Failed to save concern. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white p-8 border-2 border-slate-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-500 border-2 border-slate-800 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-mono font-bold text-lg text-slate-800 mb-2">CAPTURED</h3>
          <p className="text-slate-600 text-sm">Your concern has been logged.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-lg border-2 border-slate-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-slate-800 bg-amber-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 border-2 border-slate-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h2 className="font-mono font-bold text-slate-800 uppercase">
                Capture a Concern
              </h2>
              <p className="font-mono text-[10px] text-slate-500">
                Log what&apos;s on your mind
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              What&apos;s bothering you?
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what's on your mind..."
              className="w-full p-3 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800 resize-none"
              rows={3}
              autoFocus
            />
          </div>

          {/* Who's involved */}
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Who&apos;s involved?
            </label>
            <div className="flex flex-wrap gap-2">
              {availablePersons.map((person) => {
                const isSelected = selectedPersons.some((p) => p.id === person.personId);
                return (
                  <button
                    key={person.personId}
                    type="button"
                    onClick={() => handlePersonToggle(person.personId, person.name)}
                    className={`px-3 py-2 border-2 font-mono text-xs transition-colors ${
                      isSelected
                        ? 'border-amber-600 bg-amber-100 text-amber-800'
                        : 'border-slate-300 hover:border-slate-400 text-slate-600'
                    }`}
                  >
                    {person.name}
                    {isSelected && (
                      <span className="ml-1">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedPersons.length === 0 && (
              <p className="mt-2 font-mono text-[10px] text-red-500">
                Please select at least one person
              </p>
            )}
          </div>

          {/* Urgency */}
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              How urgent?
            </label>
            <div className="space-y-2">
              {(Object.keys(CONCERN_URGENCY_LABELS) as ConcernUrgency[]).map((level) => {
                const config = CONCERN_URGENCY_LABELS[level];
                const isSelected = urgency === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setUrgency(level)}
                    className={`w-full p-3 border-2 text-left transition-colors ${
                      isSelected
                        ? level === 'can-wait'
                          ? 'border-slate-600 bg-slate-100'
                          : level === 'simmering'
                          ? 'border-amber-600 bg-amber-100'
                          : 'border-red-600 bg-red-100'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`font-mono text-sm font-bold ${
                          isSelected
                            ? level === 'can-wait'
                              ? 'text-slate-800'
                              : level === 'simmering'
                              ? 'text-amber-800'
                              : 'text-red-800'
                            : 'text-slate-700'
                        }`}>
                          {config.label}
                        </span>
                        <p className="font-mono text-[10px] text-slate-500 mt-0.5">
                          {config.description}
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? level === 'can-wait'
                            ? 'border-slate-600 bg-slate-600'
                            : level === 'simmering'
                            ? 'border-amber-600 bg-amber-600'
                            : 'border-red-600 bg-red-600'
                          : 'border-slate-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t-2 border-slate-200 bg-slate-50">
          <TechnicalButton
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            CANCEL
          </TechnicalButton>
          <TechnicalButton
            variant="primary"
            onClick={handleSubmit}
            disabled={!description.trim() || selectedPersons.length === 0 || isSubmitting}
          >
            {isSubmitting ? 'SAVING...' : 'CAPTURE'}
          </TechnicalButton>
        </div>
      </div>
    </div>
  );
}

export default QuickCaptureModal;
