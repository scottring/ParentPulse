/**
 * Household Workbook Types
 *
 * Hub-and-spokes architecture where household goals delegate tasks to individuals.
 * Uses the 6-layer framework with friendly names.
 */

import { Timestamp } from 'firebase/firestore';
import { LayerId } from './assessment';

// Re-export LayerId so consumers can import from this file if they prefer
export type { LayerId };

// ============ LAYER DEFINITIONS ============

export const HOUSEHOLD_LAYERS = {
  1: { id: 1, friendly: 'What Sets Us Off', technical: 'Inputs/Triggers' },
  2: { id: 2, friendly: 'How We Talk', technical: 'Processing' },
  3: { id: 3, friendly: 'Our Rhythms', technical: 'Memory/Structure' },
  4: { id: 4, friendly: 'How We Get Things Done', technical: 'Execution' },
  5: { id: 5, friendly: 'What We\'re Building', technical: 'Outputs' },
  6: { id: 6, friendly: 'What We Stand For', technical: 'Supervisory' },
} as const;

export function getLayerFriendlyName(layerId: LayerId): string {
  return HOUSEHOLD_LAYERS[layerId].friendly;
}

// ============ PAIN POINTS ============

export interface PainPoint {
  id: string;
  label: string;
  description: string;
  relatedLayers: LayerId[];
}

export const HOUSEHOLD_PAIN_POINTS: PainPoint[] = [
  {
    id: 'disorganized',
    label: 'Disorganized / Chaotic',
    description: 'Things feel scattered, routines don\'t stick',
    relatedLayers: [3, 4],
  },
  {
    id: 'arguing',
    label: 'We Argue A Lot',
    description: 'Conflicts escalate, hard to communicate',
    relatedLayers: [1, 2],
  },
  {
    id: 'no-quality-time',
    label: 'No Quality Time Together',
    description: 'We\'re ships passing in the night',
    relatedLayers: [5, 6],
  },
  {
    id: 'transitions-hard',
    label: 'Transitions Are Hard',
    description: 'Mornings, bedtimes, leaving the house',
    relatedLayers: [1, 3, 4],
  },
  {
    id: 'chores-battles',
    label: 'Constant Battles Over Chores',
    description: 'Nobody does their part without nagging',
    relatedLayers: [3, 4],
  },
  {
    id: 'screen-time',
    label: 'Screen Time Conflicts',
    description: 'Technology is a constant source of tension',
    relatedLayers: [1, 6],
  },
  {
    id: 'sibling-rivalry',
    label: 'Sibling Rivalry',
    description: 'Kids constantly fighting or competing',
    relatedLayers: [1, 2],
  },
  {
    id: 'overwhelmed',
    label: 'Everyone\'s Overwhelmed',
    description: 'Too much to do, not enough time',
    relatedLayers: [4, 5],
  },
];

// ============ MILESTONE ============

export interface HouseholdMilestone {
  target: 'day30' | 'day60' | 'day90';
  description: string;
  status: 'upcoming' | 'active' | 'completed';
  achievedAt?: Timestamp;
}

// ============ HOUSEHOLD TASK ============

export interface HouseholdTask {
  taskId: string;
  title: string;
  description?: string;
  layerId: LayerId;
  isCompleted: boolean;
  completedAt?: Timestamp;
  completedBy?: string; // userId who marked complete
}

// ============ DELEGATED TASK ============

export interface DelegatedTask {
  taskId: string;
  title: string;
  description?: string;
  layerId: LayerId;
  personId: string;
  personName: string;
  isCompleted: boolean;
  completedAt?: Timestamp;
  dueDate?: string; // "monday", "daily", or ISO date
}

// ============ WEEKLY FOCUS ============

export interface HouseholdWeeklyFocus {
  title: string;
  description: string;
  whyItMatters: string;
  layersFocused: LayerId[];
  // Actionable instructions for this focus
  instructions?: FocusInstruction[];
  // Suggested items to add to manual after completion
  suggestedManualAdditions?: {
    triggers?: string[];
    strategies?: string[];
    boundaries?: string[];
  };
}

/**
 * A step-by-step instruction for completing a weekly focus
 */
export interface FocusInstruction {
  id: string;
  step: number;
  title: string;
  description: string;
  tips?: string[];
  // Temporal guidance - when to do this step
  dayRange?: {
    start: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    end: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  };
  phase?: 'setup' | 'implement' | 'practice' | 'refine';
  isCompleted?: boolean;
  completedAt?: Timestamp;
  // Allow user edits
  isUserEdited?: boolean;
  // Deliverable - what this step produces
  deliverableType?: 'checklist' | 'location' | 'schedule' | 'assignment' | 'note';
  deliverable?: StepDeliverable;
}

/**
 * Content created within a step - the actual output/artifact
 */
