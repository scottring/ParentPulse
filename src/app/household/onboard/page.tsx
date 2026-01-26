'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useHouseholdManual, useHouseholdJourney, createEmptyHouseholdManual } from '@/hooks/useHouseholdManual';
import { usePerson } from '@/hooks/usePerson';
import {
  TechnicalCard,
  TechnicalButton,
  TechnicalLabel,
  ProgressBar,
  SectionHeader,
} from '@/components/technical';
import { PainPointSelector } from '@/components/onboarding/PainPointSelector';
import { MilestoneEditor } from '@/components/onboarding/MilestoneEditor';
import { HouseholdMemberList } from '@/components/onboarding/HouseholdMemberList';
import { HOUSEHOLD_PAIN_POINTS, HOUSEHOLD_LAYERS, LayerId } from '@/types/household-workbook';
import { Timestamp } from 'firebase/firestore';

type OnboardingStep = 'welcome' | 'members' | 'pain-points' | 'milestones' | 'review';

interface Member {
  id: string;
  name: string;
  role: 'parent' | 'child' | 'other';
  dateOfBirth?: string; // ISO date string
  isExistingPerson?: boolean;
}

const SUGGESTED_MILESTONES = {
  day30: 'We have a clear morning routine that everyone follows',
  day60: 'Family conflicts are resolved calmly 80% of the time',
  day90: 'Our home feels like a peaceful, organized space',
};

