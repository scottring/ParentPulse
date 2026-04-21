'use client';

import { useState } from 'react';
import type { TherapyTheme } from '@/types/therapy';
import { ThemeCard } from './ThemeCard';
import styles from './therapy.module.css';

interface ThemeListProps {
  themes: TherapyTheme[];
  onStar: (id: string, current: boolean) => Promise<void>;
  onDismiss: (id: string, current: boolean) => Promise<void>;
  onNote: (id: string, note: string) => Promise<void>;
}

/**
 * Ordered theme list.
 *
 * Order: starred first, then LLM insertion order (by generatedAt),
 * dismissed hidden behind a "Show N dismissed" toggle.
 */
export function ThemeList({ themes, onStar, onDismiss, onNote }: ThemeListProps) {
  const [showDismissed, setShowDismissed] = useState(false);

  const active = themes.filter((t) => !t.userState.dismissed);
  const dismissed = themes.filter((t) => t.userState.dismissed);

  // Starred first, then chronological by generatedAt
  const sorted = [...active].sort((a, b) => {
    if (a.userState.starred && !b.userState.starred) return -1;
    if (!a.userState.starred && b.userState.starred) return 1;
    const ta = a.generatedAt?.toMillis?.() ?? 0;
    const tb = b.generatedAt?.toMillis?.() ?? 0;
    return ta - tb;
  });

  if (themes.length === 0) {
    return (
      <p className={styles.themeEmpty}>
        No themes yet. Hit Refresh to generate your prep brief.
      </p>
    );
  }

  return (
    <div className={styles.themeList}>
      {sorted.map((theme) => (
        <ThemeCard
          key={theme.id}
          theme={theme}
          onStar={onStar}
          onDismiss={onDismiss}
          onNote={onNote}
        />
      ))}

      {dismissed.length > 0 && (
        <div className={styles.dismissedSection}>
          <button
            type="button"
            className={styles.dismissedToggle}
            onClick={() => setShowDismissed((o) => !o)}
            aria-expanded={showDismissed}
          >
            {showDismissed ? '▾' : '▸'}{' '}
            {dismissed.length} dismissed theme{dismissed.length !== 1 ? 's' : ''}
          </button>

          {showDismissed && (
            <div className={styles.dismissedList}>
              {dismissed.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  onStar={onStar}
                  onDismiss={onDismiss}
                  onNote={onNote}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
