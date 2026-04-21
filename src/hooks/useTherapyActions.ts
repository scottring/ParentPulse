'use client';

import { useCallback, useState } from 'react';
import {
  addDoc, arrayUnion, collection, doc, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firestore, functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { THERAPY_NOTE_MAX_LENGTH } from '@/types/therapy';

export interface CloseSessionInput {
  windowId: string;
  sessionDate: Date;
  discussedThemeIds: string[];
  transcript?: string | null;
}

export interface ImportNoteInput {
  windowId: string;
  therapistId: string;
  content: string;
}

export interface UseTherapyActionsResult {
  saving: boolean;
  error: Error | null;
  toggleStar: (themeId: string, currentValue: boolean) => Promise<void>;
  toggleDismiss: (themeId: string, currentValue: boolean) => Promise<void>;
  setNote: (themeId: string, note: string) => Promise<void>;
  importNote: (input: ImportNoteInput) => Promise<string>;
  refresh: (windowId: string) => Promise<void>;
  closeSession: (input: CloseSessionInput) => Promise<{ newWindowId: string }>;
}

export function useTherapyActions(): UseTherapyActionsResult {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const wrap = <T,>(fn: () => Promise<T>) => async (): Promise<T> => {
    setSaving(true); setError(null);
    try { return await fn(); }
    catch (e) { setError(e as Error); throw e; }
    finally { setSaving(false); }
  };

  const toggleStar = useCallback(
    async (themeId: string, currentValue: boolean) =>
      wrap(async () => {
        await updateDoc(doc(firestore, 'therapy_themes', themeId), { 'userState.starred': !currentValue });
      })(),
    []);

  const toggleDismiss = useCallback(
    async (themeId: string, currentValue: boolean) =>
      wrap(async () => {
        await updateDoc(doc(firestore, 'therapy_themes', themeId), { 'userState.dismissed': !currentValue });
      })(),
    []);

  const setNote = useCallback(
    async (themeId: string, note: string) =>
      wrap(async () => {
        const trimmed = note.trim();
        await updateDoc(doc(firestore, 'therapy_themes', themeId), {
          'userState.note': trimmed.length > 0 ? trimmed : null,
        });
      })(),
    []);

  const importNote = useCallback(
    async ({ windowId, therapistId, content }: ImportNoteInput): Promise<string> =>
      wrap(async () => {
        if (!user?.userId) throw new Error('Not signed in');
        const trimmed = content.trim();
        if (trimmed.length === 0) throw new Error('Note is empty');
        if (trimmed.length > THERAPY_NOTE_MAX_LENGTH) {
          throw new Error(`Note exceeds ${THERAPY_NOTE_MAX_LENGTH.toLocaleString()} characters`);
        }
        const ref = await addDoc(collection(firestore, 'therapy_notes'), {
          windowId, therapistId, ownerUserId: user.userId,
          content: trimmed, createdAt: serverTimestamp(),
        });
        await updateDoc(doc(firestore, 'therapy_windows', windowId), {
          noteIds: arrayUnion(ref.id),
        });
        return ref.id;
      })(),
    [user?.userId]);

  const refresh = useCallback(
    async (windowId: string) =>
      wrap(async () => {
        const call = httpsCallable<{ windowId: string }, { ok: boolean }>(functions, 'regenerateTherapyWindow');
        await call({ windowId });
      })(),
    []);

  const closeSession = useCallback(
    async ({ windowId, sessionDate, discussedThemeIds, transcript }: CloseSessionInput) =>
      wrap(async () => {
        const call = httpsCallable<
          { windowId: string; sessionDateMillis: number; discussedThemeIds: string[]; transcript?: string | null },
          { newWindowId: string }
        >(functions, 'closeTherapyWindow');
        const r = await call({
          windowId, sessionDateMillis: sessionDate.getTime(),
          discussedThemeIds, transcript: transcript ?? null,
        });
        return r.data;
      })(),
    []);

  return { saving, error, toggleStar, toggleDismiss, setNote, importNote, refresh, closeSession };
}
