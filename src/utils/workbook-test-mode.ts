/**
 * Workbook Test Mode Utilities
 *
 * Helper functions for enabling test mode to avoid API costs during:
 * - Development
 * - Customer demonstrations (integrates with existing demo account)
 * - QA testing
 * - Load testing
 *
 * INTEGRATION WITH DEMO ACCOUNT:
 * This automatically enables test mode for the demo account (demo@relish.app)
 * so demos don't incur API costs.
 */

import { isDemoUser, isDemoMode, DEMO_ACCOUNT } from './demo';
import type { User } from '@/types';

/**
 * Check if test mode should be enabled based on environment
 */
export function shouldUseTestMode(): boolean {
  // Enable in development environment
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Check for explicit test mode flag
  if (process.env.NEXT_PUBLIC_WORKBOOK_TEST_MODE === 'true') {
    return true;
  }

  // Default: production mode (costs apply)
  return false;
}

/**
 * Check if a user should use test mode for workbook generation
 * Integrates with existing demo account system
 */
export function shouldUserUseTestMode(user: User | null): boolean {
  if (!user) return false;

  // Check if user is the demo account
  if (isDemoUser(user)) {
    return true;
  }

  // Check if demo mode is enabled via URL
  if (isDemoMode()) {
    return true;
  }

  // Check demo account email explicitly
  if (user.email === DEMO_ACCOUNT.email) {
    return true;
  }

  return false;
}

/**
 * Determine test mode for workbook generation
 */
export interface TestModeOptions {
  // Force test mode regardless of environment
  forceTestMode?: boolean;

  // Force production mode regardless of environment
  forceProductionMode?: boolean;

  // User object (integrates with demo account detection)
  user?: User | null;

  // Family information
  familyEmail?: string;
  familyDemoFlag?: boolean;

  // Override environment detection
  ignoreEnvironment?: boolean;
}

export function determineTestMode(options: TestModeOptions = {}): boolean {
  // Force flags take precedence
  if (options.forceTestMode) return true;
  if (options.forceProductionMode) return false;

  // Check if user is demo account (integrates with existing demo system)
  if (options.user && shouldUserUseTestMode(options.user)) {
    return true;
  }

  // Check family-level flags
  if (options.familyDemoFlag) return true;
  if (options.familyEmail === DEMO_ACCOUNT.email) return true;

  // Check environment (unless ignored)
  if (!options.ignoreEnvironment && shouldUseTestMode()) {
    return true;
  }

  // Default: production mode
  return false;
}

/**
 * Get estimated cost for workbook generation
 */
export function getWorkbookCost(testMode: boolean, tier: 'premium' | 'standard' | 'budget' | 'economy' = 'standard'): number {
  if (testMode) return 0;

  const costs = {
    premium: 1.14,
    standard: 0.38,
    budget: 0.225,
    economy: 0.115,
  };

  return costs[tier];
}

/**
 * Format cost for display
 */
export function formatWorkbookCost(testMode: boolean, tier: 'premium' | 'standard' | 'budget' | 'economy' = 'standard'): string {
  const cost = getWorkbookCost(testMode, tier);
  return cost === 0 ? 'Free (Test Mode)' : `$${cost.toFixed(2)}`;
}

/**
 * Example usage in workbook generation
 */
export interface GenerateWorkbookParams {
  familyId: string;
  personId: string;
  personName: string;
  personAge: number;
  manualId: string;
  relationshipType: string;

  // Optional: Test mode configuration
  testModeOptions?: TestModeOptions;
}

/**
 * Prepare parameters for Cloud Function call with automatic test mode detection
 */
export function prepareWorkbookParams(params: GenerateWorkbookParams) {
  const testMode = determineTestMode(params.testModeOptions || {});

  return {
    familyId: params.familyId,
    personId: params.personId,
    personName: params.personName,
    personAge: params.personAge,
    manualId: params.manualId,
    relationshipType: params.relationshipType,

    // Add test mode flag
    testMode: testMode,

    // Log for debugging
    _meta: {
      testMode: testMode,
      environment: process.env.NODE_ENV,
      estimatedCost: getWorkbookCost(testMode),
    },
  };
}
