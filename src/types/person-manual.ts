/**
 * Person-Centric Operating Manual System
 *
 * Architecture:
 * - Person: Core entity (Scott, Iris, Ella, Caleb)
 * - PersonManual: One per person, contains all role sections
 * - RoleSection: Multiple per person, represents one relationship role
 *   - "Scott as Father to Ella" (contributors: Scott, Ella)
 *   - "Scott as Spouse to Iris" (contributors: Scott, Iris)
 *
 * Key Benefits:
 * 1. One person = one cohesive manual
 * 2. Roles are context-specific sections
 * 3. Collaborative editing - both people in relationship contribute
 * 4. Living document - roles evolve over time
 * 5. Strategic plans target person + specific role
 */

import { Timestamp } from 'firebase/firestore';

// ==================== Relationship Types ====================

/**
 * Relationship Type - Used to determine which section templates a person gets
 * This is separate from RoleType which describes roles within manual sections
 */
export type RelationshipType =
  | 'child'
  | 'spouse'
  | 'elderly_parent'
  | 'friend'
  | 'professional'
  | 'sibling'
  | 'other';

// ==================== Core Person Entity ====================

export interface Person {
  personId: string;
  familyId: string;

  // Basic identity
  name: string;
  dateOfBirth?: Timestamp;
  avatarUrl?: string;
  pronouns?: string;

  // Relationship context - determines which section templates they get
  relationshipType?: RelationshipType;

  // Manual reference
  hasManual: boolean;
  manualId?: string;

  // Metadata
  addedAt: Timestamp;
  addedByUserId: string;

  // Person-specific data (optional)
  childData?: {
    chipBalance: number;
    schoolGrade?: string;
  };
}

// ==================== Person Manual ====================

export interface PersonManual {
  manualId: string;
  familyId: string;
  personId: string;
  personName: string; // Denormalized for easy display

  // Manual metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number;

  // Role sections (stored as subcollection, count tracked here)
  roleSectionCount: number;
  activeRoles: string[]; // Array of role IDs for quick lookup

  // Living document tracking
  lastEditedAt: Timestamp;
  lastEditedBy: string; // User ID

  // Summary statistics
  totalTriggers: number;
  totalStrategies: number;
  activePlansCount: number;
}

// ==================== Role Section ====================

export type RoleType = 'parent' | 'child' | 'spouse' | 'sibling' | 'friend' | 'professional' | 'caregiver' | 'pet_owner' | 'other';

export interface RoleSection {
  roleSectionId: string;
  manualId: string;
  familyId: string;

  // Role definition
  roleType: RoleType;
  roleTitle: string; // "Father to Ella", "Spouse to Iris", "Manager of Team"
  roleDescription?: string;

  // Role-specific overview (collaborative description of the person in this role)
  roleOverview?: string; // Rich text description of how this person shows up in this role
  // Contributors can each add their perspective on the person in this relationship

  // Relationship context
  relatedPersonId?: string; // The other person in this relationship (if applicable)
  relatedPersonName?: string; // Denormalized

  // Contributors - people who can edit this section
  contributors: string[]; // Array of person IDs
  contributorNames: string[]; // Denormalized for display

  // Role-specific content
  triggers: RoleTrigger[];
  whatWorks: RoleStrategy[];
  whatDoesntWork: RoleStrategy[];
  strengths: string[];
  challenges: string[];

  // Context and notes
  importantContext: string[]; // Key facts about this role
  boundaries?: RoleBoundary[];

  // Dynamic content
  emergingPatterns: RolePattern[];
  progressNotes: RoleProgressNote[];

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number;
  lastEditedBy: string; // User ID

  // References
  relatedJournalEntries: string[];
  relatedKnowledgeIds: string[];
  activeStrategicPlanId?: string;
}

// ==================== Role-Specific Content Types ====================

export interface RoleTrigger {
  id: string;
  description: string;
  context: string; // When/where this happens
  typicalResponse: string; // How the person typically reacts
  deescalationStrategy?: string; // What helps
  severity: 'mild' | 'moderate' | 'significant';
  identifiedDate: Timestamp;
  identifiedBy: string; // Person ID who added this
  confirmedByOthers: string[]; // Other contributors who confirmed this
}

