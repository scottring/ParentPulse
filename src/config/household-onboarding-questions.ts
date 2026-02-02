/**
 * Household Manual Onboarding Questions
 *
 * Section-by-section questions for building out the household manual.
 * Each section maps to a layer in the 6-layer framework.
 */

import {
  HouseholdSectionId,
  HOUSEHOLD_SECTION_META
} from '@/types/household-workbook';

// ==================== Question Type System ====================

export type HouseholdQuestionType =
  | 'text'              // Free-form textarea
  | 'rating'            // 1-5 scale
  | 'multiple_choice'   // Single selection
  | 'checkbox'          // Multiple selections
  | 'yes_no'            // Binary
  | 'time_picker'       // Time selection
  | 'day_picker';       // Day of week selection

export interface HouseholdQuestionOption {
  value: string | number;
  label: string;
  description?: string;
}

export interface HouseholdOnboardingQuestion {
  id: string;
  question: string;
  questionType: HouseholdQuestionType;
  placeholder?: string;
  helperText?: string;
  required: boolean;
  options?: HouseholdQuestionOption[];
  allowMultiple?: boolean;
  minSelections?: number;
  maxSelections?: number;
}

export interface HouseholdOnboardingSection {
  sectionId: HouseholdSectionId;
  sectionName: string;
  sectionDescription: string;
  icon: string;
  layerId: number;
  questions: HouseholdOnboardingQuestion[];
  aiGenerationEnabled: boolean;
}

// ==================== Home Charter (L6 - Values) ====================

export const HOME_CHARTER_QUESTIONS: HouseholdOnboardingQuestion[] = [
  {
    id: 'charter_mission',
    question: 'In one sentence, what is your family\'s mission or purpose?',
    questionType: 'text',
    placeholder: 'Example: "We are a family that prioritizes connection, supports each other\'s growth, and welcomes adventure."',
    helperText: 'This doesn\'t have to be perfect - it\'s a starting point you can refine',
    required: true
  },
  {
    id: 'charter_non_negotiables',
    question: 'What are the non-negotiables in your household? (Select all that apply)',
    questionType: 'checkbox',
    helperText: 'These are the rules that never bend, regardless of circumstances',
    required: true,
    allowMultiple: true,
    minSelections: 1,
    options: [
      { value: 'safety_first', label: 'Safety comes first', description: 'Physical and emotional safety are paramount' },
      { value: 'kindness', label: 'We speak kindly', description: 'No name-calling, yelling, or hurtful words' },
      { value: 'honesty', label: 'We tell the truth', description: 'Honesty is expected, even when it\'s hard' },
      { value: 'respect_boundaries', label: 'We respect boundaries', description: 'When someone says stop, we stop' },
      { value: 'screens_off_meals', label: 'Screens off at meals', description: 'Mealtime is for connection' },
      { value: 'bedtime_routines', label: 'Consistent bedtimes', description: 'Sleep schedules are non-negotiable' },
      { value: 'homework_first', label: 'Responsibilities first', description: 'Homework/chores before play' },
      { value: 'family_time', label: 'Protected family time', description: 'Certain times are reserved for family' }
    ]
  },
  {
    id: 'charter_custom_non_negotiables',
    question: 'Are there other non-negotiables specific to your family?',
    questionType: 'text',
    placeholder: 'Example: "We always say goodbye before leaving" or "Everyone helps with Sunday dinner"',
    helperText: 'Add any unique rules that are sacred in your household',
    required: false
  },
  {
    id: 'charter_desired_feelings',
    question: 'How do you want people to FEEL when they\'re in your home?',
    questionType: 'checkbox',
    helperText: 'Select the top 3-5 feelings you want your home to evoke',
    required: true,
    allowMultiple: true,
    minSelections: 3,
    maxSelections: 5,
    options: [
      { value: 'calm', label: 'Calm', description: 'Peaceful and relaxed' },
      { value: 'safe', label: 'Safe', description: 'Protected and secure' },
      { value: 'energized', label: 'Energized', description: 'Excited and motivated' },
      { value: 'connected', label: 'Connected', description: 'Close and bonded' },
      { value: 'creative', label: 'Creative', description: 'Inspired and imaginative' },
      { value: 'joyful', label: 'Joyful', description: 'Happy and lighthearted' },
      { value: 'respected', label: 'Respected', description: 'Valued and heard' },
      { value: 'free', label: 'Free', description: 'Unburdened and liberated' },
      { value: 'cozy', label: 'Cozy', description: 'Warm and comfortable' },
      { value: 'productive', label: 'Productive', description: 'Accomplishing and achieving' }
    ]
  },
  {
    id: 'charter_values',
    question: 'What are your family\'s top 3 core values?',
    questionType: 'text',
    placeholder: 'Example: Kindness, Curiosity, Perseverance',
    helperText: 'These guide decisions and behavior in your household',
    required: true
  }
];

