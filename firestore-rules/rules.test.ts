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
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { readFileSync, existsSync } from 'fs';
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';

const PROJECT_ID = 'test-project';
const FAMILY_ID = 'test-family';
const OTHER_FAMILY_ID = 'other-family';

let testEnv: RulesTestEnvironment | undefined;

// `describe.skipIf` evaluates its argument when the describe block is
// registered, which is *before* any beforeAll runs. So we can't flip
// a flag from inside beforeAll and expect the describe to pick it up —
// we need a condition we can read synchronously at module load time.
//
// `firebase emulators:exec` sets FIRESTORE_EMULATOR_HOST on the child
// process that runs the tests, so we use that as the availability
// signal. When running `npm run test:run` standalone (no emulator),
// the env var is unset and the whole describe block is skipped.
const emulatorAvailable = !!process.env.FIRESTORE_EMULATOR_HOST;

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
  if (!emulatorAvailable) return;

  // Check if firestore.rules exists
  if (!existsSync('firestore.rules')) {
    throw new Error('firestore.rules not found — cannot run rules tests');
  }

  const rules = readFileSync('firestore.rules', 'utf8');

  // FIRESTORE_EMULATOR_HOST is "host:port" — split it so we can feed
  // the rules-unit-testing SDK the exact connection info the emulator
  // process is listening on.
  const [host, portStr] = (process.env.FIRESTORE_EMULATOR_HOST || '').split(':');
  const port = parseInt(portStr || '8080', 10);

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: host || 'localhost',
      port,
    },
  });
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

    // ================================================================
    // Seed contributions — multi-author, mixed status/relationship so
    // the list-query tests below exercise the real rule surface.
    //
    // Parent (parent-user-id) owns:
    //   - draft, perspectiveType=self, relationshipToSubject=self
    //     (as if parent is filling out their own self-onboard)
    //   - draft, perspectiveType=self, relationshipToSubject=child-session
    //     (as if parent is supervising a kid session for the child)
    //   - draft, perspectiveType=observer, relationshipToSubject=child
    //   - complete, perspectiveType=observer, relationshipToSubject=child
    //
    // Child (child-user-id) owns:
    //   - draft, perspectiveType=observer, relationshipToSubject=child-observer
    //     (as if the kid is observing a sibling)
    //   - complete, perspectiveType=observer, relationshipToSubject=child-observer
    //
    // This mix is what made the old "filter only by familyId+manualId"
    // listener query fail in production — when another family member
    // had a draft in the family, Firestore couldn't prove the list
    // matched either read rule for every returned doc.
    // ================================================================
    const contribBase = {
      manualId: 'test-manual-id',
      personId: 'test-person-id',
      familyId: FAMILY_ID,
      answers: {},
      updatedAt: new Date(),
    };
    await setDoc(doc(db, 'contributions', 'contrib-parent-draft-self'), {
      ...contribBase,
      contributorId: parentUser.uid,
      contributorName: 'Parent',
      perspectiveType: 'self',
      relationshipToSubject: 'self',
      status: 'draft',
    });
    await setDoc(doc(db, 'contributions', 'contrib-parent-draft-kid-session'), {
      ...contribBase,
      contributorId: parentUser.uid,
      contributorName: 'Parent',
      perspectiveType: 'self',
      relationshipToSubject: 'child-session',
      status: 'draft',
    });
    await setDoc(doc(db, 'contributions', 'contrib-parent-draft-observer'), {
      ...contribBase,
      contributorId: parentUser.uid,
      contributorName: 'Parent',
      perspectiveType: 'observer',
      relationshipToSubject: 'child',
      status: 'draft',
    });
    await setDoc(doc(db, 'contributions', 'contrib-parent-complete-observer'), {
      ...contribBase,
      contributorId: parentUser.uid,
      contributorName: 'Parent',
      perspectiveType: 'observer',
      relationshipToSubject: 'child',
      status: 'complete',
    });
    await setDoc(doc(db, 'contributions', 'contrib-child-draft-kid-observer'), {
      ...contribBase,
      contributorId: childUser.uid,
      contributorName: 'Child',
      perspectiveType: 'observer',
      relationshipToSubject: 'child-observer',
      status: 'draft',
    });
    await setDoc(doc(db, 'contributions', 'contrib-child-complete-kid-observer'), {
      ...contribBase,
      contributorId: childUser.uid,
      contributorName: 'Child',
      perspectiveType: 'observer',
      relationshipToSubject: 'child-observer',
      status: 'complete',
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

  // ================================================================
  // Contributions collection
  //
  // Rules surface:
  //   allow read if contributorId == me && belongsToFamily(familyId)
  //   allow read if status == 'complete' && belongsToFamily(familyId)
  //   allow create if signed in && belongsToFamily(request.resource.familyId)
  //   allow update if contributorId == me && belongsToFamily(familyId)
  //   allow delete if isParent() && belongsToFamily(familyId)
  //
  // Every bug we hit recently in useContribution, useDashboard, and
  // useManualSummaries was a list-query that couldn't prove every
  // returned document satisfied one of the read rules. These tests
  // lock that surface down so the bug can't come back silently.
  // ================================================================
  describe('Contributions collection', () => {
    describe('single-doc reads', () => {
      it('allows owner to read their own draft', async () => {
        const db = getAuthContext(parentUser.uid).firestore();
        await assertSucceeds(
          getDoc(doc(db, 'contributions', 'contrib-parent-draft-self'))
        );
      });

      it('allows owner to read their own completed contribution', async () => {
        const db = getAuthContext(parentUser.uid).firestore();
        await assertSucceeds(
          getDoc(doc(db, 'contributions', 'contrib-parent-complete-observer'))
        );
      });

      it('denies reading another family member draft', async () => {
        // The parent is signed in and in the family but is not the
        // contributor, so rule (a) fails. Status is draft so rule (b)
        // fails. Both rules deny → read rejected.
        const db = getAuthContext(parentUser.uid).firestore();
        await assertFails(
          getDoc(doc(db, 'contributions', 'contrib-child-draft-kid-observer'))
        );
      });

      it('allows reading another family member COMPLETED contribution', async () => {
        // Rule (b) covers this: status=complete + family member.
        const db = getAuthContext(parentUser.uid).firestore();
        await assertSucceeds(
          getDoc(doc(db, 'contributions', 'contrib-child-complete-kid-observer'))
        );
      });

      it('denies cross-family single-doc read', async () => {
        const db = getAuthContext(otherFamilyUser.uid).firestore();
        await assertFails(
          getDoc(doc(db, 'contributions', 'contrib-parent-complete-observer'))
        );
      });

      it('denies unauthenticated read', async () => {
        const db = getUnauthContext().firestore();
        await assertFails(
          getDoc(doc(db, 'contributions', 'contrib-parent-complete-observer'))
        );
      });
    });

    describe('list queries', () => {
      it('[REGRESSION] unscoped list filtered only by familyId+manualId is REJECTED when other-user drafts exist', async () => {
        // This was the bug in useContribution.ts, useDashboard.ts, and
        // useManualSummaries.ts. The query can't prove every returned
        // doc matches a read rule because the child's draft violates
        // both rule (a) (wrong contributor) and rule (b) (not complete).
        // Firestore must reject the list. If this test starts passing,
        // it means either the rules were loosened OR the listener was
        // silently broken again.
        const db = getAuthContext(parentUser.uid).firestore();
        const q = query(
          collection(db, 'contributions'),
          where('familyId', '==', FAMILY_ID),
          where('manualId', '==', 'test-manual-id')
        );
        await assertFails(getDocs(q));
      });

      it('OWN query scoped by contributorId succeeds and returns all own docs', async () => {
        // This is the replacement query half of the fixed listener.
        // Every returned doc matches rule (a) because contributorId
        // equals the signed-in user.
        const db = getAuthContext(parentUser.uid).firestore();
        const q = query(
          collection(db, 'contributions'),
          where('familyId', '==', FAMILY_ID),
          where('manualId', '==', 'test-manual-id'),
          where('contributorId', '==', parentUser.uid)
        );
        const snap = await assertSucceeds(getDocs(q));
        // 4 parent-owned: draft-self, draft-kid-session, draft-observer, complete-observer
        expect(snap.docs.length).toBe(4);
      });

      it('COMPLETE query scoped by status=complete succeeds and returns family-wide completes', async () => {
        // The other half of the replacement query. Every returned doc
        // matches rule (b) because it's status=complete and in-family.
        const db = getAuthContext(parentUser.uid).firestore();
        const q = query(
          collection(db, 'contributions'),
          where('familyId', '==', FAMILY_ID),
          where('manualId', '==', 'test-manual-id'),
          where('status', '==', 'complete')
        );
        const snap = await assertSucceeds(getDocs(q));
        // parent-complete-observer + child-complete-kid-observer
        expect(snap.docs.length).toBe(2);
      });

      it('findDraft query with full (perspective+relationship) tuple succeeds and narrows correctly', async () => {
        // This is the exact query shape useContribution.findDraft uses.
        // Regression guard for the kid-session "answers don't restore"
        // bug: the tuple must include relationshipToSubject so we
        // don't cross-match a self-onboard draft with a kid-session one.
        const db = getAuthContext(parentUser.uid).firestore();
        const q = query(
          collection(db, 'contributions'),
          where('familyId', '==', FAMILY_ID),
          where('manualId', '==', 'test-manual-id'),
          where('contributorId', '==', parentUser.uid),
          where('perspectiveType', '==', 'self'),
          where('status', '==', 'draft'),
          where('relationshipToSubject', '==', 'child-session')
        );
        const snap = await assertSucceeds(getDocs(q));
        expect(snap.docs.length).toBe(1);
        expect(snap.docs[0].id).toBe('contrib-parent-draft-kid-session');
      });

      it('findDraft query with a different relationshipToSubject returns a disjoint result', async () => {
        // Same shape as above but asking for the self-onboard draft.
        // Confirms the tuple does not bleed across routes.
        const db = getAuthContext(parentUser.uid).firestore();
        const q = query(
          collection(db, 'contributions'),
          where('familyId', '==', FAMILY_ID),
          where('manualId', '==', 'test-manual-id'),
          where('contributorId', '==', parentUser.uid),
          where('perspectiveType', '==', 'self'),
          where('status', '==', 'draft'),
          where('relationshipToSubject', '==', 'self')
        );
        const snap = await assertSucceeds(getDocs(q));
        expect(snap.docs.length).toBe(1);
        expect(snap.docs[0].id).toBe('contrib-parent-draft-self');
      });

      it('cross-family list is rejected even when scoped to complete status', async () => {
        // other-family user trying to read our completes. Rule (b)
        // requires belongsToFamily(familyId) which checks the *resource*
        // familyId against the requesting user's familyId, so this
        // still fails per-doc and the list is rejected.
        const db = getAuthContext(otherFamilyUser.uid).firestore();
        const q = query(
          collection(db, 'contributions'),
          where('familyId', '==', FAMILY_ID),
          where('status', '==', 'complete')
        );
        await assertFails(getDocs(q));
      });

      it('child family-member can read family-wide completes via list query', async () => {
        // Confirms rule (b) works for non-parent family members too.
        const db = getAuthContext(childUser.uid).firestore();
        const q = query(
          collection(db, 'contributions'),
          where('familyId', '==', FAMILY_ID),
          where('status', '==', 'complete')
        );
        const snap = await assertSucceeds(getDocs(q));
        expect(snap.docs.length).toBe(2);
      });
    });

    describe('write permissions', () => {
      it('allows a family member to create their own contribution', async () => {
        const db = getAuthContext(parentUser.uid).firestore();
        await assertSucceeds(
          addDoc(collection(db, 'contributions'), {
            manualId: 'test-manual-id',
            personId: 'test-person-id',
            familyId: FAMILY_ID,
            contributorId: parentUser.uid,
            contributorName: 'Parent',
            perspectiveType: 'self',
            relationshipToSubject: 'self',
            status: 'draft',
            answers: {},
            updatedAt: new Date(),
          })
        );
      });

      it('denies creating a contribution in another family', async () => {
        const db = getAuthContext(parentUser.uid).firestore();
        await assertFails(
          addDoc(collection(db, 'contributions'), {
            manualId: 'test-manual-id',
            familyId: OTHER_FAMILY_ID,
            contributorId: parentUser.uid,
            perspectiveType: 'self',
            relationshipToSubject: 'self',
            status: 'draft',
            answers: {},
            updatedAt: new Date(),
          })
        );
      });

      it('allows owner to update their own draft', async () => {
        const db = getAuthContext(parentUser.uid).firestore();
        await assertSucceeds(
          updateDoc(doc(db, 'contributions', 'contrib-parent-draft-self'), {
            answers: { feelings: { q1: 'happy' } },
            updatedAt: new Date(),
          })
        );
      });

      it('denies updating another user contribution', async () => {
        const db = getAuthContext(parentUser.uid).firestore();
        await assertFails(
          updateDoc(
            doc(db, 'contributions', 'contrib-child-draft-kid-observer'),
            { answers: { tampered: true } }
          )
        );
      });

      it('allows parent to delete a contribution in their family', async () => {
        const db = getAuthContext(parentUser.uid).firestore();
        await assertSucceeds(
          deleteDoc(doc(db, 'contributions', 'contrib-parent-draft-self'))
        );
      });

      it('denies non-parent (child role) from deleting contributions', async () => {
        const db = getAuthContext(childUser.uid).firestore();
        await assertFails(
          deleteDoc(
            doc(db, 'contributions', 'contrib-parent-complete-observer')
          )
        );
      });

      it('denies cross-family delete', async () => {
        const db = getAuthContext(otherFamilyUser.uid).firestore();
        await assertFails(
          deleteDoc(
            doc(db, 'contributions', 'contrib-parent-complete-observer')
          )
        );
      });
    });
  });
});
