import { Timestamp } from 'firebase/firestore';
import type { BudgetConfig } from './ai-usage';

// ==================== User & Family Types ====================

export type UserRole = 'parent' | 'child';

export interface User {
  userId: string;
  familyId: string;
  role: UserRole;
  name: string;
  email?: string;
  dateOfBirth?: Timestamp;
  avatarUrl?: string;
  isDemo?: boolean;
  createdAt: Timestamp;
  settings: {
    notifications: boolean;
    theme: 'light' | 'dark';
  };
}

export interface Family {
  familyId: string;
  name: string;
  createdBy: string;
  members: string[];
  pendingInvites: PendingInvite[];
  createdAt: Timestamp;
  aiBudget?: BudgetConfig;
}

export interface PendingInvite {
  email: string;
  role: 'parent' | 'child';
  sentAt: Timestamp;
  invitedBy: string;
}

// ==================== Authentication Types ====================

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationData {
  email: string;
  password: string;
  name: string;
  familyName: string;
  isDemo?: boolean;
}

export interface ChildRegistrationData {
  name: string;
  dateOfBirth: Date;
  username: string;
  pin: string;
}

// ==================== Onboarding Content Types ====================

export type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'reading-writing' | 'mixed';
export type ChallengeCategory = 'adhd' | 'anxiety' | 'sensory' | 'behavioral' | 'learning' | 'social' | 'other';
export type ChallengeSeverity = 'mild' | 'moderate' | 'significant';

export interface ChildChallenge {
  id: string;
  category: ChallengeCategory;
  description: string;
  severity: ChallengeSeverity;
  diagnosed: boolean;
  professionalSupport: boolean;
  notes?: string;
  identifiedDate: Timestamp;
}

// ==================== Firestore Collections ====================

export const COLLECTIONS = {
  FAMILIES: 'families',
  USERS: 'users',
  CONTRIBUTIONS: 'contributions',
  COACHING_SESSIONS: 'coaching_sessions',
} as const;
