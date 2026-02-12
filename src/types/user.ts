// User & Family types for the domain-based Relish app

export type UserRole = 'parent' | 'partner' | 'child';

export type DomainId =
  | 'values'
  | 'communication'
  | 'connection'
  | 'roles'
  | 'organization'
  | 'adaptability'
  | 'problemSolving'
  | 'resources';

export type OnboardingPhaseId = 'foundation' | 'relationships' | 'operations' | 'strategy';

export interface User {
  userId: string;
  email: string;
  displayName: string;
  familyId: string;
  role: UserRole;
  onboardingStatus: OnboardingStatus;
  createdAt: Date;
  updatedAt?: Date;
}

export interface OnboardingStatus {
  introCompleted: boolean;
  phasesCompleted: OnboardingPhaseId[];
  currentPhase: OnboardingPhaseId | null;
  familyManualId: string | null;
  launchCompleted?: boolean;
}

export interface Family {
  familyId: string;
  name: string;
  memberIds: string[];
  createdAt: Date;
  updatedAt?: Date;
}

// Auth types
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
  displayName: string;
  familyName: string;
}