export type StepDeliverable =
  | ChecklistDeliverable
  | LocationDeliverable
  | AssignmentDeliverable
  | NoteDeliverable;

export interface ChecklistDeliverable {
  type: 'checklist';
  checklists: PersonChecklist[];
}

export interface PersonChecklist {
  personId: string;
  personName: string;
  title: string;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  isDefault?: boolean; // AI-suggested vs user-added
}

export interface LocationDeliverable {
  type: 'location';
  name: string;
  description: string;
  location: string; // e.g., "By the front door", "In the mudroom"
}

export interface AssignmentDeliverable {
  type: 'assignment';
  assignments: {
    personId: string;
    personName: string;
    responsibility: string;
  }[];
}

export interface NoteDeliverable {
  type: 'note';
  content: string;
}

// ============ MILESTONE PERIOD PLAN ============

/**
 * Overview of a milestone period (30, 60, or 90 days)
 * Provides the "30,000 foot view" of what to expect
 */
export interface MilestonePeriodPlan {
  periodId: string;
  familyId: string;
  milestoneTarget: 'day30' | 'day60' | 'day90';
  milestoneDescription: string;

  // Overview
  periodGoal: string; // What we're working toward
  whyThisMatters: string;

  // Weekly breakdown
  weeklyPlan: WeekPlanSummary[];

  // Expected outcomes
  expectedOutcomes: string[];

  // Adjustability
  isUserEdited: boolean;
  lastEditedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Summary of a single week within a milestone period
 */
export interface WeekPlanSummary {
  weekNumber: number; // 1-4 for day30, 1-8 for day60, etc.
  title: string;
  focus: string;
  buildingOn?: string; // How this builds on previous weeks
  keyActivities: string[];
  expectedProgress: string;
  isCurrentWeek?: boolean;
}

/**
 * Day-by-day schedule for a week
 */
export interface WeeklySchedule {
  weekId: string;
  days: DayPlan[];
}

export interface DayPlan {
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1 = Monday
  dayLabel: string; // "Monday", "Day 1", etc.
  phase: 'setup' | 'implement' | 'practice' | 'refine' | 'rest';
  activities: DayActivity[];
  isFlexDay?: boolean; // Can be adjusted
}

export interface DayActivity {
  id: string;
  instructionId?: string; // Links to FocusInstruction
  title: string;
  timeEstimate?: string; // "15 min", "30 min", etc.
  priority: 'must-do' | 'should-do' | 'nice-to-have';
  isCompleted?: boolean;
}

// ============ HOUSEHOLD REFLECTION ============

export interface HouseholdReflection {
  weekHighlight: string;
  weekChallenge: string;
  nextWeekFocus: string;
  familyMoodRating: 1 | 2 | 3 | 4 | 5;
  completedAt: Timestamp;
  completedBy: string;
}

// ============ HOUSEHOLD WORKBOOK ============

export interface HouseholdWorkbook {
  workbookId: string;
  familyId: string;
  weekId: string; // "2026-W04"
  weekNumber: number;
  startDate: string; // ISO date
  endDate: string; // ISO date

  // Journey context
  currentMilestone: {
    target: 'day30' | 'day60' | 'day90';
    description: string;
    daysRemaining: number;
  };
  journeyDayNumber: number; // Day X of 90

  // This week's focus
  weeklyFocus: HouseholdWeeklyFocus;

  // Hub tasks (household-level)
  householdTasks: HouseholdTask[];

  // Spoke tasks (delegated to individuals)
  delegatedTasks: {
    personId: string;
    personName: string;
    tasks: DelegatedTask[];
  }[];

  // Reflection
  weeklyReflection?: HouseholdReflection;

  // Metadata
  status: 'active' | 'completed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============ HOUSEHOLD JOURNEY ============

export interface HouseholdJourney {
  journeyId: string;
  familyId: string;
  startDate: Timestamp;
  endDate?: Timestamp; // Day 90 or when completed

  // Selected pain points from onboarding
  selectedPainPoints: string[];
  layersFocused: LayerId[];

  // Milestones
  milestones: {
    day30: HouseholdMilestone;
    day60: HouseholdMilestone;
    day90: HouseholdMilestone;
  };

  // Progress
  currentDay: number;
  status: 'active' | 'completed' | 'paused';

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============ CONCERNS (Quick Capture) ============

export type ConcernUrgency = 'can-wait' | 'simmering' | 'need-soon';

export interface Concern {
  concernId: string;
  familyId: string;

  // What's the concern
  description: string;

  // Who's involved
  involvedPersonIds: string[];
  involvedPersonNames: string[];

  // Urgency
  urgency: ConcernUrgency;

  // Optional context
  relatedLayers?: LayerId[];
  notes?: string;

