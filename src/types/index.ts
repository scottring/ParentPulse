// Relish — Coherence Framework
// Central type exports and Firestore collection constants

// Re-export all types
export * from './user';
export * from './manual';
export * from './entry';
export * from './yearbook';
export * from './onboarding';
export * from './checkin';

// Firestore collection names
export const COLLECTIONS = {
  FAMILIES: 'families',
  USERS: 'users',
  MANUALS: 'manuals',
  ENTRIES: 'entries',
  YEARBOOKS: 'yearbooks',
  CONVERSATIONS: 'conversations',
  CHECKINS: 'checkins',
} as const;
