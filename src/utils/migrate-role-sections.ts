/**
 * Migration Script: Add personId to existing RoleSections
 *
 * This script updates all existing role sections in Firestore to include the personId field.
 * Run this once to migrate existing data.
 */

import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { PERSON_MANUAL_COLLECTIONS } from '@/types/person-manual';

interface MigrationResult {
  total: number;
  updated: number;
  skipped: number;
  errors: Array<{ id: string; error: string }>;
}

export async function migrateRoleSectionsAddPersonId(familyId: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    total: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  try {
    console.log('🔄 Starting migration: Adding personId to role sections...');

    // Fetch all role sections for this family
    const roleSectionsQuery = query(
      collection(firestore, PERSON_MANUAL_COLLECTIONS.ROLE_SECTIONS),
      where('familyId', '==', familyId)
    );

    const roleSectionsSnapshot = await getDocs(roleSectionsQuery);
    result.total = roleSectionsSnapshot.size;

    console.log(`📊 Found ${result.total} role sections to process`);

    // Process each role section
    for (const roleSectionDoc of roleSectionsSnapshot.docs) {
      const roleSection = roleSectionDoc.data();
      const roleSectionId = roleSectionDoc.id;

      // Skip if personId already exists
      if (roleSection.personId) {
        console.log(`⏭️  Skipping ${roleSectionId} - already has personId`);
        result.skipped++;
        continue;
      }

      try {
        // Fetch the manual to get the personId
        const manualRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS, roleSection.manualId);
        const manualDoc = await getDoc(manualRef);

        if (!manualDoc.exists()) {
          console.error(`❌ Manual not found for role section ${roleSectionId}`);
          result.errors.push({
            id: roleSectionId,
            error: `Manual ${roleSection.manualId} not found`
          });
          continue;
        }

        const manual = manualDoc.data();
        const personId = manual.personId;

        if (!personId) {
          console.error(`❌ Manual ${roleSection.manualId} has no personId`);
          result.errors.push({
            id: roleSectionId,
            error: `Manual ${roleSection.manualId} has no personId`
          });
          continue;
        }

        // Update the role section with personId
        const roleSectionRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.ROLE_SECTIONS, roleSectionId);
        await updateDoc(roleSectionRef, {
          personId: personId
        });

        console.log(`✅ Updated ${roleSectionId} with personId: ${personId}`);
        result.updated++;

      } catch (error) {
        console.error(`❌ Error updating role section ${roleSectionId}:`, error);
        result.errors.push({
          id: roleSectionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log('✨ Migration complete!');
    console.log(`📊 Results:
      Total: ${result.total}
      Updated: ${result.updated}
      Skipped: ${result.skipped}
      Errors: ${result.errors.length}
    `);

    if (result.errors.length > 0) {
      console.error('❌ Errors encountered:', result.errors);
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }

  return result;
}
