/**
 * usePerson Hook
 *
 * Manages people in the family - the core entities of the operating manual system
 * Each person has one comprehensive manual with multiple role sections
 */

'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Person, PERSON_MANUAL_COLLECTIONS } from '@/types/person-manual';

interface UsePersonReturn {
  people: Person[];
  loading: boolean;
  error: string | null;

  // CRUD operations
  addPerson: (personData: Omit<Person, 'personId' | 'familyId' | 'addedAt' | 'addedByUserId' | 'hasManual'>) => Promise<string>;
  updatePerson: (personId: string, updates: Partial<Person>) => Promise<void>;
  deletePerson: (personId: string) => Promise<void>;

  // Getters
  getById: (personId: string) => Person | undefined;
  getByName: (name: string) => Person[];

  // Manual management
  linkManual: (personId: string, manualId: string) => Promise<void>;

  // Statistics
  totalCount: number;
  withManuals: number;
}

export function usePerson(): UsePersonReturn {
  const { user } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all people in the family
  useEffect(() => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }

    const fetchPeople = async () => {
      try {
        setLoading(true);
        setError(null);

        const q = query(
          collection(firestore, PERSON_MANUAL_COLLECTIONS.PEOPLE),
          where('familyId', '==', user.familyId),
          orderBy('addedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const fetchedPeople = querySnapshot.docs.map(doc => ({
          personId: doc.id,
          ...doc.data()
        } as Person));

        setPeople(fetchedPeople);
      } catch (err) {
        console.error('Error fetching people:', err);
        setError('Failed to load people');
      } finally {
        setLoading(false);
      }
    };

    fetchPeople();
  }, [user?.familyId]);

  // Get person by ID
  const getById = (personId: string): Person | undefined => {
    return people.find(person => person.personId === personId);
  };

  // Get people by name (partial match)
  const getByName = (name: string): Person[] => {
    const lowerName = name.toLowerCase();
    return people.filter(person =>
      person.name.toLowerCase().includes(lowerName)
    );
  };

  // Add new person
  const addPerson = async (
    personData: Omit<Person, 'personId' | 'familyId' | 'addedAt' | 'addedByUserId' | 'hasManual'>
  ): Promise<string> => {
    if (!user?.familyId || !user?.userId) {
      throw new Error('User must be authenticated');
    }

    try {
      const newPerson: Omit<Person, 'personId'> = {
        ...personData,
        familyId: user.familyId,
        addedAt: Timestamp.now(),
        addedByUserId: user.userId,
        hasManual: false
      };

      // Remove undefined fields to avoid Firestore errors
      const cleanedPerson = Object.fromEntries(
        Object.entries(newPerson).filter(([_, value]) => value !== undefined)
      );

      const docRef = await addDoc(
        collection(firestore, PERSON_MANUAL_COLLECTIONS.PEOPLE),
        cleanedPerson
      );

      // Update local state
      setPeople(prev => [{
        personId: docRef.id,
        ...newPerson
      } as Person, ...prev]);

      return docRef.id;
    } catch (err) {
      console.error('Error adding person:', err);
      throw new Error('Failed to add person');
    }
  };

  // Update person
  const updatePerson = async (
    personId: string,
    updates: Partial<Person>
  ): Promise<void> => {
    try {
      const personRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.PEOPLE, personId);
      await updateDoc(personRef, updates);

      // Update local state
      setPeople(prev =>
        prev.map(person =>
          person.personId === personId
            ? { ...person, ...updates }
            : person
        )
      );
    } catch (err) {
      console.error('Error updating person:', err);
      throw new Error('Failed to update person');
    }
  };

  // Delete person (with cascade delete of manual and workbooks)
  const deletePerson = async (personId: string): Promise<void> => {
    if (!user?.familyId) {
      throw new Error('User must be authenticated with a family');
    }

    try {
      // First, delete associated manual if it exists
      const manualsQuery = query(
        collection(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS),
        where('personId', '==', personId),
        where('familyId', '==', user.familyId)
      );
      const manualsSnapshot = await getDocs(manualsQuery);

      for (const manualDoc of manualsSnapshot.docs) {
        try {
          await deleteDoc(doc(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS, manualDoc.id));
          console.log(`Deleted manual: ${manualDoc.id}`);
        } catch (err) {
          console.error(`Failed to delete manual ${manualDoc.id}:`, err);
          throw new Error(`Failed to delete manual: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      // Delete weekly workbooks
      const workbooksQuery = query(
        collection(firestore, 'weekly_workbooks'),
        where('personId', '==', personId),
        where('familyId', '==', user.familyId)
      );
      const workbooksSnapshot = await getDocs(workbooksQuery);

      for (const workbookDoc of workbooksSnapshot.docs) {
        try {
          await deleteDoc(doc(firestore, 'weekly_workbooks', workbookDoc.id));
          console.log(`Deleted workbook: ${workbookDoc.id}`);
        } catch (err) {
          console.error(`Failed to delete workbook ${workbookDoc.id}:`, err);
          throw new Error(`Failed to delete workbook: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      // Finally, delete the person
      try {
        const personRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.PEOPLE, personId);
        await deleteDoc(personRef);
        console.log(`Deleted person: ${personId}`);
      } catch (err) {
        console.error(`Failed to delete person ${personId}:`, err);
        throw new Error(`Failed to delete person: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      // Update local state
      setPeople(prev => prev.filter(person => person.personId !== personId));
    } catch (err) {
      console.error('Error deleting person:', err);
      throw err; // Re-throw the specific error instead of generic message
    }
  };

  // Link manual to person
  const linkManual = async (personId: string, manualId: string): Promise<void> => {
    await updatePerson(personId, {
      hasManual: true,
      manualId
    });
  };

  // Statistics
  const totalCount = people.length;
  const withManuals = people.filter(p => p.hasManual).length;

  return {
    people,
    loading,
    error,
    addPerson,
    updatePerson,
    deletePerson,
    getById,
    getByName,
    linkManual,
    totalCount,
    withManuals
  };
}

/**
 * Hook for a single person
 */
export function usePersonById(personId?: string) {
  const { people, loading, error, updatePerson } = usePerson();
  const [person, setPerson] = useState<Person | null>(null);

  useEffect(() => {
    if (!personId) {
      setPerson(null);
      return;
    }

    const foundPerson = people.find(p => p.personId === personId);
    setPerson(foundPerson || null);
  }, [personId, people]);

  return {
    person,
    loading,
    error,
    updatePerson: (updates: Partial<Person>) =>
      personId ? updatePerson(personId, updates) : Promise.reject('No person ID'),
    exists: !!person
  };
}