export default function HouseholdOnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { saveManual } = useHouseholdManual(user?.familyId);
  const { createJourney } = useHouseholdJourney(user?.familyId);
  const { people: existingPeople, loading: peopleLoading } = usePerson();

  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [householdName, setHouseholdName] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedPainPoints, setSelectedPainPoints] = useState<string[]>([]);
  const [milestones, setMilestones] = useState({
    day30: '',
    day60: '',
    day90: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Initialize household name from family
  useEffect(() => {
    if (user) {
      setHouseholdName(`The ${user.name?.split(' ')[1] || 'Family'} Household`);
    }
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const steps: OnboardingStep[] = ['welcome', 'members', 'pain-points', 'milestones', 'review'];
  const currentStepIndex = steps.indexOf(step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const canProceed = () => {
    switch (step) {
      case 'welcome':
        return householdName.trim().length > 0;
      case 'members':
        return members.length >= 1;
      case 'pain-points':
        return selectedPainPoints.length >= 1;
      case 'milestones':
        return milestones.day30 && milestones.day60 && milestones.day90;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  const handlePainPointToggle = (id: string) => {
    setSelectedPainPoints((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleAddMember = (member: Omit<Member, 'id'>, existingPersonId?: string) => {
    // If existingPersonId is provided, use it as the id (links to real Person document)
    // Otherwise, generate a temporary id
    const id = existingPersonId || `member-${Date.now()}`;
    setMembers((prev) => [
      ...prev,
      { ...member, id, isExistingPerson: !!existingPersonId },
    ]);
  };

  const handleRemoveMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSubmit = async () => {
    if (!user?.familyId) return;

    setIsSubmitting(true);
    try {
      // Create the household manual
      const manual = createEmptyHouseholdManual(user.familyId, householdName);
      manual.members = members.map((m) => ({
        personId: m.id,
        name: m.name,
        role: m.role,
        dateOfBirth: m.dateOfBirth ? Timestamp.fromDate(new Date(m.dateOfBirth)) : undefined,
      }));

      // Get layers to focus on based on pain points
      const layersFocused = new Set<LayerId>();
      selectedPainPoints.forEach((ppId) => {
        const pp = HOUSEHOLD_PAIN_POINTS.find((p) => p.id === ppId);
        if (pp) {
          pp.relatedLayers.forEach((l) => layersFocused.add(l as LayerId));
        }
      });

      await saveManual(manual);

      // Create the journey
      await createJourney(selectedPainPoints, milestones);

      // Navigate to the household manual page
      router.push('/household');
    } catch (err) {
      console.error('Failed to create household manual:', err);
      alert('Failed to create household manual. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get suggested milestones based on pain points
  const getSuggestedMilestones = () => {
    // For now, return default suggestions
    // In the future, this could be AI-generated based on pain points
    return SUGGESTED_MILESTONES;
  };

  const getLayersFocused = () => {
    const layers = new Set<LayerId>();
    selectedPainPoints.forEach((ppId) => {
      const pp = HOUSEHOLD_PAIN_POINTS.find((p) => p.id === ppId);
      if (pp) {
        pp.relatedLayers.forEach((l) => layers.add(l as LayerId));
      }
    });
    return Array.from(layers);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Progress header */}
      <header className="border-b-2 border-slate-800 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <TechnicalLabel variant="filled" color="slate" size="sm">
              HOUSEHOLD ONBOARDING
            </TechnicalLabel>
            <span className="font-mono text-xs text-slate-500">
              STEP {currentStepIndex + 1} OF {steps.length}
            </span>
          </div>
          <ProgressBar
            progress={progress}
            segments={steps.length}
            showPercentage={false}
            color="amber"
            size="sm"
          />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Welcome step */}
        {step === 'welcome' && (
          <TechnicalCard cornerBrackets shadowSize="lg" className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 border-2 border-amber-600 flex items-center justify-center">
                <span className="font-mono font-bold text-2xl text-white">HQ</span>
              </div>
              <h1 className="font-mono font-bold text-2xl text-slate-800 mb-2">
                WELCOME TO HOUSEHOLD ONBOARDING
              </h1>
              <p className="text-slate-600">
                Let&apos;s create your family&apos;s operating manual together.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  NAME YOUR HOUSEHOLD
                </label>
                <input
                  type="text"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="e.g., The Smith Household"
                  className="
                    w-full p-3 border-2 border-slate-300 font-mono text-lg
                    focus:outline-none focus:border-slate-800
                  "
                />
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  WHAT YOU&apos;LL DO:
                </h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-slate-800 text-white font-mono text-xs flex items-center justify-center">1</span>
                    Add your household members
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-slate-800 text-white font-mono text-xs flex items-center justify-center">2</span>
                    Identify your biggest pain points
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-slate-800 text-white font-mono text-xs flex items-center justify-center">3</span>
                    Set 90-day milestones
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-slate-800 text-white font-mono text-xs flex items-center justify-center">4</span>
                    Review and start your journey
                  </li>
                </ul>
              </div>
            </div>
          </TechnicalCard>
        )}

        {/* Members step */}
        {step === 'members' && (
          <TechnicalCard badge={1} cornerBrackets shadowSize="lg" className="p-8">
            <SectionHeader
              title="HOUSEHOLD MEMBERS"
              subtitle="Add everyone who lives in your home"
              cornerBrackets={false}
              className="mb-6"
            />

            <HouseholdMemberList
              members={members}
              existingPeople={existingPeople}
              onAddMember={handleAddMember}
              onRemoveMember={handleRemoveMember}
            />
          </TechnicalCard>
        )}

        {/* Pain points step */}
        {step === 'pain-points' && (
          <TechnicalCard badge={2} cornerBrackets shadowSize="lg" className="p-8">
            <SectionHeader
              title="PAIN POINTS"
              subtitle="What's hardest right now? Select up to 3."
              cornerBrackets={false}
              className="mb-6"
            />

            <PainPointSelector
              selectedPainPoints={selectedPainPoints}
              onSelect={handlePainPointToggle}
              maxSelections={3}
            />
          </TechnicalCard>
        )}

        {/* Milestones step */}
        {step === 'milestones' && (
          <TechnicalCard badge={3} cornerBrackets shadowSize="lg" className="p-8">
            <SectionHeader
              title="YOUR 90-DAY VISION"
              subtitle="What does success look like?"
              cornerBrackets={false}
              className="mb-6"
            />

            <MilestoneEditor
              day30={milestones.day30}
              day60={milestones.day60}
              day90={milestones.day90}
              onUpdate={setMilestones}
              suggestedMilestones={getSuggestedMilestones()}
            />
          </TechnicalCard>
        )}

        {/* Review step */}
        {step === 'review' && (
          <div className="space-y-6">
            <TechnicalCard badge="!" badgeColor="amber" cornerBrackets shadowSize="lg" className="p-8">
              <h1 className="font-mono font-bold text-2xl text-slate-800 mb-4">
                REVIEW YOUR HOUSEHOLD MANUAL
              </h1>
              <p className="text-slate-600">
                Here&apos;s a summary of what you&apos;ve configured. You can go back to make changes.
              </p>
            </TechnicalCard>

            {/* Household name */}
            <TechnicalCard shadowSize="sm" className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <TechnicalLabel variant="subtle" color="slate" size="xs">
                    HOUSEHOLD NAME
                  </TechnicalLabel>
                  <p className="font-mono font-bold text-lg text-slate-800 mt-1">
                    {householdName}
                  </p>
                </div>
                <button
                  onClick={() => setStep('welcome')}
                  className="font-mono text-xs text-slate-500 hover:text-slate-700"
                >
                  [EDIT]
                </button>
              </div>
            </TechnicalCard>

            {/* Members */}
            <TechnicalCard shadowSize="sm" className="p-4">
              <div className="flex items-center justify-between mb-2">
                <TechnicalLabel variant="subtle" color="slate" size="xs">
                  MEMBERS ({members.length})
                </TechnicalLabel>
                <button
                  onClick={() => setStep('members')}
                  className="font-mono text-xs text-slate-500 hover:text-slate-700"
                >
                  [EDIT]
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <TechnicalLabel
                    key={m.id}
                    variant={m.isExistingPerson ? 'filled' : 'outline'}
                    color={m.isExistingPerson ? 'green' : 'slate'}
                    size="sm"
                  >
                    {m.name} ({m.role}){m.isExistingPerson ? ' ✓' : ''}
                  </TechnicalLabel>
                ))}
              </div>
              {members.some(m => m.isExistingPerson) && (
                <p className="mt-2 font-mono text-xs text-green-600">
                  ✓ = Linked to existing person manual
                </p>
              )}
            </TechnicalCard>

            {/* Pain points */}
            <TechnicalCard shadowSize="sm" className="p-4">
              <div className="flex items-center justify-between mb-2">
                <TechnicalLabel variant="subtle" color="slate" size="xs">
                  PAIN POINTS ({selectedPainPoints.length})
                </TechnicalLabel>
                <button
                  onClick={() => setStep('pain-points')}
                  className="font-mono text-xs text-slate-500 hover:text-slate-700"
                >
                  [EDIT]
                </button>
              </div>
              <div className="space-y-1">
                {selectedPainPoints.map((ppId) => {
                  const pp = HOUSEHOLD_PAIN_POINTS.find((p) => p.id === ppId);
                  return pp ? (
                    <div key={ppId} className="text-sm text-slate-700">
                      • {pp.label}
                    </div>
                  ) : null;
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="font-mono text-xs text-slate-500">
                  Layers we&apos;ll focus on: {getLayersFocused().map((l) => HOUSEHOLD_LAYERS[l].friendly).join(', ')}
                </p>
              </div>
            </TechnicalCard>

            {/* Milestones */}
            <TechnicalCard shadowSize="sm" className="p-4">
              <div className="flex items-center justify-between mb-2">
                <TechnicalLabel variant="subtle" color="slate" size="xs">
                  90-DAY MILESTONES
                </TechnicalLabel>
                <button
                  onClick={() => setStep('milestones')}
                  className="font-mono text-xs text-slate-500 hover:text-slate-700"
                >
                  [EDIT]
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <TechnicalLabel variant="filled" color="amber" size="xs">DAY 30</TechnicalLabel>
                  <span className="text-sm text-slate-700">{milestones.day30}</span>
                </div>
                <div className="flex items-start gap-2">
                  <TechnicalLabel variant="filled" color="blue" size="xs">DAY 60</TechnicalLabel>
                  <span className="text-sm text-slate-700">{milestones.day60}</span>
                </div>
                <div className="flex items-start gap-2">
                  <TechnicalLabel variant="filled" color="green" size="xs">DAY 90</TechnicalLabel>
                  <span className="text-sm text-slate-700">{milestones.day90}</span>
                </div>
              </div>
            </TechnicalCard>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-8 flex items-center justify-between">
          {currentStepIndex > 0 ? (
            <TechnicalButton variant="outline" onClick={goBack}>
              &larr; BACK
            </TechnicalButton>
          ) : (
            <button
              onClick={() => router.push('/household')}
              className="font-mono text-sm text-slate-500 hover:text-slate-700"
            >
              &larr; Cancel
            </button>
          )}

          {step === 'review' ? (
            <TechnicalButton
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'CREATING...' : 'CREATE HOUSEHOLD MANUAL'}
            </TechnicalButton>
          ) : (
            <TechnicalButton
              variant="primary"
              onClick={goNext}
              disabled={!canProceed()}
            >
              CONTINUE &rarr;
            </TechnicalButton>
          )}
        </div>
      </main>
    </div>
  );
}
