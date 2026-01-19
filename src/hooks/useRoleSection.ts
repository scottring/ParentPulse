/**
 * useRoleSection Hook
 *
 * Manages role sections within a person's manual
 * Supports collaborative editing - multiple contributors can edit the same role section
 *
 * Example:
 * - "Scott as Father to Ella" (contributors: Scott, Ella)
 * - "Scott as Spouse to Iris" (contributors: Scott, Iris)
 */

'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  RoleSection,
  RoleTrigger,
  RoleStrategy,
  RoleBoundary,
  RolePattern,
  RoleProgressNote,
  RoleOverviewContribution,
  RoleType,
  PERSON_MANUAL_COLLECTIONS,
  getContributorPermissions
} from '@/types/person-manual';

interface UseRoleSectionsReturn {
  roleSections: RoleSection[];
  loading: boolean;
  error: string | null;

  // CRUD operations
  createRoleSection: (roleSectionData: Omit<RoleSection, 'roleSectionId' | 'createdAt' | 'updatedAt' | 'version' | 'lastEditedBy'>) => Promise<string>;
  updateRoleSection: (roleSectionId: string, updates: Partial<RoleSection>) => Promise<void>;
  deleteRoleSection: (roleSectionId: string) => Promise<void>;

  // Content management
  addTrigger: (roleSectionId: string, trigger: Omit<RoleTrigger, 'id' | 'identifiedDate' | 'identifiedBy' | 'confirmedByOthers'>) => Promise<void>;
  removeTrigger: (roleSectionId: string, triggerId: string) => Promise<void>;
  confirmTrigger: (roleSectionId: string, triggerId: string) => Promise<void>;

  addStrategy: (roleSectionId: string, strategy: Omit<RoleStrategy, 'id' | 'addedDate' | 'addedBy'>, worksOrNot: 'works' | 'doesnt') => Promise<void>;
  removeStrategy: (roleSectionId: string, strategyId: string, worksOrNot: 'works' | 'doesnt') => Promise<void>;
  updateStrategyEffectiveness: (roleSectionId: string, strategyId: string, effectiveness: 1 | 2 | 3 | 4 | 5) => Promise<void>;

  addBoundary: (roleSectionId: string, boundary: Omit<RoleBoundary, 'id' | 'addedDate' | 'addedBy'>) => Promise<void>;
  removeBoundary: (roleSectionId: string, boundaryId: string) => Promise<void>;

  addProgressNote: (roleSectionId: string, note: Omit<RoleProgressNote, 'id' | 'date' | 'addedBy'>) => Promise<void>;

  // Overview contributions (multi-contributor perspectives)
  addOverviewContribution: (roleSectionId: string, contribution: Omit<RoleOverviewContribution, 'id' | 'addedAt' | 'updatedAt' | 'contributorName'>) => Promise<void>;
  updateOverviewContribution: (roleSectionId: string, contributionId: string, updates: { perspective?: string; relationshipToSubject?: string; closenessWeight?: 1 | 2 | 3 | 4 | 5 }) => Promise<void>;
  removeOverviewContribution: (roleSectionId: string, contributionId: string) => Promise<void>;

  // Getters
  getById: (roleSectionId: string) => RoleSection | undefined;
  getByRoleType: (roleType: RoleType) => RoleSection[];
}

