import React, { createContext, useContext, ReactNode } from 'react';
import { vi } from 'vitest';
import { User, UserRole } from '@/types';
import { createTimestamp } from './firebase';

/**
 * Mock user factory
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    userId: 'test-user-id',
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
 * Mock auth context value
 */
export interface MockAuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  loginChild: ReturnType<typeof vi.fn>;
  registerChild: ReturnType<typeof vi.fn>;
  refreshUser: ReturnType<typeof vi.fn>;
  updateUserProfile: ReturnType<typeof vi.fn>;
  isParent: boolean;
  isChild: boolean;
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
    loginChild: vi.fn().mockResolvedValue(undefined),
    registerChild: vi.fn().mockResolvedValue(undefined),
    refreshUser: vi.fn().mockResolvedValue(undefined),
    updateUserProfile: vi.fn().mockResolvedValue(undefined),
    isParent: user?.role === 'parent',
    isChild: user?.role === 'child',
    ...overrides
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
    AuthProvider: ({ children }: { children: ReactNode }) => children
  }));

  return mockValue;
}

/**
 * Preset: Authenticated parent user
 */
export const authenticatedParentUser = createMockAuthContextValue({
  user: createMockUser({ role: 'parent' }),
  isParent: true,
  isChild: false
});

/**
 * Preset: Authenticated child user
 */
export const authenticatedChildUser = createMockAuthContextValue({
  user: createMockUser({ role: 'child', email: undefined }),
  isParent: false,
  isChild: true
});

/**
 * Preset: Unauthenticated user
 */
export const unauthenticatedUser = createMockAuthContextValue({
  user: null,
  isParent: false,
  isChild: false
});

/**
 * Preset: Loading state
 */
export const loadingAuthState = createMockAuthContextValue({
  user: null,
  loading: true,
  isParent: false,
  isChild: false
});

/**
 * Preset: Error state
 */
export const errorAuthState = createMockAuthContextValue({
  user: null,
  error: 'Authentication failed',
  isParent: false,
  isChild: false
});