// ==================== Sanctuary Map (L1 - Inputs/Triggers) ====================

export const SANCTUARY_MAP_QUESTIONS: HouseholdOnboardingQuestion[] = [
  {
    id: 'sanctuary_light_quality',
    question: 'How would you rate the natural light in your main living spaces?',
    questionType: 'rating',
    helperText: '1 = Very dark/artificial, 5 = Abundant natural light',
    required: true
  },
  {
    id: 'sanctuary_light_issues',
    question: 'Are there any lighting issues that affect mood or function?',
    questionType: 'text',
    placeholder: 'Example: "The kitchen is too dark for homework" or "Bedroom gets harsh morning light"',
    helperText: 'Note any rooms that need lighting improvements',
    required: false
  },
  {
    id: 'sanctuary_sound_sources',
    question: 'What are the main sound sources in your home? (Select all that apply)',
    questionType: 'checkbox',
    helperText: 'Understanding your sound environment helps identify stress triggers',
    required: true,
    allowMultiple: true,
    options: [
      { value: 'traffic', label: 'Street/traffic noise', description: 'Cars, buses, sirens' },
      { value: 'neighbors', label: 'Neighbor sounds', description: 'Voices, music, footsteps' },
      { value: 'appliances', label: 'Appliance hum', description: 'HVAC, refrigerator, washer' },
      { value: 'kids_play', label: 'Kids playing', description: 'Normal play sounds' },
      { value: 'pets', label: 'Pet sounds', description: 'Barking, meowing, etc.' },
      { value: 'screens', label: 'Screens/media', description: 'TV, games, devices' },
      { value: 'quiet', label: 'Generally quiet', description: 'Minimal noise issues' }
    ]
  },
  {
    id: 'sanctuary_quiet_zone',
    question: 'Is there a designated quiet zone or calm-down space in your home?',
    questionType: 'yes_no',
    helperText: 'A place anyone can go when feeling overwhelmed',
    required: true
  },
  {
    id: 'sanctuary_quiet_zone_location',
    question: 'Where is (or could be) your household\'s quiet/calm-down zone?',
    questionType: 'text',
    placeholder: 'Example: "Reading nook in the living room" or "Corner of the guest room"',
    helperText: 'If you don\'t have one, where would work?',
    required: false
  },
  {
    id: 'sanctuary_nature_elements',
    question: 'What nature elements are present in your home? (Select all that apply)',
    questionType: 'checkbox',
    helperText: 'Nature elements support regulation and calm',
    required: false,
    allowMultiple: true,
    options: [
      { value: 'plants', label: 'Indoor plants', description: 'Living greenery' },
      { value: 'natural_light', label: 'Good natural light', description: 'Sunlight access' },
      { value: 'water', label: 'Water feature', description: 'Fountain, aquarium' },
      { value: 'wood', label: 'Natural wood', description: 'Furniture, floors' },
      { value: 'outdoor_view', label: 'View of outdoors', description: 'Windows to nature' },
      { value: 'outdoor_access', label: 'Easy outdoor access', description: 'Yard, patio, balcony' },
      { value: 'none', label: 'Limited nature elements', description: 'Room for improvement' }
    ]
  }
];

// ==================== Village Wiki (L3 - Memory/Structure) ====================

