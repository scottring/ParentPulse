'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePrivacyLock } from '@/hooks/usePrivacyLock';
import { useTherapist } from '@/hooks/useTherapist';
import { useTherapyWindow } from '@/hooks/useTherapyWindow';
import { useTherapyActions } from '@/hooks/useTherapyActions';
import { PinKeypad } from '@/components/privacy/PinKeypad';
import { PinSetupModal } from '@/components/privacy/PinSetupModal';
import { TherapistSetupForm } from './TherapistSetupForm';
import { WindowHeader } from './WindowHeader';
import { CarryForwardBanner } from './CarryForwardBanner';
import { ThemeList } from './ThemeList';
import { PastSessionsList } from './PastSessionsList';
import { ImportNotesModal } from './ImportNotesModal';
import { SessionCloseSheet } from './SessionCloseSheet';
import styles from './therapy.module.css';

/**
 * TherapyBookShell — top-level orchestrator for the /therapy page.
 *
 * Gate order:
 *   1. PIN not set → PIN setup (PinSetupModal)
 *   2. PIN set but locked → PIN entry (PinKeypad)
 *   3. No therapist → TherapistSetupForm
 *   4. Workspace (WindowHeader + CarryForwardBanner + ThemeList + PastSessionsList)
 */
export function TherapyBookShell() {
  const lock = usePrivacyLock();
  const { loading: therapistLoading, therapist, createTherapist } = useTherapist();
  const { loading: windowLoading, openWindow, themes, notes } = useTherapyWindow(
    therapist?.id ?? null
  );
  const actions = useTherapyActions();

  const [showImport, setShowImport] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Gate 1: loading lock state ──────────────────────────────────
  if (lock.loading) {
    return <div className={styles.loadingScreen}>Loading…</div>;
  }

  // ── Gate 2: PIN not set → setup ─────────────────────────────────
  if (!lock.pinIsSet) {
    return (
      <div className={styles.root}>
        <TopBar />
        <PinSetupModal
          onComplete={async (pin) => {
            await lock.setupPin(pin);
          }}
        />
      </div>
    );
  }

  // ── Gate 3: PIN set but locked → entry ──────────────────────────
  if (!lock.unlocked) {
    return (
      <div className={styles.root}>
        <TopBar />
        <PinKeypad
          title="Therapy Prep"
          subtitle="Enter your PIN to open this space"
          error={lock.error}
          onSubmit={lock.verify}
        />
      </div>
    );
  }

  // ── Gate 4: therapist loading ────────────────────────────────────
  if (therapistLoading) {
    return (
      <div className={styles.root}>
        <TopBar onLock={lock.lock} />
        <div className={styles.loadingScreen}>Opening prep space…</div>
      </div>
    );
  }

  // ── Gate 5: no therapist → setup form ───────────────────────────
  if (!therapist) {
    return (
      <div className={styles.root}>
        <TopBar onLock={lock.lock} />
        <TherapistSetupForm
          onCreate={async (name) => {
            await createTherapist(name);
          }}
        />
      </div>
    );
  }

  // ── Gate 6: window loading ───────────────────────────────────────
  if (windowLoading) {
    return (
      <div className={styles.root}>
        <TopBar onLock={lock.lock} />
        <div className={styles.loadingScreen}>Loading your session…</div>
      </div>
    );
  }

  // ── Workspace ────────────────────────────────────────────────────
  async function handleRefresh() {
    if (!openWindow) return;
    setRefreshing(true);
    try {
      await actions.refresh(openWindow.id);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className={styles.root}>
      <TopBar onLock={lock.lock} />

      <main className={styles.workspace}>
        {openWindow ? (
          <>
            <WindowHeader
              window={openWindow}
              therapistName={therapist.displayName}
              onRefresh={handleRefresh}
              onImport={() => setShowImport(true)}
              onClose={() => setShowClose(true)}
              refreshing={refreshing}
            />

            <CarryForwardBanner themes={themes} />

            {themes.length === 0 && !windowLoading ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyStateText}>
                  No themes yet. Hit Refresh to generate your prep brief from recent
                  journal entries.
                </p>
              </div>
            ) : (
              <ThemeList
                themes={themes}
                onStar={actions.toggleStar}
                onDismiss={actions.toggleDismiss}
                onNote={actions.setNote}
              />
            )}

            {actions.error && (
              <p className={styles.actionError}>
                Something went wrong: {actions.error.message}
              </p>
            )}
          </>
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>
              No open session window found. This shouldn&apos;t happen — try
              refreshing the page.
            </p>
          </div>
        )}

        <PastSessionsList therapistId={therapist.id} />

        {showImport && openWindow && (
          <ImportNotesModal
            windowId={openWindow.id}
            therapistId={therapist.id}
            notes={notes}
            onImport={actions.importNote}
            onClose={() => setShowImport(false)}
          />
        )}

        {showClose && openWindow && (
          <SessionCloseSheet
            windowId={openWindow.id}
            themes={themes}
            onClose={async (input) => {
              await actions.closeSession(input);
              setShowClose(false);
            }}
            onCancel={() => setShowClose(false)}
          />
        )}
      </main>
    </div>
  );
}

// ── TopBar ────────────────────────────────────────────────────────

function TopBar({ onLock }: { onLock?: () => void }) {
  return (
    <header className={styles.topBar}>
      <Link href="/journal" className={styles.topBarWordmark} aria-label="Relish">
        Relish
      </Link>
      <div className={styles.topBarRight}>
        <Link href="/journal" className={styles.topBarCrossNav}>
          ← The Journal
        </Link>
        <Link href="/manual" className={styles.topBarCrossNav}>
          The Family Manual →
        </Link>
        {onLock && (
          <button
            type="button"
            className={styles.topBarLockBtn}
            onClick={onLock}
            aria-label="Lock therapy prep"
            title="Lock this space"
          >
            Lock
          </button>
        )}
      </div>
    </header>
  );
}
