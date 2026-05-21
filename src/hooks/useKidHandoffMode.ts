'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'relish:kidHandoffMode';

export interface UseKidHandoffModeReturn {
  kidHandoffMode: boolean;
  setKidHandoffMode: (next: boolean) => void;
  toggle: () => void;
}

/**
 * Global UI state for "kid handoff mode" — when on, sensitive content
 * is hidden across all surfaces. Persists in localStorage so the user
 * doesn't have to re-enable it after a page reload.
 *
 * Phase 1: hook + persistence only. Phase 2 wires it to TopChrome.
 */
export function useKidHandoffMode(): UseKidHandoffModeReturn {
  const [kidHandoffMode, setState] = useState<boolean>(() => {
    // Rehydrate from localStorage on initial render.
    if (typeof window === 'undefined') return false;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw === '1';
    } catch {
      // localStorage may be disabled — non-fatal.
      return false;
    }
  });

  const setKidHandoffMode = useCallback((next: boolean) => {
    setState(next);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      }
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    setState((prev) => {
      const next = !prev;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
        }
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { kidHandoffMode, setKidHandoffMode, toggle };
}
