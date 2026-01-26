'use client';

import React, { useState } from 'react';
import { TechnicalCard, TechnicalLabel, TechnicalButton } from '../technical';
import {
  HouseholdWeeklyFocus,
  FocusInstruction,
  LayerId,
  HOUSEHOLD_LAYERS,
  ChecklistDeliverable,
  LocationDeliverable,
  AssignmentDeliverable,
  NoteDeliverable,
  PersonChecklist,
  ChecklistItem,
  StepDeliverable,
} from '@/types/household-workbook';

interface WeeklyFocusCardProps {
  weeklyFocus: HouseholdWeeklyFocus;
  weekNumber: number;
  householdMembers?: { personId: string; personName: string }[];
  onInstructionComplete?: (instructionId: string) => void;
  onEditInstruction?: (instructionId: string, updates: Partial<FocusInstruction>) => void;
  onDeliverableUpdate?: (instructionId: string, deliverable: StepDeliverable) => void;
  onAddToManual?: (type: 'trigger' | 'strategy' | 'boundary', description: string) => void;
  onGenerateTasks?: () => void;
  onAskCoach?: () => void;
  className?: string;
}

// Day labels
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PHASE_LABELS = {
  setup: { label: 'SETUP', color: 'blue', description: 'Prepare and plan' },
  implement: { label: 'IMPLEMENT', color: 'amber', description: 'Put it in action' },
  practice: { label: 'PRACTICE', color: 'green', description: 'Build the habit' },
  refine: { label: 'REFINE', color: 'purple', description: 'Adjust and improve' },
};

// Default instructions for "Creating a Launch Pad" focus with temporal guidance and deliverables
const DEFAULT_LAUNCHPAD_INSTRUCTIONS: FocusInstruction[] = [
  {
    id: 'step-1',
    step: 1,
    title: 'Choose Your Launch Pad Location',
    description: 'Pick a spot near your exit door that everyone passes. This could be a table, bench, or wall-mounted organizer.',
    tips: [
      'Near the door works best - no backtracking',
      'Eye level for kids, accessible for adults',
      'Consider traffic flow - avoid bottlenecks',
    ],
    dayRange: { start: 1, end: 2 },
    phase: 'setup',
    deliverableType: 'location',
  },
  {
    id: 'step-2',
    step: 2,
    title: 'Set Up Key Categories',
    description: 'Create dedicated spots for: keys, bags/backpacks, shoes, and any daily essentials (lunch boxes, water bottles).',
    tips: [
      'Use hooks at different heights for different family members',
      'Label spots for younger children',
      'Keep a small tray for loose items like phones and wallets',
    ],
    dayRange: { start: 2, end: 3 },
    phase: 'implement',
    deliverableType: 'assignment',
  },
  {
    id: 'step-3',
    step: 3,
    title: 'Create a Visual Checklist',
    description: 'Make a simple checklist that lives at the launch pad. Include items each person needs before leaving.',
    tips: [
      'Use pictures for non-readers',
      'Laminate it so kids can check off with dry-erase',
      'Keep it simple: 5-7 items max',
    ],
    dayRange: { start: 3, end: 4 },
    phase: 'implement',
    deliverableType: 'checklist',
  },
  {
    id: 'step-4',
    step: 4,
    title: 'Practice the Routine',
    description: 'Walk through the launch pad routine with your family. Do it together for 3 days before expecting independence.',
    tips: [
      'Model it yourself first',
      'Praise effort, not perfection',
      'Adjust based on what you observe',
    ],
    dayRange: { start: 4, end: 6 },
    phase: 'practice',
    deliverableType: 'note',
  },
  {
    id: 'step-5',
    step: 5,
    title: 'Refine and Celebrate',
    description: 'After practicing, discuss what\'s working and what isn\'t. Make adjustments and celebrate your progress!',
    tips: [
      'Ask each family member for feedback',
      'Note what worked - add it to your manual!',
      'Small tweaks often make big differences',
    ],
    dayRange: { start: 6, end: 7 },
    phase: 'refine',
    deliverableType: 'note',
  },
];