export function useRoleSections(manualId?: string): UseRoleSectionsReturn {
  const { user } = useAuth();
  const [roleSections, setRoleSections] = useState<RoleSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all role sections for a manual
  useEffect(() => {
    if (!manualId || !user?.familyId) {
      setLoading(false);
      return;
    }

    const fetchRoleSections = async () => {
      try {
        setLoading(true);
        setError(null);

        const q = query(
          collection(firestore, PERSON_MANUAL_COLLECTIONS.ROLE_SECTIONS),
          where('familyId', '==', user.familyId),
          where('manualId', '==', manualId),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const fetchedSections = querySnapshot.docs.map(doc => ({
          roleSectionId: doc.id,
          ...doc.data()
        } as RoleSection));

        setRoleSections(fetchedSections);
      } catch (err) {
        console.error('Error fetching role sections:', err);
        setError('Failed to load role sections');
      } finally {
        setLoading(false);
      }
    };

    fetchRoleSections();
  }, [manualId, user?.familyId]);

  // Get role section by ID
  const getById = (roleSectionId: string): RoleSection | undefined => {
    return roleSections.find(section => section.roleSectionId === roleSectionId);
  };

  // Get role sections by type
  const getByRoleType = (roleType: RoleType): RoleSection[] => {
    return roleSections.filter(section => section.roleType === roleType);
  };

  // Create new role section
  const createRoleSection = async (
    roleSectionData: Omit<RoleSection, 'roleSectionId' | 'createdAt' | 'updatedAt' | 'version' | 'lastEditedBy'>
  ): Promise<string> => {
    if (!user?.userId) {
      throw new Error('User must be authenticated');
    }

    try {
      const newSection: Omit<RoleSection, 'roleSectionId'> = {
        ...roleSectionData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        version: 1,
        lastEditedBy: user.userId,
        triggers: roleSectionData.triggers || [],
        whatWorks: roleSectionData.whatWorks || [],
        whatDoesntWork: roleSectionData.whatDoesntWork || [],
        strengths: roleSectionData.strengths || [],
        challenges: roleSectionData.challenges || [],
        importantContext: roleSectionData.importantContext || [],
        boundaries: roleSectionData.boundaries || [],
        emergingPatterns: roleSectionData.emergingPatterns || [],
        progressNotes: roleSectionData.progressNotes || [],
        relatedJournalEntries: roleSectionData.relatedJournalEntries || [],
        relatedKnowledgeIds: roleSectionData.relatedKnowledgeIds || []
      };

      // Remove undefined fields to avoid Firestore errors
      const cleanedSection = Object.fromEntries(
        Object.entries(newSection).filter(([_, value]) => value !== undefined)
      );

      const docRef = await addDoc(
        collection(firestore, PERSON_MANUAL_COLLECTIONS.ROLE_SECTIONS),
        cleanedSection
      );

      // Update local state
      setRoleSections(prev => [{
        roleSectionId: docRef.id,
        ...newSection
      } as RoleSection, ...prev]);

      return docRef.id;
    } catch (err) {
      console.error('Error creating role section:', err);
      throw new Error('Failed to create role section');
    }
  };

  // Update role section
  const updateRoleSection = async (
    roleSectionId: string,
    updates: Partial<RoleSection>
  ): Promise<void> => {
    if (!user?.userId) {
      throw new Error('User must be authenticated');
    }

    try {
      const sectionRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.ROLE_SECTIONS, roleSectionId);
      const section = getById(roleSectionId);

      const updateData = {
        ...updates,
        updatedAt: Timestamp.now(),
        lastEditedBy: user.userId,
        version: section ? section.version + 1 : 1
      };

      await updateDoc(sectionRef, updateData);

      // Update local state
      setRoleSections(prev =>
        prev.map(s =>
          s.roleSectionId === roleSectionId
            ? { ...s, ...updateData } as RoleSection
            : s
        )
      );
    } catch (err) {
      console.error('Error updating role section:', err);
      throw new Error('Failed to update role section');
    }
  };

  // Delete role section
  const deleteRoleSection = async (roleSectionId: string): Promise<void> => {
    try {
      const sectionRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.ROLE_SECTIONS, roleSectionId);
      await deleteDoc(sectionRef);

      // Update local state
      setRoleSections(prev => prev.filter(s => s.roleSectionId !== roleSectionId));
    } catch (err) {
      console.error('Error deleting role section:', err);
      throw new Error('Failed to delete role section');
    }
  };

  // Add trigger
  const addTrigger = async (
    roleSectionId: string,
    trigger: Omit<RoleTrigger, 'id' | 'identifiedDate' | 'identifiedBy' | 'confirmedByOthers'>
  ): Promise<void> => {
    if (!user?.userId) throw new Error('User must be authenticated');

    const section = getById(roleSectionId);
    if (!section) throw new Error('Role section not found');

    const newTrigger: RoleTrigger = {
      id: `trigger_${Date.now()}`,
      ...trigger,
      identifiedDate: Timestamp.now(),
      identifiedBy: user.userId,
      confirmedByOthers: []
    };

    await updateRoleSection(roleSectionId, {
      triggers: [...section.triggers, newTrigger]
    });
  };

  // Remove trigger
  const removeTrigger = async (roleSectionId: string, triggerId: string): Promise<void> => {
    const section = getById(roleSectionId);
    if (!section) throw new Error('Role section not found');

    await updateRoleSection(roleSectionId, {
      triggers: section.triggers.filter(t => t.id !== triggerId)
    });
  };

  // Confirm trigger (another contributor validates it)
  const confirmTrigger = async (roleSectionId: string, triggerId: string): Promise<void> => {
    if (!user?.userId) throw new Error('User must be authenticated');

    const section = getById(roleSectionId);
    if (!section) throw new Error('Role section not found');

    const updatedTriggers = section.triggers.map(t => {
      if (t.id === triggerId && !t.confirmedByOthers.includes(user.userId)) {
        return {
          ...t,
          confirmedByOthers: [...t.confirmedByOthers, user.userId]
        };
      }
      return t;
    });

    await updateRoleSection(roleSectionId, {
      triggers: updatedTriggers
    });
  };

  // Add strategy
  const addStrategy = async (
    roleSectionId: string,
    strategy: Omit<RoleStrategy, 'id' | 'addedDate' | 'addedBy'>,
    worksOrNot: 'works' | 'doesnt'
  ): Promise<void> => {
    if (!user?.userId) throw new Error('User must be authenticated');

    const section = getById(roleSectionId);
    if (!section) throw new Error('Role section not found');

    const newStrategy: RoleStrategy = {
      id: `strategy_${Date.now()}`,
      ...strategy,
      addedDate: Timestamp.now(),
      addedBy: user.userId
    };

    if (worksOrNot === 'works') {
      await updateRoleSection(roleSectionId, {
        whatWorks: [...section.whatWorks, newStrategy]
      });
    } else {
      await updateRoleSection(roleSectionId, {
        whatDoesntWork: [...section.whatDoesntWork, newStrategy]
      });
    }
  };

  // Remove strategy
  const removeStrategy = async (
    roleSectionId: string,
    strategyId: string,
    worksOrNot: 'works' | 'doesnt'
  ): Promise<void> => {
    const section = getById(roleSectionId);
    if (!section) throw new Error('Role section not found');

    if (worksOrNot === 'works') {
      await updateRoleSection(roleSectionId, {
        whatWorks: section.whatWorks.filter(s => s.id !== strategyId)
      });
    } else {
      await updateRoleSection(roleSectionId, {
        whatDoesntWork: section.whatDoesntWork.filter(s => s.id !== strategyId)
      });
    }
  };

  // Update strategy effectiveness
  const updateStrategyEffectiveness = async (
    roleSectionId: string,
    strategyId: string,
    effectiveness: 1 | 2 | 3 | 4 | 5
  ): Promise<void> => {
    const section = getById(roleSectionId);
    if (!section) throw new Error('Role section not found');

    const updatedStrategies = section.whatWorks.map(s =>
      s.id === strategyId ? { ...s, effectiveness } : s
    );

    await updateRoleSection(roleSectionId, {
      whatWorks: updatedStrategies
    });
  };

  // Add boundary
  const addBoundary = async (
    roleSectionId: string,
    boundary: Omit<RoleBoundary, 'id' | 'addedDate' | 'addedBy'>
  ): Promise<void> => {
    if (!user?.userId) throw new Error('User must be authenticated');

    const section = getById(roleSectionId);
    if (!section) throw new Error('Role section not found');

    const newBoundary: RoleBoundary = {
      id: `boundary_${Date.now()}`,
      ...boundary,
      addedDate: Timestamp.now(),
      addedBy: user.userId
    };

    await updateRoleSection(roleSectionId, {
      boundaries: [...(section.boundaries || []), newBoundary]
    });
  };

  // Remove boundary
  const removeBoundary = async (roleSectionId: string, boundaryId: string): Promise<void> => {
    const section = getById(roleSectionId);
    if (!section) throw new Error('Role section not found');

    await updateRoleSection(roleSectionId, {
      boundaries: (section.boundaries || []).filter(b => b.id !== boundaryId)
    });
  };

  // Add progress note
  const addProgressNote = async (
    roleSectionId: string,
    note: Omit<RoleProgressNote, 'id' | 'date' | 'addedBy'>
  ): Promise<void> => {
    if (!user?.userId) throw new Error('User must be authenticated');

    const section = getById(roleSectionId);
    if (!section) throw new Error('Role section not found');

    const newNote: RoleProgressNote = {
      id: `note_${Date.now()}`,
      date: Timestamp.now(),
      addedBy: user.userId,
      ...note
    };

    await updateRoleSection(roleSectionId, {
      progressNotes: [...section.progressNotes, newNote]
    });
  };

  // Add overview contribution (perspective)
  const addOverviewContribution = async (
    roleSectionId: string,
    contribution: Omit<RoleOverviewContribution, 'id' | 'addedAt' | 'updatedAt' | 'contributorName'>
  ): Promise<void> => {
    if (!user?.userId || !user?.name) throw new Error('User must be authenticated');

    const section = getById(roleSectionId);
    if (!section) throw new Error('Role section not found');

    const newContribution: RoleOverviewContribution = {
      id: `contribution_${Date.now()}`,
      contributorName: user.name,
      addedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      ...contribution
    };

    await updateRoleSection(roleSectionId, {
      roleOverviewContributions: [...(section.roleOverviewContributions || []), newContribution]
    });
  };

  // Update overview contribution
  const updateOverviewContribution = async (
    roleSectionId: string,
    contributionId: string,
    updates: { perspective?: string; relationshipToSubject?: string; closenessWeight?: 1 | 2 | 3 | 4 | 5 }
  ): Promise<void> => {
    const section = getById(roleSectionId);
    if (!section) throw new Error('Role section not found');

    const updatedContributions = (section.roleOverviewContributions || []).map(c => {
      if (c.id === contributionId) {
        return {
          ...c,
          ...updates,
          updatedAt: Timestamp.now()
        };
      }
      return c;
    });

    await updateRoleSection(roleSectionId, {
      roleOverviewContributions: updatedContributions
    });
  };

  // Remove overview contribution
  const removeOverviewContribution = async (
    roleSectionId: string,
    contributionId: string
  ): Promise<void> => {
    const section = getById(roleSectionId);
    if (!section) throw new Error('Role section not found');

    await updateRoleSection(roleSectionId, {
      roleOverviewContributions: (section.roleOverviewContributions || []).filter(c => c.id !== contributionId)
    });
  };

  return {
    roleSections,
    loading,
    error,
    createRoleSection,
    updateRoleSection,
    deleteRoleSection,
    addTrigger,
    removeTrigger,
    confirmTrigger,
    addStrategy,
    removeStrategy,
    updateStrategyEffectiveness,
    addBoundary,
    removeBoundary,
    addProgressNote,
    addOverviewContribution,
    updateOverviewContribution,
    removeOverviewContribution,
    getById,
    getByRoleType
  };
}

