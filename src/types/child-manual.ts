import { Timestamp } from 'firebase/firestore';

// ==================== Core Entities ====================

/**
 * Family - Container for parents and children
 */
export interface Family {
  familyId: string;
  createdBy: string; // userId of primary parent
  members: string[]; // userIds of all family members (parents + children)
  pendingInvites: PendingInvite[];
  createdAt: Timestamp;
}

export interface PendingInvite {
  email: string;
  role: 'parent' | 'child';
  sentAt: Timestamp;
  invitedBy: string; // userId
}

/**
 * Child - Basic child information
 */
export interface Child {
  childId: string;
  familyId: string;
  name: string;
  age?: number; // Calculated from dateOfBirth if provided
  dateOfBirth?: Timestamp;
  pronouns?: string;
  manualId?: string; // Reference to ChildManual
  createdBy: string; // Parent userId who added the child
  createdAt: Timestamp;
}

/**
 * ChildManual - The core operating manual for a child
 */
export interface ChildManual {
  manualId: string;
  childId: string;
  familyId: string;
  status: 'draft' | 'active';
  contributors: string[]; // Parent userIds who can edit

  // Import metadata
  importedFrom?: ImportMetadata;

  // Manual content sections
  triggers: Trigger[];
  whatWorks: Strategy[];
  whatDoesntWork: AvoidStrategy[];
  strengths: Strength[];
  contextNotes: string; // Free text: ADHD, therapy, sensory needs, etc.

  // Child's perspective (optional - from child questionnaire)
  childPerspective?: ChildPerspective;

  // Metadata
  lastUpdatedAt: Timestamp;
  lastUpdatedBy: string; // userId
  version: number; // Increment on each update
}

export interface ImportMetadata {
  fileNames: string[];
  uploadedAt: Timestamp;
  aiProcessingNotes?: string; // Any notes from AI processing
}

/**
 * ChildPerspective - Child's own answers from questionnaire
 */
export interface ChildPerspective {
  answers: Record<string, any>; // Question ID -> answer value
  completedAt: Timestamp;
  completedBy: string; // Parent userId who helped child complete it
}

/**
 * Trigger - What sets the child off
 */
export interface Trigger {
  id: string;
  text: string;
  severity: 1 | 2 | 3 | 4 | 5; // 1=mild, 5=severe
  examples?: string[]; // Specific instances
  addedBy: string; // userId
  addedAt: Timestamp;
}

/**
 * Strategy - What works (effective approaches)
 */
export interface Strategy {
  id: string;
  text: string;
  effectiveness: 1 | 2 | 3 | 4 | 5; // 1=not very, 5=very effective
  context?: string; // When/where it works best
  addedBy: string; // userId
  addedAt: Timestamp;
}

/**
 * AvoidStrategy - What doesn't work (approaches to avoid)
 */
export interface AvoidStrategy {
  id: string;
  text: string;
  addedBy: string; // userId
  addedAt: Timestamp;
}

/**
 * Strength - Positive attributes
 */
export interface Strength {
  id: string;
  text: string;
  addedBy: string; // userId
  addedAt: Timestamp;
}

/**
 * DailyObservation - Quick parent logs
 */
export interface DailyObservation {
  observationId: string;
  childId: string;
  familyId: string;
  userId: string; // Which parent logged this
  date: string; // YYYY-MM-DD format for easy querying
  text: string; // 1-3 sentences, informal
  aiSuggestions: AISuggestion[];
  createdAt: Timestamp;
}

/**
 * BehaviorObservation - Tracks specific situations and strategy effectiveness
 */
export interface BehaviorObservation {
  observationId: string;
  childId: string;
  familyId: string;
  userId: string; // Which parent logged this

  // What happened
  situation: string; // e.g., "bedtime", "homework", "leaving house"
  description: string; // Brief description of what happened

  // What strategy was tried (if any)
  strategyUsed?: {
    strategyId?: string; // Reference to Strategy from manual
    strategyText: string; // Text of the strategy (in case not from manual)
  };

  // How did it go
  outcome: 'worked_great' | 'worked_okay' | 'didnt_work' | 'made_worse'; // Emoji ratings: 😊 😐 😞 😡
  notes?: string; // Optional additional notes

  // Metadata
  createdAt: Timestamp;
  date: string; // YYYY-MM-DD for easy querying
}

export interface AISuggestion {
  type: 'add_trigger' | 'add_strategy' | 'update_effectiveness' | 'add_strength' | 'add_avoid_strategy';
  suggestedContent: SuggestedTrigger | SuggestedStrategy | SuggestedStrength | SuggestedAvoidStrategy | SuggestedEffectivenessUpdate;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: Timestamp;
  reviewedBy?: string; // userId
}

