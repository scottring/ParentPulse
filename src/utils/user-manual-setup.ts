/**
 * User Manual Setup Utilities
 *
 * Handles auto-creation of a user's own Person + Manual during signup
 */

import {
  collection,
  doc,
  addDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { PERSON_MANUAL_COLLECTIONS, Person, PersonManual } from '@/types/person-manual';
import { createManualSections } from './manual-initialization';

/**
 * Create a Person document and empty Manual for the user themselves
 * Called during family creation/user registration
 */
export async function createUserOwnManual(
  familyId: string,
  userId: string,
  userName: string
): Promise<{ personId: string; manualId: string }> {
  try {
    // Step 1: Create Person document for the user
    const personData: Omit<Person, 'personId'> = {
      familyId,
      name: userName,
      relationshipType: 'other', // Flexible - family members can define relationship
      addedAt: Timestamp.now(),
      addedByUserId: userId,
      hasManual: false, // Will be updated to true after manual creation
      // Don't include optional fields with undefined values - Firestore doesn't allow them
    };

    const personDocRef = await addDoc(
      collection(firestore, PERSON_MANUAL_COLLECTIONS.PEOPLE),
      personData
    );

    const personId = personDocRef.id;

    // Step 2: Create PersonManual for this person
    const manualData: Omit<PersonManual, 'manualId'> = {
      familyId,
      personId,
      personName: userName,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastEditedAt: Timestamp.now(),
      lastEditedBy: userId,
      version: 1,

      // Core Information
      coreInfo: {
        sensoryNeeds: [],
        interests: [],
        strengths: [],
        notes: ''
      },

      // Content sections (empty initially)
      triggers: [],
      whatWorks: [],
      whatDoesntWork: [],
      boundaries: [],

      // Dynamic content
      emergingPatterns: [],
      progressNotes: [],

      // Summary statistics
      totalTriggers: 0,
      totalStrategies: 0,
      totalBoundaries: 0,

      // References
      relatedJournalEntries: [],
      relatedKnowledgeIds: []
    };

    const manualDocRef = doc(
      collection(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS)
    );
    const manualId = manualDocRef.id;

    await setDoc(manualDocRef, {
      ...manualData,
      manualId
    });

    // Step 3: Create empty role sections based on 'other' relationship type
    await createManualSections({
      manualId,
      personId,
      personName: userName,
      familyId,
      userId,
      relationshipType: 'other'
    });

    // Step 4: Update Person to mark hasManual = true
    await setDoc(
      doc(firestore, PERSON_MANUAL_COLLECTIONS.PEOPLE, personId),
      { hasManual: true },
      { merge: true }
    );

    console.log(`Created manual for user ${userName} (Person: ${personId}, Manual: ${manualId})`);

    return { personId, manualId };
  } catch (error) {
    console.error('Error creating user own manual:', error);
    throw new Error('Failed to create user manual during setup');
  }
}
