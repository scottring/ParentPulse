/**
 * Emergency Intervention Types
 *
 * Handle unexpected behavioral crises that arise mid-week, outside planned goals.
 */

import { Timestamp } from 'firebase/firestore';
import { LayerId } from './household-workbook';

// ============ INTERVENTION SEVERITY ============

export type InterventionSeverity = 'mild' | 'moderate' | 'severe' | 'crisis';

export const SEVERITY_CONFIG = {
  mild: {
    label: 'Mild',
    description: 'Unusual behavior but manageable',
    color: 'amber',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-700',
  },
  moderate: {
    label: 'Moderate',
    description: 'Significant disruption, needs attention',
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-500',
    textColor: 'text-orange-700',
  },
  severe: {
    label: 'Severe',
    description: 'Major incident, immediate response needed',
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-500',
    textColor: 'text-red-700',
  },
  crisis: {
    label: 'Crisis',
    description: 'Safety concern or emergency',
    color: 'red',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-700',
    textColor: 'text-red-800',
  },
} as const;

// ============ INTERVENTION TASK ============

export interface InterventionTask {
  taskId: string;
  title: string;
  description?: string;
  assignedTo?: string; // personId
  assignedToName?: string;
  priority: 'immediate' | 'today' | 'this-week';
  isCompleted: boolean;
  completedAt?: Timestamp;
}

// ============ MANUAL UPDATE SUGGESTION ============

export interface ManualUpdateSuggestion {
  suggestionId: string;
  type: 'trigger' | 'strategy' | 'boundary';
  content: {
    description: string;
    layerId: LayerId;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    effectiveness?: 1 | 2 | 3 | 4 | 5;
    category?: 'immovable' | 'negotiable' | 'preference';
  };
  targetManualType: 'household' | 'child' | 'marriage';
  targetManualId: string;
  targetPersonName?: string;
  rationale: string;
  approved: boolean | null; // null = pending review
  reviewedAt?: Timestamp;
}

// ============ INTERVENTION ============

export interface Intervention {
  interventionId: string;
  familyId: string;
  personId?: string; // Optional - can be household-wide
  personName?: string;

  // What happened
  title: string;
  description: string;
  whatHappened: string; // Detailed narrative
  severity: InterventionSeverity;
  triggeredAt: Timestamp;

  // Context
  relatedTriggerIds?: string[]; // Links to existing manual triggers
  possibleCauses?: string[];
  environmentalFactors?: string[]; // tired, hungry, transition, etc.

  // Response
  strategiesUsed: {
    strategyId?: string; // If from manual
    description: string;
    effectiveness: 'helped' | 'didnt-help' | 'made-worse' | 'unknown';
  }[];
  whatWorked?: string;
  whatDidntWork?: string;

  // Tasks added to workbook
  emergencyTasks: InterventionTask[];

  // Resolution
  status: 'active' | 'stabilized' | 'resolved';
  stabilizedAt?: Timestamp;
  resolvedAt?: Timestamp;
  resolutionNotes?: string;

  // Learning loop
  suggestedManualUpdates: ManualUpdateSuggestion[];
  lessonsLearned?: string;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // userId
}

// ============ INTERVENTION LOG (SUMMARY) ============

export interface InterventionLog {
  interventionId: string;
  title: string;
  personName?: string;
  severity: InterventionSeverity;
  triggeredAt: Timestamp;
  status: 'active' | 'stabilized' | 'resolved';
  resolvedAt?: Timestamp;
  suggestionsApproved: number;
  suggestionsTotal: number;
}

// ============ COMMON ENVIRONMENTAL FACTORS ============

export const ENVIRONMENTAL_FACTORS = [
  { id: 'tired', label: 'Tired / Overtired', icon: 'sleep' },
  { id: 'hungry', label: 'Hungry', icon: 'food' },
  { id: 'transition', label: 'During a Transition', icon: 'change' },
  { id: 'overstimulated', label: 'Overstimulated', icon: 'noise' },
  { id: 'understimulated', label: 'Understimulated / Bored', icon: 'bored' },
  { id: 'sick', label: 'Sick / Not Feeling Well', icon: 'health' },
  { id: 'routine-disruption', label: 'Routine Was Disrupted', icon: 'calendar' },
  { id: 'social-situation', label: 'Challenging Social Situation', icon: 'people' },
  { id: 'school-stress', label: 'School-Related Stress', icon: 'school' },
  { id: 'family-tension', label: 'Family Tension', icon: 'home' },
  { id: 'sensory', label: 'Sensory Overload', icon: 'sensory' },
  { id: 'unknown', label: 'Not Sure / Unknown', icon: 'question' },
] as const;

