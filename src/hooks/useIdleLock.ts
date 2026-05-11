import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseIdleLockOptions {
  idleMs: number;
  /** Surface a warning when this many ms remain. */
  warnAtMs: number;
  /** Called when idleMs elapses without a reset. */
  onLock: () => void;
}

export interface UseIdleLockReturn {
  /** True when warnAtMs remain until lock. */
  warningActive: boolean;
  /** Reset the timer (e.g., on user interaction). */
  reset: () => void;
}

export function useIdleLock({ idleMs, warnAtMs, onLock }: UseIdleLockOptions): UseIdleLockReturn {
  const [warningActive, setWarningActive] = useState(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;

  const clearTimers = useCallback(() => {
    if (lockTimer.current) { clearTimeout(lockTimer.current); lockTimer.current = null; }
    if (warnTimer.current) { clearTimeout(warnTimer.current); warnTimer.current = null; }
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setWarningActive(false);
    warnTimer.current = setTimeout(() => setWarningActive(true), idleMs - warnAtMs);
    lockTimer.current = setTimeout(() => { onLockRef.current?.(); }, idleMs);
  }, [idleMs, warnAtMs, clearTimers]);

  useEffect(() => {
    reset();
    return clearTimers;
  }, [reset, clearTimers]);

  return { warningActive, reset };
}
