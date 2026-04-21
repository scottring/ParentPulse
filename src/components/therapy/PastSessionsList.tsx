'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { TherapyWindow } from '@/types/therapy';
import styles from './therapy.module.css';

interface PastSessionsListProps {
  therapistId: string;
}

function formatDate(window: TherapyWindow): string {
  const ts = window.closedAt;
  if (!ts) return 'Unknown date';
  const d = ts.toDate ? ts.toDate() : new Date((ts as unknown as { seconds: number }).seconds * 1000);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function PastSessionsList({ therapistId }: PastSessionsListProps) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [windows, setWindows] = useState<TherapyWindow[]>([]);

  useEffect(() => {
    if (!user?.userId || !therapistId) return;
    const unsub = onSnapshot(
      query(
        collection(firestore, 'therapy_windows'),
        where('therapistId', '==', therapistId),
        where('status', '==', 'closed'),
        orderBy('closedAt', 'desc'),
      ),
      (snap) => {
        const out: TherapyWindow[] = [];
        snap.forEach((d) => out.push({ id: d.id, ...(d.data() as Omit<TherapyWindow, 'id'>) }));
        setWindows(out);
      },
    );
    return () => unsub();
  }, [user?.userId, therapistId]);

  if (windows.length === 0) return null;

  return (
    <div className={styles.pastSessions}>
      <button
        type="button"
        className={styles.pastToggle}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        Past sessions · {windows.length} {expanded ? '▴' : '▾'}
      </button>

      {expanded && (
        <ul className={styles.pastList}>
          {windows.map((w) => (
            <li key={w.id}>
              <Link href={`/therapy/sessions/${w.id}`} className={styles.pastLink}>
                <span>{formatDate(w)}</span>
                {w.noteIds.length > 0 && (
                  <span className={styles.pastPip}>Transcript</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
