'use client';

import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, orderBy, query, where,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { TherapyWindow, TherapyTheme, TherapyNote } from '@/types/therapy';

export interface UseTherapyWindowResult {
  loading: boolean;
  openWindow: TherapyWindow | null;
  themes: TherapyTheme[];
  notes: TherapyNote[];
  error: Error | null;
}

interface WindowState {
  openWindow: TherapyWindow | null;
  loaded: boolean;
}

interface ThemesNotesState {
  themes: TherapyTheme[];
  notes: TherapyNote[];
  themesLoaded: boolean;
  notesLoaded: boolean;
}

export function useTherapyWindow(therapistId: string | null): UseTherapyWindowResult {
  const { user } = useAuth();
  const [windowState, setWindowState] = useState<WindowState>({ openWindow: null, loaded: false });
  const [themesNotesState, setThemesNotesState] = useState<ThemesNotesState>({
    themes: [], notes: [], themesLoaded: false, notesLoaded: false,
  });
  const [error, setError] = useState<Error | null>(null);

  // Window subscription
  useEffect(() => {
    if (!user?.userId || !therapistId) {
      setWindowState({ openWindow: null, loaded: true });
      setThemesNotesState({ themes: [], notes: [], themesLoaded: true, notesLoaded: true });
      return;
    }
    setWindowState({ openWindow: null, loaded: false });
    const unsubWin = onSnapshot(
      query(collection(firestore, 'therapy_windows'),
        where('therapistId', '==', therapistId),
        where('status', '==', 'open')),
      (snap) => {
        if (snap.docs.length === 0) {
          setWindowState({ openWindow: null, loaded: true });
        } else {
          const d = snap.docs[0];
          setWindowState({ openWindow: { id: d.id, ...(d.data() as Omit<TherapyWindow, 'id'>) }, loaded: true });
        }
      },
      (err) => { setError(err); setWindowState((prev) => ({ ...prev, loaded: true })); }
    );
    return () => unsubWin();
  }, [user?.userId, therapistId]);

  // Themes + notes subscription (depends on open window id)
  useEffect(() => {
    const windowId = windowState.openWindow?.id;
    if (!windowId) {
      setThemesNotesState({ themes: [], notes: [], themesLoaded: true, notesLoaded: true });
      return;
    }
    setThemesNotesState({ themes: [], notes: [], themesLoaded: false, notesLoaded: false });

    const unsubThemes = onSnapshot(
      query(collection(firestore, 'therapy_themes'), where('windowId', '==', windowId)),
      (snap) => {
        const out: TherapyTheme[] = [];
        snap.forEach((d) => out.push({ id: d.id, ...(d.data() as Omit<TherapyTheme, 'id'>) }));
        setThemesNotesState((prev) => ({ ...prev, themes: out, themesLoaded: true }));
      },
      (err) => { setError(err); setThemesNotesState((prev) => ({ ...prev, themesLoaded: true })); }
    );
    const unsubNotes = onSnapshot(
      query(collection(firestore, 'therapy_notes'),
        where('windowId', '==', windowId),
        orderBy('createdAt', 'desc')),
      (snap) => {
        const out: TherapyNote[] = [];
        snap.forEach((d) => out.push({ id: d.id, ...(d.data() as Omit<TherapyNote, 'id'>) }));
        setThemesNotesState((prev) => ({ ...prev, notes: out, notesLoaded: true }));
      },
      (err) => { setError(err); setThemesNotesState((prev) => ({ ...prev, notesLoaded: true })); }
    );
    return () => { unsubThemes(); unsubNotes(); };
  }, [windowState.openWindow?.id]);

  const loading = !windowState.loaded || !themesNotesState.themesLoaded || !themesNotesState.notesLoaded;
  return {
    loading,
    openWindow: windowState.openWindow,
    themes: themesNotesState.themes,
    notes: themesNotesState.notes,
    error,
  };
}
