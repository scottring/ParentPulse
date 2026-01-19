import {
  RoleSection,
  RoleType,
  RoleTrigger,
  RoleStrategy,
  RoleBoundary,
  RolePattern,
  RoleProgressNote
} from '@/types/person-manual';
import { createTimestamp } from '../firebase';

/**
 * Create a mock RoleTrigger
 */
export function createMockTrigger(overrides: Partial<RoleTrigger> = {}): RoleTrigger {
  return {
    id: `trigger-${Date.now()}`,
    description: 'Test trigger description',
    context: 'When this happens',
    typicalResponse: 'They typically respond this way',
    severity: 'moderate',
    identifiedDate: createTimestamp() as any,
    identifiedBy: 'test-user-id',
    confirmedByOthers: [],
    ...overrides
  };
}

/**
 * Create a mock RoleStrategy
 */
export function createMockStrategy(overrides: Partial<RoleStrategy> = {}): RoleStrategy {
  return {
    id: `strategy-${Date.now()}`,
    description: 'Test strategy description',
    context: 'Use this when...',
    effectiveness: 4,
    addedDate: createTimestamp() as any,
    addedBy: 'test-user-id',
    sourceType: 'discovered',
    ...overrides
  };
}

/**
 * Create a mock RoleBoundary
 */
export function createMockBoundary(overrides: Partial<RoleBoundary> = {}): RoleBoundary {
  return {
    id: `boundary-${Date.now()}`,
    description: 'Test boundary description',
    category: 'negotiable',
    addedDate: createTimestamp() as any,
    addedBy: 'test-user-id',
    ...overrides
  };
}

/**
 * Create a mock RolePattern
 */
export function createMockPattern(overrides: Partial<RolePattern> = {}): RolePattern {
  return {
    id: `pattern-${Date.now()}`,
    description: 'Test pattern description',
    frequency: 'Daily',
    firstObserved: createTimestamp() as any,
    lastObserved: createTimestamp() as any,
    confidence: 'emerging',
    relatedEntries: [],
    identifiedBy: 'contributor',
    ...overrides
  };
}

/**
 * Create a mock RoleProgressNote
 */
export function createMockProgressNote(overrides: Partial<RoleProgressNote> = {}): RoleProgressNote {
  return {
    id: `note-${Date.now()}`,
    date: createTimestamp() as any,
    note: 'Test progress note',
    category: 'insight',
    addedBy: 'test-user-id',
    isPrivate: false,
    ...overrides
  };
}

/**
 * Create a mock RoleSection
 */
export function createMockRoleSection(overrides: Partial<RoleSection> = {}): RoleSection {
  return {
    roleSectionId: `role-section-${Date.now()}`,
    manualId: 'test-manual-id',
    personId: 'test-person-id',
    familyId: 'test-family-id',

    roleType: 'parent' as RoleType,
    roleTitle: 'Parent to Test Child',
    roleDescription: 'Operating manual for understanding and supporting Test Child',

    relatedPersonId: 'test-person-id',
    relatedPersonName: 'Test Child',

    contributors: ['test-user-id'],
    contributorNames: ['Test User'],

    triggers: [],
    whatWorks: [],
    whatDoesntWork: [],
    strengths: [],
    challenges: [],
    importantContext: [],
    boundaries: [],
    emergingPatterns: [],
    progressNotes: [],

    createdAt: createTimestamp() as any,
    updatedAt: createTimestamp() as any,
    version: 1,
    lastEditedBy: 'test-user-id',

    relatedJournalEntries: [],
    relatedKnowledgeIds: [],
    ...overrides
  };
}

/**
 * Create a populated mock RoleSection with content
 */
