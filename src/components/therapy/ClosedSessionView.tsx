'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { usePrivacyLock } from '@/hooks/usePrivacyLock';
import { PinKeypad } from '@/components/privacy/PinKeypad';
import type { TherapyWindow, TherapyTheme, TherapyNote } from '@/types/therapy';
import styles from './therapy.module.css';

interface ClosedSessionViewProps {
  windowId: string;
}

function formatSessionDate(window: TherapyWindow): string {
  const ts = window.closedAt;
  if (!ts) return 'Session';
  const d = ts.toDate ? ts.toDate() : new Date((ts as unknown as { seconds: number }).seconds * 1000);
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function ClosedSessionView({ windowId }: ClosedSessionViewProps) {
  const { user } = useAuth();
  const lock = usePrivacyLock();

  const [window, setWindow] = useState<TherapyWindow | null>(null);
  const [themes, setThemes] = useState<TherapyTheme[]>([]);
  const [notes, setNotes] = useState<TherapyNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.userId || !windowId) return;

    let windowLoaded = false;
    let themesLoaded = false;
    let notesLoaded = false;

    function checkDone() {
      if (windowLoaded && themesLoaded && notesLoaded) setLoading(false);
    }

    const unsubWin = onSnapshot(doc(firestore, 'therapy_windows', windowId), (snap) => {
      if (snap.exists()) {
        setWindow({ id: snap.id, ...(snap.data() as Omit<TherapyWindow, 'id'>) });
      }
      windowLoaded = true;
      checkDone();
    });

    const unsubThemes = onSnapshot(
      query(collection(firestore, 'therapy_themes'), where('windowId', '==', windowId)),
      (snap) => {
        const out: TherapyTheme[] = [];
        snap.forEach((d) => out.push({ id: d.id, ...(d.data() as Omit<TherapyTheme, 'id'>) }));
        setThemes(out);
        themesLoaded = true;
        checkDone();
      },
    );

    const unsubNotes = onSnapshot(
      query(collection(firestore, 'therapy_notes'), where('windowId', '==', windowId)),
      (snap) => {
        const out: TherapyNote[] = [];
        snap.forEach((d) => out.push({ id: d.id, ...(d.data() as Omit<TherapyNote, 'id'>) }));
        setNotes(out);
        notesLoaded = true;
        checkDone();
      },
    );

    return () => { unsubWin(); unsubThemes(); unsubNotes(); };
  }, [user?.userId, windowId]);

  // ── PIN gate ───────────────────────────────────────────────────────
  if (lock.loading) {
    return <div className={styles.loadingScreen}>Loading…</div>;
  }

  if (!lock.pinIsSet || !lock.unlocked) {
    return (
      <div className={styles.root}>
        <PinKeypad
          title="Therapy Prep"
          subtitle="Enter your PIN to view this session"
          error={lock.error}
          onSubmit={lock.verify}
        />
      </div>
    );
  }

  if (loading) {
    return <div className={styles.loadingScreen}>Loading session…</div>;
  }

  if (!window) {
    return (
      <div className={styles.workspace}>
        <Link href="/therapy" className={styles.backLink}>← Therapy</Link>
        <p className={styles.emptyStateText}>Session not found.</p>
      </div>
    );
  }

  const discussed = themes.filter((t) => t.lifecycle.discussedAt != null);
  const notDiscussed = themes.filter((t) => t.lifecycle.discussedAt == null);

  return (
    <div className={styles.workspace}>
      <Link href="/therapy" className={styles.backLink}>← Therapy</Link>

      <h1 className={styles.setupTitle}>{formatSessionDate(window)}</h1>

      {discussed.length > 0 && (
        <section>
          <h2 className={styles.closedSectionHead}>Discussed</h2>
          <ul className={styles.themeList} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {discussed.map((t) => (
              <li key={t.id} className={styles.themeCard}>
                <p className={styles.themeTitle}>{t.title}</p>
                <p className={styles.themeSummary}>{t.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {notDiscussed.length > 0 && (
        <section>
          <h2 className={styles.closedSectionHead}>Not discussed (carried forward)</h2>
          <ul className={styles.themeList} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {notDiscussed.map((t) => (
              <li key={t.id} className={`${styles.themeCard}`} style={{ opacity: 0.65 }}>
                <p className={styles.themeTitle}>{t.title}</p>
                <p className={styles.themeSummary}>{t.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {notes.length > 0 && (
        <section>
          <h2 className={styles.closedSectionHead}>Transcript</h2>
          {notes.map((note) => (
            <pre key={note.id} className={styles.noteBody}>{note.content}</pre>
          ))}
        </section>
      )}

      {discussed.length === 0 && notDiscussed.length === 0 && notes.length === 0 && (
        <p className={styles.emptyStateText}>No themes or notes recorded for this session.</p>
      )}
    </div>
  );
}
