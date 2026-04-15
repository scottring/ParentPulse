'use client';

import { useMemo } from 'react';
import { usePerson } from '@/hooks/usePerson';
import type { Person } from '@/types/person-manual';

export interface PeopleMap {
  byId: Record<string, Person>;
  nameOf: (personId: string) => string;
  loading: boolean;
}

export function usePeopleMap(): PeopleMap {
  const { people, loading } = usePerson();

  const byId = useMemo(() => {
    const map: Record<string, Person> = {};
    for (const p of people ?? []) {
      map[p.personId] = p;
    }
    return map;
  }, [people]);

  const nameOf = useMemo(
    () => (personId: string) => byId[personId]?.name ?? personId,
    [byId]
  );

  return { byId, nameOf, loading };
}
