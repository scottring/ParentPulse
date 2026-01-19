import { Person, RelationshipType } from '@/types/person-manual';
import { createTimestamp } from '../firebase';

/**
 * Create a mock Person for testing
 */
export function createMockPerson(overrides: Partial<Person> = {}): Person {
  return {
    personId: `person-${Date.now()}`,
    familyId: 'test-family-id',
    name: 'Test Person',
    hasManual: false,
    addedAt: createTimestamp() as any,
    addedByUserId: 'test-user-id',
    ...overrides
  };
}

/**
 * Create a mock child person
 */
export function createMockChildPerson(overrides: Partial<Person> = {}): Person {
  return createMockPerson({
    name: 'Test Child',
    relationshipType: 'child' as RelationshipType,
    dateOfBirth: createTimestamp(new Date('2015-01-01')) as any,
    childData: {
      chipBalance: 50,
      schoolGrade: '3rd'
    },
    ...overrides
  });
}

/**
 * Create a mock spouse person
 */
export function createMockSpousePerson(overrides: Partial<Person> = {}): Person {
  return createMockPerson({
    name: 'Test Spouse',
    relationshipType: 'spouse' as RelationshipType,
    pronouns: 'they/them',
    ...overrides
  });
}

/**
 * Create a mock elderly parent person
 */
export function createMockElderlyParentPerson(overrides: Partial<Person> = {}): Person {
  return createMockPerson({
    name: 'Test Parent',
    relationshipType: 'elderly_parent' as RelationshipType,
    dateOfBirth: createTimestamp(new Date('1950-01-01')) as any,
    ...overrides
  });
}

/**
 * Create a mock friend person
 */
export function createMockFriendPerson(overrides: Partial<Person> = {}): Person {
  return createMockPerson({
    name: 'Test Friend',
    relationshipType: 'friend' as RelationshipType,
    ...overrides
  });
}

/**
 * Create a mock professional person
 */
export function createMockProfessionalPerson(overrides: Partial<Person> = {}): Person {
  return createMockPerson({
    name: 'Test Professional',
    relationshipType: 'professional' as RelationshipType,
    ...overrides
  });
}

/**
 * Create a mock sibling person
 */
export function createMockSiblingPerson(overrides: Partial<Person> = {}): Person {
  return createMockPerson({
    name: 'Test Sibling',
    relationshipType: 'sibling' as RelationshipType,
    ...overrides
  });
}

/**
 * Prebuilt person fixtures
 */
export const personFixtures = {
  childElla: createMockChildPerson({
    personId: 'ella-person-id',
    familyId: 'kaufman-family',
    name: 'Ella',
    hasManual: true,
    manualId: 'ella-manual-id',
    childData: {
      chipBalance: 100,
      schoolGrade: '5th'
    }
  }),
  childCaleb: createMockChildPerson({
    personId: 'caleb-person-id',
    familyId: 'kaufman-family',
    name: 'Caleb',
    hasManual: true,
    manualId: 'caleb-manual-id',
    childData: {
      chipBalance: 75,
      schoolGrade: '2nd'
    }
  }),
  spouseIris: createMockSpousePerson({
    personId: 'iris-person-id',
    familyId: 'kaufman-family',
    name: 'Iris',
    hasManual: true,
    manualId: 'iris-manual-id',
    pronouns: 'she/her'
  }),
  elderlyParentMom: createMockElderlyParentPerson({
    personId: 'mom-person-id',
    familyId: 'kaufman-family',
    name: 'Mom',
    hasManual: false
  }),
  friendJohn: createMockFriendPerson({
    personId: 'john-person-id',
    familyId: 'kaufman-family',
    name: 'John',
    hasManual: false
  }),
  professionalBoss: createMockProfessionalPerson({
    personId: 'boss-person-id',
    familyId: 'kaufman-family',
    name: 'Boss',
    hasManual: false
  }),
  siblingBrother: createMockSiblingPerson({
    personId: 'brother-person-id',
    familyId: 'kaufman-family',
    name: 'Brother',
    hasManual: false
  }),
  newPersonNoManual: createMockChildPerson({
    personId: 'new-person-id',
    familyId: 'kaufman-family',
    name: 'New Person',
    hasManual: false,
    manualId: undefined
  })
};
