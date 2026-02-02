'use client';

import { useState } from 'react';
import {
  TechnicalCard,
  TechnicalButton,
  TechnicalLabel,
} from '@/components/technical';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import type {
  FocusDomain,
  CapacityLevel,
  WeeklyPlanningPreferences,
  HouseholdWeeklyFocusV2,
  FocusArea,
} from '@/types/household-workbook';
import { FOCUS_DOMAIN_META, DOMAIN_BASELINE_REQUIREMENTS } from '@/types/household-workbook';
import { useBaselineEnforcement } from '@/hooks/useBaselineEnforcement';
import type { HouseholdManual } from '@/types/household-workbook';

// ==================== Types ====================

interface WeeklyPlanningWizardProps {
  manual: HouseholdManual;
  onGenerate: (preferences: WeeklyPlanningPreferences) => Promise<{ success: boolean; focus?: HouseholdWeeklyFocusV2 }>;
  onConfirm: (focus: HouseholdWeeklyFocusV2) => Promise<void>;
  onCancel: () => void;
  isGenerating?: boolean;
}

type WizardStep = 'preferences' | 'review' | 'confirmed';

// ==================== Component ====================

export default function WeeklyPlanningWizard({
  manual,
  onGenerate,
  onConfirm,
  onCancel,
  isGenerating = false,
}: WeeklyPlanningWizardProps) {
  const [step, setStep] = useState<WizardStep>('preferences');
  const [selectedDomains, setSelectedDomains] = useState<FocusDomain[]>([]);
  const [capacity, setCapacity] = useState<CapacityLevel>('moderate');
  const [priorities, setPriorities] = useState('');
  const [generatedFocus, setGeneratedFocus] = useState<HouseholdWeeklyFocusV2 | null>(null);
  const [removedAreaIds, setRemovedAreaIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { getDomainStatus, canSelectDomain } = useBaselineEnforcement(manual);

  const allDomains: FocusDomain[] = [
    'physical_environment',
    'behavior_boundaries',
    'partner_dynamics',
    'routines_rituals',
    'self_regulation',
    'values_alignment',
  ];

  const handleDomainToggle = (domain: FocusDomain) => {
    if (!canSelectDomain(domain)) return;

    if (selectedDomains.includes(domain)) {
      setSelectedDomains(selectedDomains.filter((d) => d !== domain));
    } else if (selectedDomains.length < 3) {
      setSelectedDomains([...selectedDomains, domain]);
    }
  };

  const handleGenerate = async () => {
    if (selectedDomains.length === 0) return;

    setError(null);
    const preferences: WeeklyPlanningPreferences = {
      focusDomains: selectedDomains,
      capacity,
      manualPriorities: priorities.trim() ? [priorities.trim()] : undefined,
    };

    const result = await onGenerate(preferences);

    if (result.success && result.focus) {
      setGeneratedFocus(result.focus);
      setStep('review');
    } else {
      setError('Failed to generate weekly focus. Please try again.');
    }
  };

  const handleRemoveArea = (focusAreaId: string) => {
    setRemovedAreaIds([...removedAreaIds, focusAreaId]);
  };

  const handleConfirm = async () => {
    if (!generatedFocus) return;

    const updatedFocus: HouseholdWeeklyFocusV2 = {
      ...generatedFocus,
      removedAreaIds,
    };

    await onConfirm(updatedFocus);
    setStep('confirmed');
  };

  const visibleFocusAreas = generatedFocus?.focusAreas.filter(
    (area) => !removedAreaIds.includes(area.focusAreaId)
  ) || [];

  // ==================== Step: Preferences ====================
  if (step === 'preferences') {
    return (
      <TechnicalCard shadowSize="lg" className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h2 className="font-mono font-bold text-xl text-slate-800 mb-2">
            WEEKLY PLANNING
          </h2>
          <p className="text-sm text-slate-600">
            Tell us what you want to focus on this week and your capacity level.
          </p>
        </div>

        {/* Domain Selection */}
        <div className="mb-6">
          <label className="block font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
            FOCUS DOMAINS (SELECT 1-3)
          </label>
          <div className="space-y-2">
            {allDomains.map((domain) => {
              const status = getDomainStatus(domain);
              const isSelected = selectedDomains.includes(domain);
              const isAvailable = canSelectDomain(domain);
              const isDisabled = !isAvailable || (!isSelected && selectedDomains.length >= 3);

              return (
                <button
                  key={domain}
                  onClick={() => handleDomainToggle(domain)}
                  disabled={isDisabled}
                  className={`
                    w-full p-4 text-left border-2 transition-all flex items-start gap-3
                    ${isSelected
                      ? 'border-amber-500 bg-amber-50'
                      : isAvailable
                        ? 'border-slate-200 hover:border-slate-400'
                        : 'border-slate-100 bg-slate-50 cursor-not-allowed'
                    }
                    ${isDisabled && !isSelected ? 'opacity-60' : ''}
                  `}
                >
                  <div className={`
                    w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                    ${isSelected ? 'border-amber-500 bg-amber-500' : 'border-slate-300'}
                  `}>
                    {isSelected && (
                      <CheckCircleIcon className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-sm text-slate-800">
                        {status.domainName}
                      </span>
                      {!isAvailable && (
                        <TechnicalLabel variant="subtle" color="red" size="xs">
                          BASELINE INCOMPLETE
                        </TechnicalLabel>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {status.domainDescription}
                    </p>
                    {!isAvailable && (
                      <p className="text-xs text-red-500 mt-1">
                        {status.missingRequirements.length} requirement(s) missing
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Capacity Selection */}
        <div className="mb-6">
          <label className="block font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
            CAPACITY THIS WEEK
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['light', 'moderate', 'full'] as CapacityLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => setCapacity(level)}
                className={`
                  p-3 border-2 text-center transition-all
                  ${capacity === level
                    ? 'border-slate-800 bg-slate-800 text-white'
                    : 'border-slate-200 hover:border-slate-400'
                  }
                `}
              >
                <span className="block font-mono text-sm font-bold uppercase">
                  {level}
                </span>
                <span className="block text-xs mt-1 opacity-80">
                  {level === 'light' && '1-2 focus areas'}
                  {level === 'moderate' && '2-3 focus areas'}
                  {level === 'full' && '3-4 focus areas'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Priority Input */}
        <div className="mb-6">
          <label className="block font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            SPECIFIC PRIORITIES (OPTIONAL)
          </label>
          <textarea
            value={priorities}
            onChange={(e) => setPriorities(e.target.value)}
            placeholder="e.g., Bedtime has been a struggle lately, want to focus on morning routine consistency..."
            className="w-full p-3 border-2 border-slate-200 font-mono text-sm resize-none focus:outline-none focus:border-slate-400"
            rows={3}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <TechnicalButton
            variant="primary"
            onClick={handleGenerate}
            disabled={selectedDomains.length === 0 || isGenerating}
          >
            {isGenerating ? (
              <>
                <SparklesIcon className="w-4 h-4 mr-2 animate-pulse" />
                GENERATING...
              </>
            ) : (
              'GENERATE WEEKLY FOCUS'
            )}
          </TechnicalButton>
          <TechnicalButton variant="outline" onClick={onCancel}>
            CANCEL
          </TechnicalButton>
        </div>
      </TechnicalCard>
    );
  }

  // ==================== Step: Review ====================
  if (step === 'review' && generatedFocus) {
    return (
      <TechnicalCard shadowSize="lg" className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h2 className="font-mono font-bold text-xl text-slate-800 mb-2">
            REVIEW YOUR WEEKLY FOCUS
          </h2>
          <p className="text-sm text-slate-600">
            Review and refine the AI-generated focus areas for this week.
          </p>
        </div>

        {/* Capacity Note */}
        {generatedFocus.capacityNote && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-800">{generatedFocus.capacityNote}</p>
          </div>
        )}

        {/* Focus Areas */}
        <div className="space-y-4 mb-6">
          {visibleFocusAreas.map((area) => (
            <div
              key={area.focusAreaId}
              className="p-4 border-2 border-slate-200"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-mono font-bold text-sm text-slate-800">
                    {area.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <TechnicalLabel variant="subtle" color="slate" size="xs">
                      L{area.layerId}
                    </TechnicalLabel>
                    <TechnicalLabel variant="subtle" color="blue" size="xs">
                      {area.sourceType.toUpperCase()}
                    </TechnicalLabel>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveArea(area.focusAreaId)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500 italic mb-3">
                {area.rationale}
              </p>

              <div className="space-y-1">
                {area.actions.map((action) => (
                  <div
                    key={action.actionId}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <div className="w-4 h-4 border border-slate-300" />
                    <span>{action.description}</span>
                    {action.dueDay !== undefined && (
                      <TechnicalLabel variant="subtle" color="slate" size="xs">
                        {getDayName(action.dueDay)}
                      </TechnicalLabel>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-green-600 mt-2">
                Success: {area.successMetric}
              </p>
            </div>
          ))}
        </div>

        {visibleFocusAreas.length === 0 && (
          <div className="p-6 text-center border-2 border-dashed border-slate-200 mb-6">
            <p className="text-slate-500">
              All focus areas removed. Add a custom focus area or regenerate.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <TechnicalButton
            variant="primary"
            onClick={handleConfirm}
            disabled={visibleFocusAreas.length === 0}
          >
            CONFIRM WEEKLY PLAN
          </TechnicalButton>
          <TechnicalButton
            variant="outline"
            onClick={() => setStep('preferences')}
          >
            BACK
          </TechnicalButton>
        </div>
      </TechnicalCard>
    );
  }

  // ==================== Step: Confirmed ====================
  if (step === 'confirmed') {
    return (
      <TechnicalCard shadowSize="lg" className="p-6 max-w-2xl mx-auto text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircleIcon className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="font-mono font-bold text-xl text-slate-800 mb-2">
          WEEKLY PLAN ACTIVATED
        </h2>
        <p className="text-sm text-slate-600 mb-6">
          Your focus areas are set for this week. Check your dashboard to track progress.
        </p>
        <TechnicalButton variant="primary" onClick={onCancel}>
          VIEW DASHBOARD
        </TechnicalButton>
      </TechnicalCard>
    );
  }

  return null;
}

// ==================== Helpers ====================

function getDayName(dayIndex: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayIndex] || '';
}
