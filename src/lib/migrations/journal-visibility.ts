'use client';

/**
 * One-shot migration: backfill `visibleToUserIds` on legacy journal
 * entries written before the per-person sharing model existed.
 *
 * Contract: adds fields, never removes or overwrites content. Only
 * entries authored by the current user are touched (because Firestore
 * rules only allow the author to update their own entries). For the
 * Leviner-Kaufman family, where Scott is the only user so far, this
 * migrates every legacy entry.
 *
 * Migration logic:
 *   - `isPrivate === true`  → visibleToUserIds: [authorId]
 *   - otherwise             → visibleToUserIds: [...family.members]
 *
 * Idempotent — entries that already have `visibleToUserIds` are
 * skipped. Gated per-family via localStorage so subsequent page loads
 * don't re-scan.
 */

import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  getDoc,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { COLLECTIONS } from '@/types';
import type { Family } from '@/types';

interface MigrationResult {
  scanned: number;
  migrated: number;
  skipped: number;
}

function localStorageKey(familyId: string): string {
  return `relish:journal-visibility-migration-v1:${familyId}`;
}

export function hasRunJournalVisibilityMigration(familyId: string): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(localStorageKey(familyId)) === 'done';
}

function markJournalVisibilityMigrationDone(familyId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(localStorageKey(familyId), 'done');
}

export async function runJournalVisibilityMigration(
  familyId: string,
  currentUserId: string,
): Promise<MigrationResult> {
  if (!familyId || !currentUserId) {
    return { scanned: 0, migrated: 0, skipped: 0 };
  }

  // Pull the family doc so we know who "family visible" means for
  // legacy non-private entries.
  const familySnap = await getDoc(
    doc(firestore, COLLECTIONS.FAMILIES, familyId),
  );
  if (!familySnap.exists()) {
    return { scanned: 0, migrated: 0, skipped: 0 };
  }
  const family = familySnap.data() as Family;
  const familyMembers =
    family.members && family.members.length > 0
      ? family.members
      : [currentUserId];

  // Only query entries authored by the current user — those are the
  // only ones we can update under existing security rules.
  const entriesQuery = query(
    collection(firestore, 'journal_entries'),
    where('familyId', '==', familyId),
    where('authorId', '==', currentUserId),
  );
  const snapshot = await getDocs(entriesQuery);

  let migrated = 0;
  let skipped = 0;

  // Firestore batches cap at 500 writes. Chunk and await each batch
  // in sequence so failures surface immediately and we don't leave
  // the migration half-applied.
  const CHUNK = 400;
  let batch = writeBatch(firestore);
  let opsInBatch = 0;

  const commitIfFull = async () => {
    if (opsInBatch >= CHUNK) {
      await batch.commit();
      batch = writeBatch(firestore);
      opsInBatch = 0;
    }
  };

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as Record<string, unknown>;

    // Already migrated — skip.
    if (Array.isArray(data.visibleToUserIds)) {
      skipped++;
      continue;
    }

    const isPrivate = data.isPrivate === true;
    const visibleToUserIds = isPrivate
      ? [currentUserId]
      : Array.from(new Set(familyMembers));

    // This update only ADDS fields. Content, category, text,
    // personMentions, createdAt, authorId — all untouched.
    batch.update(docSnap.ref, {
      visibleToUserIds,
      // New entries write an empty sharedWithUserIds by default, so
      // backfill legacy entries with the same shape. Author can still
      // see the entry via visibleToUserIds (which includes them).
      sharedWithUserIds: [],
    });
    opsInBatch++;
    migrated++;

    await commitIfFull();
  }

  // Commit the trailing batch.
  if (opsInBatch > 0) {
    await batch.commit();
  }

  markJournalVisibilityMigrationDone(familyId);

  return {
    scanned: snapshot.size,
    migrated,
    skipped,
  };
}
