/**
 * Test data for household onboarding E2E tests
 *
 * These values are used to programmatically complete the onboarding flow.
 * Answers are organized by section and question ID.
 */

export const SECTIONS_ORDER = [
  'home_charter',
  'sanctuary_map',
  'village_wiki',
  'roles_rituals',
  'communication_rhythm',
  'household_pulse',
] as const;

export type SectionId = typeof SECTIONS_ORDER[number];

/**
 * Test answers for each section, keyed by question ID
 */
export const TEST_ANSWERS: Record<SectionId, Record<string, unknown>> = {
  // Home Charter (5 questions)
  home_charter: {
    charter_mission: 'We are a family that prioritizes connection, supports each other\'s growth, and welcomes adventure.',
    charter_non_negotiables: ['safety_first', 'kindness', 'honesty'],
    charter_custom_non_negotiables: 'We always say goodbye before leaving the house.',
    charter_desired_feelings: ['calm', 'safe', 'connected', 'joyful'],
    charter_values: 'Kindness, Curiosity, Perseverance',
  },

  // Sanctuary Map (6 questions)
  sanctuary_map: {
    sanctuary_light_quality: 4,
    sanctuary_light_issues: 'The kitchen is sometimes too dark for homework in the evening.',
    sanctuary_sound_sources: ['traffic', 'kids_play'],
    sanctuary_quiet_zone: true,
    sanctuary_quiet_zone_location: 'Reading nook in the living room corner',
    sanctuary_nature_elements: ['plants', 'natural_light', 'outdoor_access'],
  },

  // Village Wiki (4 questions)
  village_wiki: {
    village_emergency_contacts: 'Grandma Joan (maternal grandmother), Uncle Mike (neighbor/family friend)',
    village_local_support: 'The Johnsons at #42, the Garcias next door',
    village_important_codes: ['garage', 'wifi'],
    village_quirks: 'Jiggle the handle to flush the upstairs toilet. The back door sticks in humid weather.',
  },

  // Roles & Rituals (5 questions)
  roles_rituals: {
    roles_mental_load: 'Meals: Partner A, Schedules: Partner B, Finances: Shared',
    roles_pain_points: ['meals', 'cleaning', 'schedules'],
    roles_standards: 'I think dishes should be done right after dinner, partner thinks anytime before bed is fine.',
    rituals_weekly: ['family_dinner', 'movie_night', 'outdoor'],
    rituals_when: 'Friday movie night, Sunday family dinner, Saturday morning park time',
  },

  // Communication Rhythm (5 questions)
  communication_rhythm: {
    comm_weekly_sync: true,
    comm_sync_day: 0, // Sunday (0-indexed)
    comm_conflict_style: 'need_space',
    comm_cool_down: 'medium',
    comm_repair_phrase: 'Can we pause and come back to this when we\'re both calmer?',
  },

  // Household Pulse (4 questions - rating only)
  household_pulse: {
    pulse_clarity: 4,
    pulse_restoration: 4,
    pulse_efficiency: 3,
    pulse_connection: 4,
  },
};

/**
 * Question metadata for each section
 * Used to determine how to interact with each question type
 */
export const QUESTION_TYPES: Record<SectionId, Record<string, string>> = {
  home_charter: {
    charter_mission: 'text',
    charter_non_negotiables: 'checkbox',
    charter_custom_non_negotiables: 'text',
    charter_desired_feelings: 'checkbox',
    charter_values: 'text',
  },
  sanctuary_map: {
    sanctuary_light_quality: 'rating',
    sanctuary_light_issues: 'text',
    sanctuary_sound_sources: 'checkbox',
    sanctuary_quiet_zone: 'yes_no',
    sanctuary_quiet_zone_location: 'text',
    sanctuary_nature_elements: 'checkbox',
  },
  village_wiki: {
    village_emergency_contacts: 'text',
    village_local_support: 'text',
    village_important_codes: 'checkbox',
    village_quirks: 'text',
  },
  roles_rituals: {
    roles_mental_load: 'text',
    roles_pain_points: 'checkbox',
    roles_standards: 'text',
    rituals_weekly: 'checkbox',
    rituals_when: 'text',
  },
  communication_rhythm: {
    comm_weekly_sync: 'yes_no',
    comm_sync_day: 'day_picker',
    comm_conflict_style: 'multiple_choice',
    comm_cool_down: 'multiple_choice',
    comm_repair_phrase: 'text',
  },
  household_pulse: {
    pulse_clarity: 'rating',
    pulse_restoration: 'rating',
    pulse_efficiency: 'rating',
    pulse_connection: 'rating',
  },
};

/**
 * Question order for each section (in the order they appear)
 */
export const QUESTION_ORDER: Record<SectionId, string[]> = {
  home_charter: [
    'charter_mission',
    'charter_non_negotiables',
    'charter_custom_non_negotiables',
    'charter_desired_feelings',
    'charter_values',
  ],
  sanctuary_map: [
    'sanctuary_light_quality',
    'sanctuary_light_issues',
    'sanctuary_sound_sources',
    'sanctuary_quiet_zone',
    'sanctuary_quiet_zone_location',
    'sanctuary_nature_elements',
  ],
  village_wiki: [
    'village_emergency_contacts',
    'village_local_support',
    'village_important_codes',
    'village_quirks',
  ],
  roles_rituals: [
    'roles_mental_load',
    'roles_pain_points',
    'roles_standards',
    'rituals_weekly',
    'rituals_when',
  ],
  communication_rhythm: [
    'comm_weekly_sync',
    'comm_sync_day',
    'comm_conflict_style',
    'comm_cool_down',
    'comm_repair_phrase',
  ],
  household_pulse: [
    'pulse_clarity',
    'pulse_restoration',
    'pulse_efficiency',
    'pulse_connection',
  ],
};

/**
 * Demo user credentials
 */
export const DEMO_USER = {
  email: 'demo@relish.app',
  password: 'demo123456',
};