export const VILLAGE_WIKI_QUESTIONS: HouseholdOnboardingQuestion[] = [
  {
    id: 'village_emergency_contacts',
    question: 'Who are your emergency contacts? (List name and relationship)',
    questionType: 'text',
    placeholder: 'Example: "Grandma Joan (maternal grandmother), Uncle Mike (neighbor/family friend)"',
    helperText: 'People who can be called in an emergency',
    required: true
  },
  {
    id: 'village_local_support',
    question: 'Who in your local community can help in a pinch?',
    questionType: 'text',
    placeholder: 'Example: "Neighbors: The Johnsons at #42, the Garcias next door"',
    helperText: 'Neighbors, nearby family, friends who can help with pickups, etc.',
    required: false
  },
  {
    id: 'village_important_codes',
    question: 'What codes or passwords should be documented? (Don\'t enter actual codes, just list what exists)',
    questionType: 'checkbox',
    helperText: 'We\'ll help you create a secure place to store these',
    required: false,
    allowMultiple: true,
    options: [
      { value: 'garage', label: 'Garage code', description: 'Garage door access' },
      { value: 'alarm', label: 'Alarm system', description: 'Home security code' },
      { value: 'wifi', label: 'WiFi password', description: 'Network access' },
      { value: 'lockbox', label: 'Lockbox/key safe', description: 'Spare key access' },
      { value: 'school', label: 'School pickup code', description: 'Authorization word' },
      { value: 'medical', label: 'Medical portal login', description: 'Health records access' }
    ]
  },
  {
    id: 'village_quirks',
    question: 'What household quirks would a babysitter or guest need to know?',
    questionType: 'text',
    placeholder: 'Example: "Jiggle the handle to flush the upstairs toilet" or "The back door sticks"',
    helperText: 'The things that only people who live there know',
    required: false
  }
];

// ==================== Roles & Rituals (L4 - Execution) ====================

export const ROLES_RITUALS_QUESTIONS: HouseholdOnboardingQuestion[] = [
  {
    id: 'roles_mental_load',
    question: 'Who primarily carries the mental load for these areas?',
    questionType: 'text',
    placeholder: 'Example: "Meals: Partner A, Schedules: Partner B, Finances: Shared"',
    helperText: 'Mental load = remembering, planning, and tracking (not just doing)',
    required: true
  },
  {
    id: 'roles_pain_points',
    question: 'Which household areas cause the most friction? (Select top 3)',
    questionType: 'checkbox',
    helperText: 'Where do responsibilities feel unbalanced or unclear?',
    required: true,
    allowMultiple: true,
    minSelections: 1,
    maxSelections: 3,
    options: [
      { value: 'meals', label: 'Meal planning & cooking', description: 'Who decides, shops, cooks?' },
      { value: 'cleaning', label: 'Cleaning & tidying', description: 'Daily mess management' },
      { value: 'laundry', label: 'Laundry', description: 'Washing, folding, putting away' },
      { value: 'schedules', label: 'Family calendar', description: 'Tracking activities, appointments' },
      { value: 'finances', label: 'Finances & bills', description: 'Budget, payments, planning' },
      { value: 'childcare', label: 'Childcare logistics', description: 'Pickups, activities, homework' },
      { value: 'emotional', label: 'Emotional support', description: 'Who notices and responds to needs?' },
      { value: 'maintenance', label: 'Home maintenance', description: 'Repairs, yard, upkeep' }
    ]
  },
  {
    id: 'roles_standards',
    question: 'Where do you have different standards of "done"?',
    questionType: 'text',
    placeholder: 'Example: "I think dishes should be done right after dinner, partner thinks anytime before bed is fine"',
    helperText: 'Areas where expectations don\'t align',
    required: false
  },
  {
    id: 'rituals_weekly',
    question: 'What weekly rituals does your family have (or want to have)?',
    questionType: 'checkbox',
    helperText: 'Rituals create predictability and connection',
    required: true,
    allowMultiple: true,
    options: [
      { value: 'family_dinner', label: 'Weekly family dinner', description: 'Everyone together for a meal' },
      { value: 'movie_night', label: 'Movie/game night', description: 'Entertainment together' },
      { value: 'outdoor', label: 'Outdoor activity', description: 'Park, hike, bike ride' },
      { value: 'planning', label: 'Weekly planning session', description: 'Review calendar together' },
      { value: 'individual_time', label: 'One-on-one time', description: 'Each parent with each child' },
      { value: 'date_night', label: 'Date night', description: 'Partner connection time' },
      { value: 'religious', label: 'Religious/spiritual practice', description: 'Church, temple, meditation' },
      { value: 'chores', label: 'Group chore time', description: 'Everyone pitches in together' }
    ]
  },
  {
    id: 'rituals_when',
    question: 'When do (or could) these rituals happen?',
    questionType: 'text',
    placeholder: 'Example: "Friday movie night, Sunday family dinner, Saturday morning park time"',
    helperText: 'Anchor rituals to specific days when possible',
    required: false
  }
];

