'use client';

import { useState } from 'react';
import { PinKeypad } from './PinKeypad';

interface PinSetupModalProps {
  /** Called with the validated PIN once the user has confirmed it. */
  onComplete: (pin: string) => Promise<void> | void;
  /** Called if the user cancels setup (only available when optional). */
  onCancel?: () => void;
}

/**
 * Two-step PIN setup: user enters their chosen PIN, then re-enters
 * it to confirm. PinKeypad auto-submits on the 4th digit. Returning
 * false from onSubmit clears the input; returning true advances.
 */
export function PinSetupModal({ onComplete, onCancel }: PinSetupModalProps) {
  const [step, setStep] = useState<'choose' | 'confirm'>('choose');
  const [firstPin, setFirstPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (step === 'choose') {
    return (
      <PinKeypad
        title="Set a PIN"
        subtitle="Pick a 4-digit PIN to protect your private view"
        onSubmit={(pin) => {
          setFirstPin(pin);
          setError(null);
          setStep('confirm');
          return true;
        }}
        onCancel={onCancel}
      />
    );
  }

  return (
    <PinKeypad
      title="Confirm PIN"
      subtitle="Re-enter your PIN to confirm"
      error={error}
      onSubmit={async (pin) => {
        if (pin !== firstPin) {
          setError('PINs don’t match. Try again.');
          setFirstPin('');
          setStep('choose');
          return false;
        }
        await onComplete(pin);
        return true;
      }}
      onCancel={
        onCancel
          ? () => {
              setFirstPin('');
              setStep('choose');
              onCancel();
            }
          : undefined
      }
    />
  );
}