// Suggested content types
export interface SuggestedTrigger {
  text: string;
  severity: 1 | 2 | 3 | 4 | 5;
  examples?: string[];
}

export interface SuggestedStrategy {
  text: string;
  effectiveness: 1 | 2 | 3 | 4 | 5;
  context?: string;
}

export interface SuggestedAvoidStrategy {
  text: string;
}

export interface SuggestedStrength {
  text: string;
}

export interface SuggestedEffectivenessUpdate {
  strategyId: string;
  currentEffectiveness: 1 | 2 | 3 | 4 | 5;
  suggestedEffectiveness: 1 | 2 | 3 | 4 | 5;
  reason: string;
}

/**
 * CoachingSession - Real-time AI coaching chat
 */
export interface CoachingSession {
  sessionId: string;
  childId: string;
  familyId: string;
  userId: string; // Which parent initiated
  messages: ChatMessage[];
  outcome?: SessionOutcome;
  startedAt: Timestamp;
  endedAt?: Timestamp;
}

export interface ChatMessage {
  role: 'parent' | 'ai';
  content: string;
  timestamp: Timestamp;
  strategiesReferenced?: string[]; // Strategy IDs from manual
}

export interface SessionOutcome {
  helpful: boolean;
  note?: string;
  recordedAt: Timestamp;
}

// ==================== UI State Types ====================

/**
 * For displaying manual content with user-friendly info
 */
export interface ManualItemDisplay {
  id: string;
  text: string;
  rating?: number; // Severity or effectiveness
  addedByName: string; // User display name
  addedAt: Date;
  canEdit: boolean; // Whether current user can edit this item
}

/**
 * For the import flow
 */
export interface ImportFile {
  file: File;
  type: 'image' | 'pdf' | 'audio' | 'text';
  preview?: string; // For images
}

export interface ImportResult {
  manual: Partial<ChildManual>;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

// ==================== API Request/Response Types ====================

/**
 * Cloud Function: generateManualFromImport
 */
export interface GenerateManualRequest {
  childId: string;
  familyId: string;
  userId: string;
  extractedText: string[]; // From all uploaded files
  pastedText?: string; // Direct text input
}

export interface GenerateManualResponse {
  triggers: Omit<Trigger, 'id' | 'addedBy' | 'addedAt'>[];
  whatWorks: Omit<Strategy, 'id' | 'addedBy' | 'addedAt'>[];
  whatDoesntWork: Omit<AvoidStrategy, 'id' | 'addedBy' | 'addedAt'>[];
  strengths: Omit<Strength, 'id' | 'addedBy' | 'addedAt'>[];
  contextNotes: string;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

/**
 * Cloud Function: analyzeObservation
 */
export interface AnalyzeObservationRequest {
  observationText: string;
  childId: string;
  currentManual: ChildManual;
}

export interface AnalyzeObservationResponse {
  suggestions: Omit<AISuggestion, 'status' | 'reviewedAt' | 'reviewedBy'>[];
  patterns: string[]; // Human-readable pattern descriptions
}

/**
 * Cloud Function: chatCoach
 */
export interface ChatCoachRequest {
  childId: string;
  sessionId: string;
  parentMessage: string;
  manual: ChildManual;
  recentMessages: ChatMessage[]; // Last 5 messages for context
  recentObservations?: DailyObservation[]; // Last 3 observations
}

export interface ChatCoachResponse {
  aiMessage: string;
  strategiesReferenced: string[]; // Strategy IDs from manual
  suggestedFollowUps?: string[]; // Optional follow-up questions
}

// ==================== Form Types ====================

export interface AddChildForm {
  name: string;
  age?: number;
  dateOfBirth?: Date;
  pronouns?: string;
}

export interface InviteParentForm {
  email: string;
}

export interface EditTriggerForm {
  text: string;
  severity: 1 | 2 | 3 | 4 | 5;
  examples?: string;
}

export interface EditStrategyForm {
  text: string;
  effectiveness: 1 | 2 | 3 | 4 | 5;
  context?: string;
}

export interface DailyObservationForm {
  text: string;
}

// ==================== Utility Types ====================

export type ManualSection = 'triggers' | 'whatWorks' | 'whatDoesntWork' | 'strengths' | 'context';

export type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest' | 'alphabetical';

export interface FilterOptions {
  section?: ManualSection;
  addedBy?: string; // userId
  dateRange?: {
    start: Date;
    end: Date;
  };
  minRating?: number; // For triggers/strategies
}