// ==================== Communication Rhythm (L2 - Processing) ====================

export const COMMUNICATION_RHYTHM_QUESTIONS: HouseholdOnboardingQuestion[] = [
  {
    id: 'comm_weekly_sync',
    question: 'Do you have a regular time to sync as partners/co-parents?',
    questionType: 'yes_no',
    helperText: 'A dedicated time to review the week, discuss issues, plan ahead',
    required: true
  },
  {
    id: 'comm_sync_day',
    question: 'What day works best for a weekly sync?',
    questionType: 'day_picker',
    helperText: 'Pick a consistent day that works for both partners',
    required: false
  },
  {
    id: 'comm_conflict_style',
    question: 'How do you typically handle conflict? (Select the closest match)',
    questionType: 'multiple_choice',
    helperText: 'Understanding your pattern helps build better repair protocols',
    required: true,
    options: [
      { value: 'talk_immediately', label: 'Talk it out immediately', description: 'Want to resolve it right away' },
      { value: 'need_space', label: 'Need space first', description: 'Process alone, then discuss' },
      { value: 'avoid', label: 'Tend to avoid', description: 'Conflict feels uncomfortable' },
      { value: 'mixed', label: 'It depends', description: 'Different styles for different issues' }
    ]
  },
  {
    id: 'comm_cool_down',
    question: 'How much cool-down time do you typically need after a disagreement?',
    questionType: 'multiple_choice',
    helperText: 'This helps set expectations for repair timing',
    required: true,
    options: [
      { value: 'none', label: 'None - ready to talk right away', description: '0-5 minutes' },
      { value: 'short', label: 'A few minutes', description: '5-15 minutes' },
      { value: 'medium', label: 'About an hour', description: '30-60 minutes' },
      { value: 'long', label: 'Several hours or overnight', description: 'Need significant time' }
    ]
  },
  {
    id: 'comm_repair_phrase',
    question: 'Do you have a "repair phrase" or signal to pause a heated moment?',
    questionType: 'text',
    placeholder: 'Example: "I need a timeout" or "Can we pause and come back to this?"',
    helperText: 'A pre-agreed phrase that means "let\'s stop before this escalates"',
    required: false
  }
];

// ==================== Household Pulse (L5 - Outputs) ====================

export const HOUSEHOLD_PULSE_QUESTIONS: HouseholdOnboardingQuestion[] = [
  {
    id: 'pulse_clarity',
    question: 'How clear are roles, rules, and expectations in your household?',
    questionType: 'rating',
    helperText: '1 = Confusing/unclear, 5 = Crystal clear',
    required: true
  },
  {
    id: 'pulse_restoration',
    question: 'How well does your home support rest and recovery?',
    questionType: 'rating',
    helperText: '1 = Home feels draining, 5 = Home is a true sanctuary',
    required: true
  },
  {
    id: 'pulse_efficiency',
    question: 'How smoothly do daily routines and logistics run?',
    questionType: 'rating',
    helperText: '1 = Constant chaos, 5 = Runs like clockwork',
    required: true
  },
  {
    id: 'pulse_connection',
    question: 'How connected does your family feel to each other?',
    questionType: 'rating',
    helperText: '1 = Disconnected/distant, 5 = Deeply bonded',
    required: true
  }
];

// ==================== Section Configurations ====================

