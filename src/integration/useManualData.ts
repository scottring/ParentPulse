'use client';
/* ================================================================
   Relish · Integration — useManualData
   Bridges useDashboard to the Manual design components.
   Maps Person → PeopleGrid.Person; PersonManual → PersonSheet.
   ================================================================ */

import { useMemo } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { computeAge } from '@/utils/age';
import type { Person as GridPerson } from '@/design/manual/PeopleGrid';
import type { Person, PersonManual } from '@/types/person-manual';

const ACCENTS = ['sage', 'ember', 'burgundy', 'amber', 'ink'] as const;
type Accent = typeof ACCENTS[number];

function accentFor(id: string): Accent {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

function relationLabel(p: Person): string {
  const age = p.dateOfBirth ? computeAge(p.dateOfBirth) : null;
  switch (p.relationshipType) {
    case 'self': return 'You';
    case 'spouse': return age != null ? `Partner · ${age}` : 'Partner';
    case 'child': return age != null ? `Child · ${age}` : 'Child';
    case 'elderly_parent': return 'Parent';
    case 'sibling': return 'Sibling';
    case 'friend': return 'Friend';
    default: return 'Of the family';
  }
}

export function useManualPeople() {
  const { people, selfPerson } = useDashboard();
  const { entries } = useJournalEntries();

  return useMemo<GridPerson[]>(() => {
    // Last-mention map: most recent entry per personId.
    const lastByPerson = new Map<string, Date>();
    for (const e of entries) {
      const d: Date | null = e.createdAt?.toDate ? e.createdAt.toDate() : null;
      if (!d) continue;
      for (const personId of e.personMentions ?? []) {
        const cur = lastByPerson.get(personId);
        if (!cur || d > cur) lastByPerson.set(personId, d);
      }
    }
    const active = people.filter((p) => !p.archived);
    const ordered: Person[] = [];
    if (selfPerson) ordered.push(selfPerson);
    for (const p of active) if (p.personId !== selfPerson?.personId) ordered.push(p);

    return ordered.map((p) => {
      const last = lastByPerson.get(p.personId);
      let lastMention: string | undefined;
      if (last) {
        const days = Math.floor((Date.now() - last.getTime()) / 86_400_000);
        lastMention = days < 1 ? 'Mentioned today'
          : days === 1 ? 'Mentioned yesterday'
          : days < 30 ? `Mentioned ${days} days ago`
          : `Mentioned ${Math.floor(days / 30)}mo ago`;
      }
      return {
        id: p.personId,
        name: p.name,
        relation: relationLabel(p),
        lastMention,
        accent: accentFor(p.personId),
      };
    });
  }, [people, selfPerson, entries]);
}

export function useManualPersonSheet(personId: string) {
  const { people, manuals } = useDashboard();
  const { entries } = useJournalEntries();

  return useMemo(() => {
    const person = people.find((p) => p.personId === personId) ?? null;
    const manual: PersonManual | null =
      manuals.find((m) => m.personId === personId) ?? null;
    if (!person) return null;

    const essentials: { label: string; value: string }[] = [];
    if (person.dateOfBirth) {
      const dob = person.dateOfBirth.toDate();
      essentials.push({ label: 'Born', value: dob.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) });
    }

    const strengths = manual?.coreInfo?.strengths?.slice(0, 6) ?? [];
    const worksList = [...(manual?.whatWorks ?? [])]
      .sort((a, b) => b.effectiveness - a.effectiveness)
      .slice(0, 4)
      .map((w) => w.description);

    const threads = entries
      .filter((e) => (e.personMentions ?? []).includes(personId))
      .slice(0, 5)
      .map((e) => ({
        id: e.entryId,
        title: e.text?.slice(0, 60) || 'A note',
        date: e.createdAt?.toDate
          ? e.createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          : '',
      }));

    return {
      name: person.name,
      relation: relationLabel(person),
      accent: accentFor(person.personId),
      essentials,
      rituals: [],          // wire from couple_rituals when person-scoped rituals exist
      threads,
      quietFacts: [...strengths, ...worksList],
    };
  }, [personId, people, manuals, entries]);
}
