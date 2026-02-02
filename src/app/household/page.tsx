'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useHouseholdManual, useHouseholdJourney } from '@/hooks/useHouseholdManual';
import { usePerson } from '@/hooks/usePerson';
import {
  TechnicalCard,
  TechnicalButton,
  SectionHeader,
  TechnicalLabel,
  ProgressBar,
} from '@/components/technical';
import {
  HouseholdManualHeader,
  LayerSection,
} from '@/components/household';
import { HOUSEHOLD_LAYERS, LayerId, HouseholdTrigger, HouseholdStrategy, HouseholdBoundary, HouseholdMember, calculateAge } from '@/types/household-workbook';
import { Timestamp } from 'firebase/firestore';

// Modal types
type ModalType =
  | 'add-member'
  | 'edit-member'
  | 'add-trigger'
  | 'edit-trigger'
  | 'add-strategy'
  | 'edit-strategy'
  | 'add-boundary'
  | 'edit-boundary'
  | 'add-value'
  | 'edit-motto'
  | 'confirm-delete'
  | null;

interface ModalState {
  type: ModalType;
  data?: any;
}

export default function HouseholdManualPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    manual,
    loading: manualLoading,
    addMember,
    updateMember,
    deleteMember,
    addTrigger,
    updateTrigger,
    deleteTrigger,
    addStrategy,
    updateStrategy,
    deleteStrategy,
    addBoundary,
    updateBoundary,
    deleteBoundary,
    addFamilyValue,
    deleteFamilyValue,
    updateFamilyMotto,
    updateManual,
  } = useHouseholdManual(user?.familyId);
  const { journey, loading: journeyLoading } = useHouseholdJourney(user?.familyId);
  const { people: existingPeople } = usePerson();
  const [expandedLayers, setExpandedLayers] = useState<Set<LayerId>>(new Set([1]));
  const [modal, setModal] = useState<ModalState>({ type: null });

  // Form states
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || manualLoading || journeyLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm text-slate-500 uppercase tracking-wider">
            Loading household manual...
          </p>
        </div>
      </div>
    );
  }

  // No manual yet - show creation screen
  if (!manual) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <TechnicalCard cornerBrackets shadowSize="lg" className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-slate-800 border-2 border-amber-600 flex items-center justify-center">
              <span className="font-mono font-bold text-3xl text-white">HQ</span>
            </div>

            <h1 className="font-mono font-bold text-2xl text-slate-800 mb-4">
              CREATE YOUR HOUSEHOLD MANUAL
            </h1>

            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              The Household Operating Manual is your family&apos;s shared reference for how you
              work together as a unit.
            </p>

            <TechnicalButton
              variant="primary"
              size="lg"
              onClick={() => router.push('/household/onboard')}
            >
              START ONBOARDING
            </TechnicalButton>
          </TechnicalCard>
        </div>
      </div>
    );
  }

  // Modal handlers
  const openModal = (type: ModalType, data?: any) => {
    setModal({ type, data });
    // Convert Timestamp to ISO date string for form input
    if (data?.dateOfBirth && typeof data.dateOfBirth.toDate === 'function') {
      const dateStr = data.dateOfBirth.toDate().toISOString().split('T')[0];
      setFormData({ ...data, dateOfBirth: dateStr });
    } else {
      setFormData(data || {});
    }
  };

  const closeModal = () => {
    setModal({ type: null });
    setFormData({});
  };

  // Member handlers
  const handleAddMember = async () => {
    if (!formData.name) return;
    const member: HouseholdMember = {
      personId: formData.existingPersonId || `member-${Date.now()}`,
      name: formData.name,
      role: formData.role || 'other',
    };
    if (formData.dateOfBirth) {
      member.dateOfBirth = Timestamp.fromDate(new Date(formData.dateOfBirth));
    }
    await addMember(member);
    closeModal();
  };

  const handleUpdateMember = async () => {
    if (!modal.data?.personId) return;
    const updates: Partial<HouseholdMember> = {
      name: formData.name,
      role: formData.role,
    };
    if (formData.dateOfBirth) {
      updates.dateOfBirth = Timestamp.fromDate(new Date(formData.dateOfBirth));
    } else if (formData.dateOfBirth === '') {
      // Allow clearing the date
      updates.dateOfBirth = undefined;
    }
    await updateMember(modal.data.personId, updates);
    closeModal();
  };

  const handleDeleteMember = async () => {
    if (!modal.data?.personId) return;
    await deleteMember(modal.data.personId);
    closeModal();
  };

  // Trigger handlers
  const handleAddTrigger = async () => {
    if (!formData.description) return;
    const now = Timestamp.now();
    const trigger: HouseholdTrigger = {
      triggerId: `trigger-${Date.now()}`,
      description: formData.description,
      layerId: formData.layerId || 1,
      severity: formData.severity || 'medium',
      source: 'user',
      createdAt: now,
      updatedAt: now,
    };
    await addTrigger(trigger);
    closeModal();
  };

  const handleUpdateTrigger = async () => {
    if (!modal.data?.triggerId) return;
    await updateTrigger(modal.data.triggerId, {
      description: formData.description,
      layerId: formData.layerId,
      severity: formData.severity,
      updatedAt: Timestamp.now(),
    });
    closeModal();
  };

  const handleDeleteTrigger = async () => {
    if (!modal.data?.triggerId) return;
    await deleteTrigger(modal.data.triggerId);
    closeModal();
  };

  // Strategy handlers
  const handleAddStrategy = async () => {
    if (!formData.description) return;
    const now = Timestamp.now();
    const strategy: HouseholdStrategy = {
      strategyId: `strategy-${Date.now()}`,
      description: formData.description,
      layerId: formData.layerId || 1,
      effectiveness: formData.effectiveness || 3,
      source: 'user',
      createdAt: now,
      updatedAt: now,
    };
    await addStrategy(strategy);
    closeModal();
  };

  const handleUpdateStrategy = async () => {
    if (!modal.data?.strategyId) return;
    await updateStrategy(modal.data.strategyId, {
      description: formData.description,
      layerId: formData.layerId,
      effectiveness: formData.effectiveness,
      updatedAt: Timestamp.now(),
    });
    closeModal();
  };

  const handleDeleteStrategy = async () => {
    if (!modal.data?.strategyId) return;
    await deleteStrategy(modal.data.strategyId);
    closeModal();
  };

  // Boundary handlers
  const handleAddBoundary = async () => {
    if (!formData.description) return;
    const now = Timestamp.now();
    const boundary: HouseholdBoundary = {
      boundaryId: `boundary-${Date.now()}`,
      description: formData.description,
      layerId: formData.layerId || 3,
      category: formData.category || 'negotiable',
      source: 'user',
      createdAt: now,
      updatedAt: now,
    };
    await addBoundary(boundary);
    closeModal();
  };

  const handleUpdateBoundary = async () => {
    if (!modal.data?.boundaryId) return;
    await updateBoundary(modal.data.boundaryId, {
      description: formData.description,
      layerId: formData.layerId,
      category: formData.category,
      updatedAt: Timestamp.now(),
    });
    closeModal();
  };

  const handleDeleteBoundary = async () => {
    if (!modal.data?.boundaryId) return;
    await deleteBoundary(modal.data.boundaryId);
    closeModal();
  };

  // Family value handlers
  const handleAddValue = async () => {
    if (!formData.value) return;
    await addFamilyValue(formData.value);
    closeModal();
  };

  const handleDeleteValue = async () => {
    if (!modal.data?.value) return;
    await deleteFamilyValue(modal.data.value);
    closeModal();
  };

  const handleUpdateMotto = async () => {
    await updateFamilyMotto(formData.motto || '');
    closeModal();
  };

  // Get layer content grouped
  const getLayerContent = (layerId: LayerId) => ({
    triggers: manual.triggers.filter((t) => t.layerId === layerId),
    strategies: manual.strategies.filter((s) => s.layerId === layerId),
    boundaries: manual.boundaries.filter((b) => b.layerId === layerId),
  });

  const toggleLayer = (layerId: LayerId) => {
    const newExpanded = new Set(expandedLayers);
    if (newExpanded.has(layerId)) {
      newExpanded.delete(layerId);
    } else {
      newExpanded.add(layerId);
    }
    setExpandedLayers(newExpanded);
  };

  // Filter existing people not already in household
  const availablePeople = existingPeople.filter(
    (p) => !manual.members.some((m) => m.personId === p.personId)
  );

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Header with journey status */}
        <HouseholdManualHeader
          householdName={manual.householdName}
          currentDay={journey?.currentDay || 0}
          totalDays={90}
          currentMilestone={
            journey?.milestones.day30.status === 'active'
              ? {
                  target: 'day30',
                  description: journey.milestones.day30.description,
                  daysRemaining: 30 - (journey?.currentDay || 0),
                }
              : journey?.milestones.day60.status === 'active'
              ? {
                  target: 'day60',
                  description: journey.milestones.day60.description,
                  daysRemaining: 60 - (journey?.currentDay || 0),
                }
              : journey?.milestones.day90.status === 'active'
              ? {
                  target: 'day90',
                  description: journey.milestones.day90.description,
                  daysRemaining: 90 - (journey?.currentDay || 0),
                }
              : undefined
          }
          onOpenWorkbook={() => router.push('/household/workbook')}
        />

        {/* Completeness overview */}
        <TechnicalCard shadowSize="sm" className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600">
              MANUAL COMPLETENESS
            </h3>
            <span className="font-mono text-sm font-bold text-slate-800">
              {manual.completeness.overall}%
            </span>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {([1, 2, 3, 4, 5, 6] as LayerId[]).map((layerId) => (
              <div key={layerId} className="text-center">
                <div
                  className={`
                    h-2 mb-1
                    ${manual.completeness[`layer${layerId}` as keyof typeof manual.completeness] > 0 ? 'bg-green-500' : 'bg-slate-200'}
                  `}
                />
                <span className="font-mono text-[10px] text-slate-500">
                  L{layerId}
                </span>
              </div>
            ))}
          </div>
        </TechnicalCard>

        {/* Members Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionHeader
              number={1}
              title="HOUSEHOLD MEMBERS"
              subtitle={`${manual.members.length} member${manual.members.length !== 1 ? 's' : ''}`}
              cornerBrackets={false}
            />
            <TechnicalButton
              variant="outline"
              size="sm"
              onClick={() => openModal('add-member')}
            >
              + ADD MEMBER
            </TechnicalButton>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {manual.members.map((member) => (
              <TechnicalCard key={member.personId} shadowSize="sm" className="p-4">
                <div className="flex items-start justify-between">
                  <Link
                    href={`/people/${member.personId}/manual`}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-1 min-w-0"
                  >
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-mono text-sm font-bold text-slate-600 flex-shrink-0">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-slate-800 truncate">
                        {member.name}
                        {member.dateOfBirth && (
                          <span className="font-normal text-slate-500 ml-1">
                            ({calculateAge(member.dateOfBirth)}y)
                          </span>
                        )}
                      </div>
                      <TechnicalLabel
                        variant="subtle"
                        color={member.role === 'parent' ? 'blue' : member.role === 'child' ? 'amber' : 'slate'}
                        size="xs"
                      >
                        {member.role.toUpperCase()}
                      </TechnicalLabel>
                    </div>
                  </Link>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal('edit-member', member);
                      }}
                      className="font-mono text-[10px] text-slate-400 hover:text-slate-600"
                    >
                      [EDIT]
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal('confirm-delete', { type: 'member', ...member });
                      }}
                      className="font-mono text-[10px] text-red-400 hover:text-red-600"
                    >
                      [X]
                    </button>
                  </div>
                </div>
              </TechnicalCard>
            ))}

            {manual.members.length === 0 && (
              <TechnicalCard shadowSize="sm" className="p-6 col-span-full text-center">
                <p className="font-mono text-sm text-slate-400">No members added yet</p>
              </TechnicalCard>
            )}
          </div>
        </section>

        {/* Layer sections */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionHeader
              number={2}
              title="WHAT WE'VE LEARNED"
              subtitle="Organized by the 6-layer framework"
              cornerBrackets={false}
            />
            <div className="flex gap-2">
              <TechnicalButton
                variant="outline"
                size="sm"
                onClick={() => openModal('add-trigger')}
              >
                + TRIGGER
              </TechnicalButton>
              <TechnicalButton
                variant="outline"
                size="sm"
                onClick={() => openModal('add-strategy')}
              >
                + STRATEGY
              </TechnicalButton>
              <TechnicalButton
                variant="outline"
                size="sm"
                onClick={() => openModal('add-boundary')}
              >
                + BOUNDARY
              </TechnicalButton>
            </div>
          </div>

          <div className="space-y-3">
            {([1, 2, 3, 4, 5, 6] as LayerId[]).map((layerId) => {
              const content = getLayerContent(layerId);
              return (
                <TechnicalCard
                  key={layerId}
                  shadowSize="sm"
                  className={`${expandedLayers.has(layerId) ? '' : 'cursor-pointer hover:bg-slate-50'}`}
                >
                  {/* Layer header */}
                  <div
                    className="p-4 flex items-center justify-between"
                    onClick={() => toggleLayer(layerId)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <span className="font-mono text-xs font-bold text-white">
                          {String(layerId).padStart(2, '0')}
                        </span>
                      </div>
                      <div>
                        <div className="font-mono font-bold text-slate-800">
                          {HOUSEHOLD_LAYERS[layerId].friendly}
                        </div>
                        <div className="font-mono text-xs text-slate-500">
                          {content.triggers.length} triggers · {content.strategies.length} strategies · {content.boundaries.length} boundaries
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-slate-400">
                      {expandedLayers.has(layerId) ? '▼' : '▶'}
                    </span>
                  </div>

                  {/* Expanded content */}
                  {expandedLayers.has(layerId) && (
                    <div className="px-4 pb-4 space-y-4 border-t border-slate-200 pt-4">
                      {/* Triggers */}
                      {content.triggers.length > 0 && (
                        <div>
                          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-red-600 mb-2">
                            TRIGGERS
                          </h4>
                          <div className="space-y-2">
                            {content.triggers.map((trigger) => (
                              <div
                                key={trigger.triggerId}
                                className="p-3 bg-red-50 border border-red-200 flex items-start justify-between"
                              >
                                <div>
                                  <p className="text-sm text-slate-700">{trigger.description}</p>
                                  <div className="flex gap-2 mt-1">
                                    <TechnicalLabel variant="subtle" color="red" size="xs">
                                      {trigger.severity.toUpperCase()}
                                    </TechnicalLabel>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => openModal('edit-trigger', trigger)}
                                    className="font-mono text-[10px] text-slate-400 hover:text-slate-600"
                                  >
                                    [EDIT]
                                  </button>
                                  <button
                                    onClick={() => openModal('confirm-delete', { type: 'trigger', ...trigger })}
                                    className="font-mono text-[10px] text-red-400 hover:text-red-600"
                                  >
                                    [X]
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Strategies */}
                      {content.strategies.length > 0 && (
                        <div>
                          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-green-600 mb-2">
                            STRATEGIES
                          </h4>
                          <div className="space-y-2">
                            {content.strategies.map((strategy) => (
                              <div
                                key={strategy.strategyId}
                                className="p-3 bg-green-50 border border-green-200 flex items-start justify-between"
                              >
                                <div>
                                  <p className="text-sm text-slate-700">{strategy.description}</p>
                                  <TechnicalLabel variant="subtle" color="green" size="xs" className="mt-1">
                                    EFFECTIVENESS: {strategy.effectiveness}/5
                                  </TechnicalLabel>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => openModal('edit-strategy', strategy)}
                                    className="font-mono text-[10px] text-slate-400 hover:text-slate-600"
                                  >
                                    [EDIT]
                                  </button>
                                  <button
                                    onClick={() => openModal('confirm-delete', { type: 'strategy', ...strategy })}
                                    className="font-mono text-[10px] text-red-400 hover:text-red-600"
                                  >
                                    [X]
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Boundaries */}
                      {content.boundaries.length > 0 && (
                        <div>
                          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">
                            BOUNDARIES
                          </h4>
                          <div className="space-y-2">
                            {content.boundaries.map((boundary) => (
                              <div
                                key={boundary.boundaryId}
                                className="p-3 bg-blue-50 border border-blue-200 flex items-start justify-between"
                              >
                                <div>
                                  <p className="text-sm text-slate-700">{boundary.description}</p>
                                  <TechnicalLabel variant="subtle" color="blue" size="xs" className="mt-1">
                                    {boundary.category}
                                  </TechnicalLabel>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => openModal('edit-boundary', boundary)}
                                    className="font-mono text-[10px] text-slate-400 hover:text-slate-600"
                                  >
                                    [EDIT]
                                  </button>
                                  <button
                                    onClick={() => openModal('confirm-delete', { type: 'boundary', ...boundary })}
                                    className="font-mono text-[10px] text-red-400 hover:text-red-600"
                                  >
                                    [X]
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {content.triggers.length === 0 && content.strategies.length === 0 && content.boundaries.length === 0 && (
                        <p className="font-mono text-sm text-slate-400 text-center py-4">
                          No content in this layer yet
                        </p>
                      )}
                    </div>
                  )}
                </TechnicalCard>
              );
            })}
          </div>
        </section>

        {/* Family values section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionHeader
              number={3}
              title="OUR FAMILY VALUES"
              subtitle="What we stand for"
              cornerBrackets={false}
            />
            <TechnicalButton
              variant="outline"
              size="sm"
              onClick={() => openModal('add-value')}
            >
              + ADD VALUE
            </TechnicalButton>
          </div>

          <TechnicalCard badge={6} badgeColor="amber" shadowSize="md" className="p-6">
            {/* Family Motto */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600">
                  FAMILY MOTTO
                </span>
                <button
                  onClick={() => openModal('edit-motto', { motto: manual.familyMotto })}
                  className="font-mono text-xs text-slate-400 hover:text-slate-600"
                >
                  [EDIT]
                </button>
              </div>
              {manual.familyMotto ? (
                <blockquote className="pl-4 border-l-4 border-amber-500 italic text-slate-600">
                  &quot;{manual.familyMotto}&quot;
                </blockquote>
              ) : (
                <p className="font-mono text-sm text-slate-400">No motto set yet</p>
              )}
            </div>

            {/* Values */}
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
                VALUES
              </span>
              {manual.familyValues.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {manual.familyValues.map((value, index) => (
                    <div key={index} className="group flex items-center">
                      <TechnicalLabel variant="outline" color="amber" size="sm">
                        {value}
                      </TechnicalLabel>
                      <button
                        onClick={() => openModal('confirm-delete', { type: 'value', value })}
                        className="ml-1 font-mono text-[10px] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
                      >
                        [X]
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-mono text-sm text-slate-400">No values added yet</p>
              )}
            </div>
          </TechnicalCard>
        </section>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-4">
          <TechnicalButton
            variant="secondary"
            onClick={() => router.push('/household/workbook')}
          >
            VIEW WORKBOOK
          </TechnicalButton>
          <TechnicalButton
            variant="outline"
            onClick={() => router.push('/household/onboard')}
          >
            RE-RUN ONBOARDING
          </TechnicalButton>
        </div>
      </div>

      {/* Modals */}
      {modal.type && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <TechnicalCard shadowSize="lg" className="w-full max-w-md p-6 bg-white">
            {/* Add Member Modal */}
            {modal.type === 'add-member' && (
              <>
                <h3 className="font-mono font-bold text-lg text-slate-800 mb-4">
                  ADD HOUSEHOLD MEMBER
                </h3>

                {/* Select from existing */}
                {availablePeople.length > 0 && (
                  <div className="mb-4">
                    <label className="block font-mono text-xs text-slate-500 mb-2">
                      SELECT FROM EXISTING PEOPLE
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {availablePeople.map((person) => (
                        <button
                          key={person.personId}
                          onClick={() => {
                            setFormData({
                              existingPersonId: person.personId,
                              name: person.name,
                              role: person.relationshipType === 'child' ? 'child' :
                                    person.relationshipType === 'spouse' ? 'parent' : 'other',
                            });
                          }}
                          className={`w-full p-2 text-left border-2 ${
                            formData.existingPersonId === person.personId
                              ? 'border-slate-800 bg-slate-100'
                              : 'border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          <span className="font-mono text-sm">{person.name}</span>
                          {person.hasManual && (
                            <TechnicalLabel variant="subtle" color="green" size="xs" className="ml-2">
                              HAS MANUAL
                            </TechnicalLabel>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="text-center my-3">
                      <span className="font-mono text-xs text-slate-400">— OR —</span>
                    </div>
                  </div>
                )}

                {/* Manual entry */}
                <div className="space-y-3">
                  <div>
                    <label className="block font-mono text-xs text-slate-500 mb-1">NAME</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value, existingPersonId: undefined })}
                      className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800"
                      placeholder="Enter name..."
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-slate-500 mb-1">ROLE</label>
                    <div className="flex gap-2">
                      {(['parent', 'child', 'other'] as const).map((role) => (
                        <button
                          key={role}
                          onClick={() => setFormData({ ...formData, role })}
                          className={`flex-1 p-2 border-2 font-mono text-xs uppercase ${
                            formData.role === role
                              ? 'border-slate-800 bg-slate-800 text-white'
                              : 'border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-slate-500 mb-1">
                      DATE OF BIRTH <span className="text-slate-400">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth || ''}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800"
                    />
                    <p className="font-mono text-[10px] text-slate-400 mt-1">
                      Used for age-appropriate content and activities
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <TechnicalButton variant="primary" onClick={handleAddMember} disabled={!formData.name}>
                    ADD MEMBER
                  </TechnicalButton>
                  <TechnicalButton variant="outline" onClick={closeModal}>
                    CANCEL
                  </TechnicalButton>
                </div>
              </>
            )}

            {/* Edit Member Modal */}
            {modal.type === 'edit-member' && (
              <>
                <h3 className="font-mono font-bold text-lg text-slate-800 mb-4">
                  EDIT MEMBER
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block font-mono text-xs text-slate-500 mb-1">NAME</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-xs text-slate-500 mb-1">ROLE</label>
                    <div className="flex gap-2">
                      {(['parent', 'child', 'other'] as const).map((role) => (
                        <button
                          key={role}
                          onClick={() => setFormData({ ...formData, role })}
                          className={`flex-1 p-2 border-2 font-mono text-xs uppercase ${
                            formData.role === role
                              ? 'border-slate-800 bg-slate-800 text-white'
                              : 'border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block font-mono text-xs text-slate-500 mb-1">
                      DATE OF BIRTH <span className="text-slate-400">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth || ''}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800"
                    />
                    {formData.dateOfBirth && (
                      <p className="font-mono text-xs text-slate-500 mt-1">
                        Age: {calculateAge(new Date(formData.dateOfBirth))} years old
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <TechnicalButton variant="primary" onClick={handleUpdateMember}>
                    SAVE CHANGES
                  </TechnicalButton>
                  <TechnicalButton variant="outline" onClick={closeModal}>
                    CANCEL
                  </TechnicalButton>
                </div>
              </>
            )}

            {/* Add/Edit Trigger Modal */}
            {(modal.type === 'add-trigger' || modal.type === 'edit-trigger') && (
              <>
                <h3 className="font-mono font-bold text-lg text-slate-800 mb-4">
                  {modal.type === 'add-trigger' ? 'ADD TRIGGER' : 'EDIT TRIGGER'}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block font-mono text-xs text-slate-500 mb-1">DESCRIPTION</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800 resize-none"
                      rows={3}
                      placeholder="What triggers stress in your household?"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-xs text-slate-500 mb-1">LAYER</label>
                    <select
                      value={formData.layerId || 1}
                      onChange={(e) => setFormData({ ...formData, layerId: Number(e.target.value) })}
                      className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800"
                    >
                      {([1, 2, 3, 4, 5, 6] as LayerId[]).map((id) => (
                        <option key={id} value={id}>{HOUSEHOLD_LAYERS[id].friendly}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-mono text-xs text-slate-500 mb-1">SEVERITY</label>
                    <div className="flex gap-2">
                      {(['low', 'medium', 'high', 'critical'] as const).map((sev) => (
                        <button
                          key={sev}
                          onClick={() => setFormData({ ...formData, severity: sev })}
                          className={`flex-1 p-2 border-2 font-mono text-xs uppercase ${
                            formData.severity === sev
                              ? 'border-red-600 bg-red-600 text-white'
                              : 'border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <TechnicalButton
                    variant="primary"
                    onClick={modal.type === 'add-trigger' ? handleAddTrigger : handleUpdateTrigger}
                    disabled={!formData.description}
                  >
                    {modal.type === 'add-trigger' ? 'ADD TRIGGER' : 'SAVE CHANGES'}
                  </TechnicalButton>
                  <TechnicalButton variant="outline" onClick={closeModal}>
                    CANCEL
                  </TechnicalButton>
                </div>
              </>
            )}

            {/* Add/Edit Strategy Modal */}
            {(modal.type === 'add-strategy' || modal.type === 'edit-strategy') && (
              <>
                <h3 className="font-mono font-bold text-lg text-slate-800 mb-4">
                  {modal.type === 'add-strategy' ? 'ADD STRATEGY' : 'EDIT STRATEGY'}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block font-mono text-xs text-slate-500 mb-1">DESCRIPTION</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800 resize-none"
                      rows={3}
                      placeholder="What strategy works for your household?"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-xs text-slate-500 mb-1">LAYER</label>
                    <select
                      value={formData.layerId || 1}
                      onChange={(e) => setFormData({ ...formData, layerId: Number(e.target.value) })}
                      className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800"
                    >
                      {([1, 2, 3, 4, 5, 6] as LayerId[]).map((id) => (
                        <option key={id} value={id}>{HOUSEHOLD_LAYERS[id].friendly}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-mono text-xs text-slate-500 mb-1">EFFECTIVENESS (1-5)</label>
                    <div className="flex gap-2">
                      {([1, 2, 3, 4, 5] as const).map((eff) => (
                        <button
                          key={eff}
                          onClick={() => setFormData({ ...formData, effectiveness: eff })}
                          className={`flex-1 p-2 border-2 font-mono text-xs ${
                            formData.effectiveness === eff
                              ? 'border-green-600 bg-green-600 text-white'
                              : 'border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {eff}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <TechnicalButton
                    variant="primary"
                    onClick={modal.type === 'add-strategy' ? handleAddStrategy : handleUpdateStrategy}
                    disabled={!formData.description}
                  >
                    {modal.type === 'add-strategy' ? 'ADD STRATEGY' : 'SAVE CHANGES'}
                  </TechnicalButton>
                  <TechnicalButton variant="outline" onClick={closeModal}>
                    CANCEL
                  </TechnicalButton>
                </div>
              </>
            )}

            {/* Add/Edit Boundary Modal */}
            {(modal.type === 'add-boundary' || modal.type === 'edit-boundary') && (
              <>
                <h3 className="font-mono font-bold text-lg text-slate-800 mb-4">
                  {modal.type === 'add-boundary' ? 'ADD BOUNDARY' : 'EDIT BOUNDARY'}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block font-mono text-xs text-slate-500 mb-1">DESCRIPTION</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800 resize-none"
                      rows={3}
                      placeholder="What boundary does your household have?"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-xs text-slate-500 mb-1">LAYER</label>
                    <select
                      value={formData.layerId || 3}
                      onChange={(e) => setFormData({ ...formData, layerId: Number(e.target.value) })}
                      className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800"
                    >
                      {([1, 2, 3, 4, 5, 6] as LayerId[]).map((id) => (
                        <option key={id} value={id}>{HOUSEHOLD_LAYERS[id].friendly}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-mono text-xs text-slate-500 mb-1">CATEGORY</label>
                    <div className="flex gap-2">
                      {(['immovable', 'negotiable', 'preference'] as const).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setFormData({ ...formData, category: cat })}
                          className={`flex-1 p-2 border-2 font-mono text-xs uppercase ${
                            formData.category === cat
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <TechnicalButton
                    variant="primary"
                    onClick={modal.type === 'add-boundary' ? handleAddBoundary : handleUpdateBoundary}
                    disabled={!formData.description}
                  >
                    {modal.type === 'add-boundary' ? 'ADD BOUNDARY' : 'SAVE CHANGES'}
                  </TechnicalButton>
                  <TechnicalButton variant="outline" onClick={closeModal}>
                    CANCEL
                  </TechnicalButton>
                </div>
              </>
            )}

            {/* Add Value Modal */}
            {modal.type === 'add-value' && (
              <>
                <h3 className="font-mono font-bold text-lg text-slate-800 mb-4">
                  ADD FAMILY VALUE
                </h3>
                <div>
                  <label className="block font-mono text-xs text-slate-500 mb-1">VALUE</label>
                  <input
                    type="text"
                    value={formData.value || ''}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800"
                    placeholder="e.g., Honesty, Respect, Adventure..."
                  />
                </div>
                <div className="flex gap-2 mt-6">
                  <TechnicalButton variant="primary" onClick={handleAddValue} disabled={!formData.value}>
                    ADD VALUE
                  </TechnicalButton>
                  <TechnicalButton variant="outline" onClick={closeModal}>
                    CANCEL
                  </TechnicalButton>
                </div>
              </>
            )}

            {/* Edit Motto Modal */}
            {modal.type === 'edit-motto' && (
              <>
                <h3 className="font-mono font-bold text-lg text-slate-800 mb-4">
                  EDIT FAMILY MOTTO
                </h3>
                <div>
                  <label className="block font-mono text-xs text-slate-500 mb-1">MOTTO</label>
                  <input
                    type="text"
                    value={formData.motto || ''}
                    onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
                    className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800"
                    placeholder="e.g., Together we thrive..."
                  />
                </div>
                <div className="flex gap-2 mt-6">
                  <TechnicalButton variant="primary" onClick={handleUpdateMotto}>
                    SAVE MOTTO
                  </TechnicalButton>
                  <TechnicalButton variant="outline" onClick={closeModal}>
                    CANCEL
                  </TechnicalButton>
                </div>
              </>
            )}

            {/* Confirm Delete Modal */}
            {modal.type === 'confirm-delete' && (
              <>
                <h3 className="font-mono font-bold text-lg text-red-600 mb-4">
                  CONFIRM DELETE
                </h3>
                <p className="text-slate-600 mb-6">
                  Are you sure you want to delete this {modal.data?.type}? This action cannot be undone.
                </p>
                <div className="p-3 bg-slate-50 border border-slate-200 mb-6">
                  <p className="font-mono text-sm text-slate-800">
                    {modal.data?.name || modal.data?.description || modal.data?.value}
                  </p>
                </div>
                <div className="flex gap-2">
                  <TechnicalButton
                    variant="danger"
                    onClick={() => {
                      switch (modal.data?.type) {
                        case 'member':
                          handleDeleteMember();
                          break;
                        case 'trigger':
                          handleDeleteTrigger();
                          break;
                        case 'strategy':
                          handleDeleteStrategy();
                          break;
                        case 'boundary':
                          handleDeleteBoundary();
                          break;
                        case 'value':
                          handleDeleteValue();
                          break;
                      }
                    }}
                  >
                    DELETE
                  </TechnicalButton>
                  <TechnicalButton variant="outline" onClick={closeModal}>
                    CANCEL
                  </TechnicalButton>
                </div>
              </>
            )}
          </TechnicalCard>
        </div>
      )}
    </div>
  );
}
