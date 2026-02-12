import type { User, UserRole, OnboardingStatus } from '@/types/user';

const DEFAULT_ONBOARDING: OnboardingStatus = {
  introCompleted: true,
  layersCompleted: ['mind', 'context'],
  currentLayer: null,
  familyManualId: 'test-manual-id',
};

/**
 * Create a mock User for testing
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    userId: `user-${Date.now()}`,
    familyId: 'test-family-id',
    role: 'parent' as UserRole,
    displayName: 'Test User',
    email: 'test@example.com',
    onboardingStatus: DEFAULT_ONBOARDING,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock parent user
 */
export function createMockParentUser(overrides: Partial<User> = {}): User {
  return createMockUser({
    role: 'parent',
    displayName: 'Test Parent',
    email: 'parent@example.com',
    ...overrides,
  });
}

/**
 * Prebuilt fixtures
 */
export const userFixtures = {
  parentScott: createMockParentUser({
    userId: 'scott-id',
    familyId: 'kaufman-family',
    displayName: 'Scott',
    email: 'scott@example.com',
  }),
  parentIris: createMockParentUser({
    userId: 'iris-id',
    familyId: 'kaufman-family',
    displayName: 'Iris',
    email: 'iris@example.com',
  }),
};
