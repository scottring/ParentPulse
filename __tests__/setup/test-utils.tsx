import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockAuthProvider, MockAuthContextValue } from './mocks/auth-context';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authContextValue?: Partial<MockAuthContextValue>;
}

/**
 * Custom render function that wraps components with all required providers
 */
function customRender(
  ui: ReactElement,
  { authContextValue, ...options }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MockAuthProvider value={authContextValue}>
        {children}
      </MockAuthProvider>
    );
  }

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...options })
  };
}

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override render with custom render
export { customRender as render };

// Export userEvent for convenience
export { userEvent };

/**
 * Helper to wait for async updates
 */
export async function waitForAsyncUpdates() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Helper to create mock Firestore timestamp
 */
export function createMockTimestamp(date: Date = new Date()) {
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0
  };
}

/**
 * Helper to create mock document reference
 */
export function createMockDocRef(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
    exists: () => true
  };
}

/**
 * Helper to create mock query snapshot
 */
export function createMockQuerySnapshot(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    empty: docs.length === 0,
    docs: docs.map(doc => ({
      id: doc.id,
      data: () => doc.data,
      exists: () => true
    })),
    size: docs.length
  };
}