// ============ QUICK CAPTURE TEMPLATES ============

export const INTERVENTION_TEMPLATES = [
  {
    id: 'meltdown',
    title: 'Meltdown',
    description: 'Emotional overwhelm with crying, screaming, or loss of control',
    defaultSeverity: 'moderate' as InterventionSeverity,
    suggestedFactors: ['tired', 'overstimulated', 'transition'],
  },
  {
    id: 'aggression',
    title: 'Aggressive Behavior',
    description: 'Hitting, kicking, throwing, or destructive actions',
    defaultSeverity: 'severe' as InterventionSeverity,
    suggestedFactors: ['overstimulated', 'social-situation'],
  },
  {
    id: 'shutdown',
    title: 'Shutdown / Withdrawal',
    description: 'Refused to engage, hid, or went completely silent',
    defaultSeverity: 'moderate' as InterventionSeverity,
    suggestedFactors: ['overwhelmed', 'social-situation'],
  },
  {
    id: 'defiance',
    title: 'Extreme Defiance',
    description: 'Complete refusal to cooperate despite multiple attempts',
    defaultSeverity: 'mild' as InterventionSeverity,
    suggestedFactors: ['transition', 'tired'],
  },
  {
    id: 'anxiety',
    title: 'Anxiety Episode',
    description: 'Panic, excessive worry, or physical symptoms of anxiety',
    defaultSeverity: 'moderate' as InterventionSeverity,
    suggestedFactors: ['school-stress', 'social-situation'],
  },
  {
    id: 'sibling-conflict',
    title: 'Sibling Conflict',
    description: 'Fighting between siblings that escalated significantly',
    defaultSeverity: 'mild' as InterventionSeverity,
    suggestedFactors: ['understimulated', 'tired'],
  },
  {
    id: 'other',
    title: 'Other',
    description: 'Something else that needs attention',
    defaultSeverity: 'mild' as InterventionSeverity,
    suggestedFactors: [],
  },
] as const;

// ============ MOCK DATA HELPERS ============

export function createMockIntervention(
  familyId: string,
  personId?: string,
  personName?: string
): Omit<Intervention, 'createdAt' | 'updatedAt' | 'triggeredAt'> {
  return {
    interventionId: `int_${Date.now()}`,
    familyId,
    personId,
    personName,
    title: 'Meltdown during homework',
    description: 'Complete emotional overwhelm when asked to start homework',
    whatHappened: 'Caleb came home tired from school. When asked to start homework, he threw his backpack and started screaming.',
    severity: 'moderate',
    relatedTriggerIds: [],
    possibleCauses: ['Tired after school', 'Difficult day at school'],
    environmentalFactors: ['tired', 'transition'],
    strategiesUsed: [
      {
        description: 'Offered a snack first',
        effectiveness: 'helped',
      },
      {
        description: 'Gave space to calm down',
        effectiveness: 'helped',
      },
    ],
    whatWorked: 'Giving him 20 minutes to decompress with a snack before homework',
    whatDidntWork: 'Pushing him to start immediately',
    emergencyTasks: [
      {
        taskId: 'et_1',
        title: 'Build in 20-min decompression time after school',
        priority: 'this-week',
        isCompleted: false,
      },
      {
        taskId: 'et_2',
        title: 'Have snack ready when he gets home',
        priority: 'today',
        isCompleted: false,
      },
    ],
    status: 'stabilized',
    suggestedManualUpdates: [
      {
        suggestionId: 'sug_1',
        type: 'trigger',
        content: {
          description: 'Transitions from school to homework',
          layerId: 1,
          severity: 'high',
        },
        targetManualType: 'child',
        targetManualId: 'child_manual_caleb',
        targetPersonName: 'Caleb',
        rationale: 'This incident revealed a consistent pattern of difficulty transitioning from school to homework.',
        approved: null,
      },
      {
        suggestionId: 'sug_2',
        type: 'strategy',
        content: {
          description: '20-minute decompression period after school before any demands',
          layerId: 3,
          effectiveness: 4,
        },
        targetManualType: 'child',
        targetManualId: 'child_manual_caleb',
        targetPersonName: 'Caleb',
        rationale: 'This strategy was discovered during this intervention and proved effective.',
        approved: null,
      },
    ],
    lessonsLearned: undefined,
    createdBy: 'user_1',
  };
}