/**
 * Hook for a single role section
 */
export function useRoleSection(roleSectionId?: string) {
  const { user } = useAuth();
  const [roleSection, setRoleSection] = useState<RoleSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roleSectionId) {
      setLoading(false);
      return;
    }

    if (!user?.familyId) {
      console.warn('useRoleSection: No familyId available for user');
      setLoading(false);
      return;
    }

    const fetchRoleSection = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching role section:', roleSectionId, 'for family:', user.familyId);

        const docRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.ROLE_SECTIONS, roleSectionId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as RoleSection;
          console.log('Role section found:', data);

          // Verify the role section belongs to the user's family
          if (data.familyId !== user.familyId) {
            console.error('Role section familyId mismatch:', data.familyId, 'vs user familyId:', user.familyId);
            setError('You do not have permission to view this role section');
            setRoleSection(null);
          } else {
            setRoleSection({
              ...data,
              roleSectionId: docSnap.id
            } as RoleSection);
          }
        } else {
          console.warn('Role section not found:', roleSectionId);
          setRoleSection(null);
          setError('Role section not found');
        }
      } catch (err) {
        console.error('Error fetching role section:', err);
        setError('Failed to load role section. Check browser console for details.');
      } finally {
        setLoading(false);
      }
    };

    fetchRoleSection();
  }, [roleSectionId, user]);

  return {
    roleSection,
    loading,
    error,
    exists: !!roleSection
  };
}
