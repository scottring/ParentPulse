/**
 * Manual Initialization Utilities
 *
 * Creates ONE comprehensive role section when a person manual is created
 * The role section contains all content: triggers, what works, boundaries, etc.
 */

import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { RelationshipType, RoleSection, PERSON_MANUAL_COLLECTIONS, RoleType } from '@/types/person-manual';

interface CreateManualSectionsParams {
  manualId: string;
  personId: string;
  personName: string;
  familyId: string;
  userId: string;
  relationshipType?: RelationshipType;
}

/**
 * Map relationship type to role type
 */
function relationshipToRoleType(relType: RelationshipType): RoleType {
  switch (relType) {
    case 'child': return 'parent'; // I am parenting this child
    case 'spouse': return 'spouse';
    case 'elderly_parent': return 'caregiver';
    case 'friend': return 'friend';
    case 'professional': return 'professional';
    case 'sibling': return 'sibling';
    default: return 'other';
  }
}

/**
 * Generate role title based on relationship type
 */
function generateRoleTitle(personName: string, relationshipType: RelationshipType): string {
  switch (relationshipType) {
    case 'child': return `Parent to ${personName}`;
    case 'spouse': return `Spouse/Partner to ${personName}`;
    case 'elderly_parent': return `Caregiver for ${personName}`;
    case 'friend': return `Friend of ${personName}`;
    case 'professional': return `Professional relationship with ${personName}`;
    case 'sibling': return `Sibling of ${personName}`;
    default: return `Relationship with ${personName}`;
  }
}

/**
 * Create ONE primary role section for a newly created person manual
 * This section will contain all content (triggers, strategies, boundaries, etc.)
 */
export async function createManualSections(params: CreateManualSectionsParams): Promise<string[]> {
  const {
    manualId,
    personId,
    personName,
    familyId,
    userId,
    relationshipType = 'other'
  } = params;

  const createdSectionIds: string[] = [];

  try {
    // Create ONE comprehensive role section
    const roleType = relationshipToRoleType(relationshipType);
    const roleTitle = generateRoleTitle(personName, relationshipType);

    const newSection: Omit<RoleSection, 'roleSectionId'> = {
      manualId,
      personId,
      familyId,

      // Role definition
      roleType,
      roleTitle,
      roleDescription: `Operating manual for understanding and supporting ${personName} in this relationship`,

      // Relationship context
      relatedPersonId: personId,
      relatedPersonName: personName,

      // Contributors - initially just the creator
      contributors: [userId],
      contributorNames: [], // Will be populated by the UI

      // Initialize empty content arrays (will be filled by onboarding wizard)
      triggers: [],
      whatWorks: [],
      whatDoesntWork: [],
      strengths: [],
      challenges: [],
      importantContext: [],
      boundaries: [],
      emergingPatterns: [],
      progressNotes: [],

      // Metadata
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: 1,
      lastEditedBy: userId,

      // References
      relatedJournalEntries: [],
      relatedKnowledgeIds: []
    };

    // Create the section in Firestore
    const docRef = await addDoc(
      collection(firestore, PERSON_MANUAL_COLLECTIONS.ROLE_SECTIONS),
      newSection
    );

    createdSectionIds.push(docRef.id);
  } catch (error) {
    console.error(`Error creating role section:`, error);
    throw error;
  }

  return createdSectionIds;
}

/**
 * Get a preview of what will be in the manual for a relationship type
 * Shows the comprehensive role section that will be created
 */
export function getManualSectionsPreview(relationshipType: RelationshipType = 'other') {
  const roleType = relationshipToRoleType(relationshipType);

  // Define what content areas will be included
  const contentAreas = [
    { title: 'Role Overview', description: 'A narrative description of the person in this relationship', emoji: '👤', category: 'universal' },
    { title: 'Triggers & Patterns', description: 'What causes stress or challenges', emoji: '⚡', category: 'universal' },
    { title: 'What Works', description: 'Effective strategies and approaches', emoji: '✨', category: 'universal' },
    { title: 'What Doesn\'t Work', description: 'Approaches to avoid', emoji: '🚫', category: 'universal' },
    { title: 'Boundaries & Limits', description: 'Important boundaries and respect markers', emoji: '🛡️', category: 'universal' },
    { title: 'Strengths & Challenges', description: 'Core strengths and areas of difficulty', emoji: '💪', category: 'universal' }
  ];

  return {
    totalSections: 1, // One comprehensive role section
    universalSections: contentAreas,
    specificSections: [] as typeof contentAreas,
    sections: contentAreas
  };
}

/**
 * Validate that a relationship type is valid
 */
export function isValidRelationshipType(type: string): type is RelationshipType {
  const validTypes: RelationshipType[] = [
    'child',
    'spouse',
    'elderly_parent',
    'friend',
    'professional',
    'sibling',
    'other'
  ];

  return validTypes.includes(type as RelationshipType);
}
