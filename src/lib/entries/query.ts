import type { Entry, EntryFilter } from '@/types/entry';
import type { JournalEntry } from '@/types/journal';
import type { Contribution, PersonManual } from '@/types/person-manual';
import type { GrowthItem } from '@/types/growth';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, query as firestoreQuery, where } from 'firebase/firestore';
import {
  journalEntryToEntry,
  contributionToEntries,
  synthesizedContentToEntries,
  growthItemToEntry,
} from './adapter';

/**
 * Dependency-injection facade so the query layer is testable without a
 * live Firestore. Production will bind these to actual collection reads
 * in Task 7; tests pass stubs.
 */
export interface EntrySource {
  journalEntries(familyId: string): Promise<JournalEntry[]>;
  contributions(familyId: string): Promise<Contribution[]>;
  personManuals(familyId: string): Promise<PersonManual[]>;
  growthItems(familyId: string): Promise<GrowthItem[]>;
}

export async function fetchEntries(
  familyId: string,
  filter: EntryFilter,
  source: EntrySource
): Promise<Entry[]> {
  const [journals, contribs, manuals, growth] = await Promise.all([
    source.journalEntries(familyId),
    source.contributions(familyId),
    source.personManuals(familyId),
    source.growthItems(familyId),
  ]);

  const entries: Entry[] = [];
  for (const j of journals) entries.push(journalEntryToEntry(j));
  for (const c of contribs) entries.push(...contributionToEntries(c));
  for (const m of manuals) {
    if (m.synthesizedContent) {
      entries.push(
        ...synthesizedContentToEntries({
          familyId: m.familyId,
          manualId: m.manualId,
          personId: m.personId ?? null,
          synth: m.synthesizedContent,
        })
      );
    }
  }
  for (const g of growth) entries.push(growthItemToEntry(g));

  return applyFilter(entries, filter);
}

export function applyFilter(entries: Entry[], filter: EntryFilter): Entry[] {
  let out = entries;

  if (!filter.includeArchived) {
    out = out.filter((e) => !e.archivedAt);
  }

  if (filter.types && filter.types.length > 0) {
    out = out.filter((e) => filter.types!.includes(e.type));
  }

  if (filter.subjectPersonIds || filter.includeFamilySubject || filter.includeBonds) {
    out = out.filter((e) =>
      e.subjects.some((s) => {
        if (s.kind === 'person' && filter.subjectPersonIds?.includes(s.personId)) return true;
        if (s.kind === 'family' && filter.includeFamilySubject) return true;
        if (s.kind === 'bond' && filter.includeBonds) return true;
        return false;
      })
    );
  }

  if (filter.fromDate) {
    const ms = filter.fromDate.getTime();
    out = out.filter((e) => e.createdAt.toMillis() >= ms);
  }
  if (filter.toDate) {
    const ms = filter.toDate.getTime();
    out = out.filter((e) => e.createdAt.toMillis() <= ms);
  }

  return out.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

/**
 * Production-bound EntrySource that reads from Firestore legacy collections.
 * Each method returns typed objects that the adapters in `./adapter.ts`
 * know how to consume.
 *
 * ID-field mapping (collection-doc-id → typed-field):
 *   journal_entries  → entryId
 *   contributions    → contributionId
 *   person_manuals   → manualId
 *   growth_items     → growthItemId
 */
export const firestoreEntrySource: EntrySource = {
  async journalEntries(familyId) {
    const snap = await getDocs(
      firestoreQuery(collection(firestore, 'journal_entries'), where('familyId', '==', familyId))
    );
    return snap.docs.map(
      (d) => ({ entryId: d.id, ...(d.data() as Omit<JournalEntry, 'entryId'>) })
    );
  },
  async contributions(familyId) {
    const snap = await getDocs(
      firestoreQuery(collection(firestore, 'contributions'), where('familyId', '==', familyId))
    );
    return snap.docs.map(
      (d) => ({ contributionId: d.id, ...(d.data() as Omit<Contribution, 'contributionId'>) })
    );
  },
  async personManuals(familyId) {
    const snap = await getDocs(
      firestoreQuery(collection(firestore, 'person_manuals'), where('familyId', '==', familyId))
    );
    return snap.docs.map(
      (d) => ({ manualId: d.id, ...(d.data() as Omit<PersonManual, 'manualId'>) })
    );
  },
  async growthItems(familyId) {
    const snap = await getDocs(
      firestoreQuery(collection(firestore, 'growth_items'), where('familyId', '==', familyId))
    );
    return snap.docs.map(
      (d) => ({ growthItemId: d.id, ...(d.data() as Omit<GrowthItem, 'growthItemId'>) })
    );
  },
};