export interface RoleStrategy {
  id: string;
  description: string;
  context: string; // When to use this
  effectiveness: 1 | 2 | 3 | 4 | 5;
  addedDate: Timestamp;
  addedBy: string; // Person ID
  sourceType: 'discovered' | 'recommended' | 'professional' | 'knowledge_base';
  sourceId?: string;
  notes?: string;
}

export interface RoleBoundary {
  id: string;
  description: string;
  category: 'immovable' | 'negotiable' | 'preference';
  context?: string;
  consequences?: string; // What happens if crossed
  addedDate: Timestamp;
  addedBy: string; // Person ID
}

export interface RolePattern {
  id: string;
  description: string;
  frequency: string; // "Daily after school", "When stressed", etc.
  firstObserved: Timestamp;
  lastObserved: Timestamp;
  confidence: 'emerging' | 'consistent' | 'validated';
  relatedEntries: string[]; // Journal entry IDs
  identifiedBy: 'ai' | 'contributor';
}

export interface RoleProgressNote {
  id: string;
  date: Timestamp;
  note: string;
  category: 'improvement' | 'challenge' | 'insight' | 'milestone' | 'concern';
  addedBy: string; // Person ID or 'ai'
  isPrivate: boolean; // If true, only visible to the person themselves
}

// ==================== Role-Specific Profile Extensions ====================

// Parent Role (parenting a child)
export interface ParentRoleProfile {
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading-writing' | 'mixed';
  developmentalChallenges?: Array<{
    category: 'adhd' | 'anxiety' | 'sensory' | 'behavioral' | 'learning' | 'social' | 'other';
    description: string;
    severity: 'mild' | 'moderate' | 'significant';
    diagnosed: boolean;
  }>;
  schoolInfo?: {
    grade?: string;
    specialServices?: string[];
    iepOrFiveOFour?: boolean;
  };
}

// Spouse Role
export interface SpouseRoleProfile {
  communicationStyle?: 'direct' | 'indirect' | 'reflective' | 'emotional' | 'logical';
  conflictStyle?: 'avoider' | 'accommodator' | 'competitor' | 'compromiser' | 'collaborator';
  loveLanguages?: Array<'words_of_affirmation' | 'quality_time' | 'receiving_gifts' | 'acts_of_service' | 'physical_touch'>;
  processingTime?: 'immediate' | 'hours' | 'days';
  anniversaryDate?: Timestamp;
}

// Caregiver Role (caring for elderly parent)
export interface CaregiverRoleProfile {
  careLevel?: 'independent' | 'some_assistance' | 'significant_support' | 'full_care';
  memoryStatus?: 'sharp' | 'mild_decline' | 'moderate_decline' | 'significant_decline';
  healthConditions?: Array<{
    condition: string;
    medications: string[];
    specialConsiderations?: string;
  }>;
  dailyRoutine?: string;
}

// Union type for role profiles
export type RoleProfileExtension = ParentRoleProfile | SpouseRoleProfile | CaregiverRoleProfile | Record<string, never>;

// Add profile extension to RoleSection (optional, role-specific data)
export interface RoleSectionWithProfile extends RoleSection {
  roleProfile?: RoleProfileExtension;
}

// ==================== Strategic Plan (Role-Specific) ====================

export interface RoleBasedStrategicPlan {
  planId: string;
  familyId: string;

  // Target
  personId: string; // The person this plan is for
  personName: string;
  roleSectionId: string; // The specific role being addressed
  roleTitle: string; // "Father to Ella", "Spouse to Iris"

  // Plan details
  title: string;
  description: string;
  targetChallenge: string; // What we're working on
  duration: 30 | 60 | 90; // Days

  // Plan structure
  phases: PlanPhase[];
  milestones: Milestone[];

  // Approval & activation
  status: 'draft' | 'pending_approval' | 'active' | 'paused' | 'completed' | 'cancelled';
  startDate?: Timestamp;
  endDate?: Timestamp;

  // Contributors who need to approve (people in the role)
  approvalRequired: string[]; // Person IDs
  approvals: {
    [personId: string]: {
      approved: boolean;
      timestamp: Timestamp;
      notes?: string;
    }
  };

  // Generation context
  generatedAt: Timestamp;
  aiReasoning: string;

  // Related data
  relatedKnowledgeIds: string[];
  relatedJournalEntries: string[];

