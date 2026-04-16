'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query as firestoreQuery,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { MarginNote } from '@/types/marginNote';
import { MARGIN_NOTE_MAX_LENGTH } from '@/types/marginNote';

// Firestore 'in' operator caps at 30 values per query. PAGE_SIZE is 6
// in JournalSpread, so a single query is always sufficient.
const FIRESTORE_IN_CAP = 30;

/**
 * Group a flat list of notes by their journalEntryId, with each group
 * sorted oldest-first so render order matches the order they were written.
 */
export function groupNotesByEntry(
  notes: MarginNote[]
): Map<string, MarginNote[]> {
  const map = new Map<string, MarginNote[]>();
  for (const n of notes) {
    const list = map.get(n.journalEntryId);
    if (list) list.push(n);
    else map.set(n.journalEntryId, [n]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
  }
  return map;
}

export interface UseMarginNotesResult {
  notesByEntry: Map<string, MarginNote[]>;
  loading: boolean;
  error: Error | null;
}

/**
 * Subscribe to all margin notes that (a) belong to any entry id in the
 * provided list, AND (b) are visible to the current user. Returns a
 * Map<journalEntryId, MarginNote[]>.
 *
 * When `journalEntryIds` is empty the hook idles — no subscription, no
 * loading flash.
 */
export function useMarginNotesForJournalEntries(
  journalEntryIds: string[]
): UseMarginNotesResult {
  const { user } = useAuth();
  const [notes, setNotes] = useState<MarginNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const idsKey = useMemo(
    () => [...journalEntryIds].sort().join(','),
    [journalEntryIds]
  );

  useEffect(() => {
    if (!user?.userId || !user.familyId || journalEntryIds.length === 0) {
      setNotes([]);
      setLoading(false);
      setError(null);
      return;
    }
    if (journalEntryIds.length > FIRESTORE_IN_CAP) {
      setError(
        new Error(
          `useMarginNotesForJournalEntries: ${journalEntryIds.length} ids exceeds Firestore in-cap of ${FIRESTORE_IN_CAP}`
        )
      );
      return;
    }
    setLoading(true);
    const q = firestoreQuery(
      collection(firestore, 'margin_notes'),
      where('familyId', '==', user.familyId),
      where('journalEntryId', 'in', journalEntryIds),
      where('visibleToUserIds', 'array-contains', user.userId)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const out: MarginNote[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          out.push({
            id: docSnap.id,
            familyId: data.familyId,
            journalEntryId: data.journalEntryId,
            authorUserId: data.authorUserId,
            content: data.content,
            createdAt: data.createdAt as Timestamp,
            editedAt: data.editedAt as Timestamp | undefined,
            visibleToUserIds: data.visibleToUserIds ?? [],
            sharedWithUserIds: data.sharedWithUserIds ?? [],
          });
        });
        setNotes(out);
        setLoading(false);
      },
      (err) => {
        setError(err as Error);
        setLoading(false);
      }
    );
    return () => unsub();
    // idsKey is the change signal for journalEntryIds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId, user?.familyId, idsKey]);

  const notesByEntry = useMemo(() => groupNotesByEntry(notes), [notes]);

  return { notesByEntry, loading, error };
}

export type ValidateNoteResult =
  | { ok: true; content: string }
  | { ok: false; reason: 'empty' | 'too_long' };

export function validateNoteContent(raw: string): ValidateNoteResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, reason: 'empty' };
  if (trimmed.length > MARGIN_NOTE_MAX_LENGTH) {
    return { ok: false, reason: 'too_long' };
  }
  return { ok: true, content: trimmed };
}

export interface UseMarginNotesMutationsResult {
  createNote: (journalEntryId: string, content: string) => Promise<string>;
  updateNote: (noteId: string, content: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  saving: boolean;
  error: Error | null;
}

/**
 * Mutation hook for margin notes. Kept separate from the subscription
 * hook so pure read-only consumers (e.g., a future "recent margin notes"
 * view) don't pull in the write path.
 */
export function useMarginNoteMutations(): UseMarginNotesMutationsResult {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createNote = useCallback(
    async (journalEntryId: string, content: string): Promise<string> => {
      if (!user?.userId || !user.familyId) {
        throw new Error('Not authenticated');
      }
      const v = validateNoteContent(content);
      if (!v.ok) {
        throw new Error(
          v.reason === 'empty' ? 'Note is empty' : 'Note is too long'
        );
      }
      setSaving(true);
      setError(null);
      try {
        // Read the parent entry so we can copy its visibility onto the
        // new note. The rule requires that visibleToUserIds on the note
        // equals the parent's at write time.
        const parentSnap = await getDoc(
          doc(firestore, 'journal_entries', journalEntryId)
        );
        if (!parentSnap.exists()) {
          throw new Error('Parent journal entry not found');
        }
        const parent = parentSnap.data();
        const visibleToUserIds: string[] = parent.visibleToUserIds ?? [];
        const sharedWithUserIds: string[] = parent.sharedWithUserIds ?? [];
        if (!visibleToUserIds.includes(user.userId)) {
          throw new Error('You cannot annotate an entry you cannot see');
        }
        const ref = await addDoc(collection(firestore, 'margin_notes'), {
          familyId: user.familyId,
          journalEntryId,
          authorUserId: user.userId,
          content: v.content,
          createdAt: serverTimestamp(),
          visibleToUserIds,
          sharedWithUserIds,
        });
        return ref.id;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [user?.userId, user?.familyId]
  );

  const updateNote = useCallback(
    async (noteId: string, content: string): Promise<void> => {
      if (!user?.userId) throw new Error('Not authenticated');
      const v = validateNoteContent(content);
      if (!v.ok) {
        throw new Error(
          v.reason === 'empty' ? 'Note is empty' : 'Note is too long'
        );
      }
      setSaving(true);
      setError(null);
      try {
        await updateDoc(doc(firestore, 'margin_notes', noteId), {
          content: v.content,
          editedAt: serverTimestamp(),
        });
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [user?.userId]
  );

  const deleteNote = useCallback(
    async (noteId: string): Promise<void> => {
      if (!user?.userId) throw new Error('Not authenticated');
      setSaving(true);
      setError(null);
      try {
        await deleteDoc(doc(firestore, 'margin_notes', noteId));
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [user?.userId]
  );

  return { createNote, updateNote, deleteNote, saving, error };
}
