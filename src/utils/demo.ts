/**
 * Demo Mode Utilities
 *
 * Utilities for managing demo account functionality
 */

import { User } from '@/types';

// Demo account credentials
export const DEMO_ACCOUNT = {
  email: 'demo@relish.app',
  password: 'demo123456',
  name: 'Demo Parent',
  familyName: 'Demo Family'
} as const;

// Demo child profile
export const DEMO_CHILD = {
  name: 'Alex',
  age: 8,
  relationshipType: 'child' as const
} as const;

/**
 * Check if current user is a demo account
 */
export function isDemoUser(user: User | null): boolean {
  if (!user) return false;

  // Check if user email matches demo account
  if (user.email === DEMO_ACCOUNT.email) {
    return true;
  }

  // Check for demo flag in user document
  if (user.isDemo === true) {
    return true;
  }

  return false;
}

/**
 * Check if running in demo mode (via URL parameter)
 */
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;

  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('demo') === 'true';
}

/**
 * Add demo mode parameter to URL
 */
export function addDemoModeToUrl(url: string): string {
  const urlObj = new URL(url, window.location.origin);
  urlObj.searchParams.set('demo', 'true');
  return urlObj.pathname + urlObj.search;
}

/**
 * Remove demo mode parameter from URL
 */
export function removeDemoModeFromUrl(url: string): string {
  const urlObj = new URL(url, window.location.origin);
  urlObj.searchParams.delete('demo');
  return urlObj.pathname + urlObj.search;
}

/**
 * Navigate to demo mode
 */
export function enterDemoMode() {
  if (typeof window === 'undefined') return;

  const currentPath = window.location.pathname;
  const newUrl = addDemoModeToUrl(currentPath);
  window.history.pushState({}, '', newUrl);
}

/**
 * Exit demo mode
 */
export function exitDemoMode() {
  if (typeof window === 'undefined') return;

  const currentPath = window.location.pathname;
  const newUrl = removeDemoModeFromUrl(currentPath);
  window.history.pushState({}, '', newUrl);
}
