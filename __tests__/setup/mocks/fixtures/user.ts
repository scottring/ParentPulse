import { User, UserRole } from '@/types';
import { createTimestamp } from '../firebase';

/**
 * Create a mock User for testing
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    userId: `user-${Date.now()}`,
    familyId: 'test-family-id',
    role: 'parent' as UserRole,
    name: 'Test User',
    email: 'test@example.com',
    createdAt: createTimestamp() as any,
    settings: {
      notifications: true,
      theme: 'light'
    },
    ...overrides
  };
}

/**
 * Create a mock parent user
 */
export function createMockParentUser(overrides: Partial<User> = {}): User {
  return createMockUser({
    role: 'parent',
    name: 'Test Parent',
    email: 'parent@example.com',
    ...overrides
  });
}

/**
 * Create a mock child user
 */
export function createMockChildUser(overrides: Partial<User> = {}): User {
  return createMockUser({
    role: 'child',
    name: 'Test Child',
    email: undefined,
    chipBalance: 50,
    dateOfBirth: createTimestamp(new Date('2015-01-01')) as any,
    ...overrides
  });
}

/**
 * Prebuilt fixtures
 */
export const userFixtures = {
  parentScott: createMockParentUser({
    userId: 'scott-id',
    familyId: 'kaufman-family',
    name: 'Scott',
    email: 'scott@example.com'
  }),
  parentIris: createMockParentUser({
    userId: 'iris-id',
    familyId: 'kaufman-family',
    name: 'Iris',
    email: 'iris@example.com'
  }),
  childElla: createMockChildUser({
    userId: 'ella-id',
    familyId: 'kaufman-family',
    name: 'Ella',
    chipBalance: 100
  }),
  childCaleb: createMockChildUser({
    userId: 'caleb-id',
    familyId: 'kaufman-family',
    name: 'Caleb',
    chipBalance: 75
  })
};
