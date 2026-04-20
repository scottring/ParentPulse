'use client';

import { useCallback, useRef, useState } from 'react';
import { usePrivacyLock } from '@/hooks/usePrivacyLock';
import { PinSetupModal } from '@/components/privacy/PinSetupModal';

// Wraps the first-time PIN setup modal around any action that turns
// an entry private. Callers invoke `gate(action)`; if the user has
// no PIN set yet, the modal appears and the action fires after a PIN
// is saved. If a PIN already exists, the action fires immediately.
//
// Render `modal` somewhere stable in the consumer tree (anywhere that
// outlives the gate call — the archive root, the capture sheet, etc).
export function usePrivacyGate(): {
  gate: (action: () => void | Promise<void>) => void;
  modal: React.ReactNode;
} {
  const privacyLock = usePrivacyLock();
  const [showPinSetup, setShowPinSetup] = useState(false);
  const pendingRef = useRef<(() => void | Promise<void>) | null>(null);

  const gate = useCallback(
    (action: () => void | Promise<void>) => {
      if (privacyLock.loading) return;
      if (privacyLock.pinIsSet) {
        void action();
        return;
      }
      pendingRef.current = action;
      setShowPinSetup(true);
    },
    [privacyLock.loading, privacyLock.pinIsSet],
  );

  const modal = showPinSetup ? (
    <PinSetupModal
      onComplete={async (pin) => {
        await privacyLock.setupPin(pin);
        setShowPinSetup(false);
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (pending) await pending();
      }}
      onCancel={() => {
        setShowPinSetup(false);
        pendingRef.current = null;
      }}
    />
  ) : null;

  return { gate, modal };
}
