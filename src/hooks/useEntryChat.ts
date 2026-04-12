'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firestore, functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export interface ChatTurn {
  turnId: string;
  role: 'user' | 'assistant';
  content: string;
  authorId?: string;
  excluded?: boolean;
  createdAt: Timestamp;
}

interface UseEntryChatReturn {
  /** All turns in chronological order, loaded via real-time subscription. */
  turns: ChatTurn[];
  /** True while waiting for the AI response. */
  loading: boolean;
  /** Error message from the last send attempt. */
  error: string | null;
  /** Send a message — appends to the entry's chat subcollection. */
  sendMessage: (message: string, personIds?: string[]) => Promise<void>;
  /** Whether the subscription has loaded at least once. */
  ready: boolean;
}

/**
 * Per-entry persistent chat. Subscribes to the
 * `journal_entries/{entryId}/chat` subcollection in real time and
 * sends messages via the `chatWithEntry` Cloud Function.
 *
 * The thread persists across page visits — when the user returns to
 * the entry, all previous turns are visible immediately.
 */
export function useEntryChat(entryId: string | null): UseEntryChatReturn {
  const { user } = useAuth();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Real-time subscription to the chat subcollection.
  useEffect(() => {
    if (!entryId || !user) {
      setTurns([]);
      setReady(false);
      return;
    }

    const q = query(
      collection(firestore, 'journal_entries', entryId, 'chat'),
      orderBy('createdAt', 'asc'),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const loaded: ChatTurn[] = [];
        snap.forEach((doc) => {
          const d = doc.data();
          loaded.push({
            turnId: doc.id,
            role: d.role,
            content: d.content,
            authorId: d.authorId,
            excluded: d.excluded ?? false,
            createdAt: d.createdAt,
          });
        });
        setTurns(loaded);
        setReady(true);
      },
      (err) => {
        console.error('useEntryChat: subscription error', err);
        setReady(true);
      },
    );

    return unsub;
  }, [entryId, user]);

  const sendMessage = useCallback(
    async (message: string, personIds?: string[]) => {
      if (!entryId || !user || !message.trim()) return;

      setLoading(true);
      setError(null);

      // Optimistic: add user message locally so it appears immediately.
      // The real-time subscription will replace it with the server doc
      // once the Cloud Function writes.
      const optimisticTurn: ChatTurn = {
        turnId: `optimistic-${Date.now()}`,
        role: 'user',
        content: message,
        authorId: user.userId,
        createdAt: Timestamp.now(),
      };
      setTurns((prev) => [...prev, optimisticTurn]);

      try {
        const fn = httpsCallable<
          { entryId: string; message: string; personIds?: string[] },
          { success: boolean; response: string; turnId: string }
        >(functions, 'chatWithEntry');

        await fn({
          entryId,
          message,
          personIds: personIds?.filter(Boolean),
        });

        // The real-time subscription picks up both the user turn and
        // the AI turn automatically — no need to manually update state.
      } catch (err) {
        console.error('useEntryChat: send failed', err);
        setError(
          err instanceof Error ? err.message : 'Failed to send message',
        );
        // Remove the optimistic message on failure
        setTurns((prev) =>
          prev.filter((t) => t.turnId !== optimisticTurn.turnId),
        );
      } finally {
        setLoading(false);
      }
    },
    [entryId, user],
  );

  return { turns, loading, error, sendMessage, ready };
}