  // Adaptations over time
  adaptations: PlanAdaptation[];
}

export interface PlanPhase {
  phaseId: string;
  title: string;
  description: string;
  weekStart: number;
  weekEnd: number;
  focus: string;
  activities: PhaseActivity[];
  successCriteria: string[];
}

export interface PhaseActivity {
  activityId: string;
  title: string;
  description: string;
  frequency: 'daily' | 'every_other_day' | 'twice_week' | 'weekly';
  estimatedMinutes: number;
  requiredResources: Resource[];
}

export interface Resource {
  type: 'physical_item' | 'printable' | 'article' | 'video' | 'app';
  name: string;
  description?: string;
  url?: string;
  knowledgeId?: string;
  cost?: 'free' | 'low' | 'medium' | 'high';
}

export interface Milestone {
  milestoneId: string;
  title: string;
  description: string;
  targetWeek: number;
  achieved: boolean;
  achievedAt?: Timestamp;
  notes?: string;
}

export interface PlanAdaptation {
  adaptationId: string;
  timestamp: Timestamp;
  reason: string;
  changesMade: string;
  triggeredBy: 'contributor_request' | 'ai_analysis' | 'milestone_failure';
  requestedBy?: string; // Person ID
}

// ==================== Permissions & Collaboration ====================

export interface RoleContributorPermissions {
  roleSectionId: string;
  personId: string;

  // What they can do
  canView: boolean;
  canEdit: boolean;
  canAddTriggers: boolean;
  canAddStrategies: boolean;
  canAddNotes: boolean;
  canRequestPlan: boolean;

  // Special permissions
  canSeePrivateNotes: boolean; // Only the person themselves
  isRoleOwner: boolean; // The person whose manual this is
}

// Helper to determine permissions
export function getContributorPermissions(
  roleSection: RoleSection,
  personId: string,
  manualOwnerId: string
): RoleContributorPermissions {
  const isContributor = roleSection.contributors.includes(personId);
  const isOwner = personId === manualOwnerId;

  return {
    roleSectionId: roleSection.roleSectionId,
    personId,
    canView: isContributor || isOwner,
    canEdit: isContributor,
    canAddTriggers: isContributor,
    canAddStrategies: isContributor,
    canAddNotes: isContributor,
    canRequestPlan: isContributor,
    canSeePrivateNotes: isOwner,
    isRoleOwner: isOwner
  };
}

// ==================== Family Manual ====================

/**
 * Family Manual - Separate from person-centric manuals
 * Contains family-wide content like house rules, values, routines, and traditions
 */
export interface FamilyManual {
  familyId: string;

  // Sections
  houseRules: FamilyHouseRule[];
  familyValues: FamilyValue[];
  routines: FamilyRoutine[];
  traditions: FamilyTradition[];

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number;
  lastEditedBy: string; // User ID
}

export interface FamilyHouseRule {
  id: string;
  rule: string;
  reasoning: string;
  consequences: string;
  appliesTo: 'everyone' | 'adults' | 'children' | 'specific';
  specificPeople?: string[]; // Person IDs if appliesTo is 'specific'
  nonNegotiable: boolean;
  addedDate: Timestamp;
  addedBy: string; // User ID
}

export interface FamilyValue {
  id: string;
  value: string;
  description: string;
  howWeShowIt: string; // How this value manifests in daily life
  addedDate: Timestamp;
  addedBy: string; // User ID
}

export interface FamilyRoutine {
  id: string;
  title: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'annual';
  timing: string; // e.g., "7:00 AM", "Sunday evenings", "Every spring"
  steps?: string[];
  notes?: string;
  addedDate: Timestamp;
  addedBy: string; // User ID
}

export interface FamilyTradition {
  id: string;
  title: string;
  description: string;
  occasion: string; // "Birthday", "Christmas", "First day of school", etc.
  howWeCelebrate: string;
  significance: string; // Why this matters to the family
  addedDate: Timestamp;
  addedBy: string; // User ID
}

// ==================== Firestore Collections ====================

export const PERSON_MANUAL_COLLECTIONS = {
  PEOPLE: 'people',
  PERSON_MANUALS: 'person_manuals',
  ROLE_SECTIONS: 'role_sections', // Subcollection under person_manuals
  ROLE_BASED_PLANS: 'role_based_strategic_plans'
} as const;
