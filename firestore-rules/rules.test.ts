/**
 * Firestore Security Rules Tests
 *
 * These tests verify the security rules work correctly.
 * Run with: npm run test:rules (requires Firebase emulator)
 *
 * NOTE: These tests require the Firebase emulator to be running.
 * Start the emulator with: firebase emulators:start --only firestore
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';
import { readFileSync, existsSync } from 'fs';
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';

const PROJECT_ID = 'test-project';
const FAMILY_ID = 'test-family';
const OTHER_FAMILY_ID = 'other-family';

let testEnv: RulesTestEnvironment | undefined;
let emulatorAvailable = false;

// Helper to create authenticated context
const getAuthContext = (uid: string) => testEnv!.authenticatedContext(uid);
const getUnauthContext = () => testEnv!.unauthenticatedContext();

// Test users
const parentUser = {
  uid: 'parent-user-id',
  email: 'parent@test.com',
};

const childUser = {
  uid: 'child-user-id',
  email: 'child@test.com',
};

const otherFamilyUser = {
  uid: 'other-family-user-id',
  email: 'other@test.com',
};

beforeAll(async () => {
  // Check if firestore.rules exists
  if (!existsSync('firestore.rules')) {
    console.warn('firestore.rules not found, skipping security rules tests');
    return;
  }

  try {
    // Read rules file
    const rules = readFileSync('firestore.rules', 'utf8');

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host: 'localhost',
        port: 8080,
      },
    });
    emulatorAvailable = true;
  } catch (error) {
    console.warn('Firebase emulator not available, skipping security rules tests');
    console.warn('Start the emulator with: firebase emulators:start --only firestore');
  }
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  if (!emulatorAvailable || !testEnv) return;

  await testEnv.clearFirestore();

  // Set up test data using admin context
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    // Create parent user document
    await setDoc(doc(db, 'users', parentUser.uid), {
      email: parentUser.email,
      role: 'parent',
      familyId: FAMILY_ID,
    });

    // Create child user document
    await setDoc(doc(db, 'users', childUser.uid), {
      email: childUser.email,
      role: 'child',
      familyId: FAMILY_ID,
    });

    // Create other family user document
    await setDoc(doc(db, 'users', otherFamilyUser.uid), {
      email: otherFamilyUser.email,
      role: 'parent',
      familyId: OTHER_FAMILY_ID,
    });

    // Create family document
    await setDoc(doc(db, 'families', FAMILY_ID), {
      name: 'Test Family',
      createdAt: new Date(),
    });

    // Create a person in the family
    await setDoc(doc(db, 'people', 'test-person-id'), {
      name: 'Test Person',
      familyId: FAMILY_ID,
    });

    // Create a person manual
    await setDoc(doc(db, 'person_manuals', 'test-manual-id'), {
      personId: 'test-person-id',
      familyId: FAMILY_ID,
      createdAt: new Date(),
    });

    // Create a role section
    await setDoc(doc(db, 'role_sections', 'test-section-id'), {
      manualId: 'test-manual-id',
      personId: 'test-person-id',
      familyId: FAMILY_ID,
      roleType: 'child',
    });
  });
});

// Use describe.skipIf to skip all tests when emulator is not available
describe.skipIf(!emulatorAvailable)('Firestore Security Rules', () => {
  describe('Users collection', () => {
    it('should allow user to read their own document', async () => {
      const db = getAuthContext(parentUser.uid).firestore();
      await assertSucceeds(getDoc(doc(db, 'users', parentUser.uid)));
    });

    it('should deny user from reading other user documents', async () => {
      const db = getAuthContext(parentUser.uid).firestore();
      await assertFails(getDoc(doc(db, 'users', otherFamilyUser.uid)));
    });

    it('should deny unauthenticated access', async () => {
      const db = getUnauthContext().firestore();
      await assertFails(getDoc(doc(db, 'users', parentUser.uid)));
    });

    it('should allow user to update their own document', async () => {
      const db = getAuthContext(parentUser.uid).firestore();
      await assertSucceeds(
        updateDoc(doc(db, 'users', parentUser.uid), { displayName: 'Updated Name' })
      );
    });

    it('should allow parent to read child documents in their family', async () => {
      const db = getAuthContext(parentUser.uid).firestore();
      await assertSucceeds(getDoc(doc(db, 'users', childUser.uid)));
    });
  });

  describe('Families collection', () => {
    it('should allow family members to read their family document', async () => {
      const db = getAuthContext(parentUser.uid).firestore();
      await assertSucceeds(getDoc(doc(db, 'families', FAMILY_ID)));
    });

    it('should deny access to other family documents', async () => {
      const db = getAuthContext(parentUser.uid).firestore();
      await assertFails(getDoc(doc(db, 'families', OTHER_FAMILY_ID)));
    });

    it('should allow authenticated user to create a family', async () => {
      const db = getAuthContext('new-user-id').firestore();
      await assertSucceeds(
        setDoc(doc(db, 'families', 'new-family-id'), {
          name: 'New Family',
          createdAt: new Date(),
        })
      );
    });
  });

  describe('People collection', () => {
    it('should allow family members to read people in their family', async () => {
      const db = getAuthContext(parentUser.uid).firestore();
      await assertSucceeds(getDoc(doc(db, 'people', 'test-person-id')));
    });

    it('should allow child to read people in their family', async () => {
      const db = getAuthContext(childUser.uid).firestore();
      await assertSucceeds(getDoc(doc(db, 'people', 'test-person-id')));
    });

    it('should deny access to people in other families', async () => {
      const db = getAuthContext(otherFamilyUser.uid).firestore();
      await assertFails(getDoc(doc(db, 'people', 'test-person-id')));
    });

    it('should allow parent to create people in their family', async () => {
      const db = getAuthContext(parentUser.uid).firestore();
      await assertSucceeds(
        setDoc(doc(db, 'people', 'new-person-id'), {
          name: 'New Person',
          familyId: FAMILY_ID,
        })
      );
    });

    it('should deny parent from creating people in other families', async () => {
      const db = getAuthContext(parentUser.uid).firestore();
      await assertFails(
        setDoc(doc(db, 'people', 'new-person-id'), {
          name: 'New Person',
          familyId: OTHER_FAMILY_ID,
        })
      );
    });

    it('should allow parent to update people in their family', async () => {
      const db = getAuthContext(parentUser.uid).firestore();
      await assertSucceeds(
        updateDoc(doc(db, 'people', 'test-person-id'), { name: 'Updated Name' })
      );
    });

    it('should allow parent to delete people in their family', async () => {
      const db = getAuthContext(parentUser.uid).firestore();
      await assertSucceeds(deleteDoc(doc(db, 'people', 'test-person-id')));
    });
  });

  describe('Person Manuals collection', () => {
    it('should allow family members to read manuals in their family', async () => {
      const db = getAuthContext(parentUser.uid).firestore();
      await assertSucceeds(getDoc(doc(db, 'person_manuals', 'test-manual-id')));
    });

    it('should allow child to read manuals in their family', async () => {
      const db = getAuthContext(childUser.uid).firestore();
      await assertSucceeds(getDoc(doc(db, 'person_manuals', 'test-manual-id')));
    });

    it('should deny access to manuals in other families', async () => {
      const db = getAuthContext(otherFamilyUser.uid).firestore();
      await assertFails(getDoc(doc(db, 'person_manuals', 'test-manual-id')));
    });

    it('should allow family members to update manuals (collaborative editing)', async () => {
      const db = getAuthContext(childUser.uid).firestore();
      await assertSucceeds(
        updateDoc(doc(db, 'person_manuals', 'test-manual-id'), {
          lastEditedBy: childUser.uid,
        })
      );
    });

    it('should allow parent to create manuals in their family', async () => {
      const db = getAuthContext(parentUser.uid).firestore();
      await assertSucceeds(
        setDoc(doc(db, 'person_manuals', 'new-manual-id'), {
          personId: 'test-person-id',
          familyId: FAMILY_ID,
          createdAt: new Date(),
        })
      );
    });

    it('should allow parent to delete manuals in their family', async () => {
      const db = getAuthContext(parentUser.uid).firestore();
      await assertSucceeds(deleteDoc(doc(db, 'person_manuals', 'test-manual-id')));
    });
  });

  describe('Role Sections collection', () => {
    it('should allow family members to read role sections in their family', async () => {
      const db = getAuthContext(parentUser.uid).firestore();
      await assertSucceeds(getDoc(doc(db, 'role_sections', 'test-section-id')));
    });

    it('should allow child to read role sections in their family', async () => {
      const db = getAuthContext(childUser.uid).firestore();
      await assertSucceeds(getDoc(doc(db, 'role_sections', 'test-section-id')));
    });

    it('should deny access to role sections in other families', async () => {
      const db = getAuthContext(otherFamilyUser.uid).firestore();
      await assertFails(getDoc(doc(db, 'role_sections', 'test-section-id')));
    });

    it('should allow family members to create role sections', async () => {
      const db = getAuthContext(parentUser.uid).firestore();
      await assertSucceeds(
        setDoc(doc(db, 'role_sections', 'new-section-id'), {
          manualId: 'test-manual-id',
          personId: 'test-person-id',
          familyId: FAMILY_ID,
          roleType: 'spouse',
        })
      );
    });

    it('should allow family members to update role sections (collaborative editing)', async () => {
      const db = getAuthContext(childUser.uid).firestore();
      await assertSucceeds(
        updateDoc(doc(db, 'role_sections', 'test-section-id'), {
          lastEditedBy: childUser.uid,
        })
      );
    });

    it('should allow parent to delete role sections', async () => {
      const db = getAuthContext(parentUser.uid).firestore();
      await assertSucceeds(deleteDoc(doc(db, 'role_sections', 'test-section-id')));
    });

    it('should deny child from deleting role sections', async () => {
      const db = getAuthContext(childUser.uid).firestore();
      await assertFails(deleteDoc(doc(db, 'role_sections', 'test-section-id')));
    });
  });

  describe('Cross-family access prevention', () => {
    it('should deny other family from reading people', async () => {
      const db = getAuthContext(otherFamilyUser.uid).firestore();
      await assertFails(getDoc(doc(db, 'people', 'test-person-id')));
    });

    it('should deny other family from reading person manuals', async () => {
      const db = getAuthContext(otherFamilyUser.uid).firestore();
      await assertFails(getDoc(doc(db, 'person_manuals', 'test-manual-id')));
    });

    it('should deny other family from reading role sections', async () => {
      const db = getAuthContext(otherFamilyUser.uid).firestore();
      await assertFails(getDoc(doc(db, 'role_sections', 'test-section-id')));
    });

    it('should deny other family from updating role sections', async () => {
      const db = getAuthContext(otherFamilyUser.uid).firestore();
      await assertFails(
        updateDoc(doc(db, 'role_sections', 'test-section-id'), {
          lastEditedBy: otherFamilyUser.uid,
        })
      );
    });
  });

  describe('Unauthenticated access prevention', () => {
    it('should deny unauthenticated access to people', async () => {
      const db = getUnauthContext().firestore();
      await assertFails(getDoc(doc(db, 'people', 'test-person-id')));
    });

    it('should deny unauthenticated access to person manuals', async () => {
      const db = getUnauthContext().firestore();
      await assertFails(getDoc(doc(db, 'person_manuals', 'test-manual-id')));
    });

    it('should deny unauthenticated access to role sections', async () => {
      const db = getUnauthContext().firestore();
      await assertFails(getDoc(doc(db, 'role_sections', 'test-section-id')));
    });

    it('should deny unauthenticated creation of people', async () => {
      const db = getUnauthContext().firestore();
      await assertFails(
        setDoc(doc(db, 'people', 'new-person-id'), {
          name: 'Unauthorized Person',
          familyId: FAMILY_ID,
        })
      );
    });
  });
});
