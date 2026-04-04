'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Person, PERSON_MANUAL_COLLECTIONS } from '@/types/person-manual';

/**
 * Given a personId, find all equivalent Person records (same real person)
 * and return their manual IDs so contributions from all of them can be loaded.
 */
export function useEquivalentManualIds(personId: string, people: Person[]): string[] {
  const { user } = useAuth();
  const [manualIds, setManualIds] = useState<string[]>([]);

  // Find equivalent person IDs (same logic as useDashboard)
  const equivalentPersonIds = useMemo(() => {
    const person = people.find((p) => p.personId === personId);
    if (!person) return [];

    const ids: string[] = [];
    const firstName = person.name.toLowerCase().trim().split(' ')[0];

    for (const p of people) {
      if (p.personId === personId) continue;
      // Same linkedUserId
      if (person.linkedUserId && p.linkedUserId === person.linkedUserId) {
        ids.push(p.personId);
        continue;
      }
      // Name match between self and spouse
      if (
        ((person.relationshipType === 'self' && p.relationshipType === 'spouse') ||
         (person.relationshipType === 'spouse' && p.relationshipType === 'self')) &&
        p.name.toLowerCase().trim().split(' ')[0] === firstName
      ) {
        ids.push(p.personId);
      }
    }
    return ids;
  }, [personId, people]);

  // Look up manuals for equivalent persons
  useEffect(() => {
    if (!user?.familyId || equivalentPersonIds.length === 0) {
      setManualIds([]);
      return;
    }

    const fetchManuals = async () => {
      const ids: string[] = [];
      for (const pid of equivalentPersonIds) {
        const q = query(
          collection(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS),
          where('familyId', '==', user.familyId),
          where('personId', '==', pid),
        );
        const snap = await getDocs(q);
        snap.docs.forEach((d) => ids.push(d.id));
      }
      setManualIds(ids);
    };

    fetchManuals();
  }, [user?.familyId, equivalentPersonIds]);

  return manualIds;
}
