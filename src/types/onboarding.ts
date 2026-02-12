// Onboarding types — conversational onboarding flow

import { OnboardingPhaseId } from './user';

export interface ConversationTurn {
  role: 'system' | 'assistant' | 'user';
  content: string;
  timestamp: Date;
  extractedData?: Record<string, unknown>;
}

export interface Conversation {
  conversationId: string;
  familyId: string;
  userId: string;
  purpose: ConversationPurpose;
  manualId?: string;
  phaseId?: OnboardingPhaseId;
  turns: ConversationTurn[];
  status: 'active' | 'completed';
  createdAt: Date;
  updatedAt?: Date;
}

export type ConversationPurpose = 'onboarding' | 'coaching' | 'checkin' | 'facilitation' | 'refresh';

export interface OnboardingProgress {
  userId: string;
  familyId: string;
  introCompleted: boolean;
  phasesCompleted: OnboardingPhaseId[];
  currentPhase: OnboardingPhaseId | null;
  currentConversationId: string | null;
  familyManualId: string | null;
}
