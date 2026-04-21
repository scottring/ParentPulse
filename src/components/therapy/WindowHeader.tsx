import type { TherapyWindow } from '@/types/therapy';
import styles from './therapy.module.css';

interface WindowHeaderProps {
  window: TherapyWindow;
  therapistName: string;
  onRefresh: () => void;
  onImport: () => void;
  onClose: () => void;
  refreshing?: boolean;
}

function formatOpenedDate(window: TherapyWindow): string {
  if (!window.openedAt) return '';
  const d = window.openedAt.toDate?.() ?? new Date(window.openedAt as unknown as number);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysOpen(window: TherapyWindow): number {
  if (!window.openedAt) return 0;
  const d = window.openedAt.toDate?.() ?? new Date(window.openedAt as unknown as number);
  const ms = Date.now() - d.getTime();
  return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)) + 1);
}

/**
 * Top header strip for the therapy workspace.
 *
 * Shows: publication-style label, opened date, days-in count, and
 * three action buttons: Refresh / Import notes / I had a session.
 */
export function WindowHeader({
  window: win,
  therapistName,
  onRefresh,
  onImport,
  onClose,
  refreshing,
}: WindowHeaderProps) {
  const opened = formatOpenedDate(win);
  const days = daysOpen(win);

  return (
    <header className={styles.windowHeader}>
      <div className={styles.windowHeaderMeta}>
        <span className={styles.windowHeaderLabel}>
          This session&apos;s prep
        </span>
        {opened && (
          <>
            <span className={styles.windowHeaderSep} aria-hidden="true">·</span>
            <span className={styles.windowHeaderSub}>opened {opened}</span>
          </>
        )}
        {days > 0 && (
          <>
            <span className={styles.windowHeaderSep} aria-hidden="true">·</span>
            <span className={styles.windowHeaderSub}>{days} day{days !== 1 ? 's' : ''} in</span>
          </>
        )}
        <span className={styles.windowHeaderSep} aria-hidden="true">·</span>
        <span className={styles.windowHeaderTherapist}>{therapistName}</span>
      </div>

      <div className={styles.windowHeaderButtons}>
        <button
          type="button"
          className={styles.windowBtn}
          onClick={onRefresh}
          disabled={refreshing}
          title="Regenerate themes from recent journal entries"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
        <button
          type="button"
          className={styles.windowBtn}
          onClick={onImport}
          title="Import session notes or a transcript"
        >
          Import notes
        </button>
        <button
          type="button"
          className={`${styles.windowBtn} ${styles.windowBtnPrimary}`}
          onClick={onClose}
          title="Record that you had a session and open a new prep window"
        >
          I had a session
        </button>
      </div>
    </header>
  );
}
