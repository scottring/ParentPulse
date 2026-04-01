import type { GrowthItemType, DepthTier } from '@/types/growth';
import type { DimensionDomain } from './relationship-dimensions';

export interface ExerciseTypeDef {
  label: string;
  description: string;
  minMinutes: number;
  maxMinutes: number;
  depth: DepthTier;
  domains: DimensionDomain[];
  emoji: string;
}

export const EXERCISE_TYPES: Record<GrowthItemType, ExerciseTypeDef> = {
  micro_activity: {
    label: 'Micro Activity',
    description: 'A quick, concrete action you can do right now',
    minMinutes: 1,
    maxMinutes: 3,
    depth: 'light',
    domains: ['self', 'couple', 'parent_child'],
    emoji: '⚡',
  },
  reflection_prompt: {
    label: 'Reflection',
    description: 'A moment to notice and name what you observe',
    minMinutes: 1,
    maxMinutes: 2,
    depth: 'light',
    domains: ['self', 'couple', 'parent_child'],
    emoji: '💭',
  },
  gratitude_practice: {
    label: 'Gratitude Practice',
    description: 'Name something specific you appreciate',
    minMinutes: 1,
    maxMinutes: 3,
    depth: 'light',
    domains: ['self', 'couple', 'parent_child'],
    emoji: '🙏',
  },
  mindfulness: {
    label: 'Mindfulness',
    description: 'A breathing, grounding, or body-scan exercise',
    minMinutes: 2,
    maxMinutes: 10,
    depth: 'light',
    domains: ['self'],
    emoji: '🧘',
  },
  journaling: {
    label: 'Journal Entry',
    description: 'Written reflection with guided prompts',
    minMinutes: 5,
    maxMinutes: 15,
    depth: 'moderate',
    domains: ['self', 'couple'],
    emoji: '📓',
  },
  partner_exercise: {
    label: 'Partner Exercise',
    description: 'A structured activity to do together with your partner',
    minMinutes: 10,
    maxMinutes: 20,
    depth: 'moderate',
    domains: ['couple'],
    emoji: '🤝',
  },
  repair_ritual: {
    label: 'Repair Ritual',
    description: 'Guided reconnection after conflict or distance',
    minMinutes: 10,
    maxMinutes: 20,
    depth: 'moderate',
    domains: ['couple', 'parent_child'],
    emoji: '🔄',
  },
  conversation_guide: {
    label: 'Guided Conversation',
    description: 'A structured, timed conversation with specific goals',
    minMinutes: 15,
    maxMinutes: 30,
    depth: 'deep',
    domains: ['couple', 'parent_child'],
    emoji: '💬',
  },
  solo_deep_dive: {
    label: 'Deep Dive',
    description: 'Extended self-work: reading, reflection, and integration',
    minMinutes: 15,
    maxMinutes: 45,
    depth: 'deep',
    domains: ['self'],
    emoji: '🌊',
  },
  assessment_prompt: {
    label: 'Check-In',
    description: 'Quick dimension portrait question',
    minMinutes: 1,
    maxMinutes: 2,
    depth: 'light',
    domains: ['self', 'couple', 'parent_child'],
    emoji: '📊',
  },
  illustrated_story: {
    label: 'Story Time',
    description: 'An illustrated story to read with your child',
    minMinutes: 5,
    maxMinutes: 10,
    depth: 'moderate',
    domains: ['parent_child'],
    emoji: '📖',
  },
  weekly_arc: {
    label: 'Weekly Theme',
    description: 'Theme card tying the week together',
    minMinutes: 2,
    maxMinutes: 5,
    depth: 'light',
    domains: ['self', 'couple', 'parent_child'],
    emoji: '🎯',
  },
  progress_snapshot: {
    label: 'Progress Check',
    description: 'See what shifted since you started',
    minMinutes: 2,
    maxMinutes: 5,
    depth: 'light',
    domains: ['self', 'couple', 'parent_child'],
    emoji: '📈',
  },
};

// Exercise type weights by engagement mode
export const EXERCISE_WEIGHTS: Record<string, Record<string, number>> = {
  light: {
    micro_activity: 0.30,
    reflection_prompt: 0.25,
    gratitude_practice: 0.20,
    mindfulness: 0.15,
    journaling: 0.10,
  },
  moderate: {
    micro_activity: 0.15,
    reflection_prompt: 0.15,
    journaling: 0.20,
    partner_exercise: 0.15,
    mindfulness: 0.10,
    conversation_guide: 0.10,
    repair_ritual: 0.05,
    gratitude_practice: 0.10,
  },
  deep: {
    solo_deep_dive: 0.20,
    conversation_guide: 0.20,
    journaling: 0.15,
    partner_exercise: 0.15,
    repair_ritual: 0.10,
    micro_activity: 0.10,
    reflection_prompt: 0.10,
  },
};