// Default household members for demo
const DEFAULT_MEMBERS = [
  { personId: 'parent-1', personName: 'Parent' },
  { personId: 'child-1', personName: 'Child 1' },
  { personId: 'child-2', personName: 'Child 2' },
];

export function WeeklyFocusCard({
  weeklyFocus,
  weekNumber,
  householdMembers = DEFAULT_MEMBERS,
  onInstructionComplete,
  onEditInstruction,
  onDeliverableUpdate,
  onAddToManual,
  onGenerateTasks,
  onAskCoach,
  className = '',
}: WeeklyFocusCardProps) {
  const [expandedInstruction, setExpandedInstruction] = useState<string | null>(null);
  const [showAddToManual, setShowAddToManual] = useState(false);
  const [manualAddType, setManualAddType] = useState<'trigger' | 'strategy' | 'boundary'>('strategy');
  const [manualAddText, setManualAddText] = useState('');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [editingInstruction, setEditingInstruction] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [viewMode, setViewMode] = useState<'steps' | 'calendar'>('steps');

  // Deliverable builder state
  const [buildingDeliverable, setBuildingDeliverable] = useState<string | null>(null);
  const [deliverables, setDeliverables] = useState<Record<string, StepDeliverable>>({});

  // Checklist builder state
  const [checklistItems, setChecklistItems] = useState<Record<string, ChecklistItem[]>>({});
  const [newItemText, setNewItemText] = useState('');
  const [activeChecklistPerson, setActiveChecklistPerson] = useState<string | null>(null);

  // Location builder state
  const [locationName, setLocationName] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [locationSpot, setLocationSpot] = useState('');

  // Assignment builder state
  const [assignments, setAssignments] = useState<{ personId: string; personName: string; responsibility: string }[]>([]);
  const [assignmentText, setAssignmentText] = useState('');
  const [assignmentPerson, setAssignmentPerson] = useState('');

  // Note builder state
  const [noteContent, setNoteContent] = useState('');

  // Use provided instructions or fall back to defaults for launchpad
  const instructions = weeklyFocus.instructions ||
    (weeklyFocus.title.toLowerCase().includes('launch') ? DEFAULT_LAUNCHPAD_INSTRUCTIONS : []);

  const handleToggleStep = (instructionId: string) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(instructionId)) {
      newCompleted.delete(instructionId);
    } else {
      newCompleted.add(instructionId);
    }
    setCompletedSteps(newCompleted);
    onInstructionComplete?.(instructionId);
  };

  const handleAddToManual = () => {
    if (manualAddText.trim() && onAddToManual) {
      onAddToManual(manualAddType, manualAddText.trim());
      setManualAddText('');
      setShowAddToManual(false);
    }
  };

  const handleStartEdit = (instruction: FocusInstruction) => {
    setEditingInstruction(instruction.id);
    setEditedTitle(instruction.title);
    setEditedDescription(instruction.description);
  };

  const handleSaveEdit = (instructionId: string) => {
    if (onEditInstruction) {
      onEditInstruction(instructionId, {
        title: editedTitle,
        description: editedDescription,
        isUserEdited: true,
      });
    }
    setEditingInstruction(null);
  };

  // ============ DELIVERABLE HANDLERS ============

  const handleStartBuildingDeliverable = (instructionId: string, type: FocusInstruction['deliverableType']) => {
    setBuildingDeliverable(instructionId);
    // Reset builder state
    setChecklistItems({});
    setActiveChecklistPerson(householdMembers[0]?.personId || null);
    setLocationName('');
    setLocationDescription('');
    setLocationSpot('');
    setAssignments([]);
    setAssignmentText('');
    setAssignmentPerson(householdMembers[0]?.personId || '');
    setNoteContent('');

    // Pre-populate checklist with default items if checklist type
    if (type === 'checklist') {
      const defaultItems: Record<string, ChecklistItem[]> = {};
      householdMembers.forEach(member => {
        defaultItems[member.personId] = [
          { id: `${member.personId}-1`, text: 'Backpack/bag ready', isDefault: true },
          { id: `${member.personId}-2`, text: 'Shoes on', isDefault: true },
          { id: `${member.personId}-3`, text: 'Keys/phone/wallet', isDefault: true },
        ];
      });
      setChecklistItems(defaultItems);
    }
  };

  const handleAddChecklistItem = (personId: string) => {
    if (!newItemText.trim()) return;
    const newItem: ChecklistItem = {
      id: `${personId}-${Date.now()}`,
      text: newItemText.trim(),
      isDefault: false,
    };
    setChecklistItems(prev => ({
      ...prev,
      [personId]: [...(prev[personId] || []), newItem],
    }));
    setNewItemText('');
  };

  const handleRemoveChecklistItem = (personId: string, itemId: string) => {
    setChecklistItems(prev => ({
      ...prev,
      [personId]: (prev[personId] || []).filter(item => item.id !== itemId),
    }));
  };

  const handleAddAssignment = () => {
    if (!assignmentText.trim() || !assignmentPerson) return;
    const member = householdMembers.find(m => m.personId === assignmentPerson);
    if (!member) return;
    setAssignments(prev => [
      ...prev,
      { personId: member.personId, personName: member.personName, responsibility: assignmentText.trim() },
    ]);
    setAssignmentText('');
  };

  const handleRemoveAssignment = (index: number) => {
    setAssignments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveDeliverable = (instructionId: string, type: FocusInstruction['deliverableType']) => {
    let deliverable: StepDeliverable | null = null;

    if (type === 'checklist') {
      const checklists: PersonChecklist[] = householdMembers
        .filter(member => (checklistItems[member.personId] || []).length > 0)
        .map(member => ({
          personId: member.personId,
          personName: member.personName,
          title: `${member.personName}'s Morning Checklist`,
          items: checklistItems[member.personId] || [],
        }));

      if (checklists.length > 0) {
        deliverable = { type: 'checklist', checklists };
      }
    } else if (type === 'location') {
      if (locationName.trim() && locationSpot.trim()) {
        deliverable = {
          type: 'location',
          name: locationName.trim(),
          description: locationDescription.trim(),
          location: locationSpot.trim(),
        };
      }
    } else if (type === 'assignment') {
      if (assignments.length > 0) {
        deliverable = { type: 'assignment', assignments };
      }
    } else if (type === 'note') {
      if (noteContent.trim()) {
        deliverable = { type: 'note', content: noteContent.trim() };
      }
    }

    if (deliverable) {
      setDeliverables(prev => ({ ...prev, [instructionId]: deliverable! }));
      onDeliverableUpdate?.(instructionId, deliverable);
    }
    setBuildingDeliverable(null);
  };

  const completedCount = completedSteps.size;
  const totalSteps = instructions.length;
  const progressPercent = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

  // Get instructions for a specific day
  const getInstructionsForDay = (day: 1 | 2 | 3 | 4 | 5 | 6 | 7) => {
    return instructions.filter(inst => {
      if (!inst.dayRange) return false;
      return day >= inst.dayRange.start && day <= inst.dayRange.end;
    });
  };

  return (
    <TechnicalCard cornerBrackets shadowSize="md" className={`p-6 ${className}`}>
      {/* ===== HEADER SECTION ===== */}
      <div className="flex items-center justify-between mb-4">
        <TechnicalLabel variant="filled" color="amber" size="sm">
          WEEK {weekNumber} FOCUS
        </TechnicalLabel>
        <div className="flex gap-1">
          {weeklyFocus.layersFocused.map((layerId) => (
            <div
              key={layerId}
              className="w-6 h-6 bg-slate-800 flex items-center justify-center"
              title={HOUSEHOLD_LAYERS[layerId as LayerId]?.friendly}
            >
              <span className="font-mono text-[10px] font-bold text-white">
                L{layerId}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== TITLE & DESCRIPTION ===== */}
      <h2 className="font-mono font-bold text-xl text-slate-800 mb-2">
        {weeklyFocus.title}
      </h2>
      <p className="text-slate-600 mb-4">
        {weeklyFocus.description}
      </p>

      {/* Why it matters */}
      <div className="p-3 bg-amber-50 border-l-4 border-amber-500 mb-6">
        <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
          WHY THIS MATTERS
        </h4>
        <p className="text-sm text-slate-700">
          {weeklyFocus.whyItMatters}
        </p>
      </div>

      {/* ===== PROGRESS BAR ===== */}
      {totalSteps > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs text-slate-500">PROGRESS</span>
            <span className="font-mono text-xs font-bold text-slate-700">
              {completedCount} / {totalSteps} steps
            </span>
          </div>
          <div className="h-2 bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* ===== VIEW MODE TOGGLE ===== */}
      {instructions.length > 0 && (
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
          <h3 className="font-mono font-bold text-sm uppercase tracking-wider text-slate-800">
            HOW TO DO THIS
          </h3>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('steps')}
              className={`font-mono text-[10px] px-2 py-1 border ${
                viewMode === 'steps'
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              STEPS
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`font-mono text-[10px] px-2 py-1 border ${
                viewMode === 'calendar'
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              CALENDAR
            </button>
          </div>
        </div>
      )}

      {/* ===== CALENDAR VIEW ===== */}
      {viewMode === 'calendar' && instructions.length > 0 && (
        <div className="mb-6">
          {/* Week calendar grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {DAY_LABELS.map((day, idx) => (
              <div key={day} className="text-center">
                <div className="font-mono text-[10px] text-slate-500 mb-1">{day}</div>
                <div className={`
                  min-h-[80px] p-1 border text-left
                  ${idx < 5 ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'}
                `}>
                  {getInstructionsForDay((idx + 1) as 1|2|3|4|5|6|7).map(inst => {
                    const phase = inst.phase ? PHASE_LABELS[inst.phase] : null;
                    const isCompleted = completedSteps.has(inst.id);
                    return (
                      <div
                        key={inst.id}
                        className={`
                          text-[10px] p-1 mb-1 cursor-pointer
                          ${isCompleted ? 'bg-green-100 text-green-700 line-through' : ''}
                          ${!isCompleted && phase?.color === 'blue' ? 'bg-blue-100 text-blue-700' : ''}
                          ${!isCompleted && phase?.color === 'amber' ? 'bg-amber-100 text-amber-700' : ''}
                          ${!isCompleted && phase?.color === 'green' ? 'bg-green-100 text-green-700' : ''}
                          ${!isCompleted && phase?.color === 'purple' ? 'bg-purple-100 text-purple-700' : ''}
                        `}
                        onClick={() => handleToggleStep(inst.id)}
                        title={inst.description}
                      >
                        {inst.step}. {inst.title.split(' ').slice(0, 2).join(' ')}...
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Phase legend */}
          <div className="flex flex-wrap gap-3 text-[10px]">
            {Object.entries(PHASE_LABELS).map(([key, value]) => (
              <div key={key} className="flex items-center gap-1">
                <div className={`w-3 h-3 bg-${value.color}-200`} />
                <span className="font-mono text-slate-600">{value.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== STEP-BY-STEP INSTRUCTIONS ===== */}
      {viewMode === 'steps' && instructions.length > 0 && (
        <div className="mb-6">
          <div className="space-y-2">
            {instructions.map((instruction) => {
              const isExpanded = expandedInstruction === instruction.id;
              const isCompleted = completedSteps.has(instruction.id);
              const isEditing = editingInstruction === instruction.id;
              const phase = instruction.phase ? PHASE_LABELS[instruction.phase] : null;

              return (
                <div
                  key={instruction.id}
                  className={`border-2 ${isCompleted ? 'border-green-300 bg-green-50' : 'border-slate-200'}`}
                >
                  {/* Step header - always visible */}
                  <button
                    onClick={() => setExpandedInstruction(isExpanded ? null : instruction.id)}
                    className="w-full p-3 text-left flex items-start gap-3"
                  >
                    {/* Step number / checkbox */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStep(instruction.id);
                      }}
                      className={`
                        w-8 h-8 flex items-center justify-center flex-shrink-0 cursor-pointer
                        ${isCompleted
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-800 text-white hover:bg-slate-700'
                        }
                      `}
                    >
                      {isCompleted ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="font-mono text-xs font-bold">{instruction.step}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-mono font-bold ${isCompleted ? 'text-green-700' : 'text-slate-800'}`}>
                          {instruction.title}
                        </span>
                        {/* Day badge */}
                        {instruction.dayRange && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500">
                            {instruction.dayRange.start === instruction.dayRange.end
                              ? `Day ${instruction.dayRange.start}`
                              : `Days ${instruction.dayRange.start}-${instruction.dayRange.end}`}
                          </span>
                        )}
                        {/* Phase badge */}
                        {phase && (
                          <span className={`font-mono text-[10px] px-1.5 py-0.5 bg-${phase.color}-100 text-${phase.color}-700`}>
                            {phase.label}
                          </span>
                        )}
                        {instruction.isUserEdited && (
                          <span className="font-mono text-[10px] text-slate-400">(edited)</span>
                        )}
                      </div>
                      {!isExpanded && (
                        <p className={`text-sm truncate ${isCompleted ? 'text-green-600' : 'text-slate-500'}`}>
                          {instruction.description}
                        </p>
                      )}
                    </div>

                    <span className="font-mono text-xs text-slate-400">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pl-14">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block font-mono text-xs text-slate-500 mb-1">TITLE</label>
                            <input
                              type="text"
                              value={editedTitle}
                              onChange={(e) => setEditedTitle(e.target.value)}
                              className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block font-mono text-xs text-slate-500 mb-1">DESCRIPTION</label>
                            <textarea
                              value={editedDescription}
                              onChange={(e) => setEditedDescription(e.target.value)}
                              className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800 resize-none"
                              rows={3}
                            />
                          </div>
                          <div className="flex gap-2">
                            <TechnicalButton
                              variant="primary"
                              size="sm"
                              onClick={() => handleSaveEdit(instruction.id)}
                            >
                              SAVE
                            </TechnicalButton>
                            <TechnicalButton
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingInstruction(null)}
                            >
                              CANCEL
                            </TechnicalButton>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-slate-600 mb-3">
                            {instruction.description}
                          </p>

                          {instruction.tips && instruction.tips.length > 0 && (
                            <div className="p-3 bg-blue-50 border border-blue-200 mb-3">
                              <h5 className="font-mono text-xs font-bold uppercase text-blue-700 mb-2">
                                TIPS
                              </h5>
                              <ul className="space-y-1">
                                {instruction.tips.map((tip, idx) => (
                                  <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                                    <span className="text-blue-500">•</span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggleStep(instruction.id)}
                              className={`
                                font-mono text-xs uppercase px-3 py-1 border-2 transition-colors
                                ${isCompleted
                                  ? 'border-green-600 text-green-600 hover:bg-green-50'
                                  : 'border-slate-400 text-slate-600 hover:bg-slate-100'
                                }
                              `}
                            >
                              {isCompleted ? 'MARK INCOMPLETE' : 'MARK COMPLETE'}
                            </button>
                            {onEditInstruction && (
                              <button
                                onClick={() => handleStartEdit(instruction)}
                                className="font-mono text-[10px] text-slate-400 hover:text-slate-600"
                              >
                                [EDIT]
                              </button>
                            )}
                          </div>

                          {/* ===== DELIVERABLE SECTION ===== */}
                          {instruction.deliverableType && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                              {/* Show existing deliverable */}
                              {deliverables[instruction.id] && buildingDeliverable !== instruction.id ? (
                                <div className="p-3 bg-green-50 border border-green-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-mono text-xs font-bold text-green-700 uppercase">
                                      {instruction.deliverableType === 'checklist' && 'CHECKLIST CREATED'}
                                      {instruction.deliverableType === 'location' && 'LOCATION SET'}
                                      {instruction.deliverableType === 'assignment' && 'ASSIGNMENTS SET'}
                                      {instruction.deliverableType === 'note' && 'NOTE SAVED'}
                                    </span>
                                    <button
                                      onClick={() => handleStartBuildingDeliverable(instruction.id, instruction.deliverableType)}
                                      className="font-mono text-[10px] text-green-600 hover:text-green-800"
                                    >
                                      [EDIT]
                                    </button>
                                  </div>

                                  {/* Display deliverable content */}
                                  {deliverables[instruction.id].type === 'checklist' && (
                                    <div className="space-y-2">
                                      {(deliverables[instruction.id] as ChecklistDeliverable).checklists.map(list => (
                                        <div key={list.personId}>
                                          <span className="font-mono text-xs text-green-600">{list.personName}:</span>
                                          <span className="text-sm text-green-700 ml-1">
                                            {list.items.length} items
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {deliverables[instruction.id].type === 'location' && (
                                    <div className="text-sm text-green-700">
                                      <strong>{(deliverables[instruction.id] as LocationDeliverable).name}</strong>
                                      {' - '}
                                      {(deliverables[instruction.id] as LocationDeliverable).location}
                                    </div>
                                  )}

                                  {deliverables[instruction.id].type === 'assignment' && (
                                    <div className="space-y-1">
                                      {(deliverables[instruction.id] as AssignmentDeliverable).assignments.map((a, i) => (
                                        <div key={i} className="text-sm text-green-700">
                                          <strong>{a.personName}:</strong> {a.responsibility}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {deliverables[instruction.id].type === 'note' && (
                                    <p className="text-sm text-green-700 italic">
                                      {(deliverables[instruction.id] as NoteDeliverable).content}
                                    </p>
                                  )}
                                </div>
                              ) : buildingDeliverable === instruction.id ? (
                                /* ===== DELIVERABLE BUILDERS ===== */
                                <div className="p-3 bg-amber-50 border-2 border-amber-200">
                                  <h5 className="font-mono text-xs font-bold text-amber-800 uppercase mb-3">
                                    {instruction.deliverableType === 'checklist' && 'BUILD YOUR CHECKLIST'}
                                    {instruction.deliverableType === 'location' && 'SET YOUR LOCATION'}
                                    {instruction.deliverableType === 'assignment' && 'ASSIGN RESPONSIBILITIES'}
                                    {instruction.deliverableType === 'note' && 'CAPTURE YOUR NOTES'}
                                  </h5>

                                  {/* CHECKLIST BUILDER */}
                                  {instruction.deliverableType === 'checklist' && (
                                    <div className="space-y-4">
                                      {/* Person tabs */}
                                      <div className="flex flex-wrap gap-1">
                                        {householdMembers.map(member => (
                                          <button
                                            key={member.personId}
                                            onClick={() => setActiveChecklistPerson(member.personId)}
                                            className={`font-mono text-xs px-2 py-1 border ${
                                              activeChecklistPerson === member.personId
                                                ? 'border-amber-600 bg-amber-600 text-white'
                                                : 'border-amber-300 hover:border-amber-400'
                                            }`}
                                          >
                                            {member.personName}
                                          </button>
                                        ))}
                                      </div>

                                      {/* Items for active person */}
                                      {activeChecklistPerson && (
                                        <div>
                                          <div className="space-y-1 mb-3">
                                            {(checklistItems[activeChecklistPerson] || []).map(item => (
                                              <div key={item.id} className="flex items-center gap-2 p-2 bg-white border border-amber-200">
                                                <span className="flex-1 text-sm">{item.text}</span>
                                                {item.isDefault && (
                                                  <span className="font-mono text-[10px] text-amber-500">(suggested)</span>
                                                )}
                                                <button
                                                  onClick={() => handleRemoveChecklistItem(activeChecklistPerson, item.id)}
                                                  className="text-red-400 hover:text-red-600 text-xs"
                                                >
                                                  ✕
                                                </button>
                                              </div>
                                            ))}
                                          </div>

                                          <div className="flex gap-2">
                                            <input
                                              type="text"
                                              value={newItemText}
                                              onChange={(e) => setNewItemText(e.target.value)}
                                              onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem(activeChecklistPerson)}
                                              placeholder="Add checklist item..."
                                              className="flex-1 p-2 border border-amber-300 text-sm focus:outline-none focus:border-amber-500"
                                            />
                                            <button
                                              onClick={() => handleAddChecklistItem(activeChecklistPerson)}
                                              className="px-3 py-2 bg-amber-600 text-white font-mono text-xs"
                                            >
                                              ADD
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* LOCATION BUILDER */}
                                  {instruction.deliverableType === 'location' && (
                                    <div className="space-y-3">
                                      <div>
                                        <label className="block font-mono text-xs text-amber-700 mb-1">NAME</label>
                                        <input
                                          type="text"
                                          value={locationName}
                                          onChange={(e) => setLocationName(e.target.value)}
                                          placeholder="e.g., Family Launch Pad"
                                          className="w-full p-2 border border-amber-300 text-sm focus:outline-none focus:border-amber-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block font-mono text-xs text-amber-700 mb-1">WHERE IS IT?</label>
                                        <input
                                          type="text"
                                          value={locationSpot}
                                          onChange={(e) => setLocationSpot(e.target.value)}
                                          placeholder="e.g., Mudroom bench by the garage door"
                                          className="w-full p-2 border border-amber-300 text-sm focus:outline-none focus:border-amber-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block font-mono text-xs text-amber-700 mb-1">DESCRIPTION (optional)</label>
                                        <textarea
                                          value={locationDescription}
                                          onChange={(e) => setLocationDescription(e.target.value)}
                                          placeholder="Any notes about this location..."
                                          className="w-full p-2 border border-amber-300 text-sm focus:outline-none focus:border-amber-500 resize-none"
                                          rows={2}
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* ASSIGNMENT BUILDER */}
                                  {instruction.deliverableType === 'assignment' && (
                                    <div className="space-y-3">
                                      {assignments.length > 0 && (
                                        <div className="space-y-1">
                                          {assignments.map((a, i) => (
                                            <div key={i} className="flex items-center gap-2 p-2 bg-white border border-amber-200">
                                              <span className="font-mono text-xs font-bold">{a.personName}:</span>
                                              <span className="flex-1 text-sm">{a.responsibility}</span>
                                              <button
                                                onClick={() => handleRemoveAssignment(i)}
                                                className="text-red-400 hover:text-red-600 text-xs"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      <div className="flex gap-2">
                                        <select
                                          value={assignmentPerson}
                                          onChange={(e) => setAssignmentPerson(e.target.value)}
                                          className="p-2 border border-amber-300 text-sm focus:outline-none focus:border-amber-500"
                                        >
                                          {householdMembers.map(member => (
                                            <option key={member.personId} value={member.personId}>
                                              {member.personName}
                                            </option>
                                          ))}
                                        </select>
                                        <input
                                          type="text"
                                          value={assignmentText}
                                          onChange={(e) => setAssignmentText(e.target.value)}
                                          onKeyDown={(e) => e.key === 'Enter' && handleAddAssignment()}
                                          placeholder="Responsibility..."
                                          className="flex-1 p-2 border border-amber-300 text-sm focus:outline-none focus:border-amber-500"
                                        />
                                        <button
                                          onClick={handleAddAssignment}
                                          className="px-3 py-2 bg-amber-600 text-white font-mono text-xs"
                                        >
                                          ADD
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* NOTE BUILDER */}
                                  {instruction.deliverableType === 'note' && (
                                    <div>
                                      <textarea
                                        value={noteContent}
                                        onChange={(e) => setNoteContent(e.target.value)}
                                        placeholder="What observations or notes do you want to capture?"
                                        className="w-full p-2 border border-amber-300 text-sm focus:outline-none focus:border-amber-500 resize-none"
                                        rows={4}
                                      />
                                    </div>
                                  )}

                                  {/* Save/Cancel buttons */}
                                  <div className="flex gap-2 mt-4">
                                    <button
                                      onClick={() => handleSaveDeliverable(instruction.id, instruction.deliverableType)}
                                      className="px-4 py-2 bg-green-600 text-white font-mono text-xs"
                                    >
                                      SAVE
                                    </button>
                                    <button
                                      onClick={() => setBuildingDeliverable(null)}
                                      className="px-4 py-2 border border-amber-400 text-amber-700 font-mono text-xs"
                                    >
                                      CANCEL
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* Show button to start building */
                                <button
                                  onClick={() => handleStartBuildingDeliverable(instruction.id, instruction.deliverableType)}
                                  className="w-full p-3 border-2 border-dashed border-amber-400 text-amber-700 hover:bg-amber-50 transition-colors"
                                >
                                  <span className="font-mono text-xs uppercase">
                                    {instruction.deliverableType === 'checklist' && '+ CREATE YOUR CHECKLIST'}
                                    {instruction.deliverableType === 'location' && '+ SET YOUR LAUNCH PAD LOCATION'}
                                    {instruction.deliverableType === 'assignment' && '+ ASSIGN RESPONSIBILITIES'}
                                    {instruction.deliverableType === 'note' && '+ ADD YOUR NOTES'}
                                  </span>
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== COMPLETION MESSAGE ===== */}
      {completedCount === totalSteps && totalSteps > 0 && (
        <div className="mb-6 p-4 bg-green-100 border-2 border-green-300 text-center">
          <div className="font-mono font-bold text-green-800 mb-1">
            ALL STEPS COMPLETED!
          </div>
          <p className="text-sm text-green-700 mb-3">
            Great work! Now save what you learned to your household manual.
          </p>
          {onAddToManual && (
            <TechnicalButton
              variant="primary"
              size="sm"
              onClick={() => setShowAddToManual(true)}
            >
              ADD LEARNINGS TO MANUAL
            </TechnicalButton>
          )}
        </div>
      )}

      {/* ===== ADD TO MANUAL FORM ===== */}
      {showAddToManual && (
        <div className="mb-6 p-4 bg-slate-50 border-2 border-slate-200">
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
            SAVE TO HOUSEHOLD MANUAL
          </h4>
          <p className="text-sm text-slate-500 mb-3">
            Learned something from this activity? Add it to your manual so you don&apos;t forget!
          </p>

          <div className="space-y-3">
            <div>
              <label className="block font-mono text-xs text-slate-500 mb-1">TYPE</label>
              <div className="flex gap-2">
                {(['strategy', 'trigger', 'boundary'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setManualAddType(type)}
                    className={`flex-1 p-2 border-2 font-mono text-xs uppercase ${
                      manualAddType === type
                        ? 'border-slate-800 bg-slate-800 text-white'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-mono text-xs text-slate-500 mb-1">DESCRIPTION</label>
              <textarea
                value={manualAddText}
                onChange={(e) => setManualAddText(e.target.value)}
                placeholder={
                  manualAddType === 'strategy'
                    ? 'e.g., Having a launch pad by the door makes mornings smoother'
                    : manualAddType === 'trigger'
                    ? 'e.g., Missing items in the morning causes stress and rushing'
                    : 'e.g., Everyone must use the launch pad before leaving'
                }
                className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <TechnicalButton
                variant="primary"
                size="sm"
                onClick={handleAddToManual}
                disabled={!manualAddText.trim()}
              >
                SAVE TO MANUAL
              </TechnicalButton>
              <TechnicalButton
                variant="outline"
                size="sm"
                onClick={() => setShowAddToManual(false)}
              >
                CANCEL
              </TechnicalButton>
            </div>
          </div>
        </div>
      )}

      {/* ===== ACTION BUTTONS ===== */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
        {onGenerateTasks && (
          <TechnicalButton variant="primary" size="sm" onClick={onGenerateTasks}>
            GENERATE TASKS
          </TechnicalButton>
        )}
        {/* Only show Add to Manual when steps are completed */}
        {onAddToManual && completedCount > 0 && !showAddToManual && (
          <TechnicalButton
            variant="secondary"
            size="sm"
            onClick={() => setShowAddToManual(true)}
          >
            ADD TO MANUAL
          </TechnicalButton>
        )}
        {onAskCoach && (
          <TechnicalButton
            variant="outline"
            size="sm"
            onClick={onAskCoach}
          >
            ASK COACH FOR HELP
          </TechnicalButton>
        )}
      </div>
    </TechnicalCard>
  );
}

export default WeeklyFocusCard;
