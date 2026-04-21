import type { TherapyTheme } from '@/types/therapy';
import styles from './therapy.module.css';

interface CarryForwardBannerProps {
  themes: TherapyTheme[];
}

/**
 * Muted banner shown when any theme in the current window was
 * carried forward from a previous session.
 */
export function CarryForwardBanner({ themes }: CarryForwardBannerProps) {
  const count = themes.filter((t) => t.lifecycle.carriedForwardCount > 0).length;
  if (count === 0) return null;

  return (
    <p className={styles.carryBanner}>
      {count} thread{count !== 1 ? 's' : ''} carried forward from your last session
    </p>
  );
}