export function createPopulatedRoleSection(overrides: Partial<RoleSection> = {}): RoleSection {
  return createMockRoleSection({
    triggers: [
      createMockTrigger({ id: 'trigger-1', description: 'Homework time', severity: 'moderate' }),
      createMockTrigger({ id: 'trigger-2', description: 'Transition times', severity: 'significant' })
    ],
    whatWorks: [
      createMockStrategy({ id: 'strategy-works-1', description: 'Give 5-minute warnings', effectiveness: 5 }),
      createMockStrategy({ id: 'strategy-works-2', description: 'Use visual schedules', effectiveness: 4 })
    ],
    whatDoesntWork: [
      createMockStrategy({ id: 'strategy-not-1', description: 'Rushing them', effectiveness: 1 })
    ],
    strengths: ['Creative', 'Kind', 'Curious'],
    challenges: ['Focus', 'Transitions'],
    importantContext: ['Needs extra time in the morning'],
    boundaries: [
      createMockBoundary({ id: 'boundary-1', description: 'No screens before homework', category: 'immovable' }),
      createMockBoundary({ id: 'boundary-2', description: 'Bedtime at 8pm on school nights', category: 'negotiable' })
    ],
    emergingPatterns: [
      createMockPattern({ id: 'pattern-1', description: 'Better after physical activity' })
    ],
    progressNotes: [
      createMockProgressNote({ id: 'note-1', note: 'Great week with transitions' })
    ],
    ...overrides
  });
}

/**
 * Prebuilt role section fixtures for different relationship types
 */
export const roleSectionFixtures = {
  parentToChild: createPopulatedRoleSection({
    roleSectionId: 'parent-to-ella-section',
    manualId: 'ella-manual-id',
    personId: 'ella-person-id',
    familyId: 'kaufman-family',
    roleType: 'parent',
    roleTitle: 'Parent to Ella',
    relatedPersonName: 'Ella'
  }),

  spouseToSpouse: createMockRoleSection({
    roleSectionId: 'spouse-to-iris-section',
    manualId: 'iris-manual-id',
    personId: 'iris-person-id',
    familyId: 'kaufman-family',
    roleType: 'spouse',
    roleTitle: 'Spouse to Iris',
    relatedPersonName: 'Iris',
    triggers: [
      createMockTrigger({ description: 'Work stress', severity: 'moderate' })
    ],
    whatWorks: [
      createMockStrategy({ description: 'Listen without solving', effectiveness: 5 })
    ]
  }),

  caregiverToElderlyParent: createMockRoleSection({
    roleSectionId: 'caregiver-to-mom-section',
    manualId: 'mom-manual-id',
    personId: 'mom-person-id',
    familyId: 'kaufman-family',
    roleType: 'caregiver',
    roleTitle: 'Caregiver for Mom',
    relatedPersonName: 'Mom'
  }),

  friendToFriend: createMockRoleSection({
    roleSectionId: 'friend-to-john-section',
    manualId: 'john-manual-id',
    personId: 'john-person-id',
    familyId: 'kaufman-family',
    roleType: 'friend',
    roleTitle: 'Friend of John',
    relatedPersonName: 'John'
  }),

  professional: createMockRoleSection({
    roleSectionId: 'professional-to-boss-section',
    manualId: 'boss-manual-id',
    personId: 'boss-person-id',
    familyId: 'kaufman-family',
    roleType: 'professional',
    roleTitle: 'Professional relationship with Boss',
    relatedPersonName: 'Boss'
  }),

  siblingToSibling: createMockRoleSection({
    roleSectionId: 'sibling-to-brother-section',
    manualId: 'brother-manual-id',
    personId: 'brother-person-id',
    familyId: 'kaufman-family',
    roleType: 'sibling',
    roleTitle: 'Sibling of Brother',
    relatedPersonName: 'Brother'
  }),

  emptySection: createMockRoleSection({
    roleSectionId: 'empty-section-id',
    manualId: 'empty-manual-id',
    personId: 'empty-person-id',
    familyId: 'kaufman-family',
    roleType: 'other',
    roleTitle: 'Relationship with Unknown'
  })
};
