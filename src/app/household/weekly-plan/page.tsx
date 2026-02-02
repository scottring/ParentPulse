'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useHouseholdManual } from '@/hooks/useHouseholdManual';
import { useHouseholdFocus } from '@/hooks/useHouseholdFocus';
import {
  TechnicalCard,
  TechnicalButton,
  SectionHeader,
} from '@/components/technical';
import {
  WeeklyPlanningWizard,
  HouseholdFocusCard,
  QuickJournalEntry,
  FloatingJournalButton,
} from '@/components/workbook';
import type {
  WeeklyPlanningPreferences,
  HouseholdWeeklyFocusV2,
} from '@/types/household-workbook';
import {
  SparklesIcon,
  CalendarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

export default function HouseholdWeeklyPlanPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { manual, loading: manualLoading } = useHouseholdManual(user?.familyId);
  const {
    currentFocus,
    isLoading: focusLoading,
    isGenerating,
    generateNewFocus,
    confirmFocus,
    markActionComplete,
    markActionIncomplete,
    addJournalEntry,
    submitReflection,
  } = useHouseholdFocus(user?.familyId);

  const [showWizard, setShowWizard] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || manualLoading || focusLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm text-slate-500 uppercase tracking-wider">
            Loading weekly plan...
          </p>
        </div>
      </div>
    );
  }

  if (!manual) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] p-6">
        <div className="max-w-2xl mx-auto">
          <TechnicalCard shadowSize="lg" className="p-8 text-center">
            <h1 className="font-mono font-bold text-xl text-slate-800 mb-4">
              HOUSEHOLD MANUAL REQUIRED
            </h1>
            <p className="text-slate-600 mb-6">
              You need to create a household manual before you can plan weekly focus areas.
            </p>
            <TechnicalButton
              variant="primary"
              onClick={() => router.push('/household')}
            >
              GO TO HOUSEHOLD MANUAL
            </TechnicalButton>
          </TechnicalCard>
        </div>
      </div>
    );
  }

  const handleGenerate = async (preferences: WeeklyPlanningPreferences) => {
    return await generateNewFocus(preferences);
  };

  const handleConfirm = async (focus: HouseholdWeeklyFocusV2) => {
    await confirmFocus();
    setShowWizard(false);
  };

  // Show wizard if no current focus or user wants to create new
  if (showWizard) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] p-6">
        <div className="max-w-2xl mx-auto">
          <WeeklyPlanningWizard
            manual={manual}
            onGenerate={handleGenerate}
            onConfirm={handleConfirm}
            onCancel={() => setShowWizard(false)}
            isGenerating={isGenerating}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <SectionHeader
            title="WEEKLY HOUSEHOLD FOCUS"
            subtitle="Track your family's priorities for the week"
            cornerBrackets={false}
          />
          <TechnicalButton
            variant="outline"
            onClick={() => router.push('/household')}
          >
            BACK TO MANUAL
          </TechnicalButton>
        </div>

        {/* No Current Focus - Show Create Option */}
        {!currentFocus && (
          <TechnicalCard shadowSize="lg" className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
              <SparklesIcon className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="font-mono font-bold text-xl text-slate-800 mb-2">
              CREATE YOUR WEEKLY FOCUS
            </h2>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Let AI analyze your household manual and suggest focus areas for this week based on your priorities and capacity.
            </p>
            <TechnicalButton
              variant="primary"
              size="lg"
              onClick={() => setShowWizard(true)}
            >
              START WEEKLY PLANNING
            </TechnicalButton>
          </TechnicalCard>
        )}

        {/* Current Focus Display */}
        {currentFocus && (
          <>
            <HouseholdFocusCard
              focus={currentFocus}
              onMarkActionComplete={markActionComplete}
              onMarkActionIncomplete={markActionIncomplete}
              onAddJournalEntry={() => setShowJournalModal(true)}
              onOpenReflection={() => setShowReflectionModal(true)}
              onEditPlan={() => setShowWizard(true)}
            />

            {/* Journal Entries */}
            {currentFocus.journalEntries.length > 0 && (
              <TechnicalCard shadowSize="sm" className="p-4">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                  JOURNAL ENTRIES THIS WEEK
                </h3>
                <div className="space-y-3">
                  {currentFocus.journalEntries.map((entry) => (
                    <div
                      key={entry.entryId}
                      className="p-3 bg-slate-50 border-l-4 border-slate-300"
                    >
                      <p className="text-sm text-slate-700">{entry.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-mono text-[10px] text-slate-400">
                          {entry.timestamp.toDate().toLocaleDateString()}
                        </span>
                        {entry.mood && (
                          <span className={`
                            font-mono text-[10px] px-1.5 py-0.5
                            ${entry.mood === 'positive' ? 'bg-green-100 text-green-700' :
                              entry.mood === 'challenging' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-600'}
                          `}>
                            {entry.mood}
                          </span>
                        )}
                        {entry.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="font-mono text-[10px] text-slate-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TechnicalCard>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <TechnicalCard shadowSize="sm" className="p-4 text-center">
                <CalendarIcon className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                <div className="font-mono font-bold text-2xl text-slate-800">
                  {currentFocus.focusAreas.length - (currentFocus.removedAreaIds?.length || 0)}
                </div>
                <div className="font-mono text-xs text-slate-500 uppercase">
                  Focus Areas
                </div>
              </TechnicalCard>

              <TechnicalCard shadowSize="sm" className="p-4 text-center">
                <ChartBarIcon className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                <div className="font-mono font-bold text-2xl text-slate-800">
                  {currentFocus.completedActions.length}
                </div>
                <div className="font-mono text-xs text-slate-500 uppercase">
                  Actions Done
                </div>
              </TechnicalCard>

              <TechnicalCard shadowSize="sm" className="p-4 text-center">
                <SparklesIcon className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                <div className="font-mono font-bold text-2xl text-slate-800">
                  {currentFocus.journalEntries.length}
                </div>
                <div className="font-mono text-xs text-slate-500 uppercase">
                  Journal Notes
                </div>
              </TechnicalCard>
            </div>

            {/* Floating Journal Button */}
            <FloatingJournalButton onClick={() => setShowJournalModal(true)} />
          </>
        )}

        {/* Journal Modal */}
        {showJournalModal && currentFocus && (
          <QuickJournalEntry
            focusAreas={[
              ...currentFocus.focusAreas.filter(
                (a) => !(currentFocus.removedAreaIds || []).includes(a.focusAreaId)
              ),
              ...(currentFocus.userAddedAreas || []),
            ]}
            onSubmit={addJournalEntry}
            onClose={() => setShowJournalModal(false)}
          />
        )}

        {/* Reflection Modal */}
        {showReflectionModal && currentFocus && (
          <ReflectionModal
            onSubmit={async (notes, rating) => {
              await submitReflection(notes, rating);
              setShowReflectionModal(false);
            }}
            onClose={() => setShowReflectionModal(false)}
          />
        )}
      </div>
    </div>
  );
}

// ==================== Reflection Modal ====================

interface ReflectionModalProps {
  onSubmit: (notes: string, rating: 1 | 2 | 3 | 4 | 5) => void;
  onClose: () => void;
}

function ReflectionModal({ onSubmit, onClose }: ReflectionModalProps) {
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(3);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <TechnicalCard shadowSize="lg" className="w-full max-w-lg bg-white p-6">
        <h3 className="font-mono font-bold text-lg text-slate-800 mb-4">
          WEEKLY REFLECTION
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block font-mono text-xs text-slate-500 mb-2">
              HOW DID THIS WEEK GO?
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What worked well? What was challenging? Any insights for next week?"
              className="w-full p-3 border-2 border-slate-200 font-mono text-sm resize-none focus:outline-none focus:border-slate-400"
              rows={4}
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-slate-500 mb-2">
              EFFECTIVENESS RATING
            </label>
            <div className="flex gap-2">
              {([1, 2, 3, 4, 5] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRating(r)}
                  className={`
                    flex-1 p-3 border-2 font-mono text-lg transition-colors
                    ${rating === r
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-slate-200 hover:border-slate-300'
                    }
                  `}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="font-mono text-[10px] text-slate-400 mt-1 text-center">
              1 = Not effective | 5 = Very effective
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <TechnicalButton
            variant="primary"
            onClick={() => onSubmit(notes, rating)}
            disabled={!notes.trim()}
          >
            SUBMIT REFLECTION
          </TechnicalButton>
          <TechnicalButton variant="outline" onClick={onClose}>
            CANCEL
          </TechnicalButton>
        </div>
      </TechnicalCard>
    </div>
  );
}