export const HOUSEHOLD_ONBOARDING_SECTIONS: HouseholdOnboardingSection[] = [
  {
    sectionId: 'home_charter',
    sectionName: HOUSEHOLD_SECTION_META.home_charter.name,
    sectionDescription: HOUSEHOLD_SECTION_META.home_charter.description,
    icon: HOUSEHOLD_SECTION_META.home_charter.icon,
    layerId: HOUSEHOLD_SECTION_META.home_charter.layer,
    questions: HOME_CHARTER_QUESTIONS,
    aiGenerationEnabled: true
  },
  {
    sectionId: 'sanctuary_map',
    sectionName: HOUSEHOLD_SECTION_META.sanctuary_map.name,
    sectionDescription: HOUSEHOLD_SECTION_META.sanctuary_map.description,
    icon: HOUSEHOLD_SECTION_META.sanctuary_map.icon,
    layerId: HOUSEHOLD_SECTION_META.sanctuary_map.layer,
    questions: SANCTUARY_MAP_QUESTIONS,
    aiGenerationEnabled: true
  },
  {
    sectionId: 'village_wiki',
    sectionName: HOUSEHOLD_SECTION_META.village_wiki.name,
    sectionDescription: HOUSEHOLD_SECTION_META.village_wiki.description,
    icon: HOUSEHOLD_SECTION_META.village_wiki.icon,
    layerId: HOUSEHOLD_SECTION_META.village_wiki.layer,
    questions: VILLAGE_WIKI_QUESTIONS,
    aiGenerationEnabled: true
  },
  {
    sectionId: 'roles_rituals',
    sectionName: HOUSEHOLD_SECTION_META.roles_rituals.name,
    sectionDescription: HOUSEHOLD_SECTION_META.roles_rituals.description,
    icon: HOUSEHOLD_SECTION_META.roles_rituals.icon,
    layerId: HOUSEHOLD_SECTION_META.roles_rituals.layer,
    questions: ROLES_RITUALS_QUESTIONS,
    aiGenerationEnabled: true
  },
  {
    sectionId: 'communication_rhythm',
    sectionName: HOUSEHOLD_SECTION_META.communication_rhythm.name,
    sectionDescription: HOUSEHOLD_SECTION_META.communication_rhythm.description,
    icon: HOUSEHOLD_SECTION_META.communication_rhythm.icon,
    layerId: HOUSEHOLD_SECTION_META.communication_rhythm.layer,
    questions: COMMUNICATION_RHYTHM_QUESTIONS,
    aiGenerationEnabled: true
  },
  {
    sectionId: 'household_pulse',
    sectionName: HOUSEHOLD_SECTION_META.household_pulse.name,
    sectionDescription: HOUSEHOLD_SECTION_META.household_pulse.description,
    icon: HOUSEHOLD_SECTION_META.household_pulse.icon,
    layerId: HOUSEHOLD_SECTION_META.household_pulse.layer,
    questions: HOUSEHOLD_PULSE_QUESTIONS,
    aiGenerationEnabled: false // Pulse is direct assessment, not AI-generated
  }
];

// ==================== Helper Functions ====================

/**
 * Get a specific section by ID
 */
export function getHouseholdSection(sectionId: HouseholdSectionId): HouseholdOnboardingSection | undefined {
  return HOUSEHOLD_ONBOARDING_SECTIONS.find(s => s.sectionId === sectionId);
}

/**
 * Get questions for a specific section
 */
export function getHouseholdSectionQuestions(sectionId: HouseholdSectionId): HouseholdOnboardingQuestion[] {
  const section = getHouseholdSection(sectionId);
  return section?.questions ?? [];
}

/**
 * Get total question count across all sections
 */
export function getTotalHouseholdQuestionCount(): number {
  return HOUSEHOLD_ONBOARDING_SECTIONS.reduce(
    (count, section) => count + section.questions.length,
    0
  );
}

/**
 * Get the recommended section order for onboarding
 */
export function getRecommendedSectionOrder(): HouseholdSectionId[] {
  return [
    'home_charter',      // Start with values/mission
    'sanctuary_map',     // Physical environment
    'village_wiki',      // Support network
    'roles_rituals',     // Responsibilities
    'communication_rhythm', // How we talk
    'household_pulse'    // Assessment/tracking
  ];
}
