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
 * live Firestore. Production will bind these to actual collection reads;
 * tests pass stubs.
 *
 * Both familyId AND currentUserId are required so each implementation can
 * scope its queries to only documents the caller is allowed to read.
 */
export interface EntrySource {
  journalEntries(familyId: string, currentUserId: string): Promise<JournalEntry[]>;
  contributions(familyId: string, currentUserId: string): Promise<Contribution[]>;
  personManuals(familyId: string, currentUserId: string): Promise<PersonManual[]>;
  growthItems(familyId: string, currentUserId: string): Promise<GrowthItem[]>;
}

export type FamilyRosterFetcher = (familyId: string) => Promise<string[]>;

const SENTINEL_FAMILY_VISIBILITY = '_visibility:family';

export async function fetchEntries(
  familyId: string,
  filter: EntryFilter,
  source: EntrySource,
  currentUserId: string,
  fetchRoster?: FamilyRosterFetcher
): Promise<Entry[]> {
  const [journals, contribs, manuals, growth] = await Promise.all([
    source.journalEntries(familyId, currentUserId),
    source.contributions(familyId, currentUserId),
    source.personManuals(familyId, currentUserId),
    source.growthItems(familyId, currentUserId),
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

  // Sentinel resolution: replace _visibility:family tag with actual roster.
  const needsRoster = entries.some((e) =>
    e.tags.includes(SENTINEL_FAMILY_VISIBILITY)
  );
  if (needsRoster && fetchRoster) {
    const roster = await fetchRoster(familyId);
    for (const e of entries) {
      if (e.tags.includes(SENTINEL_FAMILY_VISIBILITY)) {
        e.visibleToUserIds = roster;
        e.tags = e.tags.filter((t) => t !== SENTINEL_FAMILY_VISIBILITY);
      }
    }
  }

  const effective: EntryFilter & { currentUserIdForFilter?: string } = {
    ...filter,
    currentUserIdForFilter: currentUserId,
  };
  return applyFilter(entries, effective);
}

export function applyFilter(entries: Entry[], filter: EntryFilter): Entry[] {
  let out = entries;

  if (filter.onlyPrivateToCurrentUser) {
    const uid = (filter as EntryFilter & { currentUserIdForFilter?: string })
      .currentUserIdForFilter;
    if (uid) {
      out = out.filter(
        (e) =>
          e.visibleToUserIds.length === 1 && e.visibleToUserIds[0] === uid
      );
    }
  }

  if (!filter.includeArchived) {
    out = out.filter((e) => !e.archivedAt);
  }

  if (!filter.includeContributionSources) {
    out = out.filter((e) => !e.tags.includes('_source:contribution'));
  }

  if (!filter.includeSynthesisDetail) {
    out = out.filter((e) => !e.tags.includes('_source:synthesis-detail'));
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
 * Production-bound EntrySource that reads from Firestore.
 *
 * contributions: issues TWO parallel queries — own drafts UNION family
 * completes — then deduplicates by document id. This satisfies Firestore
 * security rules that require either `contributorId == me` OR
 * `status == 'complete'`.
 *
 * ID-field mapping (collection-doc-id → typed-field):
 *   journal_entries  → entryId
 *   contributions    → contributionId
 *   person_manuals   → manualId
 *   growth_items     → growthItemId
 */
export const firestoreEntrySource: EntrySource = {
  async journalEntries(familyId, _currentUserId) {
    const snap = await getDocs(
      firestoreQuery(collection(firestore, 'journal_entries'), where('familyId', '==', familyId))
    );
    return snap.docs.map(
      (d) => ({ entryId: d.id, ...(d.data() as Omit<JournalEntry, 'entryId'>) })
    );
  },
  async contributions(familyId, currentUserId) {
    const [ownSnap, completeSnap] = await Promise.all([
      getDocs(
        firestoreQuery(
          collection(firestore, 'contributions'),
          where('familyId', '==', familyId),
          where('contributorId', '==', currentUserId)
        )
      ),
      getDocs(
        firestoreQuery(
          collection(firestore, 'contributions'),
          where('familyId', '==', familyId),
          where('status', '==', 'complete')
        )
      ),
    ]);
    const seen = new Set<string>();
    const out: Contribution[] = [];
    for (const d of [...ownSnap.docs, ...completeSnap.docs]) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      out.push({ contributionId: d.id, ...(d.data() as Omit<Contribution, 'contributionId'>) });
    }
    return out;
  },
  async personManuals(familyId, _currentUserId) {
    const snap = await getDocs(
      firestoreQuery(collection(firestore, 'person_manuals'), where('familyId', '==', familyId))
    );
    return snap.docs.map(
      (d) => ({ manualId: d.id, ...(d.data() as Omit<PersonManual, 'manualId'>) })
    );
  },
  async growthItems(familyId, _currentUserId) {
    const snap = await getDocs(
      firestoreQuery(collection(firestore, 'growth_items'), where('familyId', '==', familyId))
    );
    return snap.docs.map(
      (d) => ({ growthItemId: d.id, ...(d.data() as Omit<GrowthItem, 'growthItemId'>) })
    );
  },
};

/**
 * Production roster fetcher: queries the `users` collection for all members
 * of the given family and returns their document ids (= user uids).
 */
export const firestoreFamilyRoster: FamilyRosterFetcher = async (familyId) => {
  const snap = await getDocs(
    firestoreQuery(collection(firestore, 'users'), where('familyId', '==', familyId))
  );
  return snap.docs.map((d) => d.id);
};
