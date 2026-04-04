/**
 * User Manual Setup Utilities
 *
 * Handles auto-creation of a user's own Person + Manual during signup.
 * If an unclaimed Person already exists in the family (e.g. created by
 * a spouse via "Add person"), we claim it instead of creating a duplicate.
 */

import {
  collection,
  doc,
  addDoc,
  setDoc,
  query,
  where,
  getDocs,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { PERSON_MANUAL_COLLECTIONS, Person, PersonManual } from '@/types/person-manual';
import { createManualSections } from './manual-initialization';

/**
 * Find an unclaimed Person in the family that matches by first name.
 * "Unclaimed" = no linkedUserId set, and not a 'self' type record.
 */
async function findUnclaimedPerson(
  familyId: string,
  userName: string
): Promise<{ personId: string; hasManual: boolean; manualId?: string; relationshipType?: string } | null> {
  const q = query(
    collection(firestore, PERSON_MANUAL_COLLECTIONS.PEOPLE),
    where('familyId', '==', familyId)
  );
  const snapshot = await getDocs(q);

  const registeredFirstName = userName.toLowerCase().trim().split(' ')[0];

  const candidates = snapshot.docs
    .map(d => ({ personId: d.id, ...d.data() } as Person))
    .filter(p =>
      !p.linkedUserId &&
      p.relationshipType !== 'self' &&
      p.name.toLowerCase().trim().split(' ')[0] === registeredFirstName
    )
    .sort((a, b) => (a.addedAt?.toMillis?.() ?? 0) - (b.addedAt?.toMillis?.() ?? 0));

  if (candidates.length === 0) return null;

  if (candidates.length > 1) {
    console.warn(
      `Found ${candidates.length} unclaimed persons matching "${registeredFirstName}" in family ${familyId}. Claiming the earliest.`
    );
  }

  const match = candidates[0];
  return {
    personId: match.personId,
    hasManual: match.hasManual,
    manualId: match.manualId,
    relationshipType: match.relationshipType,
  };
}

/**
 * Create (or claim) a Person document and Manual for the user themselves.
 * Called during family creation/user registration.
 *
 * If an unclaimed Person already exists (e.g. spouse created by partner),
 * we claim it by setting linkedUserId and reuse its manual.
 */
export async function createUserOwnManual(
  familyId: string,
  userId: string,
  userName: string
): Promise<{ personId: string; manualId: string }> {
  try {
    // Step 0: Check if an unclaimed Person already exists for this user
    const existing = await findUnclaimedPerson(familyId, userName);

    if (existing) {
      console.log(
        `Claiming existing Person "${existing.personId}" (${existing.relationshipType}) for user ${userName}`
      );

      // Claim the existing Person
      const personRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.PEOPLE, existing.personId);
      await updateDoc(personRef, {
        linkedUserId: userId,
        canSelfContribute: true,
        name: userName, // Update to full registered name
      });

      let manualId: string;

      if (existing.hasManual && existing.manualId) {
        // Reuse existing manual — just update the personName
        manualId = existing.manualId;
        const manualRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS, manualId);
        await updateDoc(manualRef, { personName: userName });
        console.log(`Reusing existing manual ${manualId} for claimed Person`);
      } else {
        // Create a new manual for the claimed Person
        const manualData: Omit<PersonManual, 'manualId'> = {
          familyId,
          personId: existing.personId,
          personName: userName,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          lastEditedAt: Timestamp.now(),
          lastEditedBy: userId,
          version: 1,
          coreInfo: { sensoryNeeds: [], interests: [], strengths: [], notes: '' },
          triggers: [],
          whatWorks: [],
          whatDoesntWork: [],
          boundaries: [],
          emergingPatterns: [],
          progressNotes: [],
          totalTriggers: 0,
          totalStrategies: 0,
          totalBoundaries: 0,
          contributionIds: [],
          perspectives: { observers: [] },
        };

        const manualDocRef = doc(
          collection(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS)
        );
        manualId = manualDocRef.id;
        await setDoc(manualDocRef, { ...manualData, manualId });

        await createManualSections({
          manualId,
          personId: existing.personId,
          personName: userName,
          familyId,
          userId,
          relationshipType: existing.relationshipType || 'self',
        });

        await updateDoc(personRef, { hasManual: true, manualId });
        console.log(`Created new manual ${manualId} for claimed Person`);
      }

      return { personId: existing.personId, manualId };
    }

    // No existing match — create new Person + Manual (original flow)

    // Step 1: Create Person document for the user
    const personData: Omit<Person, 'personId'> = {
      familyId,
      name: userName,
      relationshipType: 'self',
      linkedUserId: userId,
      canSelfContribute: true,
      addedAt: Timestamp.now(),
      addedByUserId: userId,
      hasManual: false,
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

      // Multi-perspective
      contributionIds: [],
      perspectives: {
        observers: [],
      },
    };

    const manualDocRef = doc(
      collection(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS)
    );
    const manualId = manualDocRef.id;

    await setDoc(manualDocRef, {
      ...manualData,
      manualId
    });

    // Step 3: Create empty role sections based on 'self' relationship type
    await createManualSections({
      manualId,
      personId,
      personName: userName,
      familyId,
      userId,
      relationshipType: 'self'
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
