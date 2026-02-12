import React, { createContext, useContext, ReactNode } from 'react';
import { vi } from 'vitest';
import type { User, UserRole, OnboardingStatus } from '@/types/user';

const DEFAULT_ONBOARDING: OnboardingStatus = {
  introCompleted: true,
  layersCompleted: ['mind', 'context'],
  currentLayer: null,
  familyManualId: 'test-manual-id',
};

/**
 * Mock user factory
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    userId: 'test-user-id',
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
 * Mock auth context value
 */
export interface MockAuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  refreshUser: ReturnType<typeof vi.fn>;
  updateUserProfile: ReturnType<typeof vi.fn>;
  resetPassword: ReturnType<typeof vi.fn>;
}

/**
 * Create default mock auth context value
 */
export function createMockAuthContextValue(overrides: Partial<MockAuthContextValue> = {}): MockAuthContextValue {
  const user = overrides.user ?? createMockUser();

  return {
    user,
    loading: false,
    error: null,
    login: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    refreshUser: vi.fn().mockResolvedValue(undefined),
    updateUserProfile: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * Mock AuthContext
 */
const MockAuthContext = createContext<MockAuthContextValue | undefined>(undefined);

/**
 * Mock AuthProvider for testing
 */
interface MockAuthProviderProps {
  children: ReactNode;
  value?: Partial<MockAuthContextValue>;
}

export function MockAuthProvider({ children, value }: MockAuthProviderProps) {
  const contextValue = createMockAuthContextValue(value);

  return (
    <MockAuthContext.Provider value={contextValue}>
      {children}
    </MockAuthContext.Provider>
  );
}

/**
 * Mock useAuth hook for testing
 */
export function useMockAuth(): MockAuthContextValue {
  const context = useContext(MockAuthContext);
  if (context === undefined) {
    throw new Error('useMockAuth must be used within a MockAuthProvider');
  }
  return context;
}

/**
 * Helper to mock the useAuth hook in tests
 */
export function mockUseAuth(overrides: Partial<MockAuthContextValue> = {}) {
  const mockValue = createMockAuthContextValue(overrides);

  vi.mock('@/context/AuthContext', () => ({
    useAuth: () => mockValue,
    AuthProvider: ({ children }: { children: ReactNode }) => children,
  }));

  return mockValue;
}

/**
 * Preset: Authenticated parent user
 */
export const authenticatedParentUser = createMockAuthContextValue({
  user: createMockUser({ role: 'parent' }),
});

/**
 * Preset: Unauthenticated user
 */
export const unauthenticatedUser = createMockAuthContextValue({
  user: null,
});

/**
 * Preset: Loading state
 */
export const loadingAuthState = createMockAuthContextValue({
  user: null,
  loading: true,
});

/**
 * Preset: New user (intro not completed)
 */
export const newUser = createMockAuthContextValue({
  user: createMockUser({
    onboardingStatus: {
      introCompleted: false,
      layersCompleted: [],
      currentLayer: null,
      familyManualId: null,
    },
  }),
});
