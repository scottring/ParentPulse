'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  MESSAGE_FLAGS_COLLECTION,
  type MessageFlag,
} from '@/types/flag';

interface UseIncomingFlagsReturn {
  flags: MessageFlag[];
  loading: boolean;
}

/**
 * Live feed of MessageFlag docs where the current user is the recipient
 * and the flag is not yet closed or retracted.
 *
 * Server-side filter uses `status in ['open', 'seen']`. We also filter
 * client-side as defense-in-depth.
 */
export function useIncomingFlags(): UseIncomingFlagsReturn {
  const { user } = useAuth();
  const [flags, setFlags] = useState<MessageFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.userId) {
      setFlags([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(firestore, MESSAGE_FLAGS_COLLECTION),
      where('toUserId', '==', user.userId),
      where('status', 'in', ['open', 'seen']),
    );
    const unsub = onSnapshot(q, (snap) => {
      const out: MessageFlag[] = snap.docs.map((d) => ({
        ...(d.data() as Omit<MessageFlag, 'flagId'>),
        flagId: d.id,
      })).filter((f) => f.status === 'open' || f.status === 'seen');
      setFlags(out);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user?.userId]);

  return { flags, loading };
}