  // Status
  status: 'active' | 'addressed' | 'dismissed';
  addressedAt?: Timestamp;
  addressedInWorkbookId?: string; // If it became a focus

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // userId
}

export const CONCERN_URGENCY_LABELS: Record<ConcernUrgency, { label: string; description: string; color: string }> = {
  'can-wait': {
    label: 'Can Wait',
    description: 'Log it, review later',
    color: 'slate',
  },
  'simmering': {
    label: 'Simmering',
    description: 'Should be addressed in 2-3 weeks',
    color: 'amber',
  },
  'need-soon': {
    label: 'Need It Soon',
    description: 'Consider for this/next week',
    color: 'red',
  },
};

// ============ HOME CHARTER (L6 - Values) ============

export interface CharterNonNegotiable {
  id: string;
  value: string;
  description?: string;
  source: 'onboarding' | 'ai' | 'user';
  createdAt: Timestamp;
}

export interface HomeCharter {
  familyMission?: string;
  nonNegotiables: CharterNonNegotiable[];
  desiredFeelings: string[];
  coreValues?: string[];
  updatedAt?: Timestamp;
}

// ============ SANCTUARY MAP (L1 - Inputs/Triggers) ============

export type SensoryType = 'light' | 'sound' | 'smell' | 'temperature' | 'nature';
export type ZoneType = 'quiet' | 'activity' | 'work' | 'rest' | 'connection' | 'transition';

export interface SensoryAuditItem {
  id: string;
  type: SensoryType;
  location: string;
  description: string;
  quality: 'optimal' | 'needs-improvement' | 'problematic';
  notes?: string;
  source: 'onboarding' | 'ai' | 'user';
  createdAt: Timestamp;
}

export interface HomeZone {
  id: string;
  name: string;
  type: ZoneType;
  location: string;
  purpose: string;
  rules?: string[];
  linkedToPersonIds?: string[];
  source: 'onboarding' | 'ai' | 'user';
  createdAt: Timestamp;
}

export interface SanctuaryMap {
  lightAudit: SensoryAuditItem[];
  soundAudit: SensoryAuditItem[];
  smellAudit?: SensoryAuditItem[];
  temperatureNotes?: string;
  natureElements?: string[];
  zones: HomeZone[];
  updatedAt?: Timestamp;
}

// ============ VILLAGE WIKI (L3 - Memory/Structure) ============

export type ContactCategory = 'emergency' | 'medical' | 'school' | 'childcare' | 'family' | 'neighbor' | 'service' | 'other';

export interface VillageContact {
  id: string;
  name: string;
  relationship: string;
  category: ContactCategory;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  linkedToPersonIds?: string[];
  source: 'onboarding' | 'ai' | 'user';
  createdAt: Timestamp;
}

export interface HouseholdCode {
  id: string;
  name: string;
  code: string;
  location?: string;
  notes?: string;
  source: 'onboarding' | 'user';
  createdAt: Timestamp;
}

export interface HowItWorks {
  id: string;
  item: string;
  category: 'appliance' | 'system' | 'routine' | 'quirk' | 'other';
  instructions: string;
  tips?: string[];
  source: 'onboarding' | 'ai' | 'user';
  createdAt: Timestamp;
}

export interface VillageWiki {
  contacts: VillageContact[];
  householdCodes: HouseholdCode[];
  howThingsWork: HowItWorks[];
  updatedAt?: Timestamp;
}

// ============ ROLES & RITUALS (L4 - Execution) ============

export type FairPlayCategory =
  | 'meals' | 'tidying' | 'laundry' | 'finances' | 'scheduling'
  | 'medical' | 'school' | 'emotional-labor' | 'household-maintenance'
  | 'childcare' | 'pet-care' | 'social' | 'other';

export interface FairPlayCard {
  id: string;
  name: string;
  category: FairPlayCategory;
  ownerId: string;
  ownerName: string;
  description?: string;
  conception: boolean;
  planning: boolean;
  execution: boolean;
  standardOfCare?: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'as-needed';
  source: 'onboarding' | 'ai' | 'user';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StandardOfCare {
  id: string;
  area: string;
  minimumStandard: string;
  idealStandard?: string;
  owner?: string;
  agreedBy: string[];
  source: 'onboarding' | 'ai' | 'user';
  createdAt: Timestamp;
}

export interface WeeklyRitual {
  id: string;
  name: string;
  description: string;
  dayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'flexible';
  duration?: string;
  participants: string[];
  purpose: string;
  isActive: boolean;
  source: 'onboarding' | 'ai' | 'user';
  createdAt: Timestamp;
}

export interface RolesAndRituals {
  fairPlayCards: FairPlayCard[];
  standardsOfCare: StandardOfCare[];
  weeklyRituals: WeeklyRitual[];
  updatedAt?: Timestamp;
}

// ============ COMMUNICATION RHYTHM (L2 - Processing) ============

export interface WeeklySyncConfig {
  isEnabled: boolean;
  dayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  timeOfDay?: string;
  duration?: string;
  agenda?: string[];
  location?: string;
  facilitator?: string;
}

export interface RepairStep {
  order: number;
  action: string;
  description?: string;
}

export interface RepairProtocol {
  coolDownTime?: string;
  initiationPhrase?: string;
  steps: RepairStep[];
  signalWords?: string[];
  aftercare?: string[];
}

export interface NVCGuideEntry {
  id: string;
  situation: string;
  observation: string;
  feeling: string;
  need: string;
  request: string;
  source: 'onboarding' | 'ai' | 'user';
  createdAt: Timestamp;
}

export interface CommunicationRhythm {
  weeklySyncConfig: WeeklySyncConfig;
  repairProtocol: RepairProtocol;
  nvcGuide?: NVCGuideEntry[];
  conflictStyle?: string;
  updatedAt?: Timestamp;
}

// ============ HOUSEHOLD PULSE (L5 - Outputs) ============

export interface HouseholdAssessmentDimension {
  dimensionId: string;
  label: string;
  description: string;
  score: number;
  notes?: string;
}

export interface HouseholdAssessment {
  assessmentId: string;
  assessedAt: Timestamp;
  assessedBy: string;
  dimensions: {
    clarity: HouseholdAssessmentDimension;
    restoration: HouseholdAssessmentDimension;
    efficiency: HouseholdAssessmentDimension;
    connection: HouseholdAssessmentDimension;
  };
  overallScore: number;
  reflectionNotes?: string;
}

export interface HouseholdPulse {
  currentAssessment?: HouseholdAssessment;
  assessmentHistory: HouseholdAssessment[];
  targetScores?: {
    clarity: number;
    restoration: number;
    efficiency: number;
    connection: number;
  };
  updatedAt?: Timestamp;
}

// ============ HOUSEHOLD SECTION IDS ============

export type HouseholdSectionId =
  | 'home_charter'
  | 'sanctuary_map'
  | 'village_wiki'
  | 'roles_rituals'
  | 'communication_rhythm'
  | 'household_pulse';

export const HOUSEHOLD_SECTION_META: Record<HouseholdSectionId, {
  name: string;
  friendlyName: string;
  layer: LayerId;
  icon: string;
  description: string;
}> = {
  home_charter: {
    name: 'Our Home Charter',
    friendlyName: 'What We Stand For',
    layer: 6,
    icon: 'DocumentTextIcon',
    description: 'Family mission, non-negotiables, and the feelings you want your home to create'
  },
  sanctuary_map: {
    name: 'The Sanctuary Map',
    friendlyName: 'What Sets Us Off',
    layer: 1,
    icon: 'HomeModernIcon',
    description: 'Light, sound, nature audit with quiet zones and activity zones'
  },
  village_wiki: {
    name: 'Our Village & Wiki',
    friendlyName: 'Our Rhythms',
    layer: 3,
    icon: 'BookOpenIcon',
    description: 'Contacts, codes, and how things work in your household'
  },
  roles_rituals: {
    name: 'Roles & Rituals',
    friendlyName: 'How We Get Things Done',
    layer: 4,
    icon: 'UserGroupIcon',
    description: 'Fair Play ownership, standards of care, and weekly rituals'
  },
  communication_rhythm: {
    name: 'Communication Rhythm',
    friendlyName: 'How We Talk',
    layer: 2,
    icon: 'ChatBubbleLeftRightIcon',
    description: 'Weekly sync, repair protocols, and NVC guide'
  },
  household_pulse: {
    name: 'Household Pulse',
    friendlyName: "What We're Building",
    layer: 5,
    icon: 'ChartBarIcon',
    description: 'Spider diagram tracking clarity, restoration, efficiency, and connection'
  }
};

// ============ HOUSEHOLD MANUAL CONTENT ============

export interface HouseholdTrigger {
  triggerId: string;
  description: string;
  context?: string;
  layerId: LayerId;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectsPersons?: string[]; // personIds most affected
  createdAt: Timestamp;
  updatedAt: Timestamp;
  source: 'onboarding' | 'ai' | 'user' | 'intervention' | 'workbook';
}

export interface HouseholdStrategy {
  strategyId: string;
  description: string;
  howToUse?: string;
  layerId: LayerId;
  effectiveness: 1 | 2 | 3 | 4 | 5;
  relatedTriggers?: string[]; // triggerIds this addresses
  createdAt: Timestamp;
  updatedAt: Timestamp;
  source: 'onboarding' | 'ai' | 'user' | 'intervention' | 'workbook';
}

export interface HouseholdBoundary {
  boundaryId: string;
  description: string;
  rationale?: string;
  layerId: LayerId;
  category: 'immovable' | 'negotiable' | 'preference';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  source: 'onboarding' | 'ai' | 'user' | 'workbook';
}

export interface HouseholdRoutine {
  routineId: string;
  name: string;
  description: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'anytime';
  frequency: 'daily' | 'weekdays' | 'weekends' | 'weekly';
  steps?: string[];
  layerId: LayerId;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============ HOUSEHOLD MEMBER ============

export interface HouseholdMember {
  personId: string;
  name: string;
  role: 'parent' | 'child' | 'other';
  dateOfBirth?: Timestamp; // For age-appropriate content
  avatarUrl?: string;
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Timestamp | Date): number {
  const birthDate = dateOfBirth instanceof Date ? dateOfBirth : dateOfBirth.toDate();
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Get age group for content targeting
 */
export function getAgeGroup(age: number): 'infant' | 'toddler' | 'preschool' | 'elementary' | 'tween' | 'teen' | 'adult' {
  if (age < 1) return 'infant';
  if (age < 3) return 'toddler';
  if (age < 6) return 'preschool';
  if (age < 10) return 'elementary';
  if (age < 13) return 'tween';
  if (age < 18) return 'teen';
  return 'adult';
}

// ============ HOUSEHOLD MANUAL ============

export interface HouseholdManual {
  manualId: string;
  familyId: string;
  householdName: string;

  // Members
  members: HouseholdMember[];

  // 6-layer content (legacy - still supported)
  triggers: HouseholdTrigger[];
  strategies: HouseholdStrategy[];
  boundaries: HouseholdBoundary[];
  routines: HouseholdRoutine[];

  // Family values (Layer 6) - legacy, migrated to homeCharter
  familyValues: string[];
  familyMotto?: string;

  // ============ NEW SECTION-BASED CONTENT ============

  // L6 - Values: Family mission, non-negotiables, desired feelings
  homeCharter?: HomeCharter;

  // L1 - Inputs: Light/sound/nature audit, quiet zones, activity zones
  sanctuaryMap?: SanctuaryMap;

  // L3 - Memory: Contacts, codes, how things work
  villageWiki?: VillageWiki;

  // L4 - Execution: Fair Play ownership, standards of care
  rolesAndRituals?: RolesAndRituals;

  // L2 - Processing: Weekly sync, repair protocols, NVC guide
  communicationRhythm?: CommunicationRhythm;

  // L5 - Outputs: Spider diagram tracking
  householdPulse?: HouseholdPulse;

  // Onboarding progress tracking
  onboardingProgress?: {
    completedSections: HouseholdSectionId[];
    lastSectionCompleted?: HouseholdSectionId;
    lastCompletedAt?: Timestamp;
  };

  // Journey reference
  activeJourneyId?: string;

  // Completeness tracking
  completeness: {
    layer1: number; // 0-100
    layer2: number;
    layer3: number;
    layer4: number;
    layer5: number;
    layer6: number;
    overall: number;
  };

  // Section-specific completeness
  sectionCompleteness?: Record<HouseholdSectionId, number>;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastGeneratedAt?: Timestamp;
}

// ============ SECTION COMPLETENESS HELPERS ============

/**
 * Calculate completeness percentage for a specific section
 */
export function calculateSectionCompleteness(
  manual: HouseholdManual,
  sectionId: HouseholdSectionId
): number {
  switch (sectionId) {
    case 'home_charter': {
      if (!manual.homeCharter) return 0;
      const { familyMission, nonNegotiables, desiredFeelings, coreValues } = manual.homeCharter;
      let score = 0;
      if (familyMission && familyMission.length > 10) score += 30;
      if (nonNegotiables && nonNegotiables.length > 0) score += 30;
      if (desiredFeelings && desiredFeelings.length > 0) score += 20;
      if (coreValues && coreValues.length > 0) score += 20;
      return Math.min(100, score);
    }

    case 'sanctuary_map': {
      if (!manual.sanctuaryMap) return 0;
      const { lightAudit, soundAudit, zones } = manual.sanctuaryMap;
      let score = 0;
      if (lightAudit && lightAudit.length > 0) score += 25;
      if (soundAudit && soundAudit.length > 0) score += 25;
      if (zones && zones.length > 0) score += 50;
      return Math.min(100, score);
    }

    case 'village_wiki': {
      if (!manual.villageWiki) return 0;
      const { contacts, householdCodes, howThingsWork } = manual.villageWiki;
      let score = 0;
      if (contacts && contacts.length > 0) score += 40;
      if (householdCodes && householdCodes.length > 0) score += 30;
      if (howThingsWork && howThingsWork.length > 0) score += 30;
      return Math.min(100, score);
    }

    case 'roles_rituals': {
      if (!manual.rolesAndRituals) return 0;
      const { fairPlayCards, standardsOfCare, weeklyRituals } = manual.rolesAndRituals;
      let score = 0;
      if (fairPlayCards && fairPlayCards.length > 0) score += 40;
      if (standardsOfCare && standardsOfCare.length > 0) score += 30;
      if (weeklyRituals && weeklyRituals.length > 0) score += 30;
      return Math.min(100, score);
    }

    case 'communication_rhythm': {
      if (!manual.communicationRhythm) return 0;
      const { weeklySyncConfig, repairProtocol } = manual.communicationRhythm;
      let score = 0;
      if (weeklySyncConfig?.isEnabled) score += 50;
      if (repairProtocol?.steps && repairProtocol.steps.length > 0) score += 50;
      return Math.min(100, score);
    }

    case 'household_pulse': {
      if (!manual.householdPulse) return 0;
      const { currentAssessment, targetScores } = manual.householdPulse;
      let score = 0;
      if (currentAssessment) score += 70;
      if (targetScores) score += 30;
      return Math.min(100, score);
    }

    default:
      return 0;
  }
}

/**
 * Calculate all section completeness values
 */
export function calculateAllSectionCompleteness(
  manual: HouseholdManual
): Record<HouseholdSectionId, number> {
  const sections: HouseholdSectionId[] = [
    'home_charter',
    'sanctuary_map',
    'village_wiki',
    'roles_rituals',
    'communication_rhythm',
    'household_pulse'
  ];

  return sections.reduce((acc, sectionId) => {
    acc[sectionId] = calculateSectionCompleteness(manual, sectionId);
    return acc;
  }, {} as Record<HouseholdSectionId, number>);
}

/**
 * Get the next recommended section to complete
 */
export function getNextRecommendedSection(
  manual: HouseholdManual
): HouseholdSectionId | null {
  // Recommended order: Charter → Sanctuary → Village → Roles → Communication → Pulse
  const recommendedOrder: HouseholdSectionId[] = [
    'home_charter',
    'sanctuary_map',
    'village_wiki',
    'roles_rituals',
    'communication_rhythm',
    'household_pulse'
  ];

  const completeness = calculateAllSectionCompleteness(manual);

  for (const sectionId of recommendedOrder) {
    if (completeness[sectionId] < 100) {
      return sectionId;
    }
  }

  return null;
}

// ============ MOCK DATA HELPERS ============

// ============ PHASE 7: ACTION GENERATION ENGINE TYPES ============

/**
 * Focus domains that span the 6-layer framework
 * Used for user preference selection in weekly planning
 */
export type FocusDomain =
  | 'physical_environment'  // Sanctuary zones, organization (L1)
  | 'behavior_boundaries'   // Child behavior, sibling dynamics (L3)
  | 'partner_dynamics'      // Communication, fair play (L2, L4)
  | 'routines_rituals'      // Daily/weekly rhythms (L4)
  | 'self_regulation'       // Parent triggers, strategies (L1, L4)
  | 'values_alignment';     // Non-negotiables, family mission (L6)

/**
 * Capacity level for weekly planning
 */
export type CapacityLevel = 'light' | 'moderate' | 'full';

/**
 * User preferences for weekly focus generation
 */
export interface WeeklyPlanningPreferences {
  focusDomains: FocusDomain[];        // 1-3 selected domains
  capacity: CapacityLevel;
  manualPriorities?: string[];        // Free-text priorities
  excludeAreas?: string[];            // Things to skip this week
}

/**
 * A trackable action within a focus area
 */
export interface FocusAction {
  actionId: string;
  description: string;
  trackable: boolean;
  dueDay?: number;  // 0-6, Sunday-Saturday
  recurring?: boolean;
  completed?: boolean;
  completedAt?: Timestamp;
}

/**
 * A focus area generated by AI or added by user
 */
export interface FocusArea {
  focusAreaId: string;
  title: string;
  sourceType: 'trigger' | 'strategy' | 'boundary' | 'ritual' | 'fairplay' | 'value' | 'custom';
  sourceId?: string;  // Links back to manual item (optional for custom)
  layerId: LayerId;
  rationale: string;  // AI explanation of why this needs focus
  domain: FocusDomain;

  actions: FocusAction[];
  successMetric: string;
}

/**
 * A reminder for a scheduled ritual
 */
export interface RitualReminder {
  ritualId: string;
  ritualName: string;
  scheduledDay: number;  // 0-6, Sunday-Saturday
  notes?: string;
}

/**
 * A journal entry for capturing observations during the week
 */
export interface WeeklyJournalEntry {
  entryId: string;
  timestamp: Timestamp;
  content: string;
  relatedFocusAreaId?: string;  // Optional link to specific focus area
  mood?: 'positive' | 'neutral' | 'challenging';
  tags?: string[];  // e.g., ['boundary-test', 'bedtime', 'progress']
}

/**
 * The complete household weekly focus generated by AI
 */
export interface HouseholdWeeklyFocusV2 {
  focusId: string;
  familyId: string;
  weekOf: Timestamp;
  generatedAt: Timestamp;

  // Planning context
  preferences: WeeklyPlanningPreferences;

  // AI-generated content
  focusAreas: FocusArea[];
  ritualReminders: RitualReminder[];
  capacityNote?: string;

  // User modifications after AI generation
  userAddedAreas?: FocusArea[];      // User's own focus areas
  removedAreaIds?: string[];          // AI areas user removed

  // Journal entries during the week
  journalEntries: WeeklyJournalEntry[];

  // Tracking
  completedActions: string[];  // action IDs
  reflectionNotes?: string;
  effectivenessRating?: 1 | 2 | 3 | 4 | 5;

  // Status
  status: 'draft' | 'active' | 'completed';
  confirmedAt?: Timestamp;
  completedAt?: Timestamp;
}

// ============ BASELINE ENFORCEMENT TYPES ============

/**
 * A single requirement for a layer baseline
 */
export interface BaselineRequirement {
  requirementId: string;
  description: string;
  minimumCount?: number;  // e.g., "At least 2 boundaries"
  fieldPath: string;      // Path in manual to check, e.g., "homeCharter.nonNegotiables"
  isMet?: boolean;
}

/**
 * Complete baseline status for a layer
 */
export interface LayerBaseline {
  layerId: LayerId;
  layerName: string;
  requirements: BaselineRequirement[];
  isComplete: boolean;
  completionPercentage: number;
}

/**
 * Mapping of focus domains to required layer baselines
 */
export const DOMAIN_BASELINE_REQUIREMENTS: Record<FocusDomain, LayerId[]> = {
  'physical_environment': [6, 1],        // Values + Triggers
  'behavior_boundaries': [6, 1, 3],      // Values + Triggers + Boundaries
  'partner_dynamics': [6, 2, 4],         // Values + Processing + Execution
  'routines_rituals': [6, 4],            // Values + Execution
  'self_regulation': [6, 1, 4],          // Values + Triggers + Execution
  'values_alignment': [6],                // Values only
};

/**
 * Focus domain metadata for UI display
 */
export const FOCUS_DOMAIN_META: Record<FocusDomain, {
  label: string;
  description: string;
  icon: string;
  relatedLayers: LayerId[];
}> = {
  'physical_environment': {
    label: 'Physical Environment',
    description: 'Sanctuary zones, organization',
    icon: 'HomeModernIcon',
    relatedLayers: [1],
  },
  'behavior_boundaries': {
    label: 'Behavior & Boundaries',
    description: 'Child behavior, sibling dynamics',
    icon: 'ShieldCheckIcon',
    relatedLayers: [1, 3],
  },
  'partner_dynamics': {
    label: 'Partner Dynamics',
    description: 'Communication, fair play',
    icon: 'HeartIcon',
    relatedLayers: [2, 4],
  },
  'routines_rituals': {
    label: 'Routines & Rituals',
    description: 'Daily/weekly rhythms',
    icon: 'ClockIcon',
    relatedLayers: [4],
  },
  'self_regulation': {
    label: 'Self-Care & Regulation',
    description: 'Parent triggers, strategies',
    icon: 'SparklesIcon',
    relatedLayers: [1, 4],
  },
  'values_alignment': {
    label: 'Values Alignment',
    description: 'Non-negotiables, family mission',
    icon: 'StarIcon',
    relatedLayers: [6],
  },
};

/**
 * Baseline requirements configuration by layer
 */
export const LAYER_BASELINE_CONFIG: Record<LayerId, BaselineRequirement[]> = {
  1: [
    { requirementId: 'l1_triggers', description: 'At least 2 triggers documented', minimumCount: 2, fieldPath: 'triggers' },
    { requirementId: 'l1_sensory', description: 'Sensory audit started', fieldPath: 'sanctuaryMap.lightAudit' },
  ],
  2: [
    { requirementId: 'l2_repair', description: 'Repair protocol defined', fieldPath: 'communicationRhythm.repairProtocol.steps' },
    { requirementId: 'l2_communication', description: 'Communication preferences documented', fieldPath: 'communicationRhythm.weeklySyncConfig' },
  ],
  3: [
    { requirementId: 'l3_boundaries', description: 'At least 2 boundaries defined', minimumCount: 2, fieldPath: 'boundaries' },
    { requirementId: 'l3_zones', description: 'Home zones mapped', fieldPath: 'sanctuaryMap.zones' },
  ],
  4: [
    { requirementId: 'l4_rituals', description: 'At least 1 weekly ritual', minimumCount: 1, fieldPath: 'rolesAndRituals.weeklyRituals' },
    { requirementId: 'l4_fairplay', description: 'Fair Play cards assigned', fieldPath: 'rolesAndRituals.fairPlayCards' },
  ],
  5: [
    { requirementId: 'l5_pulse', description: 'Initial household assessment completed', fieldPath: 'householdPulse.currentAssessment' },
  ],
  6: [
    { requirementId: 'l6_mission', description: 'Family mission defined', fieldPath: 'homeCharter.familyMission' },
    { requirementId: 'l6_values', description: 'At least 3 non-negotiables documented', minimumCount: 3, fieldPath: 'homeCharter.nonNegotiables' },
    { requirementId: 'l6_feelings', description: 'Core values selected', fieldPath: 'homeCharter.coreValues' },
  ],
};

// ============ HELPER FUNCTIONS FOR PHASE 7 ============

/**
 * Get required baseline layers for a set of focus domains
 */
export function getRequiredBaselinesForDomains(domains: FocusDomain[]): LayerId[] {
  const layers = new Set<LayerId>();
  domains.forEach(domain => {
    DOMAIN_BASELINE_REQUIREMENTS[domain].forEach(layer => layers.add(layer));
  });
  return Array.from(layers).sort();
}

/**
 * Check if a baseline requirement is met based on manual content
 */
export function checkBaselineRequirement(
  manual: HouseholdManual,
  requirement: BaselineRequirement
): boolean {
  // Navigate to the field path
  const pathParts = requirement.fieldPath.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = manual;

  for (const part of pathParts) {
    if (value === undefined || value === null) return false;
    value = value[part];
  }

  // Check based on requirement type
  if (requirement.minimumCount !== undefined) {
    return Array.isArray(value) && value.length >= requirement.minimumCount;
  }

  // For non-array fields, check if it exists and has content
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'string') {
    return value.trim().length > 10; // Non-trivial content
  }

  return value !== undefined && value !== null;
}

/**
 * Calculate baseline completion for a layer
 */
export function calculateLayerBaseline(
  manual: HouseholdManual,
  layerId: LayerId
): LayerBaseline {
  const requirements = LAYER_BASELINE_CONFIG[layerId].map(req => ({
    ...req,
    isMet: checkBaselineRequirement(manual, req),
  }));

  const metCount = requirements.filter(r => r.isMet).length;
  const totalCount = requirements.length;

  return {
    layerId,
    layerName: HOUSEHOLD_LAYERS[layerId].friendly,
    requirements,
    isComplete: metCount === totalCount,
    completionPercentage: totalCount > 0 ? Math.round((metCount / totalCount) * 100) : 0,
  };
}

/**
 * Check if all baselines for given domains are complete
 */
export function checkBaselinesForDomains(
  manual: HouseholdManual,
  domains: FocusDomain[]
): { complete: boolean; missingLayers: LayerBaseline[] } {
  const requiredLayers = getRequiredBaselinesForDomains(domains);
  const baselines = requiredLayers.map(layerId => calculateLayerBaseline(manual, layerId));
  const missingLayers = baselines.filter(b => !b.isComplete);

  return {
    complete: missingLayers.length === 0,
    missingLayers,
  };
}

// ============ MOCK DATA HELPERS ============

export function createMockHouseholdWorkbook(
  familyId: string,
  weekId: string,
  weekNumber: number
): Omit<HouseholdWorkbook, 'createdAt' | 'updatedAt'> {
  return {
    workbookId: `hw_${familyId}_${weekId}`,
    familyId,
    weekId,
    weekNumber,
    startDate: '2026-01-20',
    endDate: '2026-01-26',
    currentMilestone: {
      target: 'day30',
      description: 'Daily transitions are smooth and predictable',
      daysRemaining: 23,
    },
    journeyDayNumber: 7, // Week 1
    weeklyFocus: {
      title: 'Morning Routine: Creating a Launch Pad',
      description: 'Set up a dedicated spot for everything you need in the morning and establish night-before prep habits',
      whyItMatters: 'Mornings set the tone for the whole day. A smooth morning means less stress and better connections.',
      layersFocused: [3, 4],
    },
    householdTasks: [
      {
        taskId: 'ht_1',
        title: 'Designate a spot for keys, bags, and shoes',
        layerId: 3,
        isCompleted: false,
      },
      {
        taskId: 'ht_2',
        title: 'Create visual checklist for morning routine',
        layerId: 4,
        isCompleted: false,
      },
    ],
    delegatedTasks: [
      {
        personId: 'person_1',
        personName: 'Sarah',
        tasks: [
          {
            taskId: 'dt_1',
            title: 'Lead the launch pad setup',
            personId: 'person_1',
            personName: 'Sarah',
            layerId: 3,
            isCompleted: false,
          },
          {
            taskId: 'dt_2',
            title: 'Model using it for 3 days',
            personId: 'person_1',
            personName: 'Sarah',
            layerId: 4,
            isCompleted: false,
          },
        ],
      },
      {
        personId: 'person_2',
        personName: 'David',
        tasks: [
          {
            taskId: 'dt_3',
            title: 'Help kids put things in the right spot',
            personId: 'person_2',
            personName: 'David',
            layerId: 3,
            isCompleted: false,
          },
        ],
      },
    ],
    status: 'active',
  };
}
